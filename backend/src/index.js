import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';

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

// Set up multer for uploads
const upload = multer({ dest: 'uploads/' });

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

// Export for Vercel serverless
export default app;

// Start server in non-serverless environments
if (process.env.NODE_ENV !== 'production' || process.env.LOCAL_DEV) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}
