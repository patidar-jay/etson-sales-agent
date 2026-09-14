import * as xlsx from 'xlsx';

/**
 * Parse Excel or CSV contact list.
 *
 * Accepted column names (case-insensitive, spaces/underscores flexible):
 *   Name        → name
 *   Mobile No.  → phone  (also: Phone, Mobile, Phone Number, etc.)
 *   Company     → company
 *   City        → city
 *
 * consent_source is NO LONGER required — defaults to "campaign".
 */
export const parseExcel = (filePathOrBuffer) => {
  try {
    const workbook = typeof filePathOrBuffer === 'string'
      ? xlsx.readFile(filePathOrBuffer)
      : xlsx.read(filePathOrBuffer, { type: 'buffer' });

    const sheetName = workbook.SheetNames[0];
    const sheet     = workbook.Sheets[sheetName];
    const rawData   = xlsx.utils.sheet_to_json(sheet);

    const contacts = [];
    const errors   = [];
    const warnings = [];

    rawData.forEach((row, index) => {
      const rowNum = index + 2;

      // Normalize all keys: lowercase, strip spaces/dots/underscores
      const cleanRow = {};
      for (const [key, value] of Object.entries(row)) {
        const cleanKey = key
          .trim()
          .toLowerCase()
          .replace(/[\s._]+/g, '_')   // spaces, dots, underscores → single _
          .replace(/[^a-z0-9_]/g, '') // remove remaining special chars
          .replace(/_+$/g, '')        // strip trailing underscores ("mobile_no_" → "mobile_no")
          .replace(/^_+/g, '');       // strip leading underscores
        cleanRow[cleanKey] = value;
      }

      // ── Resolve phone from any common column name ───────────────────────
      const phone_raw =
        cleanRow.mobile_no  ||   // "Mobile No."
        cleanRow.mobile     ||   // "Mobile"
        cleanRow.phone_no   ||   // "Phone No."
        cleanRow.phone_number || // "Phone Number"
        cleanRow.phone      ||   // "Phone"
        cleanRow.contact    ||   // "Contact"
        cleanRow.number     ||   // "Number"
        cleanRow.mob        ||   // "Mob"
        null;

      if (!phone_raw) {
        errors.push(`Row ${rowNum}: Missing phone/mobile number`);
        return;
      }

      // ── Resolve name ────────────────────────────────────────────────────
      const name =
        cleanRow.name        ||
        cleanRow.full_name   ||
        cleanRow.customer    ||
        cleanRow.contact_name||
        '';

      // ── Resolve company ─────────────────────────────────────────────────
      const company =
        cleanRow.company     ||
        cleanRow.company_name||
        cleanRow.firm        ||
        cleanRow.business    ||
        '';

      // ── Resolve city ────────────────────────────────────────────────────
      const city =
        cleanRow.city        ||
        cleanRow.location    ||
        cleanRow.area        ||
        '';

      // ── Clean phone number ───────────────────────────────────────────────
      let phone = String(phone_raw).trim().replace(/[^\d+]/g, '');
      if (!phone.startsWith('+91') && phone.length === 10) {
        phone = '+91' + phone;
      }
      if (phone.length < 10) {
        errors.push(`Row ${rowNum}: Invalid phone number "${phone_raw}"`);
        return;
      }

      contacts.push({
        name,
        phone,
        company,
        city,
        consent_source: cleanRow.consent_source || 'campaign',
        status: 'new',
      });
    });

    return { contacts, errors, warnings };
  } catch (error) {
    console.error('Excel parse error:', error);
    return { contacts: [], errors: [error.message], warnings: [] };
  }
};
