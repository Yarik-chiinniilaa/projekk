import { open } from './db.js';

const db = open();
for (const t of ['apartments', 'clients']) {
  console.log(`\n=== ${t} ===`);
  console.table(db.prepare(`SELECT * FROM ${t} ORDER BY id`).all());
}
db.close();
