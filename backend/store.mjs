import {mkdirSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {DatabaseSync} from "node:sqlite";

const defaultPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "data", "stats.db");
const dbPath = process.env.DATA_PATH ?? defaultPath;

mkdirSync(path.dirname(dbPath), {recursive: true});

const db = new DatabaseSync(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS counters (
    key TEXT PRIMARY KEY,
    value INTEGER NOT NULL
  ) STRICT;
  INSERT OR IGNORE INTO counters (key, value) VALUES ('filesProcessed', 0);
`);

const getStmt = db.prepare("SELECT value FROM counters WHERE key = 'filesProcessed'");
const incStmt = db.prepare(
  "UPDATE counters SET value = value + 1 WHERE key = 'filesProcessed' RETURNING value",
);

export function getCount() {
  return getStmt.get().value;
}

export function increment() {
  return incStmt.get().value;
}

export function close() {
  db.close();
}
