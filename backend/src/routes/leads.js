import express from 'express';
import { localDB as supabase } from '../config/localdb.js';
import { triggerOutboundCall } from '../services/sarvam.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { category, status, campaign_id, search } = req.query;
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);

    let query = supabase.from('leads').select('*').order('created_at', { ascending: false });

    if (category)    query = query.eq('category',    category);
    if (status)      query = query.eq('status',      status);
    if (campaign_id) query = query.eq('campaign_id', campaign_id);

    // Search across name, company, phone, city
    if (search) {
      const s = `%${search}%`;
      query = query.or(`name.ilike.${s},company.ilike.${s},phone.ilike.${s},city.ilike.${s}`);
    }

    // Fetch ALL matching rows first (localDB has no server-side LIMIT for counting)
    const { data: allLeads, error } = await query;
    if (error) throw error;

    const total      = allLeads.length;
    const totalPages = Math.ceil(total / limit);
    const data       = allLeads.slice((page - 1) * limit, page * limit);

    res.status(200).json({ data, total, page, limit, totalPages });
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
      hot: leads.filter(l => l.category === 'hot').length,
      warm: leads.filter(l => l.category === 'warm').length,
      nurture: leads.filter(l => l.category === 'nurture').length
    };
    
    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/leads/call-logs — all leads that came from Sarvam webhook (have transcript)
router.get('/call-logs', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('id, name, phone, company, category, status, transcript, call_duration, recording_url, score_breakdown, created_at')
      .not('transcript', 'is', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Get single lead
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', req.params.id)
      .single();
      
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Lead not found' });
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger Sarvam AI Outbound Call
router.post('/:id/call', async (req, res) => {
  try {
    // 1. Fetch the lead
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', req.params.id)
      .single();
      
    if (error) throw error;
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    if (!lead.phone) return res.status(400).json({ error: 'Lead has no phone number' });

    // 2. Prepare dynamic variables (using what we know about the lead)
    const variables = {
      name: lead.name || '',
      company: lead.company || '',
      category: lead.category || '',
      source: lead.source || ''
    };

    // 3. Trigger call via Sarvam API
    const response = await triggerOutboundCall(lead.phone, variables);
    
    // 4. Update lead status locally to show call initiated
    await supabase
      .from('leads')
      .update({ status: 'contacted' })
      .eq('id', req.params.id);

    res.json({ success: true, sarvam_response: response });
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

// PATCH /api/leads/:id/followup — enable or disable follow-ups for this lead
router.patch('/:id/followup', async (req, res) => {
  try {
    const { enabled } = req.body;
    if (enabled === undefined) return res.status(400).json({ error: 'enabled (boolean) required' });
    const val = enabled ? 1 : 0;
    const { error } = await supabase.from('leads').update({ followup_enabled: val }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, followup_enabled: val });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

