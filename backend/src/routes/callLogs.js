import express from 'express';
import { getSarvamAttempts, getSarvamTranscript, getSarvamRecording } from '../services/sarvam.js';

const router = express.Router();

// GET /api/call-logs — paginated list of call attempts from Sarvam
router.get('/', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    // Sarvam Analytics requires start_datetime and end_datetime — default to last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const start_datetime = req.query.start_datetime || thirtyDaysAgo.toISOString().replace('T', ' ').slice(0, 19);
    const end_datetime   = req.query.end_datetime   || now.toISOString().replace('T', ' ').slice(0, 19);

    const data = await getSarvamAttempts({ limit: parseInt(limit), offset: parseInt(offset), start_datetime, end_datetime });
    res.json(data);
  } catch (err) {
    console.error('[CallLogs GET]', err.message);
    res.status(500).json({ error: err.message });
  }
});


// GET /api/call-logs/:interactionId/transcript
router.get('/:interactionId/transcript', async (req, res) => {
  try {
    const data = await getSarvamTranscript(req.params.interactionId);
    res.json(data);
  } catch (err) {
    console.error('[CallLogs Transcript]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/call-logs/:interactionId/recording
router.get('/:interactionId/recording', async (req, res) => {
  try {
    const data = await getSarvamRecording(req.params.interactionId);
    res.json(data);
  } catch (err) {
    console.error('[CallLogs Recording]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
