/**
 * Direct import of all 6 Sarvam calls parsed from the 3-part export data
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'backend/etson-local.db');

// ── All 6 calls extracted from the 3-part Sarvam export ─────────────────────
const calls = [
  {
    id: 'sarvam_20260905_2bf228de',
    name: 'Ravi Nair',
    company: 'BrightTech Solutions',
    phone: '917052386067',
    call_duration: '183.99',
    created_at: 'Sep 05, 2026, 10:09:57 PM',
    recording_url: 'https://agents.sarvam.ai/media?org_id=01a070e6-bd52-736f-8f9c-9ddb8178a4f8&workspace_id=01a070e6-bd63-78b6-8726-3336ed438ced&app_id=Conversatio-8eaeaf2f-9a7a&interaction_id=20260905/2bf228de-22:09:57-7b0d583f&audio_hash=merged_audio',
    disposition: 'needs_more_discovery',
    discovery_fit: 5,
    authority_level: 'needs_more_discovery',
    budget: '',
    timeline: '',
    pain_points: '',
    chosen_next_step: 'none',
    next_step_date: '',
    sample_kit: 'not_discussed',
    call_summary: 'The agent connected with Ravi Nair, who transferred the call to his assistant. After some initial confusion and language barriers, the assistant agreed to discuss thermal paper and barcode label supplies, but the call ended before any specific pain points or requirements were shared.',
    transcript: 'Agent connected with Ravi Nair who transferred to assistant Mohi. Language barrier (Bhojpuri). Assistant agreed to discuss supply needs but call ended early. No pain points captured.',
    channel: 'outbound',
    status: 'new',
    category: 'nurture',
    score: 30,
  },
  {
    id: 'sarvam_20260905_0eac6002',
    name: 'Ravi Nair',
    company: 'BrightTech Solutions',
    phone: '917415999997',
    call_duration: '15.56',
    created_at: 'Sep 05, 2026, 05:16:52 PM',
    recording_url: 'https://agents.sarvam.ai/media?org_id=01a070e6-bd52-736f-8f9c-9ddb8178a4f8&workspace_id=01a070e6-bd63-78b6-8726-3336ed438ced&app_id=Conversatio-8eaeaf2f-9a7a&interaction_id=20260905/0eac6002-17:16:52-30b3b7b5&audio_hash=merged_audio',
    disposition: 'needs_more_discovery',
    discovery_fit: 5,
    authority_level: '',
    budget: '',
    timeline: '',
    pain_points: '',
    chosen_next_step: '',
    next_step_date: '',
    sample_kit: '',
    call_summary: 'Very short call (15s). Agent introduced themselves but call ended immediately — likely a dropped/cut call.',
    transcript: 'Agent: Hello, I am Ananya calling from Etsun Manufacturing... (call ended at 15 seconds)',
    channel: 'outbound',
    status: 'new',
    category: 'nurture',
    score: 20,
  },
  {
    id: 'sarvam_20260905_5a5770df',
    name: 'Ravi Nair',
    company: 'BrightTech Solutions',
    phone: '919165493082',
    call_duration: '270.07',
    created_at: 'Sep 05, 2026, 04:02:46 PM',
    recording_url: 'https://agents.sarvam.ai/media?org_id=01a070e6-bd52-736f-8f9c-9ddb8178a4f8&workspace_id=01a070e6-bd63-78b6-8726-3336ed438ced&app_id=Conversatio-8eaeaf2f-9a7a&interaction_id=20260905/5a5770df-16:02:46-7fca5acc&audio_hash=merged_audio',
    disposition: 'not_interested',
    discovery_fit: 2,
    authority_level: 'disqualified',
    budget: '',
    timeline: '',
    pain_points: 'Quality, compliance, reliability from current suppliers (Siddharth Innovative). Billing delays, shipment issues, unable to pay labor on time.',
    chosen_next_step: 'none',
    next_step_date: '',
    sample_kit: 'no',
    call_summary: 'Prospect expressed extreme dissatisfaction with Atsun Manufacturing citing previous bad experience with poor quality and unreliable delivery. Refused to work with Atsun. Current vendor Siddharth Innovative also problematic. Said: "fix your quality first, then call me."',
    transcript: 'Ravi Nair expressed strong dissatisfaction. Current vendor: Siddharth Innovative (supply issues). Pain points: quality, compliance, reliability, billing delays, labor payment issues. Refused to engage further until quality improves. Feedback: improve quality and dispatch before calling again.',
    channel: 'outbound',
    status: 'lost',
    category: 'nurture',
    score: 15,
  },
  {
    id: 'sarvam_20260905_98aafdf4',
    name: 'Ravi Nair',
    company: 'BrightTech Solutions',
    phone: '917089725625',
    call_duration: '311.76',
    created_at: 'Sep 05, 2026, 03:56:09 PM',
    recording_url: 'https://agents.sarvam.ai/media?org_id=01a070e6-bd52-736f-8f9c-9ddb8178a4f8&workspace_id=01a070e6-bd63-78b6-8726-3336ed438ced&app_id=Conversatio-8eaeaf2f-9a7a&interaction_id=20260905/98aafdf4-15:56:09-fcc5f601&audio_hash=merged_audio',
    disposition: 'qualified',
    discovery_fit: 7,
    authority_level: 'Sole decision-maker',
    budget: '3 to 4 lakh rupees',
    timeline: 'Immediate need',
    pain_points: 'Quality issues and pricing problems causing customer dissatisfaction. Monthly consumption: 10,000 units.',
    chosen_next_step: 'technical demo',
    next_step_date: 'Monday, September 11th at 2:00 PM',
    sample_kit: 'yes',
    call_summary: '⭐ QUALIFIED LEAD. Prospect has quality+pricing issues with current supply, monthly consumption 10,000 units, budget ₹3-4 lakhs, immediate need. Agreed to 30-min technical demo with Product Lead Kiran Rao on Sep 11 at 2 PM. Booking ref: DEMO-48213.',
    transcript: 'Qualified call. Pain: quality & rate issues → customer disturbance. Consumption: 10,000/month. Procurement-managed. Sole decision-maker. Budget: ₹3-4L. Need: Immediate. Demo scheduled: Sep 11 2PM with Kiran Rao (+91-98XXXXXXXX). Sample kit requested.',
    channel: 'outbound',
    status: 'contacted',
    category: 'hot',
    score: 85,
  },
  {
    id: 'sarvam_20260905_5c1efb78',
    name: 'Ravi Nair (Inbound Test)',
    company: 'BrightTech Solutions',
    phone: 'zotus.ai@gmail.com',
    call_duration: '71.08',
    created_at: 'Sep 05, 2026, 03:11:33 PM',
    recording_url: 'https://agents.sarvam.ai/media?org_id=01a070e6-bd52-736f-8f9c-9ddb8178a4f8&workspace_id=01a070e6-bd63-78b6-8726-3336ed438ced&app_id=Conversatio-8eaeaf2f-9a7a&interaction_id=20260905/5c1efb78-15:11:33-a5a99c9f&audio_hash=merged_audio',
    disposition: 'needs_more_discovery',
    discovery_fit: 4,
    authority_level: '',
    budget: '',
    timeline: '',
    pain_points: '',
    chosen_next_step: 'none',
    next_step_date: '',
    sample_kit: 'not_discussed',
    call_summary: 'Inbound test call (71s). Ravi Nair called in but was time-constrained ("30 seconds only"). Questioned the purpose of discovery questions. Call ended without clear outcome.',
    transcript: 'Inbound call. Prospect: "I have 30 seconds." Questioned why discovery questions being asked. Agent explained we are direct manufacturers. Call ended before qualification. Needs follow-up.',
    channel: 'inbound',
    status: 'new',
    category: 'nurture',
    score: 35,
  },
  {
    id: 'sarvam_20260905_no_answer',
    name: 'Ravi Nair',
    company: 'BrightTech Solutions',
    phone: '917415999997',
    call_duration: '0',
    created_at: 'Sep 05, 2026, 05:16:44 PM',
    recording_url: null,
    disposition: 'no_answer',
    discovery_fit: 0,
    authority_level: '',
    budget: '',
    timeline: '',
    pain_points: '',
    chosen_next_step: '',
    next_step_date: '',
    sample_kit: '',
    call_summary: 'No answer. Call attempt at 5:16 PM, no connection established.',
    transcript: 'No answer — call not connected.',
    channel: 'outbound',
    status: 'new',
    category: 'nurture',
    score: 10,
  },
];

// ── Import into SQLite ───────────────────────────────────────────────────────
const db = new Database(DB_PATH);
let created = 0, updated = 0;

for (const c of calls) {
  const existing = db.prepare('SELECT id FROM leads WHERE id=?').get(c.id);

  const notes = [
    c.chosen_next_step ? `Next Step: ${c.chosen_next_step}` : null,
    c.next_step_date   ? `Follow-up: ${c.next_step_date}` : null,
    c.sample_kit === 'yes' || c.sample_kit === 'true' ? '✅ Sample kit requested' : null,
    c.channel === 'inbound' ? '📞 INBOUND call' : null,
  ].filter(Boolean).join('\n');

  const rec = {
    id:             c.id,
    name:           c.name,
    company:        c.company,
    phone:          c.phone,
    status:         c.status,
    category:       c.category,
    priority:       c.score,
    supplier_pain:  c.pain_points,
    decision_maker: c.authority_level,
    budget:         c.budget,
    timeline:       c.timeline,
    transcript:     c.call_summary + '\n\n--- TRANSCRIPT SUMMARY ---\n' + c.transcript,
    call_duration:  c.call_duration,
    recording_url:  c.recording_url,
    notes,
    score_breakdown: JSON.stringify({ discovery_fit: c.discovery_fit * 10, disposition: c.disposition }),
    source:         'Sarvam AI (bulk import)',
    created_at:     c.created_at,
  };

  if (existing) {
    const { id, created_at, ...upd } = rec;
    const uk = Object.keys(upd);
    db.prepare(`UPDATE leads SET ${uk.map(k=>k+'=?').join(',')} WHERE id=?`)
      .run(...uk.map(k=>typeof upd[k]==='object'?JSON.stringify(upd[k]):upd[k]), c.id);
    updated++;
    console.log(`  🔄 Updated : ${c.name} | ${c.disposition} | Score: ${c.score} [${c.category}]`);
  } else {
    const keys = Object.keys(rec);
    db.prepare(`INSERT OR IGNORE INTO leads (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`)
      .run(...keys.map(k=>typeof rec[k]==='object'?JSON.stringify(rec[k]):rec[k]));
    created++;
    console.log(`  ✅ Imported: ${c.name} | ${c.disposition} | Score: ${c.score} [${c.category}]`);
  }
}

db.close();

console.log('\n╔════════════════════════════════════════╗');
console.log(`║  Import Complete!                      ║`);
console.log(`║  New leads created  : ${String(created).padEnd(17)}║`);
console.log(`║  Existing updated   : ${String(updated).padEnd(17)}║`);
console.log('╚════════════════════════════════════════╝');
console.log('\n📊 Dashboard: http://localhost:5173\n');
