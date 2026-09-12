import express from 'express';
import { localDB as supabase } from '../config/localdb.js';
import { settingsHelper } from '../config/localdb.js';
import { scoreLead } from '../services/scoring.js';
import { sendHotLeadAlert } from '../services/email.js';

const router = express.Router();

// POST /api/webhooks/sarvam
// Sarvam AI calls this after every completed call
router.post('/sarvam', async (req, res) => {
  try {
    const {
      interaction_id,
      phone,
      transcript,
      agent_variables,
      call_duration,
      recording_url,
      status
    } = req.body;

    console.log('[Sarvam Webhook] Received call data:', {
      interaction_id,
      phone,
      call_duration,
      status
    });

    // Idempotency check: already processed?
    const existing = await settingsHelper.get(`webhook_${interaction_id}`);
    if (existing.data) {
      return res.status(200).json({ message: 'Already processed' });
    }

    // Mark as processed
    await settingsHelper.set(`webhook_${interaction_id}`);

    // Score the lead based on transcript + agent variables
    const scoringResult = scoreLead(req.body);

    // Build lead record from Sarvam webhook data
    const leadId = `sarvam_${interaction_id || Date.now()}`;
    const leadData = {
      id: leadId,
      phone,
      transcript,
      // Agent variables sent from Sarvam (name, company, city, etc.)
      ...(agent_variables || {}),
      call_duration,
      recording_url,
      status: 'new',
      category: scoringResult.category === 'High'
        ? 'hot'
        : (scoringResult.category === 'Medium' ? 'warm' : 'nurture'),
      priority: scoringResult.total || 0,
      score_breakdown: JSON.stringify(scoringResult.score_breakdown || {}),
      created_at: new Date().toISOString()
    };

    // Upsert: update existing lead by phone, or insert new
    const { data: existingLeads } = await supabase
      .from('leads')
      .select('id')
      .eq('phone', phone)
      .limit(1);

    let savedLeadId;

    if (existingLeads && existingLeads.length > 0) {
      const existingId = existingLeads[0].id;
      await supabase
        .from('leads')
        .update(leadData)
        .eq('id', existingId);
      savedLeadId = existingId;
      console.log(`[Sarvam Webhook] Updated existing lead: ${existingId}`);
    } else {
      await supabase.from('leads').insert([leadData]);
      savedLeadId = leadId;
      console.log(`[Sarvam Webhook] Created new lead: ${leadId}`);
    }

    // Hot lead email alert
    if (scoringResult.category === 'High') {
      leadData.id = savedLeadId;
      await sendHotLeadAlert(leadData);
    }

    res.status(200).json({ success: true, leadId: savedLeadId });
  } catch (error) {
    console.error('[Sarvam Webhook] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
