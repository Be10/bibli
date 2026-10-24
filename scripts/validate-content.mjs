import path from "node:path";
import Database from "better-sqlite3";

const rootDir = process.cwd();
const dbPath = path.join(rootDir, "data", "bibli.sqlite");
const db = new Database(dbPath, { readonly: true });
const problems = [];

function fail(message) {
  problems.push(message);
}

function rows(sql, params = []) {
  return db.prepare(sql).all(...params);
}

function one(sql, params = []) {
  return db.prepare(sql).get(...params);
}

function requireNoRows(label, sql, params = []) {
  const found = rows(sql, params);
  if (found.length > 0) {
    const sample = found.slice(0, 5).map((row) => JSON.stringify(row)).join("; ");
    fail(`${label}: ${found.length} problema(s)${sample ? ` · ${sample}` : ""}`);
  }
}

function requireCount(label, sql, expected, params = []) {
  const value = Number(one(sql, params)?.n ?? 0);
  if (value !== expected) fail(`${label}: ${value}; esperado ${expected}`);
  return value;
}

function validateSlugTable(table, { scope = [], keyColumns = ["id"] } = {}) {
  const columns = [...new Set([...keyColumns, "slug", ...scope])];
  const entries = rows(`SELECT ${columns.join(", ")} FROM ${table}`);
  const seen = new Map();
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  for (const entry of entries) {
    const entryKey = keyColumns.map((key) => String(entry[key] ?? "")).join("::");
    const slug = String(entry.slug ?? "");
    if (!slugPattern.test(slug)) {
      fail(`${table}: slug no canónico para ${entryKey}: ${JSON.stringify(slug)}`);
      continue;
    }
    const scopeKey = scope.map((key) => String(entry[key] ?? "").toLowerCase()).join("::");
    const key = `${scopeKey}::${slug.toLowerCase()}`;
    if (seen.has(key)) {
      fail(`${table}: colisión de slug normalizado ${slug} entre ${seen.get(key)} y ${entryKey}`);
    } else {
      seen.set(key, entryKey);
    }
  }
}

try {
  // Canon bíblico y versificación.
  requireCount("Libros canónicos", "SELECT COUNT(*) AS n FROM books", 66);
  requireCount(
    "Códigos USFM no vacíos y únicos",
    "SELECT COUNT(DISTINCT usfm_code) AS n FROM books WHERE usfm_code IS NOT NULL AND trim(usfm_code) <> ''",
    66,
  );

  const bookOrder = one(`
    SELECT MIN(order_number) AS min_order,
           MAX(order_number) AS max_order,
           COUNT(DISTINCT order_number) AS distinct_orders
    FROM books
  `);
  if (bookOrder.min_order !== 1 || bookOrder.max_order !== 66 || bookOrder.distinct_orders !== 66) {
    fail(`Orden canónico de libros inválido: ${JSON.stringify(bookOrder)}`);
  }

  requireNoRows("Capítulos con numeración discontinua", `
    SELECT book_id, MIN(chapter_number) AS min_chapter, MAX(chapter_number) AS max_chapter, COUNT(*) AS chapters
    FROM bible_chapters
    GROUP BY book_id
    HAVING min_chapter <> 1 OR max_chapter <> chapters OR COUNT(DISTINCT chapter_number) <> chapters
  `);

  requireNoRows("Versículos cuyo chapter_id contradice libro/capítulo", `
    SELECT v.id, v.version_id, v.book_id, v.chapter_number, c.book_id AS chapter_book_id,
           c.chapter_number AS linked_chapter_number
    FROM bible_verses v
    JOIN bible_chapters c ON c.id = v.chapter_id
    WHERE c.book_id <> v.book_id OR c.chapter_number <> v.chapter_number
  `);

  requireNoRows("Versículos vacíos", `
    SELECT version_id, book_id, chapter_number, verse_number
    FROM bible_verses
    WHERE trim(coalesce(verse_text, '')) = ''
  `);

  requireNoRows("Numeración de versículos discontinua", `
    SELECT version_id, book_id, chapter_number,
           MIN(verse_number) AS min_verse, MAX(verse_number) AS max_verse, COUNT(*) AS verses
    FROM bible_verses
    GROUP BY version_id, book_id, chapter_number
    HAVING min_verse <> 1 OR max_verse <> verses OR COUNT(DISTINCT verse_number) <> verses
  `);

  for (const versionId of ["rvr1960", "kjv"]) {
    requireCount(
      `${versionId}: cobertura de capítulos`,
      "SELECT COUNT(DISTINCT book_id || ':' || chapter_number) AS n FROM bible_verses WHERE version_id = ?",
      1189,
      [versionId],
    );
  }

  const rvrOnly = rows(`
    SELECT r.book_id, r.chapter_number, r.verse_number
    FROM bible_verses r
    WHERE r.version_id = 'rvr1960'
      AND NOT EXISTS (
        SELECT 1 FROM bible_verses k
        WHERE k.version_id = 'kjv'
          AND k.book_id = r.book_id
          AND k.chapter_number = r.chapter_number
          AND k.verse_number = r.verse_number
      )
    ORDER BY r.book_id, r.chapter_number, r.verse_number
  `);
  const expectedRvrOnly = [
    { book_id: "book-3-juan", chapter_number: 1, verse_number: 15 },
    { book_id: "book-salmos", chapter_number: 47, verse_number: 10 },
  ];
  if (JSON.stringify(rvrOnly) !== JSON.stringify(expectedRvrOnly)) {
    fail(`Diferencias posicionales RVR1960→KJV inesperadas: ${JSON.stringify(rvrOnly)}`);
  }
  requireNoRows("Posiciones KJV sin equivalente RVR1960", `
    SELECT k.book_id, k.chapter_number, k.verse_number
    FROM bible_verses k
    WHERE k.version_id = 'kjv'
      AND NOT EXISTS (
        SELECT 1 FROM bible_verses r
        WHERE r.version_id = 'rvr1960'
          AND r.book_id = k.book_id
          AND r.chapter_number = k.chapter_number
          AND r.verse_number = k.verse_number
      )
  `);

  // Slugs públicos: formato estable y sin colisiones al normalizar mayúsculas/minúsculas.
  validateSlugTable("routes");
  validateSlugTable("route_modules", { scope: ["route_id"] });
  validateSlugTable("books");
  validateSlugTable("book_translations", { scope: ["language"], keyColumns: ["book_id", "language"] });
  validateSlugTable("passages");
  validateSlugTable("study_lessons");
  validateSlugTable("topics");
  validateSlugTable("events");
  validateSlugTable("people");
  validateSlugTable("places");
  validateSlugTable("glossary_terms");
  validateSlugTable("visual_resources");

  // Rangos de pasajes contra la referencia bíblica canónica usada por el contenido ES.
  requireNoRows("Pasajes con rango invertido o no positivo", `
    SELECT id, display_reference, start_chapter, start_verse, end_chapter, end_verse
    FROM passages
    WHERE start_chapter < 1 OR end_chapter < 1
       OR coalesce(start_verse, 1) < 1 OR coalesce(end_verse, 1) < 1
       OR start_chapter > end_chapter
       OR (start_chapter = end_chapter AND start_verse IS NOT NULL AND end_verse IS NOT NULL AND start_verse > end_verse)
  `);

  requireNoRows("Pasajes con capítulo inicial inexistente", `
    SELECT p.id, p.display_reference
    FROM passages p
    LEFT JOIN bible_chapters c ON c.book_id = p.book_id AND c.chapter_number = p.start_chapter
    WHERE c.id IS NULL
  `);
  requireNoRows("Pasajes con capítulo final inexistente", `
    SELECT p.id, p.display_reference
    FROM passages p
    LEFT JOIN bible_chapters c ON c.book_id = p.book_id AND c.chapter_number = p.end_chapter
    WHERE c.id IS NULL
  `);
  requireNoRows("Pasajes con versículo inicial inexistente en RVR1960", `
    SELECT p.id, p.display_reference
    FROM passages p
    WHERE p.start_verse IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM bible_verses v
        WHERE v.version_id = 'rvr1960'
          AND v.book_id = p.book_id
          AND v.chapter_number = p.start_chapter
          AND v.verse_number = p.start_verse
      )
  `);
  requireNoRows("Pasajes con versículo final inexistente en RVR1960", `
    SELECT p.id, p.display_reference
    FROM passages p
    WHERE p.end_verse IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM bible_verses v
        WHERE v.version_id = 'rvr1960'
          AND v.book_id = p.book_id
          AND v.chapter_number = p.end_chapter
          AND v.verse_number = p.end_verse
      )
  `);

  // Lecciones y estructura editorial.
  requireNoRows("Lecciones sin exactamente una ruta primaria", `
    SELECT s.id, s.slug, COUNT(rl.lesson_id) AS primary_routes
    FROM study_lessons s
    LEFT JOIN route_lessons rl ON rl.lesson_id = s.id AND rl.is_primary = 1
    GROUP BY s.id, s.slug
    HAVING COUNT(rl.lesson_id) <> 1
  `);
  requireNoRows("Lecciones sin módulo editorial", `
    SELECT route_id, lesson_id, position
    FROM route_lessons
    WHERE module_id IS NULL
  `);
  requireNoRows("Lecciones enlazadas a un módulo de otra ruta", `
    SELECT rl.route_id, rl.lesson_id, rl.module_id, rm.route_id AS module_route_id
    FROM route_lessons rl
    JOIN route_modules rm ON rm.id = rl.module_id
    WHERE rl.route_id <> rm.route_id
  `);
  requireNoRows("Posiciones de módulos discontinuas", `
    SELECT route_id, MIN(position) AS min_position, MAX(position) AS max_position, COUNT(*) AS modules
    FROM route_modules
    GROUP BY route_id
    HAVING min_position <> 1 OR max_position <> modules OR COUNT(DISTINCT position) <> modules
  `);
  requireNoRows("Posiciones de lecciones discontinuas", `
    SELECT route_id, MIN(position) AS min_position, MAX(position) AS max_position, COUNT(*) AS lessons
    FROM route_lessons
    GROUP BY route_id
    HAVING min_position <> 1 OR max_position <> lessons OR COUNT(DISTINCT position) <> lessons
  `);
  requireNoRows("Lecciones sin exactamente un libro canónico", `
    SELECT s.id, COUNT(lb.book_id) AS linked_books
    FROM study_lessons s
    LEFT JOIN lesson_books lb ON lb.lesson_id = s.id
    GROUP BY s.id
    HAVING COUNT(lb.book_id) <> 1
  `);
  requireNoRows("Libro canónico de lección inconsistente", `
    SELECT s.id, s.book_id, lb.book_id AS linked_book_id
    FROM study_lessons s
    JOIN lesson_books lb ON lb.lesson_id = s.id
    WHERE s.book_id <> lb.book_id
  `);
  requireNoRows("Lecciones sin exactamente un pasaje principal", `
    SELECT s.id, COUNT(lp.passage_id) AS principal_passages
    FROM study_lessons s
    LEFT JOIN lesson_passages lp ON lp.lesson_id = s.id AND lp.relation_type = 'principal'
    GROUP BY s.id
    HAVING COUNT(lp.passage_id) <> 1
  `);
  requireNoRows("Pasaje principal de lección pertenece a otro libro", `
    SELECT s.id, s.book_id, p.book_id AS passage_book_id, p.display_reference
    FROM study_lessons s
    JOIN lesson_passages lp ON lp.lesson_id = s.id AND lp.relation_type = 'principal'
    JOIN passages p ON p.id = lp.passage_id
    WHERE s.book_id <> p.book_id
  `);
  requireNoRows("Traducción de lección no resoluble", `
    SELECT s.id, s.translation
    FROM study_lessons s
    WHERE NOT EXISTS (
      SELECT 1 FROM bible_versions v
      WHERE lower(trim(s.translation)) IN (lower(trim(v.id)), lower(trim(v.abbreviation)), lower(trim(v.name)))
    )
  `);

  // Datos geográficos y flags de publicación visual.
  requireNoRows("Lugares con coordenadas incompletas", `
    SELECT id, name, latitude, longitude
    FROM places
    WHERE (latitude IS NULL AND longitude IS NOT NULL)
       OR (latitude IS NOT NULL AND longitude IS NULL)
  `);
  requireNoRows("Lugares con coordenadas fuera de rango", `
    SELECT id, name, latitude, longitude
    FROM places
    WHERE latitude IS NOT NULL
      AND (latitude < -90 OR latitude > 90 OR longitude < -180 OR longitude > 180)
  `);
  requireNoRows("Flags de eventos fuera de dominio booleano", `
    SELECT id, title, appears_on_timeline, appears_on_map
    FROM events
    WHERE appears_on_timeline NOT IN (0, 1) OR appears_on_map NOT IN (0, 1)
  `);
  requireNoRows("Eventos de cronología sin orden", `
    SELECT id, title
    FROM events
    WHERE appears_on_timeline = 1 AND chronological_order IS NULL
  `);
  requireNoRows("Eventos de mapa sin ningún lugar geocodificado", `
    SELECT e.id, e.title
    FROM events e
    WHERE e.appears_on_map = 1
      AND NOT EXISTS (
        SELECT 1
        FROM event_places ep
        JOIN places p ON p.id = ep.place_id
        WHERE ep.event_id = e.id AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
      )
  `);

  // Contenido publicado: campos editoriales mínimos que las páginas muestran como sustancia principal.
  requireNoRows("Entidades publicadas con contenido principal vacío", `
    SELECT 'topic' AS entity_type, id, title AS label FROM topics
      WHERE lower(status) LIKE 'publicado%' AND trim(coalesce(definition, '')) = ''
    UNION ALL
    SELECT 'person', id, name FROM people
      WHERE lower(status) LIKE 'publicado%' AND trim(coalesce(summary, '')) = ''
    UNION ALL
    SELECT 'place', id, name FROM places
      WHERE lower(status) LIKE 'publicado%' AND trim(coalesce(summary, '')) = ''
    UNION ALL
    SELECT 'glossary', id, term FROM glossary_terms
      WHERE lower(status) LIKE 'publicado%' AND trim(coalesce(definition, '')) = ''
    UNION ALL
    SELECT 'event', id, title FROM events
      WHERE lower(status) LIKE 'publicado%' AND trim(coalesce(summary, '')) = ''
    UNION ALL
    SELECT 'passage', id, display_reference FROM passages
      WHERE lower(status) LIKE 'publicado%' AND trim(coalesce(summary, '')) = ''
  `);
  requireNoRows("Lecciones publicadas sin texto de búsqueda", `
    SELECT id, slug
    FROM study_lessons
    WHERE lower(status) LIKE 'publicado%' AND trim(coalesce(search_text, '')) = ''
  `);

  requireNoRows("Lecciones publicadas enlazadas a contenido borrador", `
    SELECT 'topic' AS entity_type, s.id AS lesson_id, t.id AS entity_id
    FROM study_lessons s
    JOIN lesson_topics x ON x.lesson_id = s.id
    JOIN topics t ON t.id = x.topic_id
    WHERE lower(s.status) LIKE 'publicado%' AND t.status = 'Borrador'
    UNION ALL
    SELECT 'event', s.id, e.id
    FROM study_lessons s
    JOIN lesson_events x ON x.lesson_id = s.id
    JOIN events e ON e.id = x.event_id
    WHERE lower(s.status) LIKE 'publicado%' AND e.status = 'Borrador'
    UNION ALL
    SELECT 'person', s.id, p.id
    FROM study_lessons s
    JOIN lesson_people x ON x.lesson_id = s.id
    JOIN people p ON p.id = x.person_id
    WHERE lower(s.status) LIKE 'publicado%' AND p.status = 'Borrador'
    UNION ALL
    SELECT 'place', s.id, p.id
    FROM study_lessons s
    JOIN lesson_places x ON x.lesson_id = s.id
    JOIN places p ON p.id = x.place_id
    WHERE lower(s.status) LIKE 'publicado%' AND p.status = 'Borrador'
    UNION ALL
    SELECT 'glossary', s.id, g.id
    FROM study_lessons s
    JOIN lesson_glossary x ON x.lesson_id = s.id
    JOIN glossary_terms g ON g.id = x.glossary_id
    WHERE lower(s.status) LIKE 'publicado%' AND g.status = 'Borrador'
    UNION ALL
    SELECT 'resource', s.id, v.id
    FROM study_lessons s
    JOIN lesson_visual_resources x ON x.lesson_id = s.id
    JOIN visual_resources v ON v.id = x.visual_resource_id
    WHERE lower(s.status) LIKE 'publicado%' AND v.status = 'Borrador'
  `);

  requireNoRows("Eventos publicados enlazados a contenido borrador", `
    SELECT 'topic' AS entity_type, e.id AS event_id, t.id AS entity_id
    FROM events e
    JOIN event_topics x ON x.event_id = e.id
    JOIN topics t ON t.id = x.topic_id
    WHERE lower(e.status) LIKE 'publicado%' AND t.status = 'Borrador'
    UNION ALL
    SELECT 'person', e.id, p.id
    FROM events e
    JOIN event_people x ON x.event_id = e.id
    JOIN people p ON p.id = x.person_id
    WHERE lower(e.status) LIKE 'publicado%' AND p.status = 'Borrador'
    UNION ALL
    SELECT 'place', e.id, p.id
    FROM events e
    JOIN event_places x ON x.event_id = e.id
    JOIN places p ON p.id = x.place_id
    WHERE lower(e.status) LIKE 'publicado%' AND p.status = 'Borrador'
    UNION ALL
    SELECT 'passage', e.id, p.id
    FROM events e
    JOIN event_passages x ON x.event_id = e.id
    JOIN passages p ON p.id = x.passage_id
    WHERE lower(e.status) LIKE 'publicado%' AND p.status = 'Borrador'
    UNION ALL
    SELECT 'book', e.id, b.id
    FROM events e
    JOIN event_books x ON x.event_id = e.id
    JOIN books b ON b.id = x.book_id
    WHERE lower(e.status) LIKE 'publicado%' AND b.status = 'Borrador'
  `);

  if (problems.length > 0) {
    console.error("Validación semántica de contenido: FAIL");
    for (const problem of problems) console.error(`- ${problem}`);
    process.exitCode = 1;
  } else {
    const counts = {
      books: one("SELECT COUNT(*) AS n FROM books").n,
      verses: one("SELECT COUNT(*) AS n FROM bible_verses").n,
      lessons: one("SELECT COUNT(*) AS n FROM study_lessons").n,
      passages: one("SELECT COUNT(*) AS n FROM passages").n,
      entities: one(`
        SELECT
          (SELECT COUNT(*) FROM topics) +
          (SELECT COUNT(*) FROM events) +
          (SELECT COUNT(*) FROM people) +
          (SELECT COUNT(*) FROM places) +
          (SELECT COUNT(*) FROM glossary_terms) +
          (SELECT COUNT(*) FROM visual_resources) AS n
      `).n,
    };
    console.log("Validación semántica de contenido: PASS");
    console.log(`Canon: ${counts.books} libros · ${counts.verses} versículos`);
    console.log(`Estudios: ${counts.lessons} lecciones · ${counts.passages} pasajes`);
    const coverage = {
      passages: one(`SELECT COUNT(*) AS n FROM passages p WHERE p.status <> 'Borrador' AND (EXISTS (SELECT 1 FROM lesson_passages x WHERE x.passage_id = p.id) OR EXISTS (SELECT 1 FROM event_passages x WHERE x.passage_id = p.id))`).n,
      topics: one(`SELECT COUNT(*) AS n FROM topics t WHERE t.status <> 'Borrador' AND (EXISTS (SELECT 1 FROM lesson_topics x WHERE x.topic_id = t.id) OR EXISTS (SELECT 1 FROM event_topics x WHERE x.topic_id = t.id))`).n,
      events: one(`SELECT COUNT(*) AS n FROM events e WHERE e.status <> 'Borrador' AND (EXISTS (SELECT 1 FROM lesson_events x WHERE x.event_id = e.id) OR EXISTS (SELECT 1 FROM event_topics x WHERE x.event_id = e.id) OR EXISTS (SELECT 1 FROM event_people x WHERE x.event_id = e.id) OR EXISTS (SELECT 1 FROM event_places x WHERE x.event_id = e.id) OR EXISTS (SELECT 1 FROM event_passages x WHERE x.event_id = e.id) OR EXISTS (SELECT 1 FROM event_books x WHERE x.event_id = e.id))`).n,
      people: one(`SELECT COUNT(*) AS n FROM people p WHERE p.status <> 'Borrador' AND (EXISTS (SELECT 1 FROM lesson_people x WHERE x.person_id = p.id) OR EXISTS (SELECT 1 FROM event_people x WHERE x.person_id = p.id))`).n,
      places: one(`SELECT COUNT(*) AS n FROM places p WHERE p.status <> 'Borrador' AND (EXISTS (SELECT 1 FROM lesson_places x WHERE x.place_id = p.id) OR EXISTS (SELECT 1 FROM event_places x WHERE x.place_id = p.id))`).n,
      glossary: one(`SELECT COUNT(*) AS n FROM glossary_terms g WHERE g.status <> 'Borrador' AND EXISTS (SELECT 1 FROM lesson_glossary x WHERE x.glossary_id = g.id)`).n,
      resources: one(`SELECT COUNT(*) AS n FROM visual_resources v WHERE v.status <> 'Borrador' AND EXISTS (SELECT 1 FROM lesson_visual_resources x WHERE x.visual_resource_id = v.id)`).n,
    };
    const coverageTotals = {
      passages: one("SELECT COUNT(*) AS n FROM passages WHERE status <> 'Borrador'").n,
      topics: one("SELECT COUNT(*) AS n FROM topics WHERE status <> 'Borrador'").n,
      events: one("SELECT COUNT(*) AS n FROM events WHERE status <> 'Borrador'").n,
      people: one("SELECT COUNT(*) AS n FROM people WHERE status <> 'Borrador'").n,
      places: one("SELECT COUNT(*) AS n FROM places WHERE status <> 'Borrador'").n,
      glossary: one("SELECT COUNT(*) AS n FROM glossary_terms WHERE status <> 'Borrador'").n,
      resources: one("SELECT COUNT(*) AS n FROM visual_resources WHERE status <> 'Borrador'").n,
    };
    console.log(`Entidades editoriales auditadas: ${counts.entities}`);
    console.log(`Conectividad explícita: pasajes ${coverage.passages}/${coverageTotals.passages} · temas ${coverage.topics}/${coverageTotals.topics} · eventos ${coverage.events}/${coverageTotals.events} · personajes ${coverage.people}/${coverageTotals.people}`);
    console.log(`Conectividad explícita: lugares ${coverage.places}/${coverageTotals.places} · glosario ${coverage.glossary}/${coverageTotals.glossary} · recursos ${coverage.resources}/${coverageTotals.resources}`);
  }
} finally {
  db.close();
}
