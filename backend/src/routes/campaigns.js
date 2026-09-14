import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { localDB as supabase } from '../config/localdb.js';
import { parseExcel } from '../utils/excelParser.js';
import { triggerOutboundCall } from '../services/sarvam.js';
import db from '../config/localdb.js';

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

    const { contacts, errors } = parseExcel(req.file.buffer || req.file.path);

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Invalid excel format', details: errors });
    }

    const campaign = {
      id: uuidv4(),
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
    const { search } = req.query;
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);

    let query = supabase.from('campaigns').select('*').order('created_at', { ascending: false });

    // Search on campaign name
    if (search) {
      const s = `%${search}%`;
      query = query.or(`name.ilike.${s}`);
    }

    // Fetch ALL matching rows first (localDB has no server-side LIMIT for counting)
    const { data: allCampaigns, error } = await query;
    if (error) throw error;

    const total      = allCampaigns.length;
    const totalPages = Math.ceil(total / limit);
    const data       = allCampaigns.slice((page - 1) * limit, page * limit);

    res.status(200).json({ data, total, page, limit, totalPages });
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

// GET progress for a campaign
router.get('/:id/progress', async (req, res) => {
  try {
    const { data: camp, error } = await supabase.from('campaigns').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    res.status(200).json(camp);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// START campaign — choose type: 'whatsapp' or 'call'
router.post('/:id/start', async (req, res) => {
  const { type = 'whatsapp', message = '' } = req.body;

  try {
    // Fetch campaign
    const { data: camp, error: campErr } = await supabase.from('campaigns').select('*').eq('id', req.params.id).single();
    if (campErr || !camp) return res.status(404).json({ error: 'Campaign not found' });
    if (camp.status === 'running') return res.status(400).json({ error: 'Campaign is already running' });

    // Fetch leads for this campaign
    const { data: leads, error: leadsErr } = await supabase.from('leads').select('*').eq('campaign_id', req.params.id);
    if (leadsErr) throw leadsErr;
    if (!leads || leads.length === 0) return res.status(400).json({ error: 'No contacts found for this campaign' });

    // Mark campaign as running
    await supabase.from('campaigns').update({
      status: 'running',
      campaign_type: type,
      sent_count: 0,
      failed_count: 0,
      started_at: new Date().toISOString()
    }).eq('id', req.params.id);

    // Respond immediately, process in background
    res.status(200).json({ success: true, total: leads.length, type });

    // Background processing
    (async () => {
      let sent = 0;
      let failed = 0;

      for (const lead of leads) {
        try {
          if (type === 'whatsapp') {
            const { wmSend } = await import('../services/whatomate.js');
            const text = message || 
              `Hello ${lead.name || 'there'}! 👋\nThis is a message from Etson Sales.\nWe'd love to connect with you. Please reply to this message and our team will get back to you shortly.`;
            await wmSend(lead.phone, text);
          } else if (type === 'call') {
            // Trigger real outbound call via Sarvam AI voice agent
            const vars = {
              name:    lead.name    || 'Customer',
              company: lead.company || lead.email || '',
              phone:   lead.phone   || '',
            };
            await triggerOutboundCall(lead.phone, vars);
          }
          sent++;
        } catch (err) {
          console.error(`[Campaign] Failed for ${lead.phone}:`, err.message);
          failed++;
        }

        // Update progress every 5 contacts
        if ((sent + failed) % 5 === 0) {
          await supabase.from('campaigns').update({ sent_count: sent, failed_count: failed }).eq('id', req.params.id);
        }

        // Delay between contacts to avoid rate limiting
        // Calls need more gap than WhatsApp messages
        const delay = type === 'call' ? 3000 : 800;
        await new Promise(r => setTimeout(r, delay));
      }

      // Mark completed
      await supabase.from('campaigns').update({
        status: 'completed',
        sent_count: sent,
        failed_count: failed,
        completed_at: new Date().toISOString()
      }).eq('id', req.params.id);

      console.log(`[Campaign ${req.params.id}] Done — sent: ${sent}, failed: ${failed}`);
    })();

  } catch (error) {
    console.error('[Campaign start error]', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/campaigns/:id/stats — live call stats from local DB
router.get('/:id/stats', async (req, res) => {
  try {
    const camp = db.prepare(`SELECT * FROM campaigns WHERE id = ?`).get(req.params.id);
    if (!camp) return res.status(404).json({ error: 'Campaign not found' });

    const leads = db.prepare(`SELECT category, status, priority FROM leads WHERE campaign_id = ?`).all(req.params.id);
    const total    = leads.length;
    const hot      = leads.filter(l => l.category === 'hot').length;
    const warm     = leads.filter(l => l.category === 'warm').length;
    const nurture  = leads.filter(l => l.category === 'nurture').length;
    const contacted = leads.filter(l => l.status === 'contacted').length;
    const avgScore = total > 0 ? Math.round(leads.reduce((s, l) => s + (l.priority || 0), 0) / total) : 0;

    res.json({
      campaign: camp,
      leads: { total, hot, warm, nurture, contacted },
      avgScore,
      progress: total > 0 ? Math.round((contacted / total) * 100) : Math.round(((camp.answered || 0) / Math.max(camp.total_contacts || 1, 1)) * 100),
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
