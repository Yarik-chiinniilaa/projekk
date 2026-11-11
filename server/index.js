import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { DB_DIR, DB_FILE, open } from '../scripts/db.js';
import { clearSession, hashPassword, sessionUserId, setSession, verifyPassword } from './auth.js';
import { ENTITIES, constraintMessage, parseBody, publicMeta } from './entities.js';

const PORT = Number(process.env.PORT) || 3001;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UPLOADS = process.env.UPLOADS_DIR || path.join(root, 'uploads');
fs.mkdirSync(UPLOADS, { recursive: true });

function imageExt(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}
function removePhotoFile(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  fs.rm(path.join(UPLOADS, path.basename(url)), { force: true }, () => {});
}

const MAX_PHOTOS = 12;
let db;

function photosFor(ids) {
  const map = new Map(ids.map((i) => [i, []]));
  if (!ids.length) return map;
  const rows = db
    .prepare(`SELECT id, apartment_id, url FROM apartment_photos WHERE apartment_id IN (${ids.map(() => '?').join(',')}) ORDER BY position, id`)
    .all(...ids);
  for (const r of rows) map.get(r.apartment_id).push({ id: r.id, url: r.url });
  return map;
}

function ensureDb() {
  const fresh = !fs.existsSync(DB_FILE);
  fs.mkdirSync(DB_DIR, { recursive: true });
  const db = open();
  try {
    if (fresh) {
      db.exec(fs.readFileSync(path.join(DB_DIR, 'schema.sql'), 'utf-8'));
      const seed = path.join(DB_DIR, 'seed.sql');
      if (fs.existsSync(seed)) db.exec(fs.readFileSync(seed, 'utf-8'));
      console.log(`Базу даних створено: ${DB_FILE}`);
    }
    db.exec(fs.readFileSync(path.join(DB_DIR, 'accounts.sql'), 'utf-8'));
    if (db.prepare('PRAGMA table_info(apartments)').all().some((c) => c.name === 'photo')) {
      db.exec(`INSERT INTO apartment_photos (apartment_id, url)
               SELECT id, photo FROM apartments WHERE photo IS NOT NULL AND photo <> ''`);
      try {
        db.exec('ALTER TABLE apartments DROP COLUMN photo');
      } catch {
        db.exec('UPDATE apartments SET photo = NULL');
      }
    }

    if (!db.prepare("SELECT 1 FROM users WHERE role = 'manager'").get()) {
      const email = process.env.MANAGER_EMAIL || 'manager@rental.ua';
      const password = process.env.MANAGER_PASSWORD || 'manager123';
      db.prepare("INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, 'manager')")
        .run('Менеджер', email, '-', hashPassword(password));
      console.log(`Створено менеджера: ${email} / ${password}`);
    }
  } finally {
    db.close();
  }
}

ensureDb();
db = open();

const app = express();
app.use(express.json({ limit: '100kb' }));
app.use('/uploads', express.static(UPLOADS, { index: false, dotfiles: 'deny', setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff') }));

const publicUser = (u) => u && { id: u.id, full_name: u.full_name, email: u.email, phone: u.phone, role: u.role, created_at: u.created_at };

function httpError(res, err) {
  if (err.code && String(err.code).startsWith('SQLITE')) {
    return res.status(400).json({ error: constraintMessage(err) });
  }
  return res.status(400).json({ error: err.message || 'Помилка запиту' });
}

app.use((req, _res, next) => {
  const id = sessionUserId(req);
  req.user = id ? db.prepare('SELECT * FROM users WHERE id = ?').get(id) : null;
  next();
});

const requireRole = (role) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Увійдіть в обліковий запис' });
  if (req.user.role !== role) return res.status(403).json({ error: 'Недостатньо прав' });
  next();
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cityOf = (address) => String(address).split(',').pop().trim();

const failures = new Map();
const WINDOW = 15 * 60 * 1000;
function tooManyAttempts(key) {
  const now = Date.now();
  const list = (failures.get(key) || []).filter((t) => now - t < WINDOW);
  failures.set(key, list);
  return list.length >= 10;
}

app.post('/api/auth/register', (req, res) => {
  const { full_name, email, phone, password } = req.body || {};
  const name = String(full_name || '').trim();
  const mail = String(email || '').trim().toLowerCase();
  const tel = String(phone || '').trim();
  if (!name) return res.status(400).json({ error: 'Вкажіть ПІБ' });
  if (!EMAIL_RE.test(mail)) return res.status(400).json({ error: 'Вкажіть коректний email' });
  if (!tel) return res.status(400).json({ error: 'Вкажіть телефон' });
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Пароль має містити щонайменше 8 символів' });
  }
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(mail)) {
    return res.status(400).json({ error: 'Користувач з таким email вже існує' });
  }
  const info = db
    .prepare("INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, 'client')")
    .run(name, mail, tel, hashPassword(password));
  setSession(res, info.lastInsertRowid);
  res.status(201).json(publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid)));
});

app.post('/api/auth/login', (req, res) => {
  const { email, password, area } = req.body || {};
  const mail = String(email || '').trim().toLowerCase();
  const key = `${req.ip}|${mail}`;
  if (tooManyAttempts(key)) {
    return res.status(429).json({ error: 'Забагато спроб входу. Спробуйте за 15 хвилин' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(mail);
  if (!user || typeof password !== 'string' || !verifyPassword(password, user.password_hash)) {
    failures.get(key).push(Date.now());
    return res.status(401).json({ error: 'Неправильний email або пароль' });
  }
  if (area === 'manager' && user.role !== 'manager') {
    return res.status(403).json({ error: 'Цей вхід лише для менеджерів' });
  }
  if (area === 'client' && user.role !== 'client') {
    return res.status(403).json({ error: 'Менеджери входять через сторінку /manager/login' });
  }
  failures.delete(key);
  setSession(res, user.id);
  res.json(publicUser(user));
});

app.post('/api/auth/password', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Увійдіть в обліковий запис' });
  const { current, next } = req.body || {};
  const key = `pw|${req.user.id}`;
  if (tooManyAttempts(key)) return res.status(429).json({ error: 'Забагато спроб. Спробуйте за 15 хвилин' });
  if (typeof current !== 'string' || !verifyPassword(current, req.user.password_hash)) {
    failures.get(key).push(Date.now());
    return res.status(400).json({ error: 'Поточний пароль неправильний' });
  }
  if (typeof next !== 'string' || next.length < 8) {
    return res.status(400).json({ error: 'Новий пароль має містити щонайменше 8 символів' });
  }
  if (next === current) return res.status(400).json({ error: 'Новий пароль має відрізнятися від поточного' });
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(next), req.user.id);
  failures.delete(key);
  res.status(204).end();
});

app.post('/api/auth/logout', (_req, res) => {
  clearSession(res);
  res.status(204).end();
});

app.get('/api/auth/me', (req, res) => {
  res.json(publicUser(req.user));
});

app.get('/api/catalog/cities', (_req, res) => {
  const rows = db.prepare("SELECT address FROM apartments WHERE status = 'available'").all();
  res.json([...new Set(rows.map((r) => cityOf(r.address)))].sort((a, b) => a.localeCompare(b, 'uk')));
});

app.get('/api/catalog', (req, res) => {
  const { city, q, rooms, min_price, max_price } = req.query;
  const where = ["a.status = 'available'"];
  const params = {};

  if (rooms === '1' || rooms === '2') {
    where.push('a.rooms = @rooms');
    params.rooms = Number(rooms);
  } else if (rooms === '3') {
    where.push('a.rooms >= 3');
  }
  if (min_price) {
    const n = Number(min_price);
    if (!Number.isFinite(n)) return res.status(400).json({ error: 'Некоректна мінімальна ціна' });
    where.push('a.price_per_day >= @min_price');
    params.min_price = n;
  }
  if (max_price) {
    const n = Number(max_price);
    if (!Number.isFinite(n)) return res.status(400).json({ error: 'Некоректна максимальна ціна' });
    where.push('a.price_per_day <= @max_price');
    params.max_price = n;
  }

  const needle = String(q || '').trim().toLowerCase();
  const rows = db
    .prepare(`SELECT a.* FROM apartments a WHERE ${where.join(' AND ')} ORDER BY a.id`)
    .all(params)
    .map((a) => ({ ...a, city: cityOf(a.address) }))
    .filter((a) => !city || a.city === city)
    .filter((a) => !needle || `${a.address} ${a.description || ''}`.toLowerCase().includes(needle));
  const photos = photosFor(rows.map((a) => a.id));
  res.json(rows.map((a) => ({ ...a, photos: photos.get(a.id).map((p) => p.url), photo: photos.get(a.id)[0]?.url ?? null })));
});

const manager = express.Router();
manager.use(requireRole('manager'));

function entityOr404(req, res) {
  const entity = ENTITIES[req.params.entity];
  if (!entity) {
    res.status(404).json({ error: 'Невідома сутність' });
    return null;
  }
  return entity;
}

manager.get('/meta', (_req, res) => res.json(publicMeta()));

manager.get('/apartments/:id/photos', (req, res) => {
  const id = Number(req.params.id);
  res.json(photosFor([id]).get(id));
});

manager.post('/apartments/:id/photos', express.raw({ type: () => true, limit: '5mb' }), (req, res) => {
  const apt = db.prepare('SELECT id FROM apartments WHERE id = ?').get(req.params.id);
  if (!apt) return res.status(404).json({ error: 'Квартиру не знайдено' });
  const buf = req.body;
  const ext = Buffer.isBuffer(buf) ? imageExt(buf) : null;
  if (!ext) return res.status(400).json({ error: 'Потрібне зображення у форматі JPG, PNG або WebP (до 5 МБ)' });
  const { n, next } = db.prepare('SELECT COUNT(*) AS n, COALESCE(MAX(position), 0) + 1 AS next FROM apartment_photos WHERE apartment_id = ?').get(apt.id);
  if (n >= MAX_PHOTOS) return res.status(400).json({ error: `Не більше ${MAX_PHOTOS} фото для однієї квартири` });
  const name = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(UPLOADS, name), buf);
  db.prepare('INSERT INTO apartment_photos (apartment_id, url, position) VALUES (?, ?, ?)').run(apt.id, `/uploads/${name}`, next);
  res.status(201).json(photosFor([apt.id]).get(apt.id));
});

manager.delete('/photos/:photoId', (req, res) => {
  const photo = db.prepare('SELECT * FROM apartment_photos WHERE id = ?').get(req.params.photoId);
  if (!photo) return res.status(404).json({ error: 'Фото не знайдено' });
  db.prepare('DELETE FROM apartment_photos WHERE id = ?').run(photo.id);
  removePhotoFile(photo.url);
  res.json(photosFor([photo.apartment_id]).get(photo.apartment_id));
});

manager.post('/photos/:photoId/cover', (req, res) => {
  const photo = db.prepare('SELECT * FROM apartment_photos WHERE id = ?').get(req.params.photoId);
  if (!photo) return res.status(404).json({ error: 'Фото не знайдено' });
  db.prepare('UPDATE apartment_photos SET position = (SELECT MIN(position) FROM apartment_photos WHERE apartment_id = ?) - 1 WHERE id = ?')
    .run(photo.apartment_id, photo.id);
  res.json(photosFor([photo.apartment_id]).get(photo.apartment_id));
});

manager.get('/:entity', (req, res) => {
  const entity = entityOr404(req, res);
  if (!entity) return;
  const rows = db.prepare(`SELECT * FROM ${entity.table} ORDER BY id`).all();
  if (!entity.photo) return res.json(rows);
  const photos = photosFor(rows.map((r) => r.id));
  res.json(rows.map((r) => ({ ...r, photo: photos.get(r.id)[0]?.url ?? null, photo_count: photos.get(r.id).length })));
});

manager.get('/:entity/:id', (req, res) => {
  const entity = entityOr404(req, res);
  if (!entity) return;
  const row = db.prepare(`SELECT * FROM ${entity.table} WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Запис не знайдено' });
  res.json(row);
});

manager.post('/:entity', (req, res) => {
  const entity = entityOr404(req, res);
  if (!entity) return;
  try {
    const row = parseBody(entity, req.body);
    const cols = entity.fields.filter((f) => !(f.name === 'created_at' && row[f.name] == null)).map((f) => f.name);
    const placeholders = cols.map((c) => `@${c}`).join(', ');
    const info = db.prepare(`INSERT INTO ${entity.table} (${cols.join(', ')}) VALUES (${placeholders})`).run(row);
    res.status(201).json(db.prepare(`SELECT * FROM ${entity.table} WHERE id = ?`).get(info.lastInsertRowid));
  } catch (err) {
    httpError(res, err);
  }
});

manager.put('/:entity/:id', (req, res) => {
  const entity = entityOr404(req, res);
  if (!entity) return;
  const existing = db.prepare(`SELECT id FROM ${entity.table} WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Запис не знайдено' });
  try {
    const row = parseBody(entity, req.body);
    const cols = entity.fields
      .filter((f) => !(f.name === 'created_at' && row[f.name] == null))
      .map((f) => `${f.name} = @${f.name}`);
    db.prepare(`UPDATE ${entity.table} SET ${cols.join(', ')} WHERE id = @id`).run({ ...row, id: Number(req.params.id) });
    res.json(db.prepare(`SELECT * FROM ${entity.table} WHERE id = ?`).get(req.params.id));
  } catch (err) {
    httpError(res, err);
  }
});

manager.delete('/:entity/:id', (req, res) => {
  const entity = entityOr404(req, res);
  if (!entity) return;
  try {
    const old = entity.photo ? db.prepare('SELECT url FROM apartment_photos WHERE apartment_id = ?').all(req.params.id) : [];
    const info = db.prepare(`DELETE FROM ${entity.table} WHERE id = ?`).run(req.params.id);
    if (!info.changes) return res.status(404).json({ error: 'Запис не знайдено' });
    old.forEach((p) => removePhotoFile(p.url));
    res.status(204).end();
  } catch (err) {
    httpError(res, err);
  }
});

app.use('/api/manager', manager);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Не знайдено' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Внутрішня помилка сервера' });
});

const clientDist = path.join(root, 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`API: http://localhost:${PORT}/api`);
  console.log(`БД:  ${DB_FILE}`);
});
