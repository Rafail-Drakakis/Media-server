import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/index.js';
import { config } from '../config.js';

const router = Router();

const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;

function slugifyUsername(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_|_$/g, '');
}

function normalizeUsername(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (USERNAME_RE.test(trimmed)) return trimmed.toLowerCase();
  return slugifyUsername(trimmed);
}

function findUserByLogin(login) {
  const trimmed = String(login || '').trim();
  if (!trimmed) return null;

  const byEmail = db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(trimmed);
  if (byEmail) return byEmail;

  const username = normalizeUsername(trimmed);
  if (!username) return null;

  return db.prepare('SELECT * FROM users WHERE lower(username) = lower(?)').get(username);
}

function usernameTaken(username, excludeUserId = null) {
  const row = db.prepare('SELECT id FROM users WHERE lower(username) = lower(?)').get(username);
  if (!row) return false;
  return excludeUserId == null || row.id !== excludeUserId;
}

router.post('/register', (req, res) => {
  const { email, password, displayName, username: rawUsername } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (userCount > 0 && !config.allowRegistration) {
    return res.status(403).json({ error: 'Registration is disabled' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const username =
    normalizeUsername(rawUsername) ||
    normalizeUsername(displayName) ||
    normalizeUsername(email.split('@')[0]);

  if (!username || !USERNAME_RE.test(username)) {
    return res.status(400).json({
      error: 'Username must be 3–32 characters (letters, numbers, underscore)',
    });
  }

  if (usernameTaken(username)) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  const resolvedDisplayName = displayName || username;
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (email, username, password_hash, display_name) VALUES (?, ?, ?, ?)',
  ).run(email, username, hash, resolvedDisplayName);

  const token = jwt.sign(
    { userId: result.lastInsertRowid, email },
    config.jwtSecret,
    { expiresIn: '30d' },
  );

  res.status(201).json({
    token,
    user: {
      id: result.lastInsertRowid,
      email,
      username,
      displayName: resolvedDisplayName,
    },
  });
});

router.post('/login', (req, res) => {
  const { login, email, password } = req.body;
  const identifier = login ?? email;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Email or username and password are required' });
  }

  const user = findUserByLogin(identifier);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email, username, or password' });
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: '30d' },
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
    },
  });
});

router.get('/me', (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret);
    const user = db
      .prepare('SELECT id, email, username, display_name FROM users WHERE id = ?')
      .get(payload.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
    });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
