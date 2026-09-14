/**
 * AI Intelligence Service - OpenAI Integration
 * Powers: transcript analysis, lead scoring, WhatsApp agent, follow-up composer
 * Add OPENAI_API_KEY to .env to activate. Gracefully degrades without key.
 * Respects the ai_agent_enabled setting — if false, all AI functions return null.
 */
import db from '../config/localdb.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

/**
 * Check if AI agent is enabled (reads live from settings table)
 */
function isAIEnabled() {
  try {
    const row = db.prepare(`SELECT value FROM settings WHERE key = 'ai_agent_enabled'`).get();
    return row?.value !== 'false';
  } catch {
    return true; // fail-open
  }
}

/**
 * Core AI call helper
 */
async function callOpenAI(systemPrompt, userMessage, options = {}) {
  if (!OPENAI_API_KEY) {
    console.log('[AI] No OPENAI_API_KEY set — skipping AI enrichment');
    return null;
  }
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: options.temperature || 0.3,
        max_tokens: options.maxTokens || 500,
        response_format: options.json ? { type: 'json_object' } : undefined,
      })
    });
    if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
    const data = await response.json();
    return data.choices[0].message.content;
  } catch(e) {
    console.error('[AI] OpenAI call failed:', e.message);
    return null;
  }
}

/**
 * Analyze a call transcript and extract/enrich lead data
 * Returns: { summary, score_adjustment, key_insights, next_action }
 */
export async function analyzeTranscript(transcript, leadData = {}) {
  if (!isAIEnabled()) { console.log('[AI] Disabled — skipping transcript analysis'); return null; }
  if (!transcript) return null;
  const systemPrompt = `You are an expert B2B sales analyst for Etson Manufacturing, a thermal paper roll manufacturer in India.
Analyze sales call transcripts and extract structured insights. Always respond in JSON format.

Etson products: Thermal paper rolls (57mm, 80mm, 110mm widths), Barcode labels, ATM rolls.
Target customers: Retail chains, POS system users, logistics companies, banks.`;

  const userMessage = `Analyze this sales call transcript and return JSON with:
{
  "summary": "2-3 sentence summary of the call",
  "score_adjustment": number between -20 and +20 (how much to adjust existing score),
  "key_insights": ["insight1", "insight2"],
  "recommended_next_action": "specific next step",
  "product_specs_found": { "width": "...", "volume": "...", "application": "..." },
  "sentiment": "positive|neutral|negative",
  "objections": ["any objections raised"]
}

Transcript:
${transcript.slice(0, 3000)}`;

  const result = await callOpenAI(systemPrompt, userMessage, { json: true });
  if (!result) return null;
  try { return JSON.parse(result); } catch { return null; }
}

/**
 * Generate a WhatsApp reply based on incoming message + lead context
 * Returns: string (the message to send back)
 */
export async function generateWhatsAppReply(incomingMessage, leadData = {}, customSystemPrompt = null) {
  if (!isAIEnabled()) { console.log('[AI] Disabled — skipping WhatsApp reply generation'); return null; }
  const defaultPrompt = `You are Ananya, a professional sales representative for Etson Manufacturing (thermal paper rolls & barcode labels in India).
You are responding to a WhatsApp message from a potential B2B customer.
Be helpful, professional, and focused on understanding their needs and moving toward a sale.
Respond in the same language the customer used (Hindi, English, or Hinglish).
Keep replies concise — 2-4 sentences max. Never be pushy.

Customer context:
- Name: ${leadData.name || 'Unknown'}
- Company: ${leadData.company || 'Unknown'}
- Category: ${leadData.category || 'nurture'}
- Previous notes: ${leadData.notes || 'None'}`;

  const systemPrompt = customSystemPrompt || defaultPrompt;
  return await callOpenAI(systemPrompt, `Customer message: "${incomingMessage}"\n\nGenerate a reply:`, { temperature: 0.7, maxTokens: 200 });
}

/**
 * Write a personalized follow-up message for a lead
 * Returns: string (follow-up message text)
 */
export async function composeFollowUp(lead, dayNumber, channel = 'whatsapp') {
  if (!isAIEnabled()) { console.log('[AI] Disabled — skipping follow-up composition'); return null; }
  const systemPrompt = `You are Ananya from Etson Manufacturing. Write a ${channel} follow-up message for Day ${dayNumber} of the sales cadence.
Be warm, reference the original call, and have a clear call-to-action.
Respond in Hinglish (mix of Hindi and English) unless lead language suggests otherwise.
Max 100 words.`;

  const userMessage = `Lead: ${lead.name} from ${lead.company}
Call summary: ${lead.transcript?.slice(0,200) || 'Discovery call completed'}
Category: ${lead.category}
Notes: ${lead.notes || 'None'}
Day ${dayNumber} follow-up purpose: ${dayNumber === 3 ? 'Check if they received quote/catalog' : dayNumber === 7 ? 'WhatsApp check-in' : 'Re-engagement'}`;

  return await callOpenAI(systemPrompt, userMessage, { temperature: 0.8, maxTokens: 150 });
}

/**
 * Generate a daily digest summary for the sales team
 */
export async function generateDailySummary(stats, hotLeads = []) {
  if (!isAIEnabled()) { console.log('[AI] Disabled — skipping daily summary'); return null; }
  const systemPrompt = `You are a sales operations analyst. Write a concise daily WhatsApp/email digest for the Etson Manufacturing sales team. Max 200 words. Be energetic and action-oriented.`;
  const userMessage = `Today's stats:
- New leads: ${stats.newLeads || 0}
- Hot leads: ${stats.hotLeads || 0}
- Calls made: ${stats.callsMade || 0}
- Quotes sent: ${stats.quotesSent || 0}

Top hot leads today:
${hotLeads.slice(0,3).map(l => `- ${l.name} (${l.company}): ${l.notes?.slice(0,60) || 'Interested'}`).join('\n')}

Write a motivating daily summary.`;

  return await callOpenAI(systemPrompt, userMessage, { temperature: 0.8, maxTokens: 250 });
}
