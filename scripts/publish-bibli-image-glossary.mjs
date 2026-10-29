import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const dbPath = path.join(repoRoot, "data", "bibli.sqlite");
const planPath = path.join(repoRoot, "content", "bibli-images-glossary-plan.json");
const manifestPath = path.join(repoRoot, "content", "bibli-images-glossary-published.json");
const sqlPath = path.join(repoRoot, "data", "bibliimg-glossary.sql");

function parseArgs(argv) {
  const options = { mode: "preview" };
  for (const arg of argv) {
    if (arg === "--preview") options.mode = "preview";
    else if (arg === "--apply") options.mode = "apply";
    else if (arg === "--check") options.mode = "check";
    else throw new Error(`Argumento no reconocido: ${arg}`);
  }
  const modes = argv.filter((arg) => ["--preview", "--apply", "--check"].includes(arg));
  if (new Set(modes).size > 1) throw new Error("Usa solo uno de --preview, --apply o --check");
  return options;
}

const options = parseArgs(process.argv.slice(2));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function normalizeIdentity(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es")
    .replace(/[’'"“”()\[\]{}.,;:!?/\\|_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sqlString(value) {
  if (value == null) return "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function writeText(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(tempPath, content, "utf8");
  fs.copyFileSync(tempPath, filePath);
  fs.rmSync(tempPath, { force: true });
}

function restoreText(filePath, existed, content) {
  if (existed) writeText(filePath, content);
  else fs.rmSync(filePath, { force: true });
}

function canonicalFromPlan(entry) {
  const proposed = entry?.proposed ?? {};
  assert(typeof entry?.sourceSlug === "string" && entry.sourceSlug.trim(), "Plan: falta sourceSlug");
  assert(typeof entry?.entityKey === "string" && entry.entityKey.trim(), `${entry.sourceSlug}: falta entityKey`);
  assert(typeof entry?.group === "string" && entry.group.trim(), `${entry.sourceSlug}: falta group`);
  assert(typeof entry?.sourcePath === "string" && entry.sourcePath.trim(), `${entry.sourceSlug}: falta sourcePath`);
  assert(typeof entry?.canonicalName === "string" && entry.canonicalName.trim(), `${entry.sourceSlug}: falta canonicalName`);
  assert(typeof proposed.id === "string" && proposed.id.trim(), `${entry.sourceSlug}: falta proposed.id`);
  assert(typeof proposed.slug === "string" && /^[a-z0-9-]+$/.test(proposed.slug), `${entry.sourceSlug}: proposed.slug inválido`);
  assert(proposed.id === `glo-${proposed.slug}`, `${entry.sourceSlug}: proposed.id no corresponde al slug`);
  assert(typeof proposed.term === "string" && proposed.term.trim(), `${entry.sourceSlug}: falta proposed.term`);
  assert(typeof proposed.definition === "string" && proposed.definition.trim(), `${entry.sourceSlug}: falta proposed.definition`);
  assert(proposed.status === "Publicado básico", `${entry.sourceSlug}: status no publicable: ${proposed.status}`);

  return {
    sourceSlug: entry.sourceSlug,
    entityKey: entry.entityKey,
    group: entry.group,
    sourcePath: entry.sourcePath,
    canonicalName: entry.canonicalName,
    sense: entry.sense ?? null,
    sharedAliases: [...new Set(entry.sharedAliases ?? [])].sort((a, b) => a.localeCompare(b, "es")),
    id: proposed.id,
    slug: proposed.slug,
    term: proposed.term.trim(),
    definition: proposed.definition.trim(),
    status: proposed.status,
  };
}

function validateManifest(manifest) {
  assert(manifest && typeof manifest === "object", "Manifest de publicación inválido");
  assert(manifest.schemaVersion === 1, "bibli-images-glossary-published.json: schemaVersion debe ser 1");
  assert(manifest.entries && typeof manifest.entries === "object" && !Array.isArray(manifest.entries),
    "bibli-images-glossary-published.json: entries debe ser objeto");

  const seenIds = new Map();
  const seenSlugs = new Map();
  const seenTerms = new Map();
  for (const [key, entry] of Object.entries(manifest.entries)) {
    assert(key === entry.sourceSlug, `${key}: la clave del manifest debe coincidir con sourceSlug`);
    assert(typeof entry.id === "string" && entry.id === `glo-${entry.slug}`, `${key}: id inválido`);
    assert(typeof entry.slug === "string" && /^[a-z0-9-]+$/.test(entry.slug), `${key}: slug inválido`);
    assert(typeof entry.term === "string" && entry.term.trim(), `${key}: term inválido`);
    assert(typeof entry.definition === "string" && entry.definition.trim(), `${key}: definition inválida`);
    assert(entry.status === "Publicado básico", `${key}: status inválido`);

    const termKey = normalizeIdentity(entry.term);
    for (const [map, value, label] of [
      [seenIds, entry.id, "id"],
      [seenSlugs, entry.slug, "slug"],
      [seenTerms, termKey, "term"],
    ]) {
      if (map.has(value)) throw new Error(`Manifest: colisión de ${label} entre ${map.get(value)} y ${key}`);
      map.set(value, key);
    }
  }
}

function buildSql(manifest) {
  const entries = Object.values(manifest.entries).sort((a, b) => a.slug.localeCompare(b.slug, "es"));
  const header = [
    "-- GENERATED FILE. DO NOT EDIT MANUALLY.",
    "-- Source: content/bibli-images-glossary-published.json",
    "-- Generator: scripts/publish-bibli-image-glossary.mjs",
    "",
  ];
  if (entries.length === 0) {
    return `${header.join("\n")}-- No BibliImg-owned glossary terms have been published yet.\n`;
  }

  const rows = entries.map((entry) =>
    `(${sqlString(entry.id)}, ${sqlString(entry.term)}, ${sqlString(entry.slug)}, ${sqlString(entry.definition)}, ${sqlString(entry.status)})`,
  );
  return `${header.join("\n")}INSERT INTO glossary_terms (id, term, slug, definition, status) VALUES\n${rows.join(",\n")};\n`;
}

function samePublishedFields(a, b) {
  return a.id === b.id &&
    a.slug === b.slug &&
    a.term === b.term &&
    a.definition === b.definition &&
    a.status === b.status;
}

assert(fs.existsSync(planPath), `No existe el plan: ${planPath}`);
assert(fs.existsSync(dbPath), `No existe SQLite: ${dbPath}`);

const plan = readJson(planPath);
assert(plan?.schemaVersion === 1, "bibli-images-glossary-plan.json: schemaVersion debe ser 1");
assert(Array.isArray(plan.entries), "bibli-images-glossary-plan.json: entries debe ser array");
const blocked = plan.entries.filter((entry) => entry.action === "blocked");
assert(blocked.length === 0, `El plan contiene ${blocked.length} entrada(s) blocked; resuélvelas antes de publicar`);

const manifest = readJson(manifestPath, { schemaVersion: 1, entries: {} });
validateManifest(manifest);

const planBySource = new Map(plan.entries.map((entry) => [entry.sourceSlug, entry]));
for (const [sourceSlug, published] of Object.entries(manifest.entries)) {
  const currentPlan = planBySource.get(sourceSlug);
  assert(currentPlan, `${sourceSlug}: publicado por BibliImg pero ya no aparece en el plan approved`);
  const currentCanonical = canonicalFromPlan(currentPlan);
  assert(samePublishedFields(published, currentCanonical),
    `${sourceSlug}: el paquete/plan cambió respecto de lo publicado; requiere revisión editorial explícita`);
}

const ready = plan.entries.filter((entry) => entry.action === "ready_to_create").map(canonicalFromPlan);
const desiredEntries = { ...manifest.entries };
const newEntries = [];
for (const candidate of ready) {
  const previous = desiredEntries[candidate.sourceSlug];
  if (previous) {
    assert(samePublishedFields(previous, candidate), `${candidate.sourceSlug}: difiere del término ya publicado`);
    continue;
  }
  desiredEntries[candidate.sourceSlug] = candidate;
  newEntries.push(candidate);
}

const desiredManifest = {
  schemaVersion: 1,
  entries: Object.fromEntries(Object.entries(desiredEntries).sort(([a], [b]) => a.localeCompare(b, "es"))),
};
validateManifest(desiredManifest);

const db = new Database(dbPath);
const allGlossary = db.prepare("SELECT id, term, slug, definition, status FROM glossary_terms ORDER BY slug").all();
const byId = new Map(allGlossary.map((row) => [row.id, row]));
const bySlug = new Map(allGlossary.map((row) => [row.slug, row]));
const byNormalizedTerm = new Map();
for (const row of allGlossary) {
  const key = normalizeIdentity(row.term);
  if (!byNormalizedTerm.has(key)) byNormalizedTerm.set(key, []);
  byNormalizedTerm.get(key).push(row);
}

function assertPublishedRowsMatch() {
  for (const entry of Object.values(manifest.entries)) {
    const row = bySlug.get(entry.slug);
    assert(row, `${entry.sourceSlug}: el manifest lo marca publicado pero falta glossary_terms.slug=${entry.slug}`);
    assert(row.id === entry.id && row.term === entry.term && row.definition === entry.definition && row.status === entry.status,
      `${entry.sourceSlug}: SQLite difiere del manifest publicado`);
  }
}

assertPublishedRowsMatch();

for (const candidate of newEntries) {
  const idCollision = byId.get(candidate.id);
  const slugCollision = bySlug.get(candidate.slug);
  const termCollisions = byNormalizedTerm.get(normalizeIdentity(candidate.term)) ?? [];
  assert(!idCollision, `${candidate.sourceSlug}: id ya existe en SQLite: ${candidate.id}`);
  assert(!slugCollision, `${candidate.sourceSlug}: slug ya existe en SQLite: ${candidate.slug}`);
  assert(termCollisions.length === 0,
    `${candidate.sourceSlug}: term colisiona en SQLite con ${termCollisions.map((row) => `${row.term} [${row.slug}]`).join(", ")}`);
}

const desiredSql = buildSql(desiredManifest);

if (options.mode === "preview") {
  db.close();
  console.log("BibliImg glossary publish preview: PASS");
  console.log(`Plan ready_to_create: ${ready.length}`);
  console.log(`Ya publicados por BibliImg: ${Object.keys(manifest.entries).length}`);
  console.log(`Nuevos a publicar: ${newEntries.length}`);
  if (newEntries.length) console.log(`  ${newEntries.map((entry) => entry.sourceSlug).join(", ")}`);
  console.log("SQLite editorial: sin modificaciones");
  process.exit(0);
}

if (options.mode === "check") {
  const currentSql = fs.existsSync(sqlPath) ? fs.readFileSync(sqlPath, "utf8") : "";
  const manifestSql = buildSql(manifest);
  assert(currentSql === manifestSql, "data/bibliimg-glossary.sql no coincide con el manifest publicado");
  db.close();
  console.log("BibliImg glossary publish check: PASS");
  console.log(`Publicados por BibliImg: ${Object.keys(manifest.entries).length}`);
  console.log(`Pendientes nuevos según plan: ${newEntries.length}`);
  console.log("Manifest, SQL canónico y SQLite: consistentes");
  process.exit(0);
}

const previousManifestExisted = fs.existsSync(manifestPath);
const previousSqlExisted = fs.existsSync(sqlPath);
const previousManifestText = previousManifestExisted ? fs.readFileSync(manifestPath, "utf8") : "";
const previousSqlText = previousSqlExisted ? fs.readFileSync(sqlPath, "utf8") : "";
const beforeCount = allGlossary.length;

const insert = db.prepare(`
  INSERT INTO glossary_terms (id, term, slug, definition, status)
  VALUES (@id, @term, @slug, @definition, @status)
`);

try {
  const publish = db.transaction(() => {
    for (const entry of newEntries) {
      insert.run({ id: entry.id, term: entry.term, slug: entry.slug, definition: entry.definition, status: entry.status });
    }
    writeText(manifestPath, stableJson(desiredManifest));
    writeText(sqlPath, desiredSql);
  });
  publish();
} catch (error) {
  try {
    restoreText(manifestPath, previousManifestExisted, previousManifestText);
    restoreText(sqlPath, previousSqlExisted, previousSqlText);
  } catch (restoreError) {
    console.error(`ADVERTENCIA: no se pudo restaurar un archivo canónico: ${restoreError.message}`);
  }
  db.close();
  throw error;
}

const afterCount = db.prepare("SELECT COUNT(*) AS n FROM glossary_terms").get().n;
db.close();

console.log("BibliImg glossary publish: PASS");
console.log(`Nuevos términos publicados: ${newEntries.length}`);
console.log(`Publicados por BibliImg acumulados: ${Object.keys(desiredManifest.entries).length}`);
console.log(`glossary_terms: ${beforeCount} -> ${afterCount}`);
console.log("Canónicos actualizados:");
console.log("  content/bibli-images-glossary-published.json");
console.log("  data/bibliimg-glossary.sql");
if (newEntries.length === 0) console.log("Sin cambios editoriales nuevos.");
