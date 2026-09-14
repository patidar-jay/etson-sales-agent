/**
 * sarvam-fetch-v2.js
 * Uses copied Chrome profile (already logged into Sarvam) to
 * intercept network calls and extract all past call logs automatically.
 */

import { chromium } from 'playwright';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH   = path.join(__dirname, 'backend/etson-local.db');
const SARVAM    = 'https://indus.sarvam.ai';
const CHROME_COPY = '/tmp/chrome-sarvam'; // copied profile — no lock issues

function scoreCall(data) {
  const fitScore  = parseFloat(data.discoveryFitScoreEstim || 5);
  const authority = (data.authorityLevel || '').toLowerCase();
  const timeline  = (data.timelineToDecide || '').toLowerCase();
  const pain      = (data.painPointsMentioned || '').toLowerCase();
  const disp      = (data.disposition || '').toLowerCase();
  const budget    = (data.budgetIndication || '').toLowerCase();

  let score = Math.round(fitScore * 10);
  if (authority.includes('yes') || authority.includes('owner')) score += 10;
  if (timeline.includes('immediate') || timeline.includes('week')) score += 10;
  if (pain.length > 10) score += 5;
  if (disp.includes('interested') || disp.includes('hot')) score += 15;
  if (budget.length > 3) score += 5;
  score = Math.min(score, 100);

  let category = score >= 70 ? 'hot' : score >= 45 ? 'warm' : 'nurture';
  let status = 'new';
  if (disp.includes('interested') || disp.includes('demo')) status = 'contacted';
  if (disp.includes('not interested') || disp.includes('reject')) status = 'lost';
  if (disp.includes('quote') || disp.includes('price')) status = 'quoted';

  return { score, category, status };
}

function saveToSQLite(callData, scoring) {
  const db = new Database(DB_PATH);
  const callId = `sarvam_${callData.interaction_id || callData.id || Date.now()}`;
  const existing = db.prepare('SELECT id FROM leads WHERE id=? OR phone=?')
                     .get(callId, callData.phone || '');

  const notes = [
    callData.chosenNextStep    ? `Next Step: ${callData.chosenNextStep}` : null,
    callData.nextStepDateTime  ? `Follow-up: ${callData.nextStepDateTime}` : null,
    callData.sampleKitRequested === 'true' ? 'Sample kit requested' : null,
    callData.currentStateOfSolving ? `Current: ${callData.currentStateOfSolving}` : null,
  ].filter(Boolean).join('\n');

  const payload = {
    id:             existing?.id || callId,
    name:           callData.userName || callData.name || 'Unknown',
    company:        callData.companyName || callData.company || '',
    phone:          callData.phone || callData.phone_number || '',
    status:         scoring.status,
    category:       scoring.category,
    priority:       scoring.score,
    supplier_pain:  callData.painPointsMentioned || '',
    decision_maker: callData.authorityLevel || '',
    budget:         callData.budgetIndication || '',
    timeline:       callData.timelineToDecide || '',
    transcript:     callData.callSummary || callData.transcript || callData.summary || '',
    call_duration:  callData.call_duration || callData.duration || '',
    recording_url:  callData.recording_url || null,
    notes,
    score_breakdown: JSON.stringify({ discovery_fit: Math.round(parseFloat(callData.discoveryFitScoreEstim || 5) * 10) }),
    source:     'Sarvam AI (imported)',
    created_at: callData.created_at || callData.start_time || new Date().toISOString(),
  };

  const keys = Object.keys(payload);
  const vals = keys.map(k => typeof payload[k] === 'object' ? JSON.stringify(payload[k]) : payload[k]);

  if (existing) {
    const { id, created_at, ...upd } = payload;
    const uk = Object.keys(upd);
    const uv = uk.map(k => typeof upd[k] === 'object' ? JSON.stringify(upd[k]) : upd[k]);
    db.prepare(`UPDATE leads SET ${uk.map(k=>k+'=?').join(',')} WHERE id=?`).run(...uv, existing.id);
    db.close();
    return { action: 'updated', id: existing.id };
  } else {
    db.prepare(`INSERT OR IGNORE INTO leads (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).run(...vals);
    db.close();
    return { action: 'created', id: callId };
  }
}

function parseSarvamCall(raw) {
  const c = raw?.data || raw;
  return {
    interaction_id:         c.id || c.interaction_id || c.call_id || c.uuid || `${Date.now()}`,
    phone:                  c.phone_number || c.phone || c.caller_number || c.to_number || '',
    call_duration:          c.duration || c.call_duration || '',
    recording_url:          c.recording_url || c.recording || null,
    created_at:             c.created_at || c.start_time || c.timestamp || null,
    userName:               c.userName || c.user_name || c.variables?.userName || c.name || '',
    companyName:            c.companyName || c.company_name || c.variables?.companyName || c.company || '',
    disposition:            c.disposition || c.variables?.disposition || c.status || '',
    discoveryFitScoreEstim: c.discoveryFitScoreEstim || c.variables?.discoveryFitScoreEstim || '5',
    painPointsMentioned:    c.painPointsMentioned || c.variables?.painPointsMentioned || '',
    currentStateOfSolving:  c.currentStateOfSolving || c.variables?.currentStateOfSolving || '',
    authorityLevel:         c.authorityLevel || c.variables?.authorityLevel || '',
    budgetIndication:       c.budgetIndication || c.variables?.budgetIndication || '',
    timelineToDecide:       c.timelineToDecide || c.variables?.timelineToDecide || '',
    sampleKitRequested:     c.sampleKitRequested || c.variables?.sampleKitRequested || 'false',
    chosenNextStep:         c.chosenNextStep || c.variables?.chosenNextStep || '',
    nextStepDateTime:       c.nextStepDateTime || c.variables?.nextStepDateTime || '',
    callSummary:            c.callSummary || c.call_summary || c.variables?.callSummary ||
                            c.transcript || c.summary || '',
  };
}

(async () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  Sarvam Call Log Auto-Importer v2      ║');
  console.log('╚════════════════════════════════════════╝\n');

  let capturedCalls = [];
  let foundApiUrl = null;

  // Launch with copied Chrome profile (pre-authenticated)
  console.log('🌐 Opening browser with existing session...');
  const context = await chromium.launchPersistentContext(CHROME_COPY, {
    headless: false,
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--profile-directory=Default'],
    viewport: { width: 1280, height: 900 },
  }).catch(async () => {
    // Fallback: use bundled chromium with cookies injected
    console.log('   Using bundled Chromium...');
    return await chromium.launchPersistentContext('/tmp/chrome-fresh-' + Date.now(), {
      headless: false,
      args: ['--no-sandbox'],
      viewport: { width: 1280, height: 900 },
    });
  });

  const page = await context.newPage();

  // Intercept ALL JSON API responses
  page.on('response', async (response) => {
    const url = response.url();
    const status = response.status();
    if (status !== 200) return;

    const ct = response.headers()['content-type'] || '';
    if (!ct.includes('json')) return;

    try {
      const body = await response.json();
      const candidates = [body, body?.data, body?.calls, body?.logs,
                          body?.interactions, body?.results, body?.items];
      for (const c of candidates) {
        if (Array.isArray(c) && c.length > 0 && (c[0]?.id || c[0]?.phone || c[0]?.duration)) {
          console.log(`\n📡 API captured: ${url}`);
          console.log(`   → ${c.length} records found`);
          capturedCalls.push(...c);
          foundApiUrl = url;
        }
      }
    } catch {}
  });

  // Navigate to call logs
  await page.goto(`${SARVAM}/samvoor/call-logs`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  }).catch(() => {});

  const currentUrl = page.url();
  console.log(`📍 Current URL: ${currentUrl}`);

  if (currentUrl.includes('login') || currentUrl.includes('auth')) {
    console.log('\n🔐 Login required. Please log in in the browser window...');
    console.log('   Waiting up to 3 minutes...');
    await page.waitForURL(`${SARVAM}/samvoor/**`, { timeout: 180000 })
      .catch(() => { console.log('⚠️  Login timed out'); });
    await page.goto(`${SARVAM}/samvoor/call-logs`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  }

  console.log('✅ On Sarvam. Waiting for call logs to load...');
  await page.waitForTimeout(5000);

  // Scroll to load all entries
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(800);
  }
  await page.waitForTimeout(2000);

  // DOM scrape if API not captured
  if (capturedCalls.length === 0) {
    console.log('🔍 Network API not found, scraping DOM...');
    capturedCalls = await page.evaluate(() => {
      const results = [];
      const sels = [
        'tr', '[class*="row"]', '[class*="item"]',
        '[class*="call"]', '[class*="log"]', '[class*="session"]'
      ];
      for (const sel of sels) {
        document.querySelectorAll(sel).forEach(el => {
          const text = (el.innerText || '').trim();
          if (text.length < 5 || text.length > 2000) return;
          const phone = (text.match(/(\+91\d{10}|\+\d{10,13}|[6-9]\d{9})/)||[])[0];
          const dur   = (text.match(/(\d{1,2}:\d{2})/)||[])[0];
          if (phone || dur) results.push({ raw: text, phone, duration: dur });
        });
        if (results.length > 0) break;
      }
      return results;
    });
    console.log(`   Found ${capturedCalls.length} DOM entries`);
  }

  await context.close();

  if (capturedCalls.length === 0) {
    console.log('\n⚠️  No call data found in Sarvam.');
    console.log('   This likely means no calls have been made yet through your agent.');
    console.log('\n💡 Next step: Go to Sarvam → Outbound campaigns → Start a campaign');
    console.log('   Each completed call will auto-appear via webhook in your dashboard.');
    process.exit(0);
  }

  // Import all
  console.log(`\n📦 Importing ${capturedCalls.length} calls into local dashboard...\n`);
  let created = 0, updated = 0, errors = 0;

  for (const raw of capturedCalls) {
    try {
      const parsed  = parseSarvamCall(raw);
      const scoring = scoreCall(parsed);
      const result  = saveToSQLite(parsed, scoring);
      if (result.action === 'created') created++;
      else updated++;
      console.log(`  ✅ ${result.action}: ${parsed.userName || parsed.phone || 'Unknown'} | score=${scoring.score} | ${scoring.category}`);
    } catch (e) {
      errors++;
      console.error(`  ❌ Error: ${e.message}`);
    }
  }

  console.log('\n╔════════════════════════════════════════╗');
  console.log(`║  Import Done!                          ║`);
  console.log(`║  Created : ${String(created).padEnd(28)}║`);
  console.log(`║  Updated : ${String(updated).padEnd(28)}║`);
  console.log(`║  Errors  : ${String(errors).padEnd(28)}║`);
  console.log('╚════════════════════════════════════════╝');
  console.log('\n📊 Dashboard: http://localhost:5173\n');
})();
