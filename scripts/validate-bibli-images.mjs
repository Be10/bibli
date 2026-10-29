import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import Database from "better-sqlite3";

const root = process.cwd();
const registryPath = path.join(root, "content", "bibli-images-integrated.json");
const dbPath = path.join(root, "data", "bibli.sqlite");
const mappingPath = path.join(root, "content", "bibli-images-integration-map.json");

function fail(message) {
  console.error(`BibliImg integration: FAIL\n- ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

assert(fs.existsSync(registryPath), "Falta content/bibli-images-integrated.json");
assert(fs.existsSync(dbPath), "Falta data/bibli.sqlite");
assert(fs.existsSync(mappingPath), "Falta content/bibli-images-integration-map.json");

const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const mapping = JSON.parse(fs.readFileSync(mappingPath, "utf8"));
assert(registry.schemaVersion === 1, `schemaVersion no soportado: ${registry.schemaVersion}`);
assert(registry.entries && typeof registry.entries === "object", "entries debe ser un objeto");
assert(mapping.schemaVersion === 1, "bibli-images-integration-map.json: schemaVersion inválido");
assert(mapping.overrides && typeof mapping.overrides === "object", "bibli-images-integration-map.json: overrides inválido");

const db = new Database(dbPath, { readonly: true });
const glossaryLookup = db.prepare("SELECT id, slug, status FROM glossary_terms WHERE slug = ?");
const seenEntityKeys = new Set();
const seenGlossarySlugs = new Set();
let integratedCount = 0;
let mediaBytes = 0;

for (const [key, entry] of Object.entries(registry.entries)) {
  assert(entry.glossarySlug === key, `${key}: la clave debe coincidir con glossarySlug`);
  assert(entry.sourceStatus === "approved", `${key}: solo se integran paquetes approved`);
  assert(entry.integrationStatus === "pilot" || entry.integrationStatus === "integrated", `${key}: integrationStatus inválido`);
  assert(!seenEntityKeys.has(entry.entityKey), `${key}: entityKey duplicado ${entry.entityKey}`);
  assert(!seenGlossarySlugs.has(entry.glossarySlug), `${key}: glossarySlug duplicado`);
  seenEntityKeys.add(entry.entityKey);
  seenGlossarySlugs.add(entry.glossarySlug);

  const requiredLocales = entry.localization?.required_locales ?? [];
  for (const locale of ["es-419", "en-US"]) {
    assert(requiredLocales.includes(locale), `${key}: falta locale obligatorio ${locale}`);
    const localized = entry.locales?.[locale];
    assert(localized, `${key}: falta contenido ${locale}`);
    for (const field of ["display_name", "definition", "alt_text"]) {
      assert(typeof localized[field] === "string" && localized[field].trim(), `${key}: ${locale}.${field} vacío`);
    }
  }

  const glossary = glossaryLookup.get(entry.glossarySlug);
  assert(glossary, `${key}: no existe glossary_terms.slug=${entry.glossarySlug}`);
  assert(glossary.status !== "Borrador", `${key}: el término de glosario está en Borrador`);

  assert(typeof entry.visual?.hasAlpha === "boolean", `${key}: visual.hasAlpha debe ser boolean`);
  assert(entry.visual?.version >= 1, `${key}: visual.version inválido`);
  for (const tier of ["optimized", "high"]) {
    const urlPath = entry.visual?.[`${tier}Path`];
    const expectedChecksum = entry.visual?.[`${tier}Checksum`];
    assert(typeof urlPath === "string" && urlPath.startsWith("/media/"), `${key}: ${tier}Path inválido`);
    assert(urlPath.endsWith(".webp"), `${key}: ${tier} debe ser WebP en el piloto`);
    const filePath = path.join(root, "public", urlPath.replace(/^\//, ""));
    assert(fs.existsSync(filePath), `${key}: falta ${urlPath}`);
    const actualChecksum = sha256(filePath);
    assert(actualChecksum === expectedChecksum, `${key}: checksum ${tier} no coincide`);
    mediaBytes += fs.statSync(filePath).size;
  }

  assert(Array.isArray(entry.biblicalReferences?.primary?.["es-419"]), `${key}: faltan referencias principales es-419`);
  assert(Array.isArray(entry.biblicalReferences?.primary?.["en-US"]), `${key}: faltan referencias principales en-US`);
  assert(
    entry.biblicalReferences.primary["es-419"].length === entry.biblicalReferences.primary["en-US"].length,
    `${key}: las referencias principales no tienen paridad entre locales`
  );
  assert(Array.isArray(entry.biblicalReferences?.additional?.["es-419"]), `${key}: faltan referencias adicionales es-419`);
  assert(Array.isArray(entry.biblicalReferences?.additional?.["en-US"]), `${key}: faltan referencias adicionales en-US`);
  assert(
    entry.biblicalReferences.additional["es-419"].length === entry.biblicalReferences.additional["en-US"].length,
    `${key}: las referencias adicionales no tienen paridad entre locales`
  );
  assert(typeof entry.sourcePath === "string" && entry.sourcePath.endsWith("/entry.yaml"), `${key}: sourcePath inválido`);

  integratedCount += 1;
}

db.close();

console.log("BibliImg integration: PASS");
console.log(`Entradas integradas: ${integratedCount}`);
console.log(`Locales requeridos: es-419 + en-US`);
console.log(`Derivados web verificados: ${integratedCount * 2} · ${(mediaBytes / 1024).toFixed(0)} KB totales`);
console.log("Masters editoriales: permanecen fuera del repositorio Bibli");
