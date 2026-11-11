import fs from 'node:fs';
import path from 'node:path';
import { DB_DIR, DB_FILE, open } from './db.js';

const read = (n) => fs.readFileSync(path.join(DB_DIR, n), 'utf-8');
const db = open();
try {
  db.exec(read('schema.sql'));
  db.exec(read('accounts.sql'));
  if (!process.argv.includes('--no-seed')) db.exec(read('seed.sql'));
  console.log(`Базу даних створено: ${DB_FILE}`);
} finally {
  db.close();
}
