import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { data: products, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data: product, error } = await supabase.from('products').select('*').eq('id', req.params.id).single();
    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'Not found' });
      throw error;
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { data: savedProduct, error } = await supabase.from('products').insert([req.body]).select().single();
    if (error) throw error;
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('products').update(req.body).eq('id', req.params.id);
    if (error) throw error;
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('products').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
