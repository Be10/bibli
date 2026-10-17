import Database from "better-sqlite3";
import path from "node:path";

const dbPath = path.join(process.cwd(), "data", "bibli.sqlite");

export const db = new Database(dbPath, {
  readonly: true,
  fileMustExist: true,
});

db.pragma("foreign_keys = ON");
