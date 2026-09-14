/**
 * Email Service — Nodemailer
 * Sends real emails when SMTP_HOST + SMTP_USER + SMTP_PASS are set in .env
 * Falls back to console.log in dev mode (no credentials needed)
 */
import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SALES_EMAIL = process.env.SALES_TEAM_EMAIL || SMTP_USER;
const FROM_NAME  = 'Etson Sales AI';
const FROM_ADDR  = SMTP_USER || 'noreply@etson.in';
const APP_URL    = process.env.APP_URL || 'http://localhost:5173';

// Build transporter once — null if not configured
let transporter = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  transporter.verify().then(() => {
    console.log('[EMAIL] ✅ SMTP connected →', SMTP_HOST);
  }).catch(e => {
    console.warn('[EMAIL] ⚠️ SMTP verify failed:', e.message);
    transporter = null;
  });
} else {
  console.log('[EMAIL] ℹ️ No SMTP config — emails will be logged only. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env to send real emails.');
}

async function send({ to, subject, html, attachments = [] }) {
  if (!transporter) {
    console.log(`[EMAIL LOG] To: ${to} | Subject: ${subject}`);
    return;
  }
  try {
    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_ADDR}>`,
      to,
      subject,
      html,
      attachments,
    });
    console.log(`[EMAIL] ✅ Sent to ${to} | MsgID: ${info.messageId}`);
  } catch (e) {
    console.error(`[EMAIL] ❌ Failed to send to ${to}:`, e.message);
  }
}

// ── Hot Lead Alert ────────────────────────────────────────────────────────────
export const sendHotLeadAlert = async (lead) => {
  const score = lead.priority || 0;
  const subject = `🔥 HOT LEAD: ${lead.name} (${lead.company || 'Unknown Company'}) — Score ${score}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f1117;color:#e2e8f0;padding:24px;border-radius:12px;">
      <div style="background:linear-gradient(135deg,#ef4444,#b91c1c);padding:16px 24px;border-radius:8px;margin-bottom:20px;">
        <h1 style="margin:0;color:white;font-size:20px;">🔥 HOT LEAD ALERT</h1>
        <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Immediate follow-up required within 24 hours</p>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr><td style="padding:8px 0;color:#94a3b8;width:140px;">Name</td><td style="font-weight:600;color:#f1f5f9;">${lead.name || 'N/A'}</td></tr>
        <tr><td style="padding:8px 0;color:#94a3b8;">Company</td><td style="font-weight:600;color:#f1f5f9;">${lead.company || 'N/A'}</td></tr>
        <tr><td style="padding:8px 0;color:#94a3b8;">Phone</td><td style="font-weight:600;color:#10b981;">${lead.phone || 'N/A'}</td></tr>
        <tr><td style="padding:8px 0;color:#94a3b8;">Score</td><td><span style="background:#ef4444;color:white;padding:2px 10px;border-radius:12px;font-weight:700;">${score}/100</span></td></tr>
        <tr><td style="padding:8px 0;color:#94a3b8;">Budget</td><td style="color:#f1f5f9;">${lead.budget || 'N/A'}</td></tr>
        <tr><td style="padding:8px 0;color:#94a3b8;">Timeline</td><td style="color:#f1f5f9;">${lead.timeline || 'N/A'}</td></tr>
        <tr><td style="padding:8px 0;color:#94a3b8;">Decision Maker</td><td style="color:#f1f5f9;">${lead.decision_maker || 'N/A'}</td></tr>
      </table>

      ${lead.transcript ? `
      <div style="background:#1e293b;padding:16px;border-radius:8px;margin-bottom:20px;border-left:3px solid #ef4444;">
        <p style="margin:0 0 8px;font-weight:600;color:#94a3b8;font-size:12px;text-transform:uppercase;">Call Summary</p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#e2e8f0;">${lead.transcript.slice(0, 400)}${lead.transcript.length > 400 ? '...' : ''}</p>
      </div>` : ''}

      ${lead.notes ? `
      <div style="background:#1e293b;padding:16px;border-radius:8px;margin-bottom:20px;border-left:3px solid #f59e0b;">
        <p style="margin:0 0 8px;font-weight:600;color:#94a3b8;font-size:12px;text-transform:uppercase;">Notes</p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#e2e8f0;">${lead.notes}</p>
      </div>` : ''}

      <div style="text-align:center;padding:16px;background:#1e293b;border-radius:8px;">
        <p style="margin:0 0 12px;font-size:13px;color:#94a3b8;">Open dashboard to send quotation and schedule follow-up</p>
        <a href="${APP_URL}/leads/${lead.id}" style="background:#ef4444;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">View Lead →</a>
      </div>

      <p style="margin-top:20px;font-size:11px;color:#475569;text-align:center;">Etson Manufacturing Sales AI · Auto-generated alert</p>
    </div>
  `;
  await send({ to: SALES_EMAIL, subject, html });
};

// ── Quote Email to Prospect ───────────────────────────────────────────────────
export const sendQuoteToProspect = async (lead, pdfBase64) => {
  const subject = `Quotation from Etson Manufacturing — Thermal Paper Rolls`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;color:#1e293b;padding:24px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#0f766e;font-size:24px;margin:0;">ETSON MANUFACTURING</h1>
        <p style="color:#64748b;margin:4px 0 0;font-size:13px;">Thermal Paper Rolls & Barcode Labels · Quality You Can Trust</p>
      </div>

      <p style="font-size:15px;">Dear <strong>${lead.name || 'Sir/Madam'}</strong>,</p>
      <p style="font-size:14px;line-height:1.7;color:#334155;">
        Thank you for your interest in Etson Manufacturing's thermal paper products. As discussed,
        please find attached our quotation tailored to your requirements.
      </p>
      <p style="font-size:14px;line-height:1.7;color:#334155;">
        We offer <strong>pan-India delivery</strong>, <strong>BPA-free premium rolls</strong>, and
        <strong>flexible MOQs</strong> to suit businesses of all sizes.
      </p>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0;font-weight:600;color:#166534;">✅ What's included in your quote:</p>
        <ul style="margin:8px 0 0;padding-left:20px;color:#334155;font-size:14px;">
          <li>Detailed product specifications</li>
          <li>Volume pricing & bulk discounts</li>
          <li>GST-inclusive pricing (18%)</li>
          <li>Delivery terms & payment options</li>
        </ul>
      </div>

      <p style="font-size:14px;color:#334155;">To proceed or ask questions, please reply to this email or call us directly.</p>

      <div style="border-top:1px solid #e2e8f0;margin-top:24px;padding-top:16px;">
        <p style="margin:0;font-size:13px;color:#64748b;"><strong>Etson Manufacturing</strong><br/>
        📞 Sales Team · 📧 ${SMTP_USER || 'sales@etson.in'}<br/>
        🌐 Premium Thermal Paper Rolls & Barcode Labels</p>
      </div>
    </div>
  `;

  const attachments = pdfBase64 ? [{
    filename: `Etson_Quote_${lead.name?.replace(/\s+/g, '_') || 'Prospect'}.pdf`,
    content: pdfBase64,
    encoding: 'base64',
    contentType: 'application/pdf',
  }] : [];

  // Send to prospect if they have email
  if (lead.email) {
    await send({ to: lead.email, subject, html, attachments });
  } else {
    console.log(`[EMAIL] No prospect email for ${lead.name} — CC to sales team`);
    await send({ to: SALES_EMAIL, subject: `[FWD: No prospect email] ${subject} — ${lead.name}`, html, attachments });
  }
};

// ── Follow-up Reminder (to sales team) ───────────────────────────────────────
export const sendFollowUpReminder = async (lead, dayNumber) => {
  const subject = `⏰ Follow-up Due: ${lead.name} (Day ${dayNumber})`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0f1117;color:#e2e8f0;border-radius:12px;">
      <h2 style="color:#f59e0b;margin:0 0 16px;">⏰ Follow-up Reminder — Day ${dayNumber}</h2>
      <p style="font-size:15px;">Time to follow up with <strong>${lead.name}</strong> from <strong>${lead.company || 'Unknown'}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:6px 0;color:#94a3b8;width:120px;">Phone</td><td style="color:#10b981;font-weight:600;">${lead.phone}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;">Category</td><td style="color:#f1f5f9;">${(lead.category || 'nurture').toUpperCase()}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;">Notes</td><td style="color:#f1f5f9;">${lead.notes || 'No notes'}</td></tr>
      </table>
      <div style="text-align:center;margin-top:20px;">
        <a href="${APP_URL}/leads/${lead.id}" style="background:#f59e0b;color:#0f1117;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:700;">Open Lead →</a>
      </div>
    </div>
  `;
  await send({ to: SALES_EMAIL, subject, html });
};
