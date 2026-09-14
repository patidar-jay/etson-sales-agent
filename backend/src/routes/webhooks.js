import express from 'express';
import { localDB as supabase } from '../config/localdb.js';
import { settingsHelper } from '../config/localdb.js';
import { sendHotLeadAlert, wmUpsertContact } from '../services/whatomate.js';
import { analyzeTranscript } from '../services/ai.js';
import { scheduleFollowUps } from '../services/followups.js';

const router = express.Router();

/**
 * POST /api/webhooks/sarvam
 *
 * Sarvam sends these exact fields (from "Log Discovery Outcome" tool):
 *   userName, companyName, disposition, discoveryFitScoreEstim,
 *   painPointsMentioned, currentStateOfSolving, authorityLevel,
 *   budgetIndication, timelineToDecide, sampleKitRequested,
 *   chosenNextStep, nextStepDateTime, callSummary,
 *   email, city, productNeeds   ← optional enrichment fields
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
      interaction_id,
      phone_number,
      phone,
      call_duration,
      recording_url,
      input_variables,
      // Optional enrichment fields (add in Sarvam tool body to capture)
      email,
      city,
      productNeeds,
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

    // ── Rule-based scoring (0–100) using Sarvam output signals ─────
    const fitScore  = parseFloat(discoveryFitScoreEstim) || 0;
    const authority = (authorityLevel || '').toLowerCase();
    const timeline  = (timelineToDecide || '').toLowerCase();
    const pain      = (painPointsMentioned || '').toLowerCase();
    const disp      = (disposition || '').toLowerCase();
    const budget    = (budgetIndication || '').toLowerCase();

    let score = Math.round(fitScore * 10); // Sarvam gives 0–10 typically

    if (authority.includes('decision') || authority.includes('yes') || authority.includes('owner')) score += 15;
    if (timeline.includes('immediate') || timeline.includes('week') || timeline.includes('month'))   score += 10;
    if (pain.length > 10)                                                                             score += 10;
    if (disp.includes('interested') || disp.includes('yes') || disp.includes('hot'))                score += 15;
    if (budget.includes('₹') || budget.length > 3)                                                   score += 10;
    if (sampleKitRequested === 'true' || sampleKitRequested === true)                                score += 10;
    score = Math.min(score, 100);

    // ── Score breakdown ─────────────────────────────────────────────
    const scoreBreakdown = {
      discovery_fit:   Math.round(fitScore * 10),
      authority:       (authority.includes('yes') || authority.includes('owner')) ? 15 : 5,
      timeline:        (timeline.includes('immediate') || timeline.includes('week')) ? 10 : 3,
      pain_points:     pain.length > 20 ? 10 : 3,
      disposition:     disp.includes('interested') ? 15 : 0,
      budget:          budget.length > 3 ? 10 : 0,
      sample_request:  (sampleKitRequested === 'true' || sampleKitRequested === true) ? 10 : 0,
    };

    // ── Category from score ─────────────────────────────────────────
    let category = 'nurture';
    if (score >= 70)      category = 'hot';
    else if (score >= 45) category = 'warm';

    // ── Lead status from disposition ────────────────────────────────
    let status = 'new';
    if (disp.includes('interested') || disp.includes('demo') || disp.includes('sample')) status = 'contacted';
    if (disp.includes('not interested') || disp.includes('reject'))                      status = 'lost';
    if (disp.includes('quote') || disp.includes('price'))                                status = 'quoted';

    // ── Notes from Sarvam signals ───────────────────────────────────
    const notes = [
      chosenNextStep    ? `Next Step: ${chosenNextStep}`                : null,
      nextStepDateTime  ? `Follow-up: ${nextStepDateTime}`             : null,
      (sampleKitRequested === 'true' || sampleKitRequested === true)
                        ? 'Sample kit requested'                        : null,
      currentStateOfSolving ? `Current solution: ${currentStateOfSolving}` : null,
    ].filter(Boolean).join('\n');

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
      id:             leadId,
      name:           userName        || 'Unknown',
      company:        companyName     || '',
      phone:          phoneNum        || '',
      email:          email           || '',
      city:           city            || '',
      needs:          productNeeds    || '',
      status,
      category,
      priority:       score,
      supplier_pain:  painPointsMentioned  || '',
      decision_maker: authorityLevel       || '',
      budget:         budgetIndication     || '',
      timeline:       timelineToDecide     || '',
      transcript:     callSummary          || '',
      call_duration:  call_duration        || '',
      recording_url:  recording_url        || null,
      notes,
      score_breakdown: JSON.stringify(scoreBreakdown),
      source:         'Sarvam AI',
      created_at:     new Date().toISOString(),
    };

    if (isUpdate) {
      const { id, created_at, ...updatePayload } = leadData;
      await supabase.from('leads').update(updatePayload).eq('id', leadId);
      console.log(`[Sarvam Webhook] Updated lead: ${leadId} | ${userName} | score=${score} | category=${category}`);
    } else {
      await supabase.from('leads').insert([leadData]);
      console.log(`[Sarvam Webhook] Created lead: ${leadId} | ${userName} | score=${score} | category=${category}`);
    }

    // ── AI transcript enrichment (async — doesn't block response) ───
    if (callSummary) {
      analyzeTranscript(callSummary, leadData).then(async (aiInsights) => {
        if (!aiInsights) return;
        console.log(`[AI] Transcript analyzed for ${userName}:`, aiInsights.summary);
        // Apply AI score adjustment (capped)
        const adjustedScore = Math.min(100, Math.max(0, score + (aiInsights.score_adjustment || 0)));
        let aiCategory = category;
        if (adjustedScore >= 70)      aiCategory = 'hot';
        else if (adjustedScore >= 45) aiCategory = 'warm';
        else                          aiCategory = 'nurture';

        const aiUpdate = {
          priority:   adjustedScore,
          category:   aiCategory,
          sentiment:  aiInsights.sentiment || 'neutral',
          confidence: aiInsights.summary   ? 'High' : 'Medium',
          notes:      notes + (aiInsights.recommended_next_action
                        ? `\nAI Recommendation: ${aiInsights.recommended_next_action}` : ''),
        };
        // Merge product specs if AI found them
        if (aiInsights.product_specs_found) {
          if (aiInsights.product_specs_found.width)    aiUpdate.width    = aiInsights.product_specs_found.width;
          if (aiInsights.product_specs_found.application) aiUpdate.application = aiInsights.product_specs_found.application;
        }
        await supabase.from('leads').update(aiUpdate).eq('id', leadId);
        console.log(`[AI] Lead ${leadId} enriched | score: ${score}→${adjustedScore} | category: ${category}→${aiCategory}`);
      }).catch(e => console.warn('[AI] Enrichment failed:', e.message));
    }

    // ── Auto-schedule follow-up cadence ─────────────────────────────
    scheduleFollowUps({ ...leadData, id: leadId, category });

    // ── Sync to Whatomate (creates/updates contact with lead data) ───
    wmUpsertContact({ ...leadData, id: leadId, category, priority: score }).catch(() => {});

    // ── Hot lead alert ───────────────────────────────────────────────
    if (category === 'hot') {
      await sendHotLeadAlert(leadData);
    }

    res.status(200).json({ success: true, leadId, score, category, status });

  } catch (error) {
    console.error('[Sarvam Webhook] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
