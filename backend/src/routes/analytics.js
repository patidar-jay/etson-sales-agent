import express from 'express';
import { localDB as supabase } from '../config/localdb.js';

const router = express.Router();

// GET /api/analytics/overview — real data from Supabase
router.get('/overview', async (req, res) => {
  try {
    const { data: leads, error } = await supabase.from('leads').select('category, status, created_at');
    if (error) throw error;

    const today = new Date().toISOString().split('T')[0];
    const newLeadsToday = leads.filter(l => l.created_at?.startsWith(today)).length;

    res.status(200).json({
      totalLeads: leads.length,      // alias used by Dashboard
      newLeads: leads.length,
      newLeadsToday,
      callsMade: leads.filter(l => l.status === 'contacted').length,
      quotesSent: leads.filter(l => l.status === 'quoted').length,
      highPriority: leads.filter(l => l.category === 'hot').length,
      pendingFollowUps: leads.filter(l => l.status === 'new').length,
      won: leads.filter(l => l.status === 'won').length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/leads-by-product — real aggregation from Supabase
router.get('/leads-by-product', async (req, res) => {
  try {
    const { data: leads, error } = await supabase.from('leads').select('product, needs');
    if (error) throw error;

    const counts = {};
    leads.forEach(l => {
      const key = l.product || l.needs || 'Unknown';
      counts[key] = (counts[key] || 0) + 1;
    });

    res.status(200).json(counts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/leads-by-city — real aggregation from Supabase
router.get('/leads-by-city', async (req, res) => {
  try {
    const { data: leads, error } = await supabase.from('leads').select('city');
    if (error) throw error;

    const counts = {};
    leads.forEach(l => {
      const city = l.city || 'Unknown';
      counts[city] = (counts[city] || 0) + 1;
    });

    res.status(200).json(counts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/conversion-funnel — real funnel from Supabase
router.get('/conversion-funnel', async (req, res) => {
  try {
    const { data: leads, error } = await supabase.from('leads').select('status, category');
    if (error) throw error;

    const total = leads.length;
    const contacted = leads.filter(l => ['contacted', 'quoted', 'won'].includes(l.status)).length;
    const qualified = leads.filter(l => l.category === 'hot').length;
    const quoted = leads.filter(l => ['quoted', 'won'].includes(l.status)).length;
    const won = leads.filter(l => l.status === 'won').length;

    res.status(200).json({ total, contacted, qualified, quoted, won });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/daily-trend — real data: leads per day from created_at
router.get('/daily-trend', async (req, res) => {
  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('created_at')
      .order('created_at', { ascending: true });
    if (error) throw error;

    // Build last 30 days buckets
    const days = 30;
    const result = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = leads.filter(l => l.created_at?.startsWith(dateStr)).length;
      result.push({
        date: dateStr,
        name: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        leads: count
      });
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/score-distribution — count leads in score brackets
router.get('/score-distribution', async (req, res) => {
  try {
    const { data: leads, error } = await supabase.from('leads').select('priority');
    if (error) throw error;

    const brackets = { '0-25': 0, '26-50': 0, '51-75': 0, '76-100': 0 };
    leads.forEach(l => {
      const s = Number(l.priority || 0);
      if      (s <= 25)  brackets['0-25']++;
      else if (s <= 50)  brackets['26-50']++;
      else if (s <= 75)  brackets['51-75']++;
      else               brackets['76-100']++;
    });

    res.json(Object.entries(brackets).map(([range, count]) => ({ range, count })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
