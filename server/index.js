import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import puppeteer from 'puppeteer';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Simple health-check
app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/api/render-pdf', async (req, res) => {
  const { html, url, filename = 'document.pdf', options = {} } = req.body || {};

  if (!html && !url) {
    res.status(400).json({ error: 'Either html or url must be provided' });
    return;
  }

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    // Set default viewport for consistent rendering
    await page.setViewport({ width: 1240, height: 800 });

    if (url) {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    } else {
      await page.setContent(html, { waitUntil: 'networkidle0' });
    }

    // Give browser a little time to apply webfonts or lazy-loaded content
    await page.waitForTimeout(options.waitFor || 300);

    const pdfOptions = {
      printBackground: true,
      format: 'A4',
      margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
      ...options.pdfOptions,
    };

    const buffer = await page.pdf(pdfOptions);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('render-pdf error:', err);
    res.status(500).json({ error: err.message || 'Unknown error' });
  } finally {
    try { await browser.close(); } catch (e) {}
  }
});

app.listen(PORT, () => {
  console.log(`PDF render server listening on port ${PORT}`);
});
