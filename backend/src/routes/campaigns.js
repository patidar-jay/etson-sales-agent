import express from 'express';
import { supabase } from '../config/supabase.js';
import { parseExcel } from '../utils/excelParser.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Excel file required' });
    }
    
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Campaign name required' });
    }

    const { contacts, errors } = parseExcel(req.file.path);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Invalid excel format', details: errors });
    }

    const campaign = {
      name,
      status: 'draft',
      total_contacts: contacts.length,
      created_at: new Date().toISOString()
    };

    const { data: savedCampaign, error: campErr } = await supabase.from('campaigns').insert([campaign]).select().single();
    if (campErr) throw campErr;

    // Add contacts to leads (as they are basically leads for a campaign)
    const newLeads = contacts.map(c => ({
      campaign_id: savedCampaign.id,
      name: c.name || '',
      phone: c.phone || '',
      email: c.email || '',
      status: 'new'
    }));

    if (newLeads.length > 0) {
      const { error: leadsErr } = await supabase.from('leads').insert(newLeads);
      if (leadsErr) console.error("Error inserting leads for campaign", leadsErr);
    }

    res.status(201).json({ success: true, campaignId: savedCampaign.id, contactsCount: contacts.length });
  } catch (error) {
    console.error('Campaign create error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { data: campaigns, error } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.status(200).json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data: campaign, error } = await supabase.from('campaigns').select('*').eq('id', req.params.id).single();
    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'Not found' });
      throw error;
    }
    res.status(200).json(campaign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('campaigns').update(req.body).eq('id', req.params.id);
    if (error) throw error;
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('campaigns').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Added these explicit routes that were requested by the frontend
router.put('/:id/pause', async (req, res) => {
  try {
    const { error } = await supabase.from('campaigns').update({ status: 'paused' }).eq('id', req.params.id);
    if (error) throw error;
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/resume', async (req, res) => {
  try {
    const { error } = await supabase.from('campaigns').update({ status: 'running' }).eq('id', req.params.id);
    if (error) throw error;
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
