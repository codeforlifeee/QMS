import puppeteer from 'puppeteer';
import type { Browser } from 'puppeteer';

/**
 * Server-side PDF rendering.
 *
 * The browser's native print dialog adds its own time, URL and page-number headers,
 * and often rescales content to a reduced area — none of which can be removed from
 * CSS, because they are controlled by the viewer's checkbox. The PRD anticipated this
 * (§4, "Optional upgrade, behind a port") and routes every one-click download through
 * this module instead.
 *
 * One Chromium process is kept alive between requests. Cold-launching Chrome adds
 * ~500ms per request; keeping it warm brings that to ~70ms, which is below what
 * humans notice.
 */

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
  }
  return browserPromise;
}

/** Clean shutdown when the Astro dev server stops. */
export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const b = await browserPromise;
    browserPromise = null;
    await b.close();
  }
}

export interface RenderOptions {
  readonly url: string;
  /** Return as `Uint8Array` so it can be streamed back as a Response body. */
}

export async function renderPdf({ url }: RenderOptions): Promise<Uint8Array> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // A4 at 96dpi is 794x1123. The actual paper size comes from preferCSSPageSize, so
    // the viewport only affects how media queries evaluate — but the print CSS doesn't
    // use any, so any A4-ish viewport is fine.
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });

    // networkidle0 waits until there are no outstanding requests for 500ms. Important
    // for the hero image, which comes from Unsplash and would otherwise be missing on
    // the first page.
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60_000 });

    // Belt-and-braces: wait for fonts even though we use the system stack.
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });

    const pdf = await page.pdf({
      // Use the CSS @page rule in document.css as the single source of truth for
      // paper size and margins. This is what makes the output match the preview
      // instead of being resized by the browser's print dialog.
      preferCSSPageSize: true,
      // Required to keep gradients, backgrounds and tinted panels. Without this the
      // whole document loses its colour.
      printBackground: true,
      // The fix for the user's three complaints: no time, no URL, no page number.
      displayHeaderFooter: false,
      // Our CSS @page controls the margin; passing 0 here tells Puppeteer not to add
      // its own on top.
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    return pdf;
  } finally {
    await page.close();
  }
}
