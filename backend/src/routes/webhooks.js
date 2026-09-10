import express from 'express';
import { supabase } from '../config/supabase.js';
import { scoreLead } from '../services/scoring.js';
import { sendHotLeadAlert } from '../services/email.js';

const router = express.Router();

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

    // Idempotency check: see if we already have this webhook interaction
    const { data: existing, error: existError } = await supabase.from('settings').select('key').eq('key', `webhook_${interaction_id}`).single();
    if (existing) {
      return res.status(200).json({ message: 'Already processed' });
    }

    // Save idempotency key
    await supabase.from('settings').insert([{ key: `webhook_${interaction_id}`, value: { processed_at: new Date().toISOString() } }]);

    // Save raw webhook data (optional, but good for debugging)
    // Could create a separate webhooks table, but here we just process the lead

    // Score lead
    const scoringResult = scoreLead(req.body);

    // Prepare lead data
    const leadData = {
      phone,
      transcript,
      ...agent_variables, // Will expand to name, company, city, etc if present
      call_duration,
      recording_url,
      status: 'new',
      category: scoringResult.category === 'High' ? 'hot' : (scoringResult.category === 'Medium' ? 'warm' : 'nurture'),
      score_breakdown: scoringResult.score_breakdown || {},
      created_at: new Date().toISOString()
    };
    
    // We should try to update an existing lead by phone if one exists, otherwise insert
    const { data: existingLeads } = await supabase.from('leads').select('id').eq('phone', phone).limit(1);
    
    let savedLeadId;

    if (existingLeads && existingLeads.length > 0) {
      const existingId = existingLeads[0].id;
      const { error: updateError } = await supabase.from('leads').update(leadData).eq('id', existingId);
      if (updateError) throw updateError;
      savedLeadId = existingId;
    } else {
      const { data: savedLead, error: insertError } = await supabase.from('leads').insert([leadData]).select().single();
      if (insertError) throw insertError;
      savedLeadId = savedLead.id;
    }

    // Hot lead alert
    if (scoringResult.category === 'High') {
      leadData.id = savedLeadId;
      await sendHotLeadAlert(leadData);
    }

    res.status(200).json({ success: true, leadId: savedLeadId });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
