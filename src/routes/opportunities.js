import { Router } from 'express';
import { filterOpportunities, getOpportunities, getOpportunityById, clearCache } from '../lib/opportunityService.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const filters = {
      location: req.query.location ? String(req.query.location) : undefined,
      subject: req.query.subject ? String(req.query.subject) : undefined,
      timeCommitment: req.query.time ? String(req.query.time) : undefined,
      search: req.query.search ? String(req.query.search) : undefined
    };

    const hasFilters = Object.values(filters).some(Boolean);
    const opportunities = hasFilters ? await filterOpportunities(filters) : await getOpportunities();

    res.json({ data: opportunities });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const opportunity = await getOpportunityById(String(req.params.id));
    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }
    res.json({ data: opportunity });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', requireAuth, async (_req, res, next) => {
  try {
    clearCache();
    const refreshed = await getOpportunities({ forceRefresh: true });
    res.json({ data: refreshed, refreshed: true });
  } catch (err) {
    next(err);
  }
});

export default router;
