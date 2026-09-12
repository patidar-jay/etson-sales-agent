import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';

// Load .env file if it exists (local dev). On Vercel, env vars are injected automatically.
dotenv.config();

import webhookRoutes from './routes/webhooks.js';
import campaignRoutes from './routes/campaigns.js';
import leadRoutes from './routes/leads.js';
import quoteRoutes from './routes/quotes.js';
import productRoutes from './routes/products.js';
import analyticsRoutes from './routes/analytics.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
  origin: (origin, callback) => {
    // Allow localhost, Vercel deployments, and no-origin requests (curl, Postman)
    const allowed = !origin ||
      origin.includes('localhost') ||
      origin.includes('vercel.app') ||
      origin.includes('etson');
    callback(null, allowed ? origin : false);
  },
  credentials: true
}));
app.use(express.json());

// Use memory storage for serverless compatibility (Vercel read-only filesystem)
const upload = multer({ storage: multer.memoryStorage() });


// Mount routes
app.use('/api/webhooks', webhookRoutes);
app.use('/api/campaigns', upload.single('file'), campaignRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/products', productRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Export for Vercel serverless runtime
export default app;

// Start server locally (not on Vercel serverless)
if (process.env.LOCAL_DEV === 'true') {
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}
