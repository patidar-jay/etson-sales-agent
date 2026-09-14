/**
 * SARVAM CALL LOG IMPORTER
 * 
 * HOW TO USE:
 * 1. Go to https://indus.sarvam.ai/samvoor/call-logs in your browser
 * 2. Open DevTools → Console (press F12 → click Console tab)
 * 3. Paste this entire script and press Enter
 * 4. It will extract all past calls and POST them to your local backend
 * 
 * Your backend must be running: http://localhost:3001
 */

(async () => {
  const BACKEND = 'http://localhost:3001';
  let imported = 0;
  let skipped = 0;

  console.log('🚀 Sarvam Call Log Importer starting...');

  // ── Step 1: Find call log rows on the page ──────────────────────
  const extractCallsFromPage = () => {
    const calls = [];

    // Try common selectors for call log tables/lists
    const rows = document.querySelectorAll(
      'tr[class*="call"], tr[class*="log"], [class*="call-row"], [class*="call-item"], ' +
      '[class*="callLog"], [data-testid*="call"], tbody tr, [role="row"]'
    );

    rows.forEach(row => {
      const text = row.innerText || row.textContent || '';
      if (!text.trim()) return;

      // Extract phone number
      const phoneMatch = text.match(/(\+91\d{10}|\+\d{10,13}|[6-9]\d{9})/);
      const phone = phoneMatch ? phoneMatch[0] : null;

      // Extract duration (e.g. 2:30, 5:12)
      const durationMatch = text.match(/(\d{1,2}:\d{2})/);
      const duration = durationMatch ? durationMatch[0] : null;

      // Extract date
      const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\w{3}\s+\d{1,2})/);
      const date = dateMatch ? dateMatch[0] : null;

      if (phone || duration) {
        calls.push({
          raw: text.trim().substring(0, 500),
          phone,
          duration,
          date,
          element: row
        });
      }
    });

    return calls;
  };

  // ── Step 2: Try to click each row and get detail ─────────────────
  const getCallDetail = async (callData) => {
    // Click the row to open detail/modal
    try {
      callData.element.click();
      await new Promise(r => setTimeout(r, 1000));

      // Look for modal/panel content
      const detail = document.querySelector(
        '[class*="modal"], [class*="drawer"], [class*="panel"], [class*="detail"], [class*="transcript"]'
      );

      if (detail) {
        const detailText = detail.innerText || '';
        
        // Extract transcript
        const transcriptEl = detail.querySelector('[class*="transcript"], [class*="chat"], [class*="message"]');
        const transcript = transcriptEl ? transcriptEl.innerText : detailText.substring(0, 1000);

        // Extract score/disposition
        const scoreMatch = detailText.match(/score[:\s]+(\d+)/i);
        const dispMatch = detailText.match(/(interested|not interested|hot|warm|nurture|disposition)[:\s]+(\w+)/i);

        return {
          ...callData,
          transcript,
          score: scoreMatch ? scoreMatch[1] : null,
          disposition: dispMatch ? dispMatch[2] : 'completed',
          detailText: detailText.substring(0, 2000)
        };
      }

      // Close modal if open
      const closeBtn = document.querySelector('[class*="close"], [aria-label="Close"]');
      if (closeBtn) closeBtn.click();
      await new Promise(r => setTimeout(r, 300));

    } catch (e) {
      // ignore
    }

    return callData;
  };

  // ── Step 3: POST to local backend ────────────────────────────────
  const importCall = async (callData, index) => {
    const payload = {
      interaction_id: `sarvam_import_${index}_${Date.now()}`,
      phone_number:   callData.phone || '',
      call_duration:  callData.duration || '',
      callSummary:    callData.transcript || callData.raw || '',
      userName:       callData.name || 'Unknown',
      companyName:    callData.company || '',
      disposition:    callData.disposition || 'completed',
      discoveryFitScoreEstim: callData.score || '5',
      painPointsMentioned:   '',
      currentStateOfSolving: '',
      authorityLevel:        '',
      budgetIndication:      '',
      timelineToDecide:      '',
      sampleKitRequested:    'false',
      chosenNextStep:        '',
      nextStepDateTime:      callData.date || '',
    };

    try {
      const res = await fetch(`${BACKEND}/api/webhooks/sarvam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'cors'
      });
      const data = await res.json();
      if (data.success) {
        imported++;
        console.log(`✅ Imported: ${callData.phone || 'Unknown'} | score=${data.score} | ${data.category}`);
      } else {
        console.warn(`⚠️ Skipped: ${callData.phone}`, data);
        skipped++;
      }
    } catch (e) {
      console.error(`❌ Error importing call:`, e.message);
      skipped++;
    }
  };

  // ── Step 4: Also try Sarvam's internal API via fetch ─────────────
  const tryInternalAPI = async () => {
    console.log('🔍 Trying Sarvam internal API...');
    
    // Check cookies/localStorage for auth token
    const token = document.cookie || localStorage.getItem('token') || 
                  localStorage.getItem('authToken') || 
                  sessionStorage.getItem('token');

    // Try fetching from their API with current session cookies
    const endpoints = [
      '/api/v1/call-logs',
      '/api/call-logs',
      '/samvoor/api/call-logs',
    ];

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(`https://indus.sarvam.ai${endpoint}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          console.log(`✅ Found Sarvam API at ${endpoint}:`, data);
          return data;
        }
      } catch (e) { /* skip */ }
    }

    // Try XHR intercept approach - check network requests that already happened
    console.log('📡 Checking browser network for Sarvam API calls...');
    return null;
  };

  // ── MAIN EXECUTION ────────────────────────────────────────────────
  
  // First try internal API
  await tryInternalAPI();

  // Then scrape visible UI
  console.log('📋 Scanning page for call log entries...');
  const calls = extractCallsFromPage();
  console.log(`Found ${calls.length} call entries on page`);

  if (calls.length === 0) {
    console.log('⚠️ No calls found by auto-detection.');
    console.log('ℹ️ The page may need to load. Try scrolling down and run again.');
    console.log('');
    console.log('📋 Manual option: Copy the page HTML with:');
    console.log('   copy(document.documentElement.outerHTML)');
    console.log('   Then share it so I can parse the call data.');
  } else {
    // Get detail for each call and import
    for (let i = 0; i < calls.length; i++) {
      const detail = await getCallDetail(calls[i]);
      await importCall(detail, i);
      await new Promise(r => setTimeout(r, 300));
    }

    console.log('');
    console.log('═══════════════════════════════');
    console.log(`✅ Import complete!`);
    console.log(`   Imported: ${imported}`);
    console.log(`   Skipped:  ${skipped}`);
    console.log(`   Total:    ${calls.length}`);
    console.log('');
    console.log('📊 Check your dashboard: http://localhost:5173');
    console.log('═══════════════════════════════');
  }
})();
