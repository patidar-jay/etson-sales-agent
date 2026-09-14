/**
 * Whatomate WhatsApp Service
 * All API paths verified against running Whatomate instance.
 *
 * Correct API base: /api (NOT /api/v1)
 * Auth header:      X-API-Key: whm_xxx
 *
 * Verified endpoints:
 *   GET  /api/contacts            → list contacts ✅
 *   POST /api/contacts            → create contact ✅
 *   POST /api/contacts/:id/send   → send message ✅ (needs WA account connected)
 */
import db from '../config/localdb.js';

const WHATOMATE_URL     = process.env.WHATOMATE_URL     || 'http://localhost:8080';
const WHATOMATE_API_KEY = process.env.WHATOMATE_API_KEY || '';
const SALES_WA          = process.env.SALES_TEAM_WHATSAPP || '916267178440';
const APP_URL           = process.env.APP_URL           || 'http://localhost:5173';

/** Common headers for all Whatomate API calls */
const wmHeaders = () => ({
  'X-API-Key':    WHATOMATE_API_KEY,
  'Content-Type': 'application/json',
});

/** Check if outgoing WA messages are enabled */
function isSendEnabled() {
  try {
    const row = db.prepare(`SELECT value FROM settings WHERE key = 'whatsapp_send_enabled'`).get();
    return row?.value !== 'false';
  } catch {
    return true;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create or update a contact in Whatomate.
 * Called automatically after every Sarvam call to sync lead data.
 */
export async function wmUpsertContact(lead) {
  if (!WHATOMATE_API_KEY) return null;
  try {
    const digits = String(lead.phone || '').replace(/\D/g, '');
    if (!digits || digits.length < 10) return null;

    // Tags based on category
    const tags = [];
    if (lead.category) tags.push(lead.category);          // hot / warm / nurture
    if (lead.disposition) tags.push(lead.disposition);
    tags.push('sarvam-call');

    // Rich metadata
    const metadata = {
      score:       lead.priority   || 0,
      company:     lead.company    || '',
      city:        lead.city       || '',
      budget:      lead.budget     || '',
      timeline:    lead.timeline   || '',
      etson_id:    lead.id         || '',
      last_call:   new Date().toISOString(),
    };

    const body = {
      phone_number:  digits,
      profile_name:  lead.name || 'Unknown',
      tags,
      metadata,
    };

    const res = await fetch(`${WHATOMATE_URL}/api/contacts`, {
      method:  'POST',
      headers: wmHeaders(),
      body:    JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      console.warn(`[Whatomate] Contact upsert issue (${res.status}):`, data?.message);
      return null;
    }
    console.log(`[Whatomate] ✅ Contact synced: ${lead.name} (${digits})`);
    return data?.data || data;
  } catch (e) {
    console.error('[Whatomate] Contact upsert error:', e.message);
    return null;
  }
}

/**
 * Get all contacts from Whatomate.
 */
export async function wmGetContacts(limit = 50, page = 1) {
  if (!WHATOMATE_API_KEY) return [];
  try {
    const res = await fetch(
      `${WHATOMATE_URL}/api/contacts?limit=${limit}&page=${page}`,
      { headers: wmHeaders() }
    );
    const data = await res.json();
    return data?.data?.contacts || [];
  } catch (e) {
    console.error('[Whatomate] Get contacts error:', e.message);
    return [];
  }
}

/**
 * Health check — is Whatomate reachable and API key valid?
 */
export async function wmStatus() {
  try {
    const res = await fetch(`${WHATOMATE_URL}/api/contacts?limit=1`, {
      headers: wmHeaders(),
      signal:  AbortSignal.timeout(3000),
    });
    return {
      reachable: true,
      authenticated: res.ok,
      status: res.status,
    };
  } catch {
    return { reachable: false, authenticated: false, status: 0 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE SENDING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send a text message via Whatomate.
 * Note: Requires a WhatsApp account (phone number) to be connected
 * in Whatomate Settings → WhatsApp Accounts first.
 */
export async function wmSend(phone, text) {
  if (!isSendEnabled()) {
    console.log(`[Whatomate] FROZEN — message blocked to ${phone}`);
    return null;
  }
  if (!WHATOMATE_API_KEY) {
    console.log('[Whatomate] No API key — message logged only:');
    console.log(`  To: ${phone}\n  ${text.substring(0, 100)}...`);
    return null;
  }
  if (!phone) {
    console.warn('[Whatomate] No phone number provided, skipping');
    return null;
  }
  try {
    const digits = String(phone).replace(/\D/g, '');

    // Step 1: ensure contact exists
    const contact = await wmUpsertContact({ phone: digits, name: '' });
    const contactId = contact?.id;

    if (!contactId) {
      console.warn(`[Whatomate] Could not get contact ID for ${digits}`);
      return null;
    }

    // Step 2: send message to contact
    const res = await fetch(`${WHATOMATE_URL}/api/contacts/${contactId}/send`, {
      method:  'POST',
      headers: wmHeaders(),
      body:    JSON.stringify({ message: text, type: 'text' }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    console.log(`[Whatomate] ✅ Sent to ${digits}`);
    return data;
  } catch (e) {
    console.error(`[Whatomate] Send failed to ${phone}:`, e.message);
    return null;
  }
}

/**
 * Send a document/PDF via Whatomate.
 */
export async function wmSendDocument(phone, pdfUrl, filename, caption) {
  if (!isSendEnabled() || !WHATOMATE_API_KEY || !phone) return null;
  try {
    const digits = String(phone).replace(/\D/g, '');
    const contact = await wmUpsertContact({ phone: digits, name: '' });
    const contactId = contact?.id;
    if (!contactId) return null;

    const res = await fetch(`${WHATOMATE_URL}/api/contacts/${contactId}/send`, {
      method:  'POST',
      headers: wmHeaders(),
      body:    JSON.stringify({
        type:     'document',
        mediaUrl: pdfUrl,
        filename: filename || 'document.pdf',
        caption:  caption  || '',
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    console.log(`[Whatomate] ✅ Document sent to ${digits} | ${filename}`);
    return data;
  } catch (e) {
    console.error(`[Whatomate] Document send failed to ${phone}:`, e.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BUSINESS NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const sendHotLeadAlert = async (lead) => {
  const score = lead.priority || 0;
  const text = [
    `🔥 HOT LEAD ALERT!`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `👤 Name: ${lead.name || 'Unknown'}`,
    `🏢 Company: ${lead.company || 'N/A'}`,
    `📊 Score: ${score}/100`,
    `📞 Phone: ${lead.phone || 'N/A'}`,
    `💰 Budget: ${lead.budget || 'N/A'}`,
    `⏰ Timeline: ${lead.timeline || 'N/A'}`,
    lead.notes ? `📝 Notes: ${lead.notes.split('\n')[0]}` : null,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🔗 View: ${APP_URL}/leads/${lead.id}`,
    `⚡ Follow up within 24 hours!`,
  ].filter(Boolean).join('\n');

  await wmSend(SALES_WA, text);
};

export const sendQuoteToProspect = async (quote, lead, pdfBase64) => {
  const text = [
    `Namaste *${lead.name || 'Sir/Madam'}* ji! 🙏`,
    ``,
    `Main *Etson Manufacturing* se Ananya bol rahi hoon.`,
    ``,
    `Aapke liye humari *Quotation* taiyaar hai:`,
    `📦 Product: Thermal Paper Rolls & Barcode Labels`,
    lead.budget ? `💰 Budget Range: ${lead.budget}` : null,
    `✅ BPA-free premium quality`,
    `🚚 Pan-India delivery included`,
    `📄 GST invoice provided`,
    ``,
    `Detailed quote aapko email mein bheji ja rahi hai.`,
    `Koi bhi sawaal ho to seedha yahan reply karein!`,
    ``,
    `— Ananya | Etson Sales Team`,
  ].filter(Boolean).join('\n');

  if (lead.phone) await wmSend(lead.phone, text);

  if (pdfBase64 && lead.phone) {
    await wmSendDocument(lead.phone, `data:application/pdf;base64,${pdfBase64}`,
      `Quote-${quote?.id || 'draft'}.pdf`, 'Your Etson Quotation');
  }

  const salesText = [
    `📋 *QUOTE SENT*`,
    `👤 ${lead.name} | ${lead.company}`,
    `📞 ${lead.phone}`,
    `🔗 ${APP_URL}/leads/${lead.id}`,
  ].join('\n');
  await wmSend(SALES_WA, salesText);
};

export const sendFollowUpReminder = async (lead, message) => {
  const text = [
    `⏰ *FOLLOW-UP REMINDER*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `👤 *${lead.name}* | ${lead.company || 'N/A'}`,
    `📞 ${lead.phone}`,
    `🏷️ Category: ${(lead.category || 'nurture').toUpperCase()}`,
    ``,
    `✅ ${message}`,
    `🔗 ${APP_URL}/leads/${lead.id}`,
  ].filter(Boolean).join('\n');
  await wmSend(SALES_WA, text);
};

export const sendDailySummary = async (summaryText) => {
  const text = [
    `📊 *ETSON DAILY SUMMARY*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    summaryText,
    ``,
    `🔗 Dashboard: ${APP_URL}`,
    `Good work team! 💪`,
  ].join('\n');
  await wmSend(SALES_WA, text);
};

export const sendProspectFollowUp = async (lead, message) => {
  if (!lead.phone || !message) return;
  await wmSend(lead.phone, message);
};
