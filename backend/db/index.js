/**
 * Database connection.
 *
 * SQLite via better-sqlite3, chosen because its API is synchronous: every
 * accessor in store.js keeps the exact signature it had when the data lived in
 * in-memory Maps, so no route handler and nothing in the frontend had to change.
 *
 * Set DB_PATH to point somewhere else, or to ':memory:' for a throwaway
 * database (used by the smoke test).
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DEFAULT_PATH = path.join(__dirname, '..', 'data', 'smartmess.db');
const dbPath = process.env.DB_PATH || DEFAULT_PATH;

if (dbPath !== ':memory:') {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const db = new Database(dbPath);

// WAL lets the dashboard keep reading while a student saves an intent.
if (dbPath !== ':memory:') db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// The schema is all CREATE ... IF NOT EXISTS, so applying it on every boot is
// both the first-run setup and a no-op for an existing database.
db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

module.exports = { db, dbPath };
