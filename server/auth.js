import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DB_DIR } from '../scripts/db.js';

const COOKIE = 'session';
const TTL = 7 * 24 * 3600;

function loadSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const file = path.join(DB_DIR, '.session-secret');
  try {
    return fs.readFileSync(file, 'utf-8').trim();
  } catch {
    const secret = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(DB_DIR, { recursive: true });
    fs.writeFileSync(file, secret, { mode: 0o600 });
    return secret;
  }
}
const SECRET = loadSecret();

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password, stored) {
  const [alg, salt, hash] = String(stored).split('$');
  if (alg !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(salt, 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

const mac = (body) => crypto.createHmac('sha256', SECRET).update(body).digest('base64url');

function makeToken(uid) {
  const body = Buffer.from(JSON.stringify({ uid, exp: Math.floor(Date.now() / 1000) + TTL })).toString('base64url');
  return `${body}.${mac(body)}`;
}

function readToken(token) {
  const [body, sig] = String(token).split('.');
  if (!body || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(mac(body));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    return payload.exp > Date.now() / 1000 ? payload.uid : null;
  } catch {
    return null;
  }
}

function cookieOf(req) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === COOKIE) return part.slice(i + 1).trim();
  }
  return null;
}

const flags = `HttpOnly; SameSite=Lax; Path=/${process.env.COOKIE_SECURE === '1' ? '; Secure' : ''}`;

export function setSession(res, userId) {
  res.setHeader('Set-Cookie', `${COOKIE}=${makeToken(userId)}; ${flags}; Max-Age=${TTL}`);
}

export function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; ${flags}; Max-Age=0`);
}

export function sessionUserId(req) {
  const token = cookieOf(req);
  return token ? readToken(token) : null;
}
