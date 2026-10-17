import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { indexStudies } from "./study-indexer.mjs";

const rootDir = process.cwd();
const dbPath = path.join(rootDir, "data", "bibli.sqlite");
const schemaPath = path.join(rootDir, "data", "schema.sql");
const seedPath = path.join(rootDir, "data", "seed.sql");
const editorialPath = path.join(rootDir, "data", "editorial.sql");

if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

try {
  db.exec(fs.readFileSync(schemaPath, "utf8"));
  db.exec(fs.readFileSync(seedPath, "utf8"));
  db.exec(fs.readFileSync(editorialPath, "utf8"));

  const studies = indexStudies(db, { rootDir });

  const counts = Object.fromEntries(
    ["books", "routes", "route_modules", "study_lessons", "topics", "events", "people", "places", "glossary_terms"]
      .map((table) => [table, db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count])
  );

  console.log("Base editorial creada correctamente.");
  console.log(`Libros: ${counts.books}`);
  console.log(`Rutas: ${counts.routes}`);
  console.log(`Módulos: ${counts.route_modules}`);
  console.log(`Lecciones canónicas: ${counts.study_lessons}`);
  console.log(`Temas: ${counts.topics}`);
  console.log(`Eventos: ${counts.events}`);
  console.log(`Personajes: ${counts.people}`);
  console.log(`Lugares: ${counts.places}`);
  console.log(`Glosario: ${counts.glossary_terms}`);
  console.log(`Indexación: ${studies.lessons} lecciones.`);
  console.log("IMPORTANTE: después de db:reset debes volver a importar RVR1960 y KJV.");
  console.log(`Archivo: ${dbPath}`);
} finally {
  db.close();
}
