/**
 * UNIFIED PDF GENERATOR WITH MULTIPLE METHODS
 * Supports: Puppeteer (server), html2pdf, jsPDF+html2canvas, and print
 * All methods use the quality checker for consistent output
 */

import html2pdf from 'html2pdf.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { applyAllQualityFixes, validatePDFQuality } from './pdfQualityChecker';

// Configuration
const PDF_SERVER_URL = 'http://localhost:4000';
const MIN_PDF_SIZE = 10000; // 10KB minimum

/**
 * Generate descriptive PDF filename from quotation data
 * Format: GuestName_Destination_Date.pdf
 */
export const generatePDFFilename = (quotationData = {}) => {
  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const guestName = (quotationData.guestName || 'Guest').replace(/[^a-z0-9]/gi, '_').substring(0, 30);
  const destination = (quotationData.destination || quotationData.packageTitle || 'Travel')
    .replace(/[^a-z0-9]/gi, '_')
    .substring(0, 30);
  
  return `${guestName}_${destination}_${timestamp}.pdf`;
};

/**
 * PDF Generation Methods
 */
export const PDF_METHODS = {
  PUPPETEER: 'puppeteer',      // Server-side rendering (best quality)
  HTML2PDF: 'html2pdf',        // Client-side with html2pdf.js (good)
  JSPDF: 'jspdf',              // Client-side with jsPDF (manual control)
  PRINT: 'print'               // Browser print dialog (fallback)
};

/**
 * METHOD 1: Puppeteer (Server-Side) - BEST QUALITY
 */
export const generatePDFViaPuppeteer = async (element, filename = 'quotation.pdf') => {
  try {
    console.log('[PDF Puppeteer] Starting server-side generation...');
    
    if (!element) {
      throw new Error('Element not provided');
    }
    
    // Apply quality fixes
    const fixedElement = applyAllQualityFixes(element);
    
    // Build complete HTML document
    const html = await buildCompleteHTML(fixedElement);
    
    // Send to server
    const response = await fetch(`${PDF_SERVER_URL}/api/render-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html,
        filename,
        options: {
          waitFor: 1000,
          pdfOptions: {
            format: 'A4',
            printBackground: true,
            margin: {
              top: '10mm',
              right: '10mm',
              bottom: '15mm',
              left: '10mm'
            }
          }
        }
      })
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Server error' }));
      throw new Error(error.error || `Server responded with ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    const blob = new Blob([buffer], { type: 'application/pdf' });
    
    if (blob.size < MIN_PDF_SIZE) {
      throw new Error(`Generated PDF is too small (${blob.size} bytes)`);
    }
    
    console.log('[PDF Puppeteer] Success! Size:', (blob.size / 1024).toFixed(2), 'KB');
    
    // Download
    saveAs(blob, filename);
    
    return blob;
    
  } catch (error) {
    console.error('[PDF Puppeteer] Failed:', error);
    throw new Error(`Puppeteer PDF failed: ${error.message}. Ensure server is running at ${PDF_SERVER_URL}`);
  }
};

/**
 * METHOD 2: html2pdf.js - GOOD QUALITY
 */
export const generatePDFViaHtml2Pdf = async (element, filename = 'quotation.pdf') => {
  try {
    console.log('[PDF html2pdf] Starting client-side generation...');
    
    if (!element) {
      throw new Error('Element not provided');
    }
    
    // Apply quality fixes
    const fixedElement = applyAllQualityFixes(element);
    
    // Prepare for rendering
    const prepared = await prepareElementForPDF(fixedElement);
    
    // Attach to DOM temporarily
    prepared.style.position = 'fixed';
    prepared.style.left = '0';
    prepared.style.top = '0';
    prepared.style.opacity = '0.01'; // Nearly invisible but rendered
    prepared.style.pointerEvents = 'none';
    prepared.style.zIndex = '-9999';
    
    document.body.appendChild(prepared);
    
    try {
      // Wait for rendering
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Configure html2pdf
      const config = {
        margin: [10, 10, 15, 10],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 3,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 1000,
          windowHeight: prepared.scrollHeight
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
          compress: true
        },
        pagebreak: {
          mode: ['avoid-all', 'css'],
          avoid: '.no-break, .keep-together'
        }
      };
      
      // Generate PDF
      const blob = await html2pdf().set(config).from(prepared).output('blob');
      
      if (!blob || blob.size < MIN_PDF_SIZE) {
        throw new Error(`Generated PDF is too small (${blob?.size || 0} bytes)`);
      }
      
      console.log('[PDF html2pdf] Success! Size:', (blob.size / 1024).toFixed(2), 'KB');
      
      // Download
      saveAs(blob, filename);
      
      return blob;
      
    } finally {
      // Cleanup
      document.body.removeChild(prepared);
    }
    
  } catch (error) {
    console.error('[PDF html2pdf] Failed:', error);
    throw new Error(`html2pdf failed: ${error.message}`);
  }
};

/**
 * METHOD 3: jsPDF + html2canvas - BEST CLIENT-SIDE METHOD
 * IMPROVED: Better quality, faster, footer at end only
 */
export const generatePDFViaJsPDF = async (element, filename = 'quotation.pdf') => {
  try {
    console.log('[PDF jsPDF] Starting IMPROVED jsPDF generation...');
    
    if (!element) {
      throw new Error('Element not provided');
    }
    
    // Apply quality fixes (now much less aggressive)
    const fixedElement = applyAllQualityFixes(element);
    
    // Prepare element
    const prepared = await prepareElementForPDF(fixedElement);
    
    // Keep footer as part of content (don't separate it)
    // Footer will appear at the end as a section, not repeated on pages
    
    // Attach main content
    prepared.style.position = 'fixed';
    prepared.style.left = '-9999px';
    prepared.style.top = '0';
    prepared.style.width = '900px'; // Increased for better quality
    
    document.body.appendChild(prepared);
    
    try {
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Capture content with IMPROVED settings - PRESERVE EXACT UI APPEARANCE
      console.log('[PDF jsPDF] Capturing content with high quality settings...');
      const contentCanvas = await html2canvas(prepared, {
        scale: 4, // High quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 900,
        windowHeight: prepared.scrollHeight,
        letterRendering: true,
        allowTaint: false,
        removeContainer: false,
        // CRITICAL: Preserve exact colors as user sees them
        foreignObjectRendering: false,
        imageTimeout: 0,
        onclone: (clonedDoc) => {
          // Ensure all computed styles are preserved
          const clonedElement = clonedDoc.body.firstChild;
          if (clonedElement) {
            clonedElement.style.webkitPrintColorAdjust = 'exact';
            clonedElement.style.printColorAdjust = 'exact';
            clonedElement.style.colorAdjust = 'exact';
          }
        }
      });
      
      console.log('[PDF jsPDF] Canvas captured. Size:', contentCanvas.width, 'x', contentCanvas.height);
      
      // Create PDF with optimized settings
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
        precision: 2
      });
      
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 8; // Reduced margins
      const contentWidth = pageWidth - (margin * 2);
      const contentHeight = pageHeight - (margin * 2);
      
      // Calculate dimensions
      const imgWidth = contentWidth;
      const imgHeight = (contentCanvas.height * imgWidth) / contentCanvas.width;
      
      // Split into pages
      const totalPages = Math.ceil(imgHeight / contentHeight);
      
      console.log('[PDF jsPDF] Splitting into', totalPages, 'pages...');
      
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage();
        }
        
        const yOffset = -(page * contentHeight);
        
        const imgData = contentCanvas.toDataURL('image/jpeg', 0.98); // Higher quality
        pdf.addImage(
          imgData,
          'JPEG',
          margin,
          margin + yOffset,
          imgWidth,
          imgHeight,
          undefined,
          'FAST' // Use FAST compression
        );
        
        console.log('[PDF jsPDF] Page', page + 1, 'of', totalPages, 'added');
      }
      
      // Get blob
      const blob = pdf.output('blob');
      
      if (!blob || blob.size < MIN_PDF_SIZE) {
        throw new Error(`Generated PDF is too small (${blob?.size || 0} bytes)`);
      }
      
      console.log('[PDF jsPDF] Success! Size:', (blob.size / 1024).toFixed(2), 'KB');
      
      // Download
      saveAs(blob, filename);
      
      return blob;
      
    } finally {
      document.body.removeChild(prepared);
    }
    
  } catch (error) {
    console.error('[PDF jsPDF] Failed:', error);
    throw new Error(`jsPDF failed: ${error.message}`);
  }
};

/**
 * METHOD 4: Browser Print - FALLBACK
 */
export const generatePDFViaPrint = async (element, filename = 'quotation.pdf') => {
  try {
    console.log('[PDF Print] Opening print dialog...');
    
    if (!element) {
      throw new Error('Element not provided');
    }
    
    // Apply quality fixes
    const fixedElement = applyAllQualityFixes(element);
    
    // Create print-friendly page
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      throw new Error('Please allow popups to use print functionality');
    }
    
    // Build complete HTML
    const html = await buildCompleteHTML(fixedElement);
    
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Trigger print
    printWindow.print();
    
    console.log('[PDF Print] Print dialog opened');
    
    return null; // No blob for print method
    
  } catch (error) {
    console.error('[PDF Print] Failed:', error);
    throw new Error(`Print failed: ${error.message}`);
  }
};

/**
 * SMART PDF GENERATOR - Try methods in order of preference
 */
export const generatePDFSmart = async (element, filename = 'quotation.pdf', preferredMethod = null) => {
  const methods = [
    { name: 'Puppeteer', fn: generatePDFViaPuppeteer },
    { name: 'html2pdf', fn: generatePDFViaHtml2Pdf },
    { name: 'jsPDF', fn: generatePDFViaJsPDF },
    { name: 'Print', fn: generatePDFViaPrint }
  ];
  
  // If preferred method specified, try it first
  if (preferredMethod) {
    const preferredIndex = methods.findIndex(m => m.name.toLowerCase() === preferredMethod.toLowerCase());
    if (preferredIndex > 0) {
      const [preferred] = methods.splice(preferredIndex, 1);
      methods.unshift(preferred);
    }
  }
  
  let lastError = null;
  
  for (const method of methods) {
    try {
      console.log(`[PDF Smart] Trying ${method.name}...`);
      const result = await method.fn(element, filename);
      console.log(`[PDF Smart] Success with ${method.name}!`);
      return { method: method.name, blob: result };
    } catch (error) {
      console.warn(`[PDF Smart] ${method.name} failed:`, error.message);
      lastError = error;
      
      // If Puppeteer fails (server not running), skip to client methods
      if (method.name === 'Puppeteer') {
        continue;
      }
      
      // If other methods fail, try next
      continue;
    }
  }
  
  throw new Error(`All PDF generation methods failed. Last error: ${lastError?.message}`);
};

/**
 * HELPER: Build complete HTML document with all styles
 */
const buildCompleteHTML = async (element) => {
  const clone = element.cloneNode(true);
  
  // Collect all styles
  const styles = [];
  
  // Inline styles
  document.querySelectorAll('style').forEach(style => {
    if (style.textContent) {
      styles.push(style.textContent);
    }
  });
  
  // External stylesheets
  const links = document.querySelectorAll('link[rel="stylesheet"]');
  for (const link of links) {
    try {
      const response = await fetch(link.href);
      if (response.ok) {
        const css = await response.text();
        styles.push(css);
      }
    } catch (error) {
      console.warn('[PDF] Failed to fetch stylesheet:', link.href);
    }
  }
  
  // PDF-specific styles
  const pdfStyles = `
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    
    body {
      margin: 0;
      padding: 20px;
      background: #ffffff;
      font-family: Arial, sans-serif;
      color: #333;
    }
    
    .pdf-root {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
    }
    
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      body {
        margin: 0;
        padding: 10mm;
      }
      
      .no-print {
        display: none !important;
      }
    }
    
    @page {
      size: A4;
      margin: 10mm;
    }
  `;
  
  styles.push(pdfStyles);
  
  // Build HTML
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PDF Document</title>
  <style>
    ${styles.join('\n\n')}
  </style>
</head>
<body>
  <div class="pdf-root">
    ${clone.outerHTML}
  </div>
</body>
</html>
  `.trim();
  
  return html;
};

/**
 * HELPER: Prepare element for PDF rendering
 */
const prepareElementForPDF = async (element) => {
  const clone = element.cloneNode(true);
  
  // Remove unwanted elements
  const toRemove = clone.querySelectorAll('.no-print, .controls, button, .edit-button, .delete-button');
  toRemove.forEach(el => el.remove());
  
  // Set fixed width
  clone.style.width = '800px';
  clone.style.maxWidth = '800px';
  clone.style.minWidth = '800px';
  clone.style.backgroundColor = '#ffffff';
  clone.style.padding = '20px';
  clone.style.boxSizing = 'border-box';
  
  // Handle images
  const images = clone.querySelectorAll('img');
  for (const img of images) {
    // Replace local paths with placeholders
    const src = img.src || '';
    if (!src.startsWith('http') && !src.startsWith('data:')) {
      img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23ddd" width="100" height="100"/><text x="50" y="50" text-anchor="middle" font-size="12" fill="%23666">Image</text></svg>';
    }
    
    // Set crossorigin
    img.setAttribute('crossorigin', 'anonymous');
    
    // Wait for loading
    if (!img.complete) {
      await new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
        setTimeout(resolve, 3000);
      });
    }
  }
  
  return clone;
};

/**
 * VALIDATE BEFORE GENERATION
 */
export const validateBeforeGeneration = (element) => {
  console.log('[PDF Validation] Checking quality...');
  
  const validation = validatePDFQuality(element);
  
  if (!validation.valid) {
    console.warn('[PDF Validation] Quality issues found:', validation.issues);
    console.log('[PDF Validation] Will apply automatic fixes');
  } else {
    console.log('[PDF Validation] Quality check passed!');
  }
  
  return validation;
};

// Export all methods
export default {
  generatePDFViaPuppeteer,
  generatePDFViaHtml2Pdf,
  generatePDFViaJsPDF,
  generatePDFViaPrint,
  generatePDFSmart,
  validateBeforeGeneration,
  PDF_METHODS
};
