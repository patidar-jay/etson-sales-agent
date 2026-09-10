import express from 'express';
import { db } from '../config/firebase.js';
import { parseExcel } from '../utils/excelParser.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Excel file required' });
    }
    
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Campaign name required' });
    }

    const { contacts, errors } = parseExcel(req.file.path);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Invalid excel format', details: errors });
    }

    const campaign = {
      name,
      status: 'draft',
      total_contacts: contacts.length,
      created_at: new Date().toISOString()
    };

    const savedCampaign = await db.collection('campaigns').doc().set(campaign);

    // Add contacts to campaign (mocking subcollection or just attaching)
    for (const contact of contacts) {
      await db.collection('campaign_contacts').doc().set({
        campaign_id: savedCampaign.id,
        ...contact
      });
    }

    res.status(201).json({ success: true, campaignId: savedCampaign.id, contactsCount: contacts.length });
  } catch (error) {
    console.error('Campaign create error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const campaigns = await db.collection('campaigns').get();
    res.status(200).json(campaigns.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('campaigns').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    await db.collection('campaigns').doc(req.params.id).update(req.body);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.collection('campaigns').doc(req.params.id).delete();
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
