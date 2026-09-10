import nodemailer from 'nodemailer';

export const sendHotLeadAlert = async (lead) => {
  console.log(`[EMAIL] Hot Lead Alert for: ${lead.name || 'Unknown'} (${lead.phone})`);
  // In dev mode, just log to console
};

export const sendQuoteToProspect = async (lead, pdfBase64) => {
  console.log(`[EMAIL] Sending Quote to: ${lead.name || 'Prospect'} (${lead.phone})`);
  console.log(`[EMAIL] Attachment size: ${pdfBase64.length} chars (base64)`);
  // In dev mode, just log to console
};
