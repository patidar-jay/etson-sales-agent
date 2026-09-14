import express from 'express';
import { localDB as supabase } from '../config/localdb.js';
import { generateQuotePDF } from '../services/quoteGenerator.js';
import { sendQuoteToProspect } from '../services/whatomate.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);

    let query = supabase.from('quotes').select('*').order('created_at', { ascending: false });

    // Search across client name, quote id, and phone
    if (search) {
      const s = `%${search}%`;
      query = query.or(`client.ilike.${s},id.ilike.${s},phone.ilike.${s}`);
    }

    // Fetch ALL matching rows first (localDB has no server-side LIMIT for counting)
    const { data: allQuotes, error } = await query;
    if (error) throw error;

    const total      = allQuotes.length;
    const totalPages = Math.ceil(total / limit);
    const data       = allQuotes.slice((page - 1) * limit, page * limit);

    res.status(200).json({ data, total, page, limit, totalPages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { lead_id, items, client, amount, notes, phone } = req.body;

    if (!lead_id) return res.status(400).json({ error: 'lead_id is required' });

    const { data: lead, error: leadError } = await supabase.from('leads').select('*').eq('id', lead_id).single();
    if (leadError) {
      if (leadError.code === 'PGRST116') return res.status(404).json({ error: 'Lead not found' });
      throw leadError;
    }

    // Generate unique quote ID like QT-0001
    const { data: existing } = await supabase.from('quotes').select('id');
    const nextNum = String((existing ? existing.length : 0) + 1).padStart(4, '0');
    const quoteId = 'QT-' + nextNum;

    const quote = {
      id:     quoteId,
      lead_id,
      items:  Array.isArray(items) ? JSON.stringify(items) : (items || '[]'),
      client: client || lead.company || lead.name,
      phone:  phone || lead.phone || '',
      amount: amount || 0,
      notes:  notes  || '',
      status: 'draft',
      created_at: new Date().toISOString(),
    };

    const { data: savedQuote, error: quoteError } = await supabase.from('quotes').insert([quote]).select().single();
    if (quoteError) throw quoteError;
    if (!savedQuote) throw new Error('Quote was not saved - DB insert returned null');

    // Parse items back for response
    if (savedQuote.items && typeof savedQuote.items === 'string') {
      try { savedQuote.items = JSON.parse(savedQuote.items); } catch(e) {}
    }

    res.status(201).json(savedQuote);
  } catch (error) {
    console.error('[Quotes POST]', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { items, client, amount, notes, phone } = req.body;
    const quoteUpdate = {
      items:  Array.isArray(items) ? JSON.stringify(items) : (items || '[]'),
      client,
      phone,
      amount: amount || 0,
      notes:  notes  || ''
    };
    
    // Remove undefined fields
    Object.keys(quoteUpdate).forEach(key => quoteUpdate[key] === undefined && delete quoteUpdate[key]);

    const { data: updatedQuote, error } = await supabase.from('quotes')
      .update(quoteUpdate)
      .eq('id', req.params.id)
      .select().single();
      
    if (error) throw error;
    
    if (updatedQuote.items && typeof updatedQuote.items === 'string') {
      try { updatedQuote.items = JSON.parse(updatedQuote.items); } catch(e) {}
    }
    
    res.status(200).json(updatedQuote);
  } catch (error) {
    console.error('[Quotes PUT]', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/approve', async (req, res) => {
  try {
    const { error } = await supabase.from('quotes').update({ status: 'approved' }).eq('id', req.params.id);
    if (error) throw error;
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/reject', async (req, res) => {
  try {
    const { error } = await supabase.from('quotes').update({ status: 'rejected' }).eq('id', req.params.id);
    if (error) throw error;
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/send', async (req, res) => {
  try {
    const { data: quoteData, error: quoteError } = await supabase.from('quotes').select('*').eq('id', req.params.id).single();
    if (quoteError) {
      if (quoteError.code === 'PGRST116') return res.status(404).json({ error: 'Quote not found' });
      throw quoteError;
    }
    
    const { data: leadData, error: leadError } = await supabase.from('leads').select('*').eq('id', quoteData.lead_id).single();
    if (leadError) {
      if (leadError.code === 'PGRST116') return res.status(404).json({ error: 'Lead not found' });
      throw leadError;
    }

    // Generate PDF
    const pdfBase64 = generateQuotePDF(leadData, quoteData);
    
    // Send via WhatsApp to prospect
    await sendQuoteToProspect(quoteData, leadData, pdfBase64);

    const { error: updateError } = await supabase.from('quotes').update({ status: 'sent' }).eq('id', req.params.id);
    if (updateError) throw updateError;

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
