import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  canonicalBookId,
  normalizeBibleReference,
  normalizeText,
  parseStudyDocument,
  slugify,
  stripStudyVersionSuffix,
  toPosixPath,
  walkFiles,
} from "./study-markdown-utils.mjs";
import { loadEditorialConfig, resolveEditorialModule } from "./study-editorial-config.mjs";

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function markdownToSearchText(body) {
  return normalizeText(
    body
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^>\s?/gm, "")
      .replace(/[\*_~]/g, " ")
  );
}

function estimateMinutes(body) {
  const words = markdownToSearchText(body).split(/\s+/).filter(Boolean).length;
  return Math.max(5, Math.ceil(words / 190));
}

function parseReferenceRange(reference) {
  const normalized = normalizeBibleReference(reference);
  const match = normalized.match(/(\d+)(?::(\d+))?(?:-(?:(\d+):)?(\d+))?$/);
  if (!match) throw new Error(`No se pudo interpretar la referencia: ${reference}`);

  const startChapter = Number(match[1]);
  const startVerse = match[2] ? Number(match[2]) : null;
  const endChapter = match[3] ? Number(match[3]) : startChapter;
  let endVerse = null;

  if (match[4]) {
    endVerse = Number(match[4]);
  } else if (startVerse !== null) {
    endVerse = startVerse;
  }

  return { startChapter, startVerse, endChapter, endVerse };
}

function stablePassageId(bookId, reference) {
  const digest = crypto.createHash("sha256").update(`${bookId}:${normalizeBibleReference(reference)}`).digest("hex").slice(0, 14);
  return `pas-study-${digest}`;
}

function lessonSlugFromPath(filePath) {
  const stem = path.basename(filePath, path.extname(filePath));
  return stripStudyVersionSuffix(stem);
}

function insertManualLinks(db, lessonId, enrichment) {
  const specs = [
    ["topics", "lesson_topics", "topic_id"],
    ["events", "lesson_events", "event_id"],
    ["people", "lesson_people", "person_id"],
    ["places", "lesson_places", "place_id"],
    ["glossary", "lesson_glossary", "glossary_id"],
    ["visual_resources", "lesson_visual_resources", "visual_resource_id"],
  ];

  for (const [key, table, targetColumn] of specs) {
    const values = enrichment?.[key];
    if (!Array.isArray(values)) continue;
    const insert = db.prepare(
      `INSERT OR REPLACE INTO ${table} (lesson_id, ${targetColumn}, link_source) VALUES (?, ?, 'editorial')`
    );
    for (const id of values) insert.run(lessonId, id);
  }
}

export function indexStudies(db, options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const studiesRoot = path.join(rootDir, "content", "studies");
  const enrichmentsPath = path.join(rootDir, "content", "study-enrichments.json");
  const editorialConfig = loadEditorialConfig(rootDir);
  const enrichments = readJson(enrichmentsPath, { lessons: {} });

  const markdownFiles = walkFiles(studiesRoot, (filePath) => filePath.toLowerCase().endsWith(".md"));
  if (markdownFiles.length === 0) throw new Error("content/studies no contiene lecciones Markdown");

  const documents = markdownFiles.map((filePath) => {
    const relativePath = toPosixPath(path.relative(studiesRoot, filePath));
    const parsed = parseStudyDocument(fs.readFileSync(filePath, "utf8"), relativePath);
    const fm = parsed.frontmatter;
    if (fm.artifact_type !== "bible_study_lesson" || fm.mode !== "official" || fm.content_type !== "lesson") {
      throw new Error(`${relativePath}: artefacto no importable`);
    }
    if (parsed.h1.length !== 1) throw new Error(`${relativePath}: se esperaba un único H1`);
    return { filePath, relativePath, parsed, fm, title: parsed.h1[0] };
  });

  const effectiveRoutes = editorialConfig.routes;
  const routeById = new Map(effectiveRoutes.map((route) => [route.id, route]));
  const knownBooks = new Set(db.prepare("SELECT id FROM books").all().map((row) => row.id));

  const tx = db.transaction(() => {
    for (const table of [
      "lesson_visual_resources", "lesson_glossary", "lesson_places", "lesson_people",
      "lesson_passages", "lesson_books", "lesson_events", "lesson_topics",
      "route_lessons", "route_modules", "routes", "study_lessons",
    ]) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
    db.prepare(`
      DELETE FROM passages
      WHERE id LIKE 'pas-study-%'
        AND id NOT IN (SELECT passage_id FROM event_passages)
    `).run();

    // Rebuild the lookup after deleting generated study passages. Building this
    // map before cleanup leaves stale pas-study-* IDs that no longer exist and
    // causes lesson_passages foreign-key failures on subsequent imports.
    const passageRows = db.prepare("SELECT id, book_id, display_reference FROM passages").all();
    const passageByKey = new Map(
      passageRows.map((row) => [`${row.book_id}::${normalizeBibleReference(row.display_reference)}`, row.id])
    );

    const insertRoute = db.prepare(`
      INSERT INTO routes (id, title, slug, subtitle, description, level, estimated_duration, language, status)
      VALUES (@id, @title, @slug, @subtitle, @description, @level, NULL, @language, @status)
    `);
    const insertModule = db.prepare(`
      INSERT INTO route_modules (id, route_id, title, slug, description, position, status)
      VALUES (@id, @route_id, @title, @slug, @description, @position, @status)
    `);

    for (const route of effectiveRoutes) {
      insertRoute.run({
        id: route.id,
        title: route.title,
        slug: route.slug,
        subtitle: route.subtitle ?? null,
        description: route.description ?? null,
        level: route.level ?? null,
        language: route.language ?? "es",
        status: route.status ?? "Publicado",
      });
      for (const module of route.modules || []) {
        insertModule.run({
          id: module.id,
          route_id: route.id,
          title: module.title,
          slug: module.slug,
          description: module.description ?? null,
          position: module.position,
          status: module.status ?? "Publicado",
        });
      }
    }

    const insertLesson = db.prepare(`
      INSERT INTO study_lessons
        (id, title, slug, book_id, primary_reference, translation, content_version, source_path, estimated_minutes, search_text, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Publicado')
    `);
    const insertRouteLesson = db.prepare(`
      INSERT INTO route_lessons (route_id, module_id, lesson_id, position, is_primary)
      VALUES (?, ?, ?, ?, 1)
    `);
    const insertBookLink = db.prepare(`
      INSERT OR IGNORE INTO lesson_books (lesson_id, book_id, link_source) VALUES (?, ?, 'canonical')
    `);
    const insertPassage = db.prepare(`
      INSERT INTO passages
        (id, display_reference, slug, book_id, start_chapter, start_verse, end_chapter, end_verse, summary, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Publicado')
    `);
    const insertPassageLink = db.prepare(`
      INSERT OR IGNORE INTO lesson_passages
        (lesson_id, passage_id, relation_type, position, link_source)
      VALUES (?, ?, 'principal', 1, 'canonical')
    `);

    for (const document of documents.sort((a, b) => a.fm.route_lesson_number - b.fm.route_lesson_number)) {
      const { fm, parsed, relativePath, title } = document;
      const route = routeById.get(fm.route_id);
      if (!route) throw new Error(`${relativePath}: route_id desconocido ${fm.route_id}`);
      if (normalizeText(route.title) !== normalizeText(fm.route_name)) {
        throw new Error(`${relativePath}: route_name no coincide con content/editorial-structure.yaml`);
      }
      const module = resolveEditorialModule(route, fm);
      if (!module) {
        throw new Error(`${relativePath}: la lección no tiene una sección editorial resoluble en ${route.id}`);
      }

      const bookId = canonicalBookId(fm.book_id);
      if (!knownBooks.has(bookId)) throw new Error(`${relativePath}: book_id no resoluble ${bookId}`);

      const normalizedBody = markdownToSearchText(parsed.body);
      const minutes = estimateMinutes(parsed.body);
      const lessonSlug = lessonSlugFromPath(document.filePath);

      insertLesson.run(
        fm.lesson_id,
        title,
        lessonSlug,
        bookId,
        fm.primary_reference,
        fm.translation,
        String(fm.content_version),
        relativePath,
        minutes,
        normalizedBody,
      );
      insertRouteLesson.run(route.id, module.id, fm.lesson_id, fm.route_lesson_number);
      insertBookLink.run(fm.lesson_id, bookId);

      const passageKey = `${bookId}::${normalizeBibleReference(fm.primary_reference)}`;
      let passageId = passageByKey.get(passageKey);
      if (!passageId) {
        const range = parseReferenceRange(fm.primary_reference);
        passageId = stablePassageId(bookId, fm.primary_reference);
        insertPassage.run(
          passageId,
          fm.primary_reference,
          `study-${slugify(fm.primary_reference)}`,
          bookId,
          range.startChapter,
          range.startVerse,
          range.endChapter,
          range.endVerse,
          `Pasaje principal de la lección ${fm.route_lesson_number}: ${title}`,
        );
        passageByKey.set(passageKey, passageId);
      }
      insertPassageLink.run(fm.lesson_id, passageId);

      insertManualLinks(db, fm.lesson_id, enrichments.lessons?.[fm.lesson_id]);
    }

    // A canonical lesson may participate in additional routes without duplicating
    // its Markdown. Secondary routes declare explicit lesson_ids per module.
    for (const route of effectiveRoutes) {
      let routePosition = 1;
      for (const module of [...(route.modules || [])].sort((a, b) => a.position - b.position)) {
        if (!Array.isArray(module.lesson_ids)) continue;
        for (const lessonId of module.lesson_ids) {
          const lessonExists = db.prepare("SELECT 1 FROM study_lessons WHERE id = ?").get(lessonId);
          if (!lessonExists) throw new Error(`${route.id}/${module.id}: lesson_id desconocido ${lessonId}`);
          const isPrimaryHere = documents.some((document) => document.fm.lesson_id === lessonId && document.fm.route_id === route.id);
          db.prepare(`
            INSERT INTO route_lessons (route_id, module_id, lesson_id, position, is_primary)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(route_id, lesson_id) DO UPDATE SET
              module_id = excluded.module_id, position = excluded.position
          `).run(route.id, module.id, lessonId, routePosition, isPrimaryHere ? 1 : 0);
          routePosition += 1;
        }
      }
    }

    for (const route of effectiveRoutes) {
      const row = db.prepare(`
        SELECT COUNT(*) AS lessons, COALESCE(SUM(study_lessons.estimated_minutes), 0) AS minutes
        FROM route_lessons
        JOIN study_lessons ON study_lessons.id = route_lessons.lesson_id
        WHERE route_lessons.route_id = ?
      `).get(route.id);
      const hours = row.minutes >= 60 ? `${Math.round(row.minutes / 60)} h aprox.` : `${row.minutes} min aprox.`;
      db.prepare("UPDATE routes SET estimated_duration = ? WHERE id = ?").run(hours, route.id);
    }
  });

  tx();

  return {
    lessons: documents.length,
    routes: effectiveRoutes.length,
    modules: effectiveRoutes.reduce((sum, route) => sum + (route.modules?.length || 0), 0),
  };
}
