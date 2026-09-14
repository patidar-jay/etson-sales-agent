import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'backend/etson-local.db');

// The scoring logic exactly matches our webhook
function scoreCall(data) {
  const fitScore  = parseFloat(data['agent_variables.discovery_fit_score_estimate'] || data.discoveryFitScoreEstim || 5);
  const authority = (data['agent_variables.authority_level'] || data.authorityLevel || '').toLowerCase();
  const timeline  = (data['agent_variables.timeline_to_decide'] || data.timelineToDecide || '').toLowerCase();
  const pain      = (data['agent_variables.pain_points_mentioned'] || data.painPointsMentioned || '').toLowerCase();
  const disp      = (data['agent_variables.disposition'] || data.disposition || '').toLowerCase();
  const budget    = (data['agent_variables.budget_indication'] || data.budgetIndication || '').toLowerCase();

  let score = Math.round(fitScore * 10);
  if (authority.includes('yes') || authority.includes('owner') || authority.includes('decision')) score += 10;
  if (timeline.includes('immediate') || timeline.includes('week')) score += 10;
  if (pain.length > 10) score += 5;
  if (disp.includes('interested') || disp.includes('hot') || disp.includes('qualified')) score += 15;
  if (budget.length > 3) score += 5;
  score = Math.min(score, 100);

  let category = score >= 70 ? 'hot' : score >= 45 ? 'warm' : 'nurture';
  
  let status = 'new';
  if (disp.includes('interested') || disp.includes('demo') || disp.includes('qualified')) status = 'contacted';
  if (disp.includes('not interested') || disp.includes('reject') || disp.includes('disqualified')) status = 'lost';
  if (disp.includes('quote') || disp.includes('price')) status = 'quoted';

  return { score, category, status, fitScore };
}

function importTSV(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    console.log(`Please save your Sarvam export data into a file named 'sarvam_export.tsv' in this folder.`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(filePath, 'utf8');
  
  // Split by newline, handle both \r\n and \n
  const lines = rawData.split(/\r?\n/).filter(line => line.trim().length > 0);
  
  if (lines.length < 2) {
    console.error("❌ File doesn't contain enough data (needs header + at least 1 row)");
    process.exit(1);
  }

  // Parse TSV (Tab Separated Values)
  const headers = lines[0].split('\t').map(h => h.trim());
  const db = new Database(DB_PATH);
  
  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t');
    const row = {};
    
    // Map array to object using headers
    headers.forEach((header, index) => {
      row[header] = values[index] ? values[index].trim() : '';
    });

    const phone = row.user_contact || row.phone_number || '';
    if (!phone) {
      skipped++;
      continue; // Skip rows without phone numbers
    }

    const interaction_id = row.interaction_id || `import_${Date.now()}_${i}`;
    const callId = `sarvam_${interaction_id}`;
    
    const scoring = scoreCall(row);

    const notes = [
      row['agent_variables.chosen_next_step'] ? `Next: ${row['agent_variables.chosen_next_step']}` : null,
      row['agent_variables.next_step_date_time'] ? `Follow-up: ${row['agent_variables.next_step_date_time']}` : null,
      row['agent_variables.sample_kit_requested'] === 'true' ? 'Sample requested' : null,
      row['agent_variables.current_state_of_solving'] ? `Current: ${row['agent_variables.current_state_of_solving']}` : null,
    ].filter(Boolean).join('\n');

    const transcript = row.transcript_en || row.transcript || row['agent_variables.call_summary'] || '';
    
    const payload = {
      id: callId,
      name: row['agent_variables.userName'] || row.user_name || 'Unknown',
      company: row['agent_variables.companyName'] || '',
      phone: phone,
      status: scoring.status,
      category: scoring.category,
      priority: scoring.score,
      supplier_pain: row['agent_variables.pain_points_mentioned'] || '',
      decision_maker: row['agent_variables.authority_level'] || '',
      budget: row['agent_variables.budget_indication'] || '',
      timeline: row['agent_variables.timeline_to_decide'] || '',
      transcript: transcript,
      call_duration: row.duration_in_seconds || '',
      recording_url: row.audio_url || null,
      notes: notes,
      score_breakdown: JSON.stringify({ discovery_fit: Math.round(scoring.fitScore * 10) }),
      source: 'Sarvam AI (bulk import)',
      created_at: row.start_datetime || new Date().toISOString(),
    };

    const existing = db.prepare('SELECT id FROM leads WHERE id=? OR phone=?').get(callId, phone);

    if (existing) {
      // Update
      const { id, created_at, ...upd } = payload;
      const uk = Object.keys(upd);
      const uv = uk.map(k => typeof upd[k] === 'object' ? JSON.stringify(upd[k]) : upd[k]);
      db.prepare(`UPDATE leads SET ${uk.map(k=>k+'=?').join(',')} WHERE id=?`).run(...uv, existing.id);
      updated++;
      console.log(`  🔄 Updated: ${payload.name} (${phone}) - Score: ${payload.priority} [${payload.category}]`);
    } else {
      // Insert
      const keys = Object.keys(payload);
      const vals = keys.map(k => typeof payload[k] === 'object' ? JSON.stringify(payload[k]) : payload[k]);
      db.prepare(`INSERT INTO leads (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).run(...vals);
      imported++;
      console.log(`  ✅ Imported: ${payload.name} (${phone}) - Score: ${payload.priority} [${payload.category}]`);
    }
  }

  db.close();
  
  console.log('\n╔════════════════════════════════════════╗');
  console.log(`║  Import Summary                        ║`);
  console.log(`║  New leads created: ${String(imported).padEnd(19)}║`);
  console.log(`║  Existing updated:  ${String(updated).padEnd(19)}║`);
  console.log(`║  Skipped (no phone): ${String(skipped).padEnd(18)}║`);
  console.log('╚════════════════════════════════════════╝');
  console.log('\n📊 Check your dashboard: http://localhost:5173\n');
}

// Run the importer
const targetFile = process.argv[2] || path.join(__dirname, 'sarvam_export.tsv');
importTSV(targetFile);
