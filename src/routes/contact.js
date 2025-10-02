import { Router } from 'express';
import db from '../lib/db.js';

const router = Router();

const insertMessageStmt = db.prepare('INSERT INTO contact_messages (name, email, message, created_at) VALUES (?, ?, ?, ?)');

function validateEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}

router.post('/', (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim();
    const message = String(req.body?.message || '').trim();

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (message.length < 10) {
      return res.status(400).json({ error: 'Message should be at least 10 characters long.' });
    }

    const createdAt = new Date().toISOString();
    insertMessageStmt.run(name, email, message, createdAt);

    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
