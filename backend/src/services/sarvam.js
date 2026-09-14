/**
 * Sarvam AI Voice Agent Service
 * Uses Sarvam Instant Outbound API to trigger outbound calls.
 * Docs: https://docs.sarvam.ai/api-reference/instant-outbound/create
 *
 * Endpoint: POST https://apps.sarvam.ai/api/outbounds/v1/orgs/{org_id}/workspaces/{workspace_id}/outbounds
 */

const SARVAM_BASE         = 'https://api.sarvam.ai';
const SARVAM_OUTBOUND_BASE= 'https://apps.sarvam.ai/api';
const SARVAM_ANALYTICS    = 'https://apps.sarvam.ai/api/analytics/v1';
const SARVAM_API_KEY      = process.env.SARVAM_API_KEY;
const SARVAM_AGENT_ID     = process.env.SARVAM_APP_ID    || process.env.SARVAM_AGENT_ID;
const SARVAM_ORG_ID       = process.env.SARVAM_ORG_ID;
const SARVAM_WORKSPACE_ID = process.env.SARVAM_WORKSPACE_ID;
const SARVAM_APP_ID       = process.env.SARVAM_APP_ID;
const SARVAM_APP_VERSION  = parseInt(process.env.SARVAM_APP_VERSION || '1', 10);
const SARVAM_CONNECTION_ID= process.env.SARVAM_CONNECTION_ID;
const SARVAM_AGENT_PHONE  = process.env.SARVAM_AGENT_PHONE;

// Build analytics base URL
function analyticsBase() {
  if (!SARVAM_ORG_ID || !SARVAM_WORKSPACE_ID || !SARVAM_APP_ID) return null;
  return `${SARVAM_ANALYTICS}/${SARVAM_ORG_ID}/${SARVAM_WORKSPACE_ID}/${SARVAM_APP_ID}`;
}

function analyticsHeaders() {
  return { 'X-API-Key': SARVAM_API_KEY, 'Content-Type': 'application/json' };
}

/**
 * Normalize a phone number to E.164 format (+91XXXXXXXXXX)
 */
function normalizePhone(phone) {
  let digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) digits = '91' + digits;
  return '+' + digits;
}

/**
 * Trigger a single outbound call using Sarvam Instant Outbound API.
 * @param {string} phone  - Customer phone number (10-digit or E.164)
 * @param {object} vars   - Dynamic variables injected into the agent (name, company, etc.)
 * @param {object} opts   - Optional overrides (leadId, webhookUrl, initialMessage)
 * @returns {object}      - Sarvam API response with attempt_id
 */
export async function triggerOutboundCall(phone, vars = {}, opts = {}) {
  if (!SARVAM_API_KEY) {
    console.warn('[Sarvam] No API key configured — call logged only');
    console.log(`[Sarvam LOG] Would call: ${phone}`, vars);
    return { simulated: true, phone };
  }

  if (!SARVAM_ORG_ID || !SARVAM_WORKSPACE_ID) {
    throw new Error('SARVAM_ORG_ID and SARVAM_WORKSPACE_ID must be set in .env');
  }

  if (!SARVAM_CONNECTION_ID) {
    throw new Error('SARVAM_CONNECTION_ID not set in .env — get it from Sarvam → Phone Numbers');
  }

  if (!SARVAM_AGENT_PHONE || SARVAM_AGENT_PHONE === 'PASTE_AFTER_BUYING_NUMBER') {
    throw new Error('SARVAM_AGENT_PHONE not set in .env — buy a number from Sarvam → Phone Numbers → Buy number');
  }

  const customerPhone = normalizePhone(phone);

  const payload = {
    app_config: {
      app_id:      SARVAM_APP_ID,
      app_version: SARVAM_APP_VERSION,
      app_type:    'agent',
      connection_config: {
        connection_id:       SARVAM_CONNECTION_ID,
        agent_phone_number:  SARVAM_AGENT_PHONE,
      },
      ...(Object.keys(vars).length > 0 && { agent_variables: vars }),
    },
    user_config: {
      user_phone_number: customerPhone,
    },
    webhook_config: {
      url: opts.webhookUrl || `${process.env.APP_URL?.replace('5173', '3001') || 'http://localhost:3001'}/api/webhooks/sarvam`,
      ...(opts.leadId && { metadata: { lead_id: opts.leadId } }),
    },
  };

  console.log(`[Sarvam] Calling ${customerPhone}`, JSON.stringify(payload, null, 2));

  const url = `${SARVAM_OUTBOUND_BASE}/outbounds/v1/orgs/${SARVAM_ORG_ID}/workspaces/${SARVAM_WORKSPACE_ID}/outbounds`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-API-Key':    SARVAM_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    const msg = data?.error?.message || data?.message || JSON.stringify(data);
    throw new Error(`Sarvam API error (${res.status}): ${msg}`);
  }

  console.log(`[Sarvam] ✅ Call initiated | attempt_id: ${data.attempt_id}`);
  return data;
}

/**
 * Get status/details of a call by call_id.
 */
export async function getSarvamCallStatus(callId) {
  if (!SARVAM_API_KEY) return { status: 'simulated' };
  const res = await fetch(`${SARVAM_BASE}/v1/calls/${callId}`, {
    headers: analyticsHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Sarvam status error: ${JSON.stringify(data)}`);
  return data;
}

/**
 * Get paginated list of call attempts from Sarvam Analytics.
 */
export async function getSarvamAttempts({ limit = 20, offset = 0, start_datetime, end_datetime } = {}) {
  const base = analyticsBase();
  // Return unconfigured if placeholders not filled
  if (!base || !SARVAM_API_KEY ||
      SARVAM_ORG_ID === 'YOUR_ORG_ID_HERE' ||
      SARVAM_WORKSPACE_ID === 'YOUR_WORKSPACE_ID_HERE' ||
      SARVAM_APP_ID === 'YOUR_APP_ID_HERE') {
    return { items: [], total: 0, configured: false };
  }
  const params = new URLSearchParams({ limit, offset });
  if (start_datetime) params.set('start_datetime', start_datetime);
  if (end_datetime)   params.set('end_datetime', end_datetime);

  try {
    const res = await fetch(`${base}/attempts?${params}`, {
      headers: analyticsHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      console.warn(`[Sarvam Analytics] HTTP ${res.status} — check SARVAM_ORG_ID, SARVAM_WORKSPACE_ID, SARVAM_APP_ID in .env`);
      return { items: [], total: 0, configured: false, error: data?.detail || `HTTP ${res.status}` };
    }
    return { ...data, configured: true };
  } catch (e) {
    console.warn('[Sarvam Analytics] Fetch error:', e.message);
    return { items: [], total: 0, configured: false };
  }
}

/**
 * Get full transcript for a specific interaction.
 */
export async function getSarvamTranscript(interactionId) {
  const base = analyticsBase();
  if (!base || !SARVAM_API_KEY) return { messages: [], configured: false };

  try {
    const res = await fetch(`${base}/transcripts/${interactionId}`, {
      headers: analyticsHeaders(),
    });
    const data = await res.json();
    if (!res.ok) return { messages: [], configured: false, error: data?.detail };
    return { ...data, configured: true };
  } catch (e) {
    return { messages: [], configured: false };
  }
}

/**
 * Get recording audio URL for a specific interaction.
 */
export async function getSarvamRecording(interactionId) {
  const base = analyticsBase();
  if (!base || !SARVAM_API_KEY) return { url: null, configured: false };

  try {
    const res = await fetch(`${base}/recordings/${interactionId}`, {
      headers: analyticsHeaders(),
    });
    const data = await res.json();
    if (!res.ok) return { url: null, configured: false, error: data?.detail };
    return { ...data, configured: true };
  } catch (e) {
    return { url: null, configured: false };
  }
}
