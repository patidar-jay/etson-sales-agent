import express from 'express';
import { db } from '../config/firebase.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { category, status, campaign_id, search } = req.query;
    const leadsRef = await db.collection('leads').get();
    let leads = leadsRef.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (category) leads = leads.filter(l => l.category === category);
    if (status) leads = leads.filter(l => l.status === status);
    if (campaign_id) leads = leads.filter(l => l.campaign_id === campaign_id);
    if (search) {
      const s = search.toLowerCase();
      leads = leads.filter(l => 
        (l.name && l.name.toLowerCase().includes(s)) ||
        (l.city && l.city.toLowerCase().includes(s)) ||
        (l.phone && l.phone.includes(s))
      );
    }

    res.status(200).json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const leadsRef = await db.collection('leads').get();
    const leads = leadsRef.docs.map(doc => doc.data());
    
    const stats = {
      total: leads.length,
      highPriority: leads.filter(l => l.category === 'High').length,
      new: leads.filter(l => l.status === 'new').length
    };
    
    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('leads').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { status, notes, assigned_to } = req.body;
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;

    await db.collection('leads').doc(req.params.id).update(updateData);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
