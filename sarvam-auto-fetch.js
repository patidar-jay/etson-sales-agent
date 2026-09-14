/**
 * sarvam-auto-fetch.js
 * 
 * Uses your existing Chrome session (already logged into Sarvam)
 * to automatically fetch all past call logs and import them.
 * 
 * Run: node sarvam-auto-fetch.js
 */

import { chromium } from 'playwright';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH   = path.join(__dirname, 'backend/etson-local.db');
const BACKEND   = 'http://localhost:3001';
const SARVAM    = 'https://indus.sarvam.ai';

// ── Scoring logic (same as webhook handler) ────────────────────────
function scoreCall(data) {
  const fitScore  = parseFloat(data.discoveryFitScoreEstim || 0);
  const authority = (data.authorityLevel || '').toLowerCase();
  const timeline  = (data.timelineToDecide || '').toLowerCase();
  const pain      = (data.painPointsMentioned || '').toLowerCase();
  const disp      = (data.disposition || '').toLowerCase();
  const budget    = (data.budgetIndication || '').toLowerCase();

  let score = Math.round(fitScore * 10);
  if (authority.includes('yes') || authority.includes('owner'))      score += 10;
  if (timeline.includes('immediate') || timeline.includes('week'))   score += 10;
  if (pain.length > 10) score += 5;
  if (disp.includes('interested') || disp.includes('hot'))           score += 15;
  if (budget.length > 3) score += 5;
  score = Math.min(score, 100);

  let category = 'nurture';
  if (score >= 70) category = 'hot';
  else if (score >= 45) category = 'warm';

  let status = 'new';
  if (disp.includes('interested') || disp.includes('demo'))  status = 'contacted';
  if (disp.includes('not interested') || disp.includes('no')) status = 'lost';
  if (disp.includes('quote') || disp.includes('price'))       status = 'quoted';

  return { score, category, status };
}

// ── Save call directly to SQLite ────────────────────────────────────
function saveToSQLite(callData, scoring) {
  const db = new Database(DB_PATH);
  
  const leadId = `sarvam_${callData.interaction_id || callData.id || Date.now()}`;
  
  const existing = db.prepare('SELECT id FROM leads WHERE phone=?').get(callData.phone || '');
  
  const payload = {
    id:             existing?.id || leadId,
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
    transcript:     callData.callSummary || callData.transcript || '',
    call_duration:  callData.call_duration || callData.duration || '',
    recording_url:  callData.recording_url || null,
    notes: [
      callData.chosenNextStep    ? `Next Step: ${callData.chosenNextStep}` : null,
      callData.nextStepDateTime  ? `Follow-up: ${callData.nextStepDateTime}` : null,
      callData.sampleKitRequested === 'true' ? 'Sample kit requested' : null,
      callData.currentStateOfSolving ? `Current: ${callData.currentStateOfSolving}` : null,
    ].filter(Boolean).join('\n'),
    score_breakdown: JSON.stringify({
      discovery_fit: Math.round(parseFloat(callData.discoveryFitScoreEstim || 0) * 10),
      disposition:   scoring.status === 'contacted' ? 15 : 0,
    }),
    source:     'Sarvam AI (imported)',
    created_at: callData.created_at || callData.start_time || new Date().toISOString(),
  };

  if (existing) {
    const { id, created_at, ...update } = payload;
    const keys = Object.keys(update);
    db.prepare(`UPDATE leads SET ${keys.map(k=>k+'=?').join(',')} WHERE id=?`)
      .run(...keys.map(k => typeof update[k]==='object' ? JSON.stringify(update[k]) : update[k]), existing.id);
    db.close();
    return { action: 'updated', id: existing.id };
  } else {
    const keys = Object.keys(payload);
    db.prepare(`INSERT OR IGNORE INTO leads (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`)
      .run(...keys.map(k => typeof payload[k]==='object' ? JSON.stringify(payload[k]) : payload[k]));
    db.close();
    return { action: 'created', id: leadId };
  }
}

// ── Parse Sarvam raw call record into our format ────────────────────
function parseSarvamCall(raw) {
  // Handle different Sarvam response formats
  const call = raw?.data || raw;
  
  return {
    interaction_id:        call.id || call.interaction_id || call.call_id || call.uuid,
    phone:                 call.phone_number || call.phone || call.caller_number || call.to_number || '',
    call_duration:         call.duration || call.call_duration || '',
    recording_url:         call.recording_url || call.recording || null,
    created_at:            call.created_at || call.start_time || call.timestamp || null,
    
    // Output variables (if already logged via tool)
    userName:              call.userName || call.user_name || call.variables?.userName || '',
    companyName:           call.companyName || call.company_name || call.variables?.companyName || '',
    disposition:           call.disposition || call.variables?.disposition || call.status || '',
    discoveryFitScoreEstim: call.discoveryFitScoreEstim || call.variables?.discoveryFitScoreEstim || '5',
    painPointsMentioned:   call.painPointsMentioned || call.variables?.painPointsMentioned || '',
    currentStateOfSolving: call.currentStateOfSolving || call.variables?.currentStateOfSolving || '',
    authorityLevel:        call.authorityLevel || call.variables?.authorityLevel || '',
    budgetIndication:      call.budgetIndication || call.variables?.budgetIndication || '',
    timelineToDecide:      call.timelineToDecide || call.variables?.timelineToDecide || '',
    sampleKitRequested:    call.sampleKitRequested || call.variables?.sampleKitRequested || 'false',
    chosenNextStep:        call.chosenNextStep || call.variables?.chosenNextStep || '',
    nextStepDateTime:      call.nextStepDateTime || call.variables?.nextStepDateTime || '',
    callSummary:           call.callSummary || call.call_summary || call.variables?.callSummary || 
                           call.transcript || call.summary || '',
  };
}

// ── MAIN ────────────────────────────────────────────────────────────
(async () => {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Sarvam Auto Call Log Importer         ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');

  let capturedCalls = [];
  let capturedApiUrl = null;
  let capturedHeaders = {};

  // Use existing Chrome profile — user is already logged into Sarvam
  const CHROME_PROFILE = process.env.HOME + '/.config/google-chrome';
  
  let context, browser, page;
  
  try {
    // Try persistent context with existing Chrome profile (already logged in)
    context = await chromium.launchPersistentContext(CHROME_PROFILE, {
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
      viewport: { width: 1280, height: 900 },
      ignoreDefaultArgs: ['--enable-automation'],
    });
    page = await context.newPage();
    console.log('✅ Using existing Chrome session (no login needed)');
  } catch (e) {
    console.log('⚠️  Could not use Chrome profile, launching fresh browser...');
    browser = await chromium.launch({ headless: false, args: ['--no-sandbox'] });
    context = await browser.newContext();
    page = await context.newPage();
  }

  // ── Intercept ALL network responses ────────────────────────────────
  page.on('response', async (response) => {
    const url = response.url();
    const status = response.status();

    // Look for any JSON response that could be call logs
    if (status === 200 && (
      url.includes('call') || url.includes('log') || 
      url.includes('interaction') || url.includes('conversation') ||
      url.includes('history') || url.includes('session')
    )) {
      try {
        const ct = response.headers()['content-type'] || '';
        if (ct.includes('json')) {
          const body = await response.json().catch(() => null);
          if (body) {
            const arr = Array.isArray(body) ? body : 
                        Array.isArray(body.data) ? body.data : 
                        Array.isArray(body.calls) ? body.calls :
                        Array.isArray(body.logs) ? body.logs :
                        Array.isArray(body.interactions) ? body.interactions :
                        body.results ? body.results : null;
            
            if (arr && arr.length > 0) {
              console.log(`📡 Captured API: ${url} → ${arr.length} records`);
              capturedCalls.push(...arr);
              capturedApiUrl = url;
              capturedHeaders = response.request().headers();
            }
          }
        }
      } catch {}
    }
  });

  // ── Navigate to Sarvam ─────────────────────────────────────────────
  console.log('🌐 Opening Sarvam dashboard...');
  await page.goto(`${SARVAM}/samvoor/call-logs`, { waitUntil: 'networkidle', timeout: 30000 });

  // Check if logged in — if not, wait up to 3 minutes for manual login
  const currentUrl = page.url();
  if (currentUrl.includes('login') || currentUrl.includes('signin') || currentUrl.includes('auth')) {
    console.log('');
    console.log('🔐 Please log in to Sarvam in the browser window...');
    console.log('   (You have 3 minutes)');
    try {
      await page.waitForURL(`${SARVAM}/samvoor/**`, { timeout: 180000 });
    } catch {
      console.log('⚠️  Login timeout. Please run again and log in faster.');
      await context.close();
      process.exit(1);
    }
    await page.goto(`${SARVAM}/samvoor/call-logs`, { waitUntil: 'networkidle', timeout: 30000 });
  }

  console.log('✅ On call logs page. Waiting for data to load...');
  await page.waitForTimeout(4000);

  // Scroll to trigger pagination load
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
  }

  await page.waitForTimeout(2000);

  // ── If no calls captured via network, try DOM scraping ─────────────
  if (capturedCalls.length === 0) {
    console.log('🔍 Network capture empty, trying DOM scraping...');
    capturedCalls = await page.evaluate(() => {
      const results = [];
      
      // Try to find call entries in the DOM
      const selectors = [
        '[class*="call-item"]', '[class*="callItem"]',
        '[class*="call-row"]', '[class*="callRow"]',
        '[class*="log-item"]', '[class*="logItem"]',
        'tbody tr', '[role="row"]:not([role="columnheader"])',
        '[class*="interaction"]', '[class*="session"]'
      ];

      for (const sel of selectors) {
        const els = document.querySelectorAll(sel);
        if (els.length > 0) {
          els.forEach((el, i) => {
            const text = el.innerText || el.textContent || '';
            if (text.trim().length > 5) {
              const phone = (text.match(/(\+91\d{10}|\+\d{10,13}|[6-9]\d{9})/)||[])[0];
              const dur   = (text.match(/(\d{1,2}:\d{2})/)||[])[0];
              results.push({ raw: text.trim(), phone, duration: dur, selector: sel, index: i });
            }
          });
          if (results.length > 0) break;
        }
      }

      return results;
    });
    console.log(`   Found ${capturedCalls.length} entries via DOM`);
  }

  await browser.close();

  // ── Import captured calls ───────────────────────────────────────────
  if (capturedCalls.length === 0) {
    console.log('');
    console.log('⚠️  No call data found.');
    console.log('   This means Sarvam has no previous calls recorded,');
    console.log('   or the call logs page requires a different navigation.');
    console.log('');
    console.log('💡 Solution: Make a test call from Sarvam Outbound Campaigns');
    console.log('   It will auto-appear in your dashboard after the call ends.');
    process.exit(0);
  }

  console.log('');
  console.log(`📦 Processing ${capturedCalls.length} calls...`);
  console.log('');

  let imported = 0, updated = 0, errors = 0;

  for (const raw of capturedCalls) {
    try {
      const parsed  = parseSarvamCall(raw);
      const scoring = scoreCall(parsed);
      const result  = saveToSQLite(parsed, scoring);

      if (result.action === 'created') { imported++; }
      else { updated++; }

      console.log(`  ✅ ${result.action}: ${parsed.userName || parsed.phone || 'Unknown'} | score=${scoring.score} | ${scoring.category}`);
    } catch (e) {
      errors++;
      console.error(`  ❌ Error:`, e.message);
    }
  }

  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log(`║  Import Complete!                      ║`);
  console.log(`║  Created: ${String(imported).padEnd(29)}║`);
  console.log(`║  Updated: ${String(updated).padEnd(29)}║`);
  console.log(`║  Errors:  ${String(errors).padEnd(29)}║`);
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  console.log('📊 Open your dashboard: http://localhost:5173');
  console.log('');
})();
