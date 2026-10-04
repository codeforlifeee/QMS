import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import puppeteer from 'puppeteer';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Simple health-check
app.get('/health', (req, res) => res.json({ ok: true, service: 'PDF Server', version: '2.0' }));

// PDF Quality Standards - Server enforces these
const PDF_QUALITY_STYLES = `
  /* SPACING STANDARDS */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  
  /* CONSISTENT SPACING */
  .pdf-section, section {
    padding: 12px !important;
    margin: 20px 0 !important;
  }
  
  /* CONSISTENT COLORS - NO GRADIENTS */
  * {
    background-image: none !important;
  }
  
  /* TABLE STANDARDS */
  table {
    border-collapse: collapse !important;
    width: 100% !important;
  }
  
  table th {
    background-color: #008B8B !important;
    color: #ffffff !important;
    padding: 12px !important;
    font-weight: 700 !important;
  }
  
  table td {
    padding: 12px !important;
    border-bottom: 1px solid #f5f5f5 !important;
  }
  
  table tr:nth-child(even) td {
    background-color: #f9f9f9 !important;
  }
  
  table tr:nth-child(odd) td {
    background-color: #ffffff !important;
  }
  
  /* FOOTER STANDARDS */
  footer, .footer {
    margin-top: 40px !important;
    border-top: 2px solid #008B8B !important;
    padding: 15px !important;
    background-color: #f9f9f9 !important;
    page-break-inside: avoid !important;
  }
  
  /* FONT STANDARDS */
  * {
    font-family: Arial, "Helvetica Neue", Helvetica, sans-serif !important;
  }
  
  h1 { font-size: 16px !important; line-height: 1.6 !important; }
  h2 { font-size: 14px !important; line-height: 1.6 !important; }
  h3 { font-size: 13px !important; line-height: 1.6 !important; }
  p, div, span, td, th { font-size: 12px !important; line-height: 1.6 !important; }
  small { font-size: 11px !important; line-height: 1.6 !important; }
  
  /* IMAGE STANDARDS */
  img {
    max-width: 100% !important;
    height: auto !important;
    display: block !important;
  }
  
  /* PAGE BREAK STANDARDS */
  .no-break, .keep-together, .pdf-section {
    page-break-inside: avoid !important;
  }
  
  @media print {
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .no-print {
      display: none !important;
    }
    
    footer, .footer {
      display: block !important;
      page-break-inside: avoid !important;
    }
  }
  
  @page {
    size: A4;
    margin: 10mm;
  }
`;

app.post('/api/render-pdf', async (req, res) => {
  const startTime = Date.now();
  const { html, url, filename = 'document.pdf', options = {} } = req.body || {};

  console.log('[PDF Server] Request received:', { filename, hasHtml: !!html, hasUrl: !!url });

  if (!html && !url) {
    res.status(400).json({ error: 'Either html or url must be provided' });
    return;
  }

  let browser;
  try {
    // Launch browser with optimized settings
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Set viewport for consistent rendering
    await page.setViewport({
      width: 1000,
      height: 1400,
      deviceScaleFactor: 2
    });

    // Load content
    if (url) {
      console.log('[PDF Server] Loading URL:', url);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    } else {
      console.log('[PDF Server] Setting HTML content...');
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    }

    // Wait for fonts and images
    await page.evaluateHandle('document.fonts.ready');
    
    // Apply quality standards
    console.log('[PDF Server] Applying quality standards...');
    await page.addStyleTag({ content: PDF_QUALITY_STYLES });
    
    // Remove unwanted elements
    await page.evaluate(() => {
      const toRemove = document.querySelectorAll('.no-print, .controls, button, .edit-button, .delete-button');
      toRemove.forEach(el => el.remove());
    });
    
    // Fix gradients to solid colors
    await page.evaluate(() => {
      const all = document.querySelectorAll('*');
      all.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.backgroundImage && style.backgroundImage.includes('gradient')) {
          el.style.backgroundImage = 'none';
          if (style.backgroundImage.includes('#008B8B')) {
            el.style.backgroundColor = '#008B8B';
          } else if (style.backgroundImage.includes('#075056')) {
            el.style.backgroundColor = '#075056';
          } else {
            el.style.backgroundColor = '#ffffff';
          }
        }
      });
    });

    // Extra wait time for rendering
    const waitTime = options.waitFor || 1000;
    console.log('[PDF Server] Waiting', waitTime, 'ms for complete rendering...');
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // Configure PDF options
    const pdfOptions = {
      printBackground: true,
      format: 'A4',
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '15mm',
        left: '10mm'
      },
      preferCSSPageSize: false,
      displayHeaderFooter: false,
      ...options.pdfOptions,
    };

    console.log('[PDF Server] Generating PDF with options:', pdfOptions);
    const buffer = await page.pdf(pdfOptions);
    
    const elapsed = Date.now() - startTime;
    const sizeKB = (buffer.length / 1024).toFixed(2);
    
    console.log('[PDF Server] Success! Size:', sizeKB, 'KB, Time:', elapsed, 'ms');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-PDF-Size', buffer.length);
    res.setHeader('X-Generation-Time', elapsed);
    res.send(buffer);
    
  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.error('[PDF Server] Error after', elapsed, 'ms:', err.message);
    console.error('[PDF Server] Stack:', err.stack);
    res.status(500).json({
      error: err.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log('[PDF Server] Browser closed');
      } catch (e) {
        console.error('[PDF Server] Error closing browser:', e.message);
      }
    }
  }
});

// Endpoint to validate PDF quality standards
app.post('/api/validate-html', async (req, res) => {
  const { html } = req.body || {};
  
  if (!html) {
    res.status(400).json({ error: 'html is required' });
    return;
  }
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Check for quality issues
    const issues = await page.evaluate(() => {
      const problems = [];
      
      // Check for gradients
      const all = document.querySelectorAll('*');
      let gradientCount = 0;
      all.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.backgroundImage && style.backgroundImage.includes('gradient')) {
          gradientCount++;
        }
      });
      if (gradientCount > 0) {
        problems.push(`Found ${gradientCount} elements with gradient backgrounds`);
      }
      
      // Check tables
      const tables = document.querySelectorAll('table');
      tables.forEach((table, i) => {
        const style = window.getComputedStyle(table);
        if (style.borderCollapse !== 'collapse') {
          problems.push(`Table ${i}: border-collapse not set to collapse`);
        }
      });
      
      // Check footer
      const footer = document.querySelector('footer, .footer');
      if (!footer) {
        problems.push('No footer element found');
      }
      
      return problems;
    });
    
    res.json({
      valid: issues.length === 0,
      issues
    });
    
  } catch (err) {
    console.error('[PDF Server] Validation error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// Server info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    service: 'QMS PDF Generation Server',
    version: '2.0',
    methods: ['Puppeteer'],
    features: [
      'Quality Standards Enforcement',
      'Gradient Removal',
      'Consistent Spacing',
      'Table Styling',
      'Footer Formatting',
      'Font Normalization'
    ],
    endpoints: {
      health: '/health',
      renderPdf: '/api/render-pdf',
      validateHtml: '/api/validate-html',
      info: '/api/info'
    }
  });
});

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('  QMS PDF Generation Server v2.0');
  console.log('='.repeat(60));
  console.log(`  ✓ Server running on port ${PORT}`);
  console.log(`  ✓ Health check: http://localhost:${PORT}/health`);
  console.log(`  ✓ Info: http://localhost:${PORT}/api/info`);
  console.log(`  ✓ PDF Quality Standards: ENABLED`);
  console.log('='.repeat(60));
});
