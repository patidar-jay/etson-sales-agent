import express from 'express';
import { localDB as supabase } from '../config/localdb.js';
import { settingsHelper } from '../config/localdb.js';
import { sendHotLeadAlert } from '../services/email.js';

const router = express.Router();

/**
 * POST /api/webhooks/sarvam
 *
 * Sarvam sends these exact fields (from "Log Discovery Outcome" tool):
 *   userName, companyName, disposition, discoveryFitScoreEstim,
 *   painPointsMentioned, currentStateOfSolving, authorityLevel,
 *   budgetIndication, timelineToDecide, sampleKitRequested,
 *   chosenNextStep, nextStepDateTime, callSummary
 *
 * Plus Sarvam call metadata (added by platform):
 *   phone_number / phone, interaction_id, call_duration, recording_url
 */
router.post('/sarvam', async (req, res) => {
  try {
    const body = req.body;
    console.log('[Sarvam Webhook] Received:', JSON.stringify(body, null, 2));

    // ── Extract fields ──────────────────────────────────────────────
    const {
      // Sarvam output variables (from Body tab)
      userName,
      companyName,
      disposition,
      discoveryFitScoreEstim,
      painPointsMentioned,
      currentStateOfSolving,
      authorityLevel,
      budgetIndication,
      timelineToDecide,
      sampleKitRequested,
      chosenNextStep,
      nextStepDateTime,
      callSummary,

      // Sarvam platform call metadata
      interaction_id,
      phone_number,
      phone,
      call_duration,
      recording_url,

      // Input variables (if Sarvam passes them)
      input_variables,
    } = body;

    const phoneNum = phone_number || phone || input_variables?.phone || null;
    const callId   = interaction_id || `sarvam_${Date.now()}`;

    // ── Idempotency: skip if already processed ──────────────────────
    const existing = await settingsHelper.get(`webhook_${callId}`);
    if (existing.data) {
      console.log(`[Sarvam Webhook] Already processed: ${callId}`);
      return res.status(200).json({ message: 'Already processed' });
    }
    await settingsHelper.set(`webhook_${callId}`);

    // ── Score the lead based on Sarvam output variables ─────────────
    const fitScore     = parseFloat(discoveryFitScoreEstim) || 0;
    const authority    = (authorityLevel || '').toLowerCase();
    const timeline     = (timelineToDecide || '').toLowerCase();
    const pain         = (painPointsMentioned || '').toLowerCase();
    const disp         = (disposition || '').toLowerCase();
    const budget       = (budgetIndication || '').toLowerCase();

    // Build a simple 0-100 score from Sarvam's own signals
    let score = Math.round(fitScore * 10); // Sarvam gives 0-10 typically

    // Boost score based on signals
    if (authority.includes('decision') || authority.includes('yes') || authority.includes('owner')) score += 10;
    if (timeline.includes('immediate') || timeline.includes('week') || timeline.includes('month'))  score += 10;
    if (pain.length > 10) score += 5;
    if (disp.includes('interested') || disp.includes('yes') || disp.includes('hot'))               score += 15;
    if (budget.includes('₹') || budget.length > 3) score += 5;
    score = Math.min(score, 100);

    // Category from score
    let category = 'nurture';
    if (score >= 70) category = 'hot';
    else if (score >= 45) category = 'warm';

    // Lead status from disposition
    let status = 'new';
    if (disp.includes('interested') || disp.includes('demo') || disp.includes('sample')) status = 'contacted';
    if (disp.includes('not interested') || disp.includes('no') || disp.includes('reject')) status = 'lost';
    if (disp.includes('quote') || disp.includes('price')) status = 'quoted';

    // ── Build notes from all Sarvam signals ─────────────────────────
    const notes = [
      chosenNextStep   ? `Next Step: ${chosenNextStep}`            : null,
      nextStepDateTime ? `Follow-up: ${nextStepDateTime}`          : null,
      sampleKitRequested === 'true' || sampleKitRequested === true ? 'Sample kit requested' : null,
      currentStateOfSolving ? `Current solution: ${currentStateOfSolving}` : null,
    ].filter(Boolean).join('\n');

    // ── Build score_breakdown ────────────────────────────────────────
    const scoreBreakdown = JSON.stringify({
      discovery_fit:    Math.round(fitScore * 10),
      authority:        authority.includes('yes') || authority.includes('owner') ? 10 : 5,
      timeline:         timeline.includes('immediate') || timeline.includes('week') ? 10 : 5,
      pain_points:      pain.length > 20 ? 10 : 5,
      disposition:      disp.includes('interested') ? 15 : 0,
      budget:           budget.length > 3 ? 5 : 0,
    });

    // ── Check if lead with same phone exists → upsert ───────────────
    let leadId;
    let isUpdate = false;

    if (phoneNum) {
      const { data: existingLeads } = await supabase
        .from('leads')
        .select('id')
        .eq('phone', phoneNum)
        .limit(1);

      if (existingLeads && existingLeads.length > 0) {
        leadId   = existingLeads[0].id;
        isUpdate = true;
      }
    }

    if (!leadId) leadId = `sarvam_${callId}`;

    const leadData = {
      id:               leadId,
      name:             userName     || 'Unknown',
      company:          companyName  || '',
      phone:            phoneNum     || '',
      status,
      category,
      priority:         score,
      supplier_pain:    painPointsMentioned     || '',
      decision_maker:   authorityLevel          || '',
      budget:           budgetIndication        || '',
      timeline:         timelineToDecide        || '',
      transcript:       callSummary             || '',
      call_duration:    call_duration           || '',
      recording_url:    recording_url           || null,
      notes,
      score_breakdown:  scoreBreakdown,
      source:           'Sarvam AI',
      created_at:       new Date().toISOString(),
    };

    if (isUpdate) {
      // Remove id and created_at from update payload
      const { id, created_at, ...updatePayload } = leadData;
      await supabase.from('leads').update(updatePayload).eq('id', leadId);
      console.log(`[Sarvam Webhook] Updated lead: ${leadId} | ${userName} | score=${score} | category=${category}`);
    } else {
      await supabase.from('leads').insert([leadData]);
      console.log(`[Sarvam Webhook] Created lead: ${leadId} | ${userName} | score=${score} | category=${category}`);
    }

    // ── Hot lead alert ───────────────────────────────────────────────
    if (category === 'hot') {
      await sendHotLeadAlert(leadData);
    }

    res.status(200).json({
      success:  true,
      leadId,
      score,
      category,
      status,
    });

  } catch (error) {
    console.error('[Sarvam Webhook] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
