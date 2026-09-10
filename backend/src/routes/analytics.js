import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

router.get('/overview', async (req, res) => {
  try {
    const { data: leads, error } = await supabase.from('leads').select('*');
    if (error) throw error;
    
    // Mock today's stats based on total leads for simplicity
    const today = {
      newLeads: leads.length,
      callsMade: leads.length * 2,
      quotesSent: leads.filter(l => l.status === 'quoted').length,
      highPriority: leads.filter(l => l.category === 'hot').length
    };
    
    res.status(200).json(today);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/leads-by-product', async (req, res) => {
  try {
    const { data: leads, error } = await supabase.from('leads').select('needs');
    if (error) throw error;
    
    const counts = {};
    leads.forEach(l => {
      const need = l.needs || 'Unknown';
      counts[need] = (counts[need] || 0) + 1;
    });
    
    res.status(200).json(counts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

router.get('/conversion-funnel', async (req, res) => {
  try {
    const { data: leads, error } = await supabase.from('leads').select('status, category');
    if (error) throw error;
    
    const total = leads.length;
    const contacted = leads.filter(l => l.status === 'contacted' || l.status === 'quoted').length;
    const qualified = leads.filter(l => l.category === 'hot').length;
    const quoted = leads.filter(l => l.status === 'quoted').length;
    
    res.status(200).json({ total, contacted, qualified, quoted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/daily-trend', async (req, res) => {
  try {
    // Mock 30 days of data
    const data = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      data.push({
        date: d.toISOString().split('T')[0],
        leads: Math.floor(Math.random() * 20) + 5
      });
    }
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
