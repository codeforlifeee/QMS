import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';

/**
 * NEW ADVANCED PDF GENERATOR
 * Uses jsPDF + html2canvas with PRECISE CONTROL
 * 
 * Benefits:
 * ✅ No unexpected white spaces
 * ✅ Perfect color rendering
 * ✅ Footer on every page
 * ✅ Manual page break control
 * ✅ Consistent output
 */

// PDF Configuration
const PDF_CONFIG = {
  format: 'a4',
  orientation: 'portrait',
  unit: 'mm',
  compress: true,
  
  // A4 dimensions in mm
  pageWidth: 210,
  pageHeight: 297,
  
  // Margins in mm
  marginTop: 8,
  marginBottom: 15, // More space for footer
  marginLeft: 10,
  marginRight: 10,
  
  // Content area
  get contentWidth() {
    return this.pageWidth - this.marginLeft - this.marginRight;
  },
  get contentHeight() {
    return this.pageHeight - this.marginTop - this.marginBottom;
  },
  
  // Canvas settings
  canvasScale: 3, // High quality
  canvasBackgroundColor: '#ffffff',
};

/**
 * Prepare element for PDF capture
 */
const prepareElement = (element) => {
  const clone = element.cloneNode(true);
  
  // Remove elements that shouldn't be in PDF
  const toRemove = clone.querySelectorAll(
    '.no-print, .controls, .edit-button, .delete-button, button'
  );
  toRemove.forEach(el => el.remove());
  
  // Force white background
  clone.style.backgroundColor = '#ffffff';
  clone.style.background = '#ffffff';
  
  // Remove ALL gradients and replace with solid colors
  const allElements = clone.querySelectorAll('*');
  allElements.forEach(el => {
    const style = window.getComputedStyle(el);
    
    // Handle background gradients
    if (style.backgroundImage && style.backgroundImage.includes('gradient')) {
      const bgImage = style.backgroundImage;
      
      // Extract color and replace with solid
      if (bgImage.includes('#075056') || bgImage.includes('teal')) {
        el.style.backgroundImage = 'none';
        el.style.backgroundColor = '#075056'; // Solid teal
      } else if (bgImage.includes('#ff5b04') || bgImage.includes('orange')) {
        el.style.backgroundImage = 'none';
        el.style.backgroundColor = '#fff7ed'; // Light orange
      } else if (bgImage.includes('#00897b') || bgImage.includes('green')) {
        el.style.backgroundImage = 'none';
        el.style.backgroundColor = '#e8f5e9'; // Light green
      } else if (bgImage.includes('blue')) {
        el.style.backgroundImage = 'none';
        el.style.backgroundColor = '#e3f2fd'; // Light blue
      } else {
        el.style.backgroundImage = 'none';
        if (!el.style.backgroundColor || el.style.backgroundColor === 'transparent') {
          el.style.backgroundColor = '#ffffff';
        }
      }
    }
    
    // Force opacity to 1
    if (style.opacity && parseFloat(style.opacity) < 1) {
      el.style.opacity = '1';
    }
    
    // Ensure text color is visible
    if (!style.color || style.color === 'transparent') {
      if (el.closest('.footer') || el.style.backgroundColor === '#075056') {
        el.style.color = '#ffffff';
      } else {
        el.style.color = '#000000';
      }
    }
  });
  
  // Optimize spacing - AGGRESSIVE
  const sections = clone.querySelectorAll('section, .pdf-section, div[style*="padding"]');
  sections.forEach(section => {
    section.style.marginTop = '0px';
    section.style.marginBottom = '6px';
    section.style.paddingTop = '8px';
    section.style.paddingBottom = '8px';
  });
  
  // Remove excess margins globally
  allElements.forEach(el => {
    const style = window.getComputedStyle(el);
    const marginTop = parseFloat(style.marginTop);
    const marginBottom = parseFloat(style.marginBottom);
    
    if (marginTop > 12) el.style.marginTop = '6px';
    if (marginBottom > 12) el.style.marginBottom = '6px';
  });
  
  // Set fixed width for consistent rendering
  clone.style.width = '800px';
  clone.style.maxWidth = '800px';
  clone.style.minWidth = '800px';
  clone.style.boxSizing = 'border-box';
  clone.style.padding = '20px';
  
  return clone;
};

/**
 * Extract footer element (if exists)
 */
const extractFooter = (element) => {
  const footer = element.querySelector('footer, .footer, [class*="footer"]');
  if (!footer) return null;
  
  // Clone and prepare footer
  const footerClone = footer.cloneNode(true);
  footerClone.style.position = 'relative';
  footerClone.style.width = '800px';
  footerClone.style.backgroundImage = 'none';
  footerClone.style.backgroundColor = '#075056';
  footerClone.style.color = '#ffffff';
  footerClone.style.padding = '15px 20px';
  
  return footerClone;
};

/**
 * Capture element as canvas
 */
const captureAsCanvas = async (element) => {
  // Temporarily add to DOM for proper rendering
  element.style.position = 'absolute';
  element.style.left = '-9999px';
  element.style.top = '0';
  element.style.visibility = 'visible';
  element.style.opacity = '1';
  
  document.body.appendChild(element);
  
  // Wait for fonts and images
  await document.fonts.ready;
  await new Promise(resolve => setTimeout(resolve, 300));
  
  try {
    const canvas = await html2canvas(element, {
      scale: PDF_CONFIG.canvasScale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: PDF_CONFIG.canvasBackgroundColor,
      logging: false,
      width: element.scrollWidth,
      height: element.scrollHeight,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      onclone: (clonedDoc) => {
        // Additional cleanup in cloned document
        const body = clonedDoc.body;
        body.style.backgroundColor = '#ffffff';
        
        // Remove any remaining gradients
        clonedDoc.querySelectorAll('*').forEach(el => {
          if (el.style.backgroundImage && el.style.backgroundImage.includes('gradient')) {
            el.style.backgroundImage = 'none';
          }
        });
      }
    });
    
    return canvas;
  } finally {
    // Clean up
    document.body.removeChild(element);
  }
};

/**
 * Add page to PDF with proper sizing
 */
const addCanvasToPDF = (pdf, canvas, yPosition = 0) => {
  const imgWidth = PDF_CONFIG.contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  
  pdf.addImage(
    imgData,
    'JPEG',
    PDF_CONFIG.marginLeft,
    yPosition + PDF_CONFIG.marginTop,
    imgWidth,
    imgHeight,
    undefined,
    'FAST'
  );
  
  return imgHeight;
};

/**
 * Add footer to current page
 */
const addFooterToPDF = async (pdf, footerElement) => {
  if (!footerElement) return;
  
  try {
    const footerCanvas = await captureAsCanvas(footerElement);
    
    const footerWidth = PDF_CONFIG.contentWidth;
    const footerHeight = (footerCanvas.height * footerWidth) / footerCanvas.width;
    
    // Position at bottom of page
    const yPosition = PDF_CONFIG.pageHeight - PDF_CONFIG.marginBottom - footerHeight;
    
    const footerImgData = footerCanvas.toDataURL('image/jpeg', 0.95);
    
    pdf.addImage(
      footerImgData,
      'JPEG',
      PDF_CONFIG.marginLeft,
      yPosition,
      footerWidth,
      footerHeight,
      undefined,
      'FAST'
    );
  } catch (error) {
    console.warn('[PDF] Footer rendering failed:', error);
  }
};

/**
 * Split content into pages
 */
const splitIntoPages = (canvas) => {
  const pages = [];
  const pageHeightInCanvas = (canvas.width / PDF_CONFIG.contentWidth) * PDF_CONFIG.contentHeight;
  
  let currentY = 0;
  
  while (currentY < canvas.height) {
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = Math.min(pageHeightInCanvas, canvas.height - currentY);
    
    const ctx = pageCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    
    ctx.drawImage(
      canvas,
      0, currentY, // Source position
      canvas.width, pageCanvas.height, // Source dimensions
      0, 0, // Destination position
      canvas.width, pageCanvas.height // Destination dimensions
    );
    
    pages.push(pageCanvas);
    currentY += pageHeightInCanvas;
  }
  
  return pages;
};

/**
 * Main PDF generation function
 */
export const generatePDF = async (element, filename = 'quotation.pdf') => {
  try {
    console.log('[PDF] Starting generation...');
    
    if (!element) {
      throw new Error('Element not found for PDF generation');
    }
    
    // Step 1: Prepare content
    console.log('[PDF] Preparing content...');
    const preparedElement = prepareElement(element);
    
    // Step 2: Extract footer
    console.log('[PDF] Extracting footer...');
    const footerElement = extractFooter(preparedElement);
    
    // Remove footer from main content to avoid duplication
    if (footerElement) {
      const footerInContent = preparedElement.querySelector('footer, .footer, [class*="footer"]');
      if (footerInContent) {
        footerInContent.remove();
      }
    }
    
    // Step 3: Capture content as high-quality canvas
    console.log('[PDF] Capturing content as canvas...');
    const contentCanvas = await captureAsCanvas(preparedElement);
    
    console.log('[PDF] Canvas size:', contentCanvas.width, 'x', contentCanvas.height);
    
    // Step 4: Split into pages
    console.log('[PDF] Splitting into pages...');
    const pageCanvases = splitIntoPages(contentCanvas);
    
    console.log('[PDF] Total pages:', pageCanvases.length);
    
    // Step 5: Create PDF
    console.log('[PDF] Creating PDF document...');
    const pdf = new jsPDF({
      orientation: PDF_CONFIG.orientation,
      unit: PDF_CONFIG.unit,
      format: PDF_CONFIG.format,
      compress: PDF_CONFIG.compress,
    });
    
    // Step 6: Add pages
    for (let i = 0; i < pageCanvases.length; i++) {
      console.log('[PDF] Adding page', i + 1, 'of', pageCanvases.length);
      
      if (i > 0) {
        pdf.addPage();
      }
      
      // Add content
      addCanvasToPDF(pdf, pageCanvases[i], 0);
      
      // Add footer on every page
      if (footerElement) {
        await addFooterToPDF(pdf, footerElement);
      }
    }
    
    // Step 7: Save PDF
    console.log('[PDF] Saving PDF...');
    const pdfBlob = pdf.output('blob');
    
    console.log('[PDF] PDF size:', (pdfBlob.size / 1024).toFixed(2), 'KB');
    
    saveAs(pdfBlob, filename);
    
    console.log('[PDF] Generation complete!');
    
    return pdfBlob;
    
  } catch (error) {
    console.error('[PDF] Generation failed:', error);
    throw error;
  }
};

/**
 * Preview PDF in new tab
 */
export const previewPDF = async (element) => {
  try {
    console.log('[PDF Preview] Starting...');
    
    const blob = await generatePDF(element, 'preview.pdf');
    
    // Open in new tab
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    
    // Clean up after a delay
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000);
    
    console.log('[PDF Preview] Complete!');
    
  } catch (error) {
    console.error('[PDF Preview] Failed:', error);
    throw error;
  }
};

/**
 * Get PDF blob for email/upload
 */
export const getPDFBlob = async (element, filename = 'quotation.pdf') => {
  return await generatePDF(element, filename);
};

/**
 * Download with retry logic
 */
export const downloadPDFWithRetry = async (element, filename = 'quotation.pdf', maxRetries = 2) => {
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[PDF] Attempt ${attempt} of ${maxRetries}...`);
      
      const blob = await generatePDF(element, filename);
      
      if (blob && blob.size > 10000) {
        console.log('[PDF] Success!');
        return blob;
      }
      
      throw new Error('Generated PDF is too small');
      
    } catch (error) {
      lastError = error;
      console.warn(`[PDF] Attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  throw new Error(`PDF generation failed after ${maxRetries} attempts: ${lastError?.message}`);
};

export default {
  generatePDF,
  previewPDF,
  getPDFBlob,
  downloadPDFWithRetry,
};
