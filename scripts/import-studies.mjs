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
  console.log(`Objetivos educativos: ${result.learningObjectives}`);
  console.log(`Vínculos de glosario contextual: ${result.learningGlossaryLinks}`);
  console.log(`Microcomprobaciones: ${result.learningMicrochecks}`);
  console.log(`Alternativas de microcomprobación: ${result.learningMicrocheckOptions}`);
  console.log(`Vínculos de evidencia de microcomprobación: ${result.learningMicrocheckEvidenceLinks}`);
  console.log(`Localizaciones de evidencia: ${result.learningMicrocheckEvidenceLocalizations}`);
  console.log(`Bloques interactivos: ${result.learningInteractiveBlocks}`);
  console.log(`Localizaciones de bloques interactivos: ${result.learningInteractiveLocalizations}`);
  console.log(`Items interactivos: ${result.learningInteractiveItems}`);
} finally {
  db.close();
}
