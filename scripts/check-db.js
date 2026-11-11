import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { DB_DIR } from './db.js';

const db = new Database(':memory:');
db.exec(fs.readFileSync(path.join(DB_DIR, 'schema.sql'), 'utf-8'));
db.exec(fs.readFileSync(path.join(DB_DIR, 'accounts.sql'), 'utf-8'));
db.exec(fs.readFileSync(path.join(DB_DIR, 'seed.sql'), 'utf-8'));

const apt = (o = {}) => ({ address: 'тест', rooms: 1, area: 30, floor: 1, price_per_day: 500, status: 'available', ...o });
const addApt = db.prepare('INSERT INTO apartments (address,rooms,area,floor,price_per_day,status) VALUES (@address,@rooms,@area,@floor,@price_per_day,@status)');
const addCl = db.prepare('INSERT INTO clients (full_name,phone,email,passport) VALUES (@full_name,@phone,@email,@passport)');
const cl = (o = {}) => ({ full_name: 'Тест', phone: '1', email: null, passport: null, ...o });

let failed = 0;
const ok = (name, cond) => { console.log(`${cond ? '✓' : '✗'} ${name}`); if (!cond) failed++; };
const rejects = (fn) => { try { fn(); return false; } catch { return true; } };

ok('додавання коректної квартири', !rejects(() => addApt.run(apt())));
ok('дубль адреси відхиляється', rejects(() => addApt.run(apt())));
ok('кімнат = 0 відхиляється', rejects(() => addApt.run(apt({ address: 'a1', rooms: 0 }))));
ok('площа ≤ 0 відхиляється', rejects(() => addApt.run(apt({ address: 'a2', area: 0 }))));
ok('ціна ≤ 0 відхиляється', rejects(() => addApt.run(apt({ address: 'a3', price_per_day: -5 }))));
ok('невідомий статус відхиляється', rejects(() => addApt.run(apt({ address: 'a4', status: 'busy' }))));
ok('додавання клієнта без паспорта', !rejects(() => addCl.run(cl())));
ok('кілька клієнтів без паспорта дозволено', !rejects(() => addCl.run(cl({ full_name: 'Інший' }))));
ok('дубль паспорта відхиляється', rejects(() => addCl.run(cl({ passport: 'AA123456' }))));
ok('порожнє ім\'я відхиляється', rejects(() => addCl.run(cl({ full_name: null }))));
ok('дата додавання проставляється автоматично', /^\d{4}-\d{2}-\d{2}$/.test(db.prepare('SELECT created_at c FROM clients WHERE id=1').get().c));

console.log(failed ? `\nПровалено: ${failed}` : '\nВсі перевірки пройдено');
process.exit(failed ? 1 : 0);
