import { Router } from 'express';
import bcrypt from 'bcrypt';
import db from '../lib/db.js';
import { signToken, setAuthCookie, clearAuthCookie } from '../middleware/auth.js';

const router = Router();

const getUserByEmailStmt = db.prepare('SELECT id, email, password_hash, created_at FROM users WHERE lower(email) = lower(?)');
const getUserByIdStmt = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?');
const insertUserStmt = db.prepare('INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)');

function validateEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}

function validatePassword(password) {
  if (typeof password !== 'string') return false;
  if (password.length < 8) return false;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  return hasLetter && hasNumber;
}

router.post('/register', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim();
    const password = String(req.body?.password || '');

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters and include a number.' });
    }

    const existing = getUserByEmailStmt.get(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hash = await bcrypt.hash(password, 12);
    const createdAt = new Date().toISOString();
    const info = insertUserStmt.run(email, hash, createdAt);

    const token = signToken({ sub: info.lastInsertRowid, email });
    setAuthCookie(res, token);

    res.status(201).json({
      user: { id: info.lastInsertRowid, email, createdAt }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim();
    const password = String(req.body?.password || '');

    const user = getUserByEmailStmt.get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken({ sub: user.id, email: user.email });
    setAuthCookie(res, token);

    res.json({ user: { id: user.id, email: user.email, createdAt: user.created_at } });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true });
});

router.get('/me', (req, res) => {
  if (!req.user) {
    return res.status(200).json({ user: null });
  }
  const user = getUserByIdStmt.get(req.user.id);
  if (!user) {
    clearAuthCookie(res);
    return res.status(200).json({ user: null });
  }
  res.json({ user });
});

export default router;
