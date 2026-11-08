import express, { Request, Response } from 'express';
import path from 'node:path';
import dotenv from 'dotenv';
import {
  initDatabase,
  getWebsites,
  addWebsite,
  updateWebsite,
  deleteWebsite,
  getProducts,
  getProductsByWebsite,
  getPriceHistoryForProduct,
  getAlerts,
  markAlertViewed,
  getSettings,
  updateSettings,
  getDashboardStats,
} from './server/db';
import { validateWebsite } from './server/scraper';
import { executeWebsiteScan, scanAllWebsites, startBackgroundScheduler } from './server/scanner';
import { sendTelegramTestMessage } from './server/telegram';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Initialize database & scheduler
initDatabase();
startBackgroundScheduler();

// API Routes

// Stats
app.get('/api/stats', (_req: Request, res: Response) => {
  try {
    const stats = getDashboardStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Websites
app.get('/api/websites', (_req: Request, res: Response) => {
  try {
    const websites = getWebsites();
    res.json(websites);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/websites/validate', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'A valid URL is required.' });
      return;
    }
    const validation = await validateWebsite(url);
    res.json(validation);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/websites', async (req: Request, res: Response) => {
  try {
    const { url, name, discount_threshold, scan_frequency } = req.body;
    if (!url) {
      res.status(400).json({ error: 'Website URL is required.' });
      return;
    }

    // Quick validation
    const validation = await validateWebsite(url);
    if (!validation.isValid) {
      res.status(400).json({ error: validation.message || 'Website could not be reached or validated.' });
      return;
    }

    const newSite = addWebsite({
      name: name?.trim() || validation.storeName,
      url: validation.normalizedUrl,
      status: 'active',
      discount_threshold: Number(discount_threshold) || 50,
      scan_frequency: Number(scan_frequency) || 3,
      last_scanned_at: null,
      next_scan_at: null,
      favicon: validation.favicon,
    });

    // Fire off immediate first scan in the background
    executeWebsiteScan(newSite.id).catch(err => console.error('[Initial Scan Error]:', err));

    res.status(201).json(newSite);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/websites/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = updateWebsite(id, updates);
    if (!updated) {
      res.status(404).json({ error: 'Website not found.' });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/websites/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = deleteWebsite(id);
    if (!success) {
      res.status(404).json({ error: 'Website not found.' });
      return;
    }
    res.json({ success: true, message: 'Website and associated data removed.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/websites/:id/scan', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await executeWebsiteScan(id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/scan/all', async (_req: Request, res: Response) => {
  try {
    const results = await scanAllWebsites();
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Products
app.get('/api/products', (req: Request, res: Response) => {
  try {
    const { website_id, min_discount } = req.query;
    let products = website_id ? getProductsByWebsite(String(website_id)) : getProducts();

    if (min_discount) {
      const min = Number(min_discount);
      products = products.filter(p => p.discount_percentage >= min);
    }

    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id/history', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const history = getPriceHistoryForProduct(id);
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Alerts
app.get('/api/alerts', (req: Request, res: Response) => {
  try {
    const alerts = getAlerts();
    res.json(alerts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/alerts/:id/view', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = markAlertViewed(id);
    if (!updated) {
      res.status(404).json({ error: 'Alert not found.' });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Settings
app.get('/api/settings', (_req: Request, res: Response) => {
  try {
    const settings = getSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const updated = updateSettings(updates);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Telegram Test
app.post('/api/telegram/test', async (req: Request, res: Response) => {
  try {
    const current = getSettings();
    const token = req.body.token || current.telegram_bot_token;
    const chatId = req.body.chat_id || current.telegram_chat_id;
    const currency = req.body.currency || current.currency;

    if (!token || !chatId) {
      res.status(400).json({ error: 'Both Bot Token and Chat ID are required.' });
      return;
    }

    const result = await sendTelegramTestMessage(token, chatId, currency);
    if (result.success) {
      res.json({ success: true, message: 'Test notification sent successfully to Telegram!' });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Seed sample store helper (useful for quick verification if user wants to see instant monitoring)
app.post('/api/seed-sample', (req: Request, res: Response) => {
  try {
    const currentSites = getWebsites();
    if (currentSites.length === 0) {
      // Add a modern fashion store as an initial sample with real catalog
      const sampleSite = addWebsite({
        name: 'Khaadi Fashion',
        url: 'https://pk.khaadi.com',
        status: 'active',
        discount_threshold: 50,
        scan_frequency: 3,
        last_scanned_at: new Date().toISOString(),
        next_scan_at: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
        favicon: 'https://www.google.com/s2/favicons?domain=pk.khaadi.com&sz=64',
      });
      res.json({ seeded: true, site: sampleSite });
    } else {
      res.json({ seeded: false, message: 'Already has sites configured.' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vite middleware for dev or static serving for prod
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SaleWatch] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[SaleWatch] Fatal startup error:', err);
});
