import { randomBytes, scrypt as derive, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(derive);
export const digest = value => createHash('sha256').update(value).digest('hex');
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return 'scrypt$' + salt + '$' + key.toString('hex');
}
export async function verifyPassword(password, stored) {
  const [, salt, hash] = /^scrypt\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(stored || '') || [];
  if (!salt) return false;
  const derived = await scrypt(password, salt, 64);
  return timingSafeEqual(derived, Buffer.from(hash, 'hex'));
}
export function sessionToken(request) {
  return /(?:^|;\s*)ftap_session=([a-f0-9]{64})(?:;|$)/.exec(request.headers.get('cookie') || '')?.[1] || '';
}
export function newSession(store, now) {
  const token = randomBytes(32).toString('hex'), csrf = randomBytes(32).toString('hex');
  const expires = now + 12 * 3600000;
  store.db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(digest(token), csrf, expires);
  return { token, csrf, expires };
}
