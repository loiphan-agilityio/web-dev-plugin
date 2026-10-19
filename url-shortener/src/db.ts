import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// shortcut: node:sqlite is synchronous and blocks the event loop on every query; fine for small traffic, move to Postgres or an async driver when it grows.
export function openDb(path: string): DatabaseSync {
  const db = new DatabaseSync(path);
  // Old links.ownerId values are api_keys ids; reading them as user ids would hand links to the wrong user.
  if (db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'api_keys'").get()) {
    throw new Error(`${path} uses the old API-key schema; delete it and start again`);
  }
  db.exec(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    passwordHash TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS sessions (
    hash TEXT PRIMARY KEY,
    userId INTEGER NOT NULL REFERENCES users(id),
    createdAt TEXT NOT NULL,
    expiresAt TEXT NOT NULL
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS links (
    code TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    clicks INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    expiresAt TEXT,
    ownerId INTEGER REFERENCES users(id)
  )`);
  // Databases from before accounts lack ownerId; their links (ownerId NULL) still redirect but no user can manage them.
  const columns = db.prepare('PRAGMA table_info(links)').all() as { name: string }[];
  if (!columns.some((c) => c.name === 'ownerId')) db.exec('ALTER TABLE links ADD COLUMN ownerId INTEGER REFERENCES users(id)');
  db.exec('CREATE INDEX IF NOT EXISTS links_owner ON links (ownerId)');
  return db;
}

// Session tokens are 256 random bits, so a fast unsalted hash is safe and lets us look them up by index.
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

// Async scrypt runs on the libuv thread pool instead of blocking the event loop.
const scryptAsync = (password: string, salt: Buffer) =>
  new Promise<Buffer>((resolve, reject) => scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key))));

/** Stored as "salt:hash" in hex. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return `${salt.toString('hex')}:${(await scryptAsync(password, salt)).toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  return timingSafeEqual(await scryptAsync(password, Buffer.from(salt, 'hex')), Buffer.from(hash, 'hex'));
}

/** Returns the plaintext token; only its hash is stored, so this is the one chance to see it. */
export function createSession(db: DatabaseSync, userId: number) {
  const token = randomBytes(32).toString('base64url');
  const now = Date.now();
  const expiresAt = new Date(now + SESSION_TTL_MS).toISOString();
  db.prepare('INSERT INTO sessions (hash, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)')
    .run(hashToken(token), userId, new Date(now).toISOString(), expiresAt);
  return { token, expiresAt };
}
