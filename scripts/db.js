import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DB_DIR = path.join(root, 'database');
export const DB_FILE = process.env.DB_FILE || path.join(DB_DIR, 'rental.db');

export function open(file = DB_FILE) {
  const db = new Database(file);
  db.pragma('foreign_keys = ON');
  return db;
}
