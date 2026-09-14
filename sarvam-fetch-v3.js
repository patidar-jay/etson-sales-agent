/**
 * sarvam-fetch-v3.js
 * Injects decrypted Chrome cookies directly into Playwright
 * → No login needed, goes straight to call logs
 */

import { chromium } from 'playwright';
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH    = path.join(__dirname, 'backend/etson-local.db');
const SARVAM     = 'https://indus.sarvam.ai';
const COOKIES_F  = '/tmp/sarvam_cookies.json';

function scoreCall(d) {
  let score = Math.round(parseFloat(d.discoveryFitScoreEstim || 5) * 10);
  if ((d.authorityLevel||'').match(/yes|owner/i)) score += 10;
  if ((d.timelineToDecide||'').match(/immediate|week/i)) score += 10;
  if ((d.painPointsMentioned||'').length > 10) score += 5;
  if ((d.disposition||'').match(/interested|hot/i)) score += 15;
  if ((d.budgetIndication||'').length > 3) score += 5;
  score = Math.min(score, 100);
  const category = score >= 70 ? 'hot' : score >= 45 ? 'warm' : 'nurture';
  let status = 'new';
  if ((d.disposition||'').match(/interested|demo/i)) status = 'contacted';
  if ((d.disposition||'').match(/not interested|reject/i)) status = 'lost';
  return { score, category, status };
}

function saveToSQLite(d, scoring) {
  const db  = new Database(DB_PATH);
  const cid = `sarvam_${d.interaction_id || Date.now()}`;
  const ex  = db.prepare('SELECT id FROM leads WHERE id=? OR (phone!=\'\' AND phone=?)').get(cid, d.phone||'');
  
  const rec = {
    id:             ex?.id || cid,
    name:           d.userName || d.name || 'Unknown',
    company:        d.companyName || d.company || '',
    phone:          d.phone || d.phone_number || '',
    status:         scoring.status,
    category:       scoring.category,
    priority:       scoring.score,
    supplier_pain:  d.painPointsMentioned || '',
    decision_maker: d.authorityLevel || '',
    budget:         d.budgetIndication || '',
    timeline:       d.timelineToDecide || '',
    transcript:     d.callSummary || d.transcript || d.summary || '',
    call_duration:  d.call_duration || d.duration || '',
    recording_url:  d.recording_url || null,
    notes: [
      d.chosenNextStep   ? `Next: ${d.chosenNextStep}` : null,
      d.nextStepDateTime ? `Follow-up: ${d.nextStepDateTime}` : null,
      d.sampleKitRequested === 'true' ? 'Sample requested' : null,
    ].filter(Boolean).join('\n'),
    score_breakdown: JSON.stringify({ discovery_fit: Math.round(parseFloat(d.discoveryFitScoreEstim||5)*10) }),
    source:     'Sarvam AI (imported)',
    created_at: d.created_at || d.start_time || new Date().toISOString(),
  };

  const keys = Object.keys(rec);
  const vals = keys.map(k => typeof rec[k]==='object' ? JSON.stringify(rec[k]) : rec[k]);

  if (ex) {
    const {id, created_at, ...upd} = rec;
    const uk = Object.keys(upd);
    db.prepare(`UPDATE leads SET ${uk.map(k=>k+'=?').join(',')} WHERE id=?`)
      .run(...uk.map(k=>typeof upd[k]==='object'?JSON.stringify(upd[k]):upd[k]), ex.id);
    db.close(); return { action: 'updated', id: ex.id };
  }
  db.prepare(`INSERT OR IGNORE INTO leads (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`)
    .run(...vals);
  db.close(); return { action: 'created', id: cid };
}

function parseRaw(raw) {
  const c = raw?.data || raw;
  return {
    interaction_id:         c.id || c.interaction_id || c.call_id || c.uuid || `imp_${Date.now()}`,
    phone:                  c.phone_number || c.phone || c.caller || c.to_number || '',
    call_duration:          c.duration || c.call_duration || '',
    recording_url:          c.recording_url || null,
    created_at:             c.created_at || c.start_time || null,
    userName:               c.userName || c.user_name || c.variables?.userName || c.name || '',
    companyName:            c.companyName || c.company_name || c.variables?.companyName || '',
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
  console.log('║  Sarvam Importer v3 (Cookie Injection) ║');
  console.log('╚════════════════════════════════════════╝\n');

  // Load pre-exported decrypted cookies
  const rawCookies = JSON.parse(readFileSync(COOKIES_F, 'utf8'));
  console.log(`🍪 Loaded ${rawCookies.length} decrypted session cookies`);

  let capturedCalls = [];

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });

  // Inject all Sarvam cookies BEFORE navigating
  await context.addCookies(rawCookies);
  console.log('✅ Session cookies injected');

  const page = await context.newPage();

  // Intercept every JSON response
  page.on('response', async (res) => {
    if (res.status() !== 200) return;
    if (!(res.headers()['content-type']||'').includes('json')) return;
    try {
      const body = await res.json();
      for (const key of [null, 'data','calls','logs','interactions','results','items','sessions']) {
        const arr = key ? body?.[key] : body;
        if (Array.isArray(arr) && arr.length > 0 &&
            (arr[0]?.id || arr[0]?.phone || arr[0]?.duration || arr[0]?.call_id)) {
          console.log(`📡 Captured: ${res.url()} → ${arr.length} records`);
          capturedCalls.push(...arr);
          break;
        }
      }
    } catch {}
  });

  // Navigate — cookies should authenticate automatically
  console.log('🌐 Navigating to Sarvam call logs...');
  await page.goto(`${SARVAM}/samvoor/call-logs`, {
    waitUntil: 'networkidle',
    timeout: 30000,
  }).catch(() => {});

  const url = page.url();
  console.log(`📍 Landed at: ${url}`);

  if (url.includes('login')) {
    console.log('\n⚠️  Still on login page — cookies did not authenticate.');
    console.log('📋 Falling back to DOM scrape after manual login...');
    console.log('   Please log in in the browser window (3 min)...');
    await page.waitForURL(`${SARVAM}/samvoor/**`, { timeout: 180000 }).catch(() => {});
    await page.goto(`${SARVAM}/samvoor/call-logs`, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
  }

  console.log('⏳ Loading all call log entries...');
  await page.waitForTimeout(4000);

  // Scroll to load all
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(600);
  }
  await page.waitForTimeout(2000);

  // DOM fallback
  if (capturedCalls.length === 0) {
    console.log('🔍 Scraping DOM for call entries...');
    const domCalls = await page.evaluate(() => {
      const results = [];
      for (const sel of ['tr','[class*="call"]','[class*="log"]','[class*="row"]','[class*="item"]']) {
        document.querySelectorAll(sel).forEach(el => {
          const text = (el.innerText||'').trim();
          if (text.length < 5 || text.length > 3000) return;
          const phone = (text.match(/(\+91\d{10}|\+\d{10,13}|[6-9]\d{9})/)||[])[0];
          const dur   = (text.match(/(\d{1,2}:\d{2})/)||[])[0];
          if (phone || dur) results.push({ phone, duration: dur, raw: text.slice(0,500) });
        });
        if (results.length) break;
      }
      return results;
    });
    capturedCalls.push(...domCalls);
    console.log(`   Found ${domCalls.length} entries via DOM`);
  }

  await browser.close();

  // ── Import ──────────────────────────────────────────────────────
  if (capturedCalls.length === 0) {
    console.log('\n⚠️  No call data found.');
    console.log('   → Your Sarvam agent has no past calls yet, OR');
    console.log('   → The call logs page uses a non-standard format.');
    console.log('\n💡 Make a test call via Sarvam → Outbound Campaigns');
    console.log('   It will auto-import via webhook after the call ends.');
    process.exit(0);
  }

  console.log(`\n📦 Importing ${capturedCalls.length} calls...\n`);
  let created = 0, updated = 0, errors = 0;

  for (const raw of capturedCalls) {
    try {
      const parsed = parseRaw(raw);
      const scoring = scoreCall(parsed);
      const result = saveToSQLite(parsed, scoring);
      if (result.action === 'created') created++;
      else updated++;
      console.log(`  ✅ ${result.action}: ${parsed.userName||parsed.phone||'Unknown'} | score=${scoring.score} | ${scoring.category}`);
    } catch(e) {
      errors++;
      console.error(`  ❌ ${e.message}`);
    }
  }

  console.log('\n╔════════════════════════════════════════╗');
  console.log(`║  Done! Created=${created} Updated=${updated} Errors=${errors}`.padEnd(41)+'║');
  console.log('╚════════════════════════════════════════╝');
  console.log('\n📊 Dashboard: http://localhost:5173\n');
})();
