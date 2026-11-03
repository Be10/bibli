import path from "node:path";
import Database from "better-sqlite3";
import { indexStudies } from "./study-indexer.mjs";

const rootDir = process.cwd();
const dbPath = path.join(rootDir, "data", "bibli.sqlite");
const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

try {
  const result = indexStudies(db, { rootDir });
  console.log("Indexación de estudios: PASS");
  console.log(`Lecciones canónicas: ${result.lessons}`);
  console.log(`Rutas: ${result.routes}`);
  console.log(`Módulos: ${result.modules}`);
  console.log(`Modelos educativos: ${result.learningModels}`);
  console.log(`Bloques educativos: ${result.learningBlocks}`);
} finally {
  db.close();
}
