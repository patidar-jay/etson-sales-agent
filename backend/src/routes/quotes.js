import express from 'express';
import { db } from '../config/firebase.js';
import { generateQuotePDF } from '../services/quoteGenerator.js';
import { sendQuoteToProspect } from '../services/email.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const quotes = await db.collection('quotes').get();
    res.status(200).json(quotes.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { lead_id, items } = req.body;
    
    const leadDoc = await db.collection('leads').doc(lead_id).get();
    if (!leadDoc.exists) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const quote = {
      lead_id,
      items,
      status: 'draft',
      created_at: new Date().toISOString()
    };

    const savedQuote = await db.collection('quotes').doc().set(quote);
    res.status(201).json({ id: savedQuote.id, ...quote });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/approve', async (req, res) => {
  try {
    await db.collection('quotes').doc(req.params.id).update({ status: 'approved' });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/reject', async (req, res) => {
  try {
    await db.collection('quotes').doc(req.params.id).update({ status: 'rejected' });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/send', async (req, res) => {
  try {
    const quoteDoc = await db.collection('quotes').doc(req.params.id).get();
    if (!quoteDoc.exists) return res.status(404).json({ error: 'Quote not found' });
    
    const quoteData = quoteDoc.data();
    const leadDoc = await db.collection('leads').doc(quoteData.lead_id).get();
    
    if (!leadDoc.exists) return res.status(404).json({ error: 'Lead not found' });
    const leadData = leadDoc.data();

    // Generate PDF
    const pdfBase64 = generateQuotePDF(leadData, quoteData);
    
    // Send email
    await sendQuoteToProspect(leadData, pdfBase64);

    await db.collection('quotes').doc(req.params.id).update({ status: 'sent' });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
