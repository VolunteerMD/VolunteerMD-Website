import { Router } from 'express';
import db from '../lib/db.js';
import { getOpportunities, getOpportunityById } from '../lib/opportunityService.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const listFavoritesStmt = db.prepare('SELECT opportunity_id FROM favorites WHERE user_id = ? ORDER BY created_at DESC');
const insertFavoriteStmt = db.prepare('INSERT OR IGNORE INTO favorites (user_id, opportunity_id, created_at) VALUES (?, ?, ?)');
const deleteFavoriteStmt = db.prepare('DELETE FROM favorites WHERE user_id = ? AND opportunity_id = ?');
const getUserByIdStmt = db.prepare('SELECT id FROM users WHERE id = ?');

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const rows = listFavoritesStmt.all(req.user.id);
    const ids = rows.map((row) => row.opportunity_id);
    if (ids.length === 0) {
      return res.json({ data: [], ids: [] });
    }

    const opportunities = await getOpportunities();
    const byId = new Map(opportunities.map((opp) => [opp.id, opp]));
    const data = ids
      .map((id) => byId.get(id))
      .filter(Boolean);

    res.json({ data, ids });
  } catch (err) {
    next(err);
  }
});

router.post('/:id', requireAuth, async (req, res, next) => {
  try {
    const opportunityId = String(req.params.id);
    const opportunity = await getOpportunityById(opportunityId);
    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    const userRecord = getUserByIdStmt.get(req.user.id);
    if (!userRecord) {
      return res.status(401).json({ error: 'User session is no longer valid.' });
    }

    const createdAt = new Date().toISOString();
    insertFavoriteStmt.run(userRecord.id, opportunityId, createdAt);

    res.status(201).json({ data: opportunity });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, (req, res, next) => {
  try {
    const opportunityId = String(req.params.id);
    const info = deleteFavoriteStmt.run(req.user.id, opportunityId);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Favorite not found' });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
