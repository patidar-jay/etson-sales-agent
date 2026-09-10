import * as xlsx from 'xlsx';

export const parseExcel = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet);
    
    const contacts = [];
    const errors = [];
    const warnings = [];

    rawData.forEach((row, index) => {
      const rowNum = index + 2; // Assuming row 1 is header
      
      // Clean up keys (lowercase, replace spaces with underscores)
      const cleanRow = {};
      for (const [key, value] of Object.entries(row)) {
        const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');
        cleanRow[cleanKey] = value;
      }

      // Validate required columns
      if (!cleanRow.phone_number && !cleanRow.phone) {
        errors.push(`Row ${rowNum}: Missing phone number`);
        return;
      }
      if (!cleanRow.consent_source) {
        errors.push(`Row ${rowNum}: Missing consent_source`);
        return;
      }

      // Clean phone number
      let phone = String(cleanRow.phone_number || cleanRow.phone).trim();
      // Remove any non-digit chars except +
      phone = phone.replace(/[^\d+]/g, '');
      if (!phone.startsWith('+91') && phone.length === 10) {
        phone = '+91' + phone;
      }

      contacts.push({
        ...cleanRow,
        phone,
        status: 'new'
      });
    });

    return { contacts, errors, warnings };
  } catch (error) {
    console.error('Excel parse error:', error);
    return { contacts: [], errors: [error.message], warnings: [] };
  }
};
