import express from 'express';
import { db } from '../config/firebase.js';
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

    // Idempotency check
    const existing = await db.collection('webhooks').where('interaction_id', '==', interaction_id).get();
    if (existing.docs.length > 0) {
      return res.status(200).json({ message: 'Already processed' });
    }

    // Save raw webhook data
    await db.collection('webhooks').doc().set({
      interaction_id, phone, transcript, agent_variables, call_duration, recording_url, status, received_at: new Date().toISOString()
    });

    // Score lead
    const scoringResult = scoreLead(req.body);

    // Save lead
    const leadData = {
      phone,
      transcript,
      ...agent_variables,
      call_duration,
      recording_url,
      status: 'new', // internal status
      call_status: status,
      ...scoringResult,
      created_at: new Date().toISOString()
    };
    
    const savedLead = await db.collection('leads').doc().set(leadData);
    leadData.id = savedLead.id;

    // Hot lead alert
    if (scoringResult.category === 'High') {
      await sendHotLeadAlert(leadData);
    }

    res.status(200).json({ success: true, leadId: savedLead.id });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
