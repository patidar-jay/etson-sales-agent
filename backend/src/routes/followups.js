/**
 * Follow-up Queue API Routes
 * Dashboard can view, complete, and skip follow-up actions
 */
import express from 'express';
import { getPendingFollowUps, completeFollowUp, skipFollowUp, getFollowUpStats, scheduleFollowUps } from '../services/followups.js';
import { localDB as supabase } from '../config/localdb.js';

const router = express.Router();

// GET /api/followups — list pending follow-ups
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const items = getPendingFollowUps(limit);
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/followups/stats — counts by status
router.get('/stats', async (req, res) => {
  try {
    res.json(getFollowUpStats());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/followups/:id/complete — mark done
router.post('/:id/complete', async (req, res) => {
  try {
    completeFollowUp(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/followups/:id/skip — skip action
router.post('/:id/skip', async (req, res) => {
  try {
    skipFollowUp(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/followups/schedule/:leadId — manually re-schedule for a lead
router.post('/schedule/:leadId', async (req, res) => {
  try {
    const { data: lead, error } = await supabase.from('leads').select('*').eq('id', req.params.leadId).single();
    if (error || !lead) return res.status(404).json({ error: 'Lead not found' });
    scheduleFollowUps(lead);
    res.json({ success: true, message: `Follow-ups scheduled for ${lead.name}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
