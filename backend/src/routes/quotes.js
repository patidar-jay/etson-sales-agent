import express from 'express';
import { supabase } from '../config/supabase.js';
import { generateQuotePDF } from '../services/quoteGenerator.js';
import { sendQuoteToProspect } from '../services/email.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { data: quotes, error } = await supabase.from('quotes').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.status(200).json(quotes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { lead_id, items, client, amount } = req.body;
    
    const { data: lead, error: leadError } = await supabase.from('leads').select('*').eq('id', lead_id).single();
    if (leadError) {
       if (leadError.code === 'PGRST116') return res.status(404).json({ error: 'Lead not found' });
       throw leadError;
    }

    const quote = {
      lead_id,
      items,
      client: client || lead.company || lead.name,
      amount: amount || '₹0',
      status: 'draft',
      created_at: new Date().toISOString()
    };

    const { data: savedQuote, error: quoteError } = await supabase.from('quotes').insert([quote]).select().single();
    if (quoteError) throw quoteError;
    
    res.status(201).json(savedQuote);
  } catch (error) {
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
    
    // Send email
    await sendQuoteToProspect(leadData, pdfBase64);

    const { error: updateError } = await supabase.from('quotes').update({ status: 'sent' }).eq('id', req.params.id);
    if (updateError) throw updateError;

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
