import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { category, status, campaign_id, search } = req.query;
    
    let query = supabase.from('leads').select('*').order('created_at', { ascending: false });

    if (category) query = query.eq('category', category);
    if (status) query = query.eq('status', status);
    if (campaign_id) query = query.eq('campaign_id', campaign_id);
    
    // For search, Supabase provides `or` or `ilike` filters
    if (search) {
      const s = `%${search}%`;
      query = query.or(`name.ilike.${s},city.ilike.${s},phone.ilike.${s}`);
    }

    const { data: leads, error } = await query;
    if (error) throw error;

    res.status(200).json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const { data: leads, error } = await supabase.from('leads').select('category, status');
    if (error) throw error;
    
    const stats = {
      total: leads.length,
      highPriority: leads.filter(l => l.category === 'hot').length,
      new: leads.filter(l => l.status === 'new').length
    };
    
    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data: lead, error } = await supabase.from('leads').select('*').eq('id', req.params.id).single();
    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'Not found' });
      throw error;
    }
    res.status(200).json(lead);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { status, notes, assigned_to } = req.body;
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;

    const { error } = await supabase.from('leads').update(updateData).eq('id', req.params.id);
    if (error) throw error;
    
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
