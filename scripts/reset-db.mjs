import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const rootDir = process.cwd();

const dbPath = path.join(rootDir, "data", "bibli.sqlite");
const schemaPath = path.join(rootDir, "data", "schema.sql");
const seedPath = path.join(rootDir, "data", "seed.sql");

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const schema = fs.readFileSync(schemaPath, "utf8");
const seed = fs.readFileSync(seedPath, "utf8");

const contentDir = path.join(process.cwd(), "data", "content");

const db = new Database(dbPath);

db.exec(schema);
db.exec(seed);

if (fs.existsSync(contentDir)) {
  const contentFiles = fs
    .readdirSync(contentDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of contentFiles) {
    const filePath = path.join(contentDir, file);
    const sql = fs.readFileSync(filePath, "utf8");

    console.log(`Ejecutando contenido: ${file}`);
    db.exec(sql);
  }
}

const routeCount = db.prepare("SELECT COUNT(*) AS count FROM routes").get();
const lessonCount = db.prepare("SELECT COUNT(*) AS count FROM lessons").get();
const bookCount = db.prepare("SELECT COUNT(*) AS count FROM books").get();
const passageCount = db.prepare("SELECT COUNT(*) AS count FROM passages").get();
const versionCount = db.prepare("SELECT COUNT(*) AS count FROM bible_versions").get();

db.close();

console.log("Base de datos creada correctamente.");
console.log(`Rutas: ${routeCount.count}`);
console.log(`Lecciones: ${lessonCount.count}`);
console.log(`Libros: ${bookCount.count}`);
console.log(`Versiones bíblicas: ${versionCount.count}`);
console.log(`Pasajes: ${passageCount.count}`);
console.log(`Archivo: ${dbPath}`);