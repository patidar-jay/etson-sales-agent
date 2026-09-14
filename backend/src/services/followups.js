/**
 * Follow-up Cadence Engine
 * Schedules and executes automated multi-touch follow-ups via WhatsApp + AI
 *
 * Cadence:
 *   HOT  → Day 0 (instant alert), Day 1 (WA check-in), Day 3 (call reminder)
 *   WARM → Day 3 (WA catalog), Day 7 (WA check-in), Day 14 (re-call)
 *   COLD → Day 30 (re-engagement)
 */

import cron from 'node-cron';
import db from '../config/localdb.js';
import { sendProspectFollowUp, sendFollowUpReminder } from './whatomate.js';
import { composeFollowUp } from './ai.js';

// ── Schedule follow-ups when a lead is created/updated ───────────────────────
export function scheduleFollowUps(lead) {
  // Don't schedule if per-lead followup is disabled
  if (lead.followup_enabled === 0 || lead.followup_enabled === false) {
    console.log(`[Followup] Skipping schedule for ${lead.name} — followups disabled on this lead`);
    return;
  }

  const cadence = {
    hot:    [1, 3],
    warm:   [3, 7, 14],
    nurture: [30],
  };

  const days = cadence[lead.category] || cadence.nurture;

  // Clear any existing pending follow-ups for this lead
  db.prepare(
    `DELETE FROM followup_queue WHERE lead_id = ? AND status = 'pending'`
  ).run(lead.id);

  for (const day of days) {
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + day);

    db.prepare(
      `INSERT INTO followup_queue (lead_id, action_type, scheduled_at, status)
       VALUES (?, ?, ?, 'pending')`
    ).run(lead.id, day <= 3 ? 'whatsapp' : 'whatsapp', scheduledAt.toISOString());
  }

  console.log(`[Followup] Scheduled ${days.length} follow-up(s) for ${lead.name} (${lead.category}): Days ${days.join(', ')}`);
}

// ── Process due follow-ups ────────────────────────────────────────────────────
async function processDueFollowUps() {
  // ── Global guard: check followups_enabled setting live from DB
  const globalRow = db.prepare(`SELECT value FROM settings WHERE key = 'followups_enabled'`).get();
  if (globalRow?.value === 'false') {
    return; // Followups disabled — silent skip
  }

  const now = new Date().toISOString();

  const dueItems = db.prepare(
    `SELECT fq.*, l.id as lead_id, l.name, l.phone, l.company, l.category,
            l.transcript, l.notes, l.budget, l.priority, l.status as lead_status,
            l.followup_enabled
     FROM followup_queue fq
     JOIN leads l ON fq.lead_id = l.id
     WHERE fq.status = 'pending'
       AND fq.scheduled_at <= ?
       AND l.status NOT IN ('won', 'lost')
       AND (l.followup_enabled IS NULL OR l.followup_enabled != 0)
     ORDER BY fq.scheduled_at ASC
     LIMIT 10`
  ).all(now);

  if (dueItems.length === 0) return;

  console.log(`[Followup] Processing ${dueItems.length} due follow-up(s)...`);

  for (const item of dueItems) {
    try {
      // Calculate which day number this is
      const createdAt = new Date(item.created_at);
      const dayNumber = Math.round((new Date() - createdAt) / (1000 * 60 * 60 * 24));

      // Try AI-composed message, fall back to template
      let message = await composeFollowUp(
        {
          name:       item.name,
          company:    item.company,
          category:   item.category,
          transcript: item.transcript,
          notes:      item.notes,
        },
        dayNumber,
        'whatsapp'
      );

      // Fallback templates if AI not configured
      if (!message) {
        message = getFollowUpTemplate(item, dayNumber);
      }

      // Send to prospect via WhatsApp
      if (item.phone && message) {
        await sendProspectFollowUp({ phone: item.phone, name: item.name }, message);
      }

      // Notify sales team
      await sendFollowUpReminder(item, dayNumber);

      // Mark as completed
      db.prepare(
        `UPDATE followup_queue SET status = 'completed', completed_at = ? WHERE id = ?`
      ).run(new Date().toISOString(), item.id);

      console.log(`[Followup] ✅ Completed follow-up #${item.id} for ${item.name} (Day ${dayNumber})`);

    } catch (e) {
      console.error(`[Followup] ❌ Failed follow-up #${item.id}:`, e.message);
      // Mark as failed so it doesn't retry endlessly
      db.prepare(
        `UPDATE followup_queue SET status = 'failed', completed_at = ? WHERE id = ?`
      ).run(new Date().toISOString(), item.id);
    }
  }
}

// ── Fallback message templates (used when no OpenAI key) ─────────────────────
function getFollowUpTemplate(lead, dayNumber) {
  const name    = lead.name?.split(' ')[0] || 'ji';
  const company = lead.company || 'aapki company';

  const templates = {
    1: `Namaste ${name} ji! 🙏\n\nMain Etson Manufacturing se Ananya bol rahi hoon.\n\nKal humari baat hui thi — kya aapko humare thermal paper rolls ke baare mein koi sawaal hai?\n\nHum ${company} ke liye best pricing de sakte hain. Reply karein! 😊`,

    3: `Namaste ${name} ji! 👋\n\nEtson Manufacturing se Ananya yahan.\n\nKya aapne humara quotation receive kiya? Koi confusion ho toh seedha batayein.\n\nHum aapke liye *free sample* bhi bhej sakte hain — interested? 📦`,

    7: `Hello ${name} ji! 🙂\n\nEtson Manufacturing se follow-up kar rahi hoon.\n\nAapke current thermal paper supplier se koi problem toh nahi? Hum better quality + faster delivery guarantee karte hain.\n\nEk baar baat karein? 📞`,

    14: `Namaste ${name} ji!\n\nMain jaanti hoon aap busy hain — this is my last follow-up. 😊\n\nEtson Manufacturing aapko offer kar sakti hai:\n✅ Premium thermal rolls\n✅ Pan-India delivery\n✅ Bulk discounts\n✅ GST invoice\n\nKab sahi time hai baat karne ka? 🙏`,

    30: `Namaste ${name} ji! 🙏\n\nEtson Manufacturing yahan — kuch mahine pehle baat hui thi.\n\nHumare paas *new products* aaye hain aur *special pricing* chal rahi hai.\n\nKya aap abhi market mein thermal paper vendor change karna chahte hain?`,
  };

  return templates[dayNumber] || templates[7];
}

// ── API helpers for dashboard ─────────────────────────────────────────────────

export function getPendingFollowUps(limit = 20) {
  return db.prepare(
    `SELECT fq.*, l.name, l.phone, l.company, l.category, l.priority
     FROM followup_queue fq
     JOIN leads l ON fq.lead_id = l.id
     WHERE fq.status = 'pending'
     ORDER BY fq.scheduled_at ASC
     LIMIT ?`
  ).all(limit);
}

export function completeFollowUp(id) {
  db.prepare(
    `UPDATE followup_queue SET status = 'completed', completed_at = ? WHERE id = ?`
  ).run(new Date().toISOString(), id);
}

export function skipFollowUp(id) {
  db.prepare(
    `UPDATE followup_queue SET status = 'skipped', completed_at = ? WHERE id = ?`
  ).run(new Date().toISOString(), id);
}

export function getFollowUpStats() {
  return db.prepare(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'pending')   as pending,
       COUNT(*) FILTER (WHERE status = 'completed') as completed,
       COUNT(*) FILTER (WHERE status = 'failed')    as failed,
       COUNT(*) FILTER (WHERE status = 'skipped')   as skipped
     FROM followup_queue`
  ).get();
}

// ── Cron scheduler — runs every 15 minutes ───────────────────────────────────
export function startFollowUpScheduler() {
  console.log('[Followup] 🕐 Scheduler started — checking every 15 minutes');

  // Run immediately on startup for any overdue items
  processDueFollowUps().catch(e => console.error('[Followup] Startup run error:', e));

  // Then every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    processDueFollowUps().catch(e => console.error('[Followup] Cron error:', e));
  });

  // Daily summary at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    try {
      const { sendDailySummary } = await import('./whatomate.js');
      const stats = db.prepare(
        `SELECT
           COUNT(*) FILTER (WHERE date(created_at) = date('now')) as newLeads,
           COUNT(*) FILTER (WHERE category = 'hot')               as hotLeads,
           COUNT(*) FILTER (WHERE status = 'contacted')           as callsMade,
           COUNT(*) FILTER (WHERE status = 'quoted')              as quotesSent,
           COUNT(*) FILTER (WHERE status = 'won')                 as won
         FROM leads`
      ).get();
      await sendDailySummary(stats);
    } catch (e) {
      console.error('[Followup] Daily summary error:', e.message);
    }
  });
}
