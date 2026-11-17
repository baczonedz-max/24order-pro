// Passwords: PBKDF2-SHA256. Sessions: random token in an HttpOnly cookie, stored hashed.
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';

const ITERATIONS = 100_000;
const COOKIE = 'sid';
const SESSION_DAYS = 30;

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const unhex = (s) => new Uint8Array(s.match(/../g).map((h) => parseInt(h, 16)));

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, key, 256);
  return `pbkdf2$${ITERATIONS}$${hex(salt)}$${hex(bits)}`;
}

export async function verifyPassword(password, stored) {
  const [, iter, saltHex, hashHex] = String(stored).split('$');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(saltHex), iterations: Number(iter) }, key, 256);
  const a = new Uint8Array(bits);
  const b = unhex(hashHex);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

const sha256 = async (s) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));

export async function startSession(c, userId) {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  await c.env.DB.prepare(`INSERT INTO sessions(token_hash, user_id, expires_at) VALUES (?, ?, ?)`)
    .bind(await sha256(token), userId, expires.toISOString()).run();
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    sameSite: 'Lax',
    path: '/',
    expires,
  });
}

export async function endSession(c) {
  const token = getCookie(c, COOKIE);
  if (token) await c.env.DB.prepare(`DELETE FROM sessions WHERE token_hash = ?`).bind(await sha256(token)).run();
  deleteCookie(c, COOKIE, { path: '/' });
}

export async function currentUser(c) {
  const token = getCookie(c, COOKIE);
  if (!token) return null;
  return c.env.DB.prepare(
    `SELECT u.id, u.name, u.email, u.role FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1`,
  ).bind(await sha256(token), new Date().toISOString()).first();
}

/** Hono middleware: 401 unless signed in. */
export const requireUser = async (c, next) => {
  const user = await currentUser(c);
  if (!user) return c.json({ success: false, message: 'Unauthorized' }, 401);
  c.set('user', user);
  await next();
};
