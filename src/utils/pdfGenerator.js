import html2pdf from 'html2pdf.js';

/**
 * PDF Configuration for html2pdf
 */
export const getPDFConfig = (filename = 'quotation.pdf') => {
  const sanitizeFilename = (name) => {
    return name.replace(/[:\\/*"?|<>]/g, '_');
  };
  return {
    margin: [12, 12, 12, 12], // top, left, bottom, right (in mm)
    filename: sanitizeFilename(filename),
    image: {
      type: 'jpeg',
      quality: 0.95,
    },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      letterRendering: true,
      backgroundColor: '#ffffff',
      removeContainer: false,
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
      compress: true,
    },
    pagebreak: {
      mode: ['avoid-all', 'css', 'legacy'],
      before: '.page-break',
      after: '.section-break',
      avoid: '.keep-together',
    },
  };
};

/**
 * Generate and download PDF from HTML element
 * @param {HTMLElement} element - Element to convert to PDF
 * @param {string} filename - Output filename
 * @returns {Promise<void>}
 */
export const downloadPDF = async (element, filename = 'quotation.pdf') => {
  try {
    // Check if element exists
    if (!element) {
      throw new Error('Element not found for PDF generation');
    }

    // Clone the element to avoid modifying original
    const elementClone = element.cloneNode(true);

    // Remove elements that shouldn't appear in PDF
    const elementsToRemove = elementClone.querySelectorAll(
      '.no-print, .controls, .edit-button, .delete-button'
    );
    elementsToRemove.forEach((el) => el.remove());

    // Ensure all images are fully loaded before PDF generation
    const images = elementClone.querySelectorAll('img');
    const imageLoadPromises = Array.from(images).map((img) => {
      return new Promise((resolve) => {
        if (img.complete) {
          resolve();
        } else {
          img.onload = resolve;
          img.onerror = resolve; // Resolve even if image fails to load
          // Set a timeout to prevent hanging
          setTimeout(resolve, 5000);
        }
      });
    });

    await Promise.all(imageLoadPromises);

    // Create PDF
    // Make sure the cloned element is attached to the DOM and not visible
    try {
      console.debug('[pdfGenerator] Preparing PDF for:', filename);
      console.debug('[pdfGenerator] Element width:', element.offsetWidth, 'height:', element.offsetHeight);
      elementClone.style.position = 'fixed';
      elementClone.style.left = '-9999px';
      elementClone.style.top = '0';
      elementClone.style.zIndex = '-9999';
      // preserve width so canvas sizing behaves as expected
      const originalStyle = window.getComputedStyle(element);
      const width = originalStyle.width || `${element.offsetWidth}px`;
      elementClone.style.width = width;
      document.body.appendChild(elementClone);

      // set crossOrigin on images to attempt CORS loading (if allowed by host)
      Array.from(elementClone.querySelectorAll('img')).forEach((img) => {
        try {
          if (!img.getAttribute('crossorigin')) img.setAttribute('crossorigin', 'anonymous');
        } catch (e) {
          // ignore
        }
      });

      const config = getPDFConfig(filename);
      console.debug('[pdfGenerator] Using config:', config);
      await html2pdf().set(config).from(elementClone).save();
      console.debug('[pdfGenerator] PDF saved successfully');
    } finally {
      // remove the temporary clone to avoid affecting layout
      try {
        if (elementClone && elementClone.parentNode === document.body) {
          document.body.removeChild(elementClone);
        }
      } catch (e) {
        // ignore remove errors
      }
    }

    return true;
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
};

/**
 * Preview PDF in new window/tab (for debugging)
 * @param {HTMLElement} element - Element to convert to PDF
 * @returns {Promise<void>}
 */
export const previewPDF = async (element) => {
  try {
    if (!element) {
      throw new Error('Element not found for PDF preview');
    }

    const elementClone = element.cloneNode(true);
    const elementsToRemove = elementClone.querySelectorAll(
      '.no-print, .controls, .edit-button, .delete-button'
    );
    elementsToRemove.forEach((el) => el.remove());

    const images = elementClone.querySelectorAll('img');
    const imageLoadPromises = Array.from(images).map((img) => {
      return new Promise((resolve) => {
        if (img.complete) {
          resolve();
        } else {
          img.onload = resolve;
          img.onerror = resolve;
          setTimeout(resolve, 5000);
        }
      });
    });

    await Promise.all(imageLoadPromises);

    // Attach clone briefly to ensure rendering of CSS, fonts and images
    try {
      elementClone.style.position = 'fixed';
      elementClone.style.left = '-9999px';
      elementClone.style.top = '0';
      elementClone.style.width = window.getComputedStyle(element).width || `${element.offsetWidth}px`;
      document.body.appendChild(elementClone);

      // set crossOrigin on images (best-effort)
      Array.from(elementClone.querySelectorAll('img')).forEach((img) => {
        try {
          if (!img.getAttribute('crossorigin')) img.setAttribute('crossorigin', 'anonymous');
        } catch (e) {}
      });

      const config = getPDFConfig('preview.pdf');
      console.debug('[pdfGenerator.preview] Using preview config:', config);
      const pdfAsString = await html2pdf().set(config).from(elementClone).outputPdf('dataurlstring');
      const newTab = window.open();
      newTab.document.write(`<iframe src="${pdfAsString}" style="width:100%;height:100%;border:none;"></iframe>`);
    } finally {
      try {
        if (elementClone && elementClone.parentNode === document.body) document.body.removeChild(elementClone);
      } catch (e) {}
    }

    return true;
  } catch (error) {
    console.error('PDF Preview Error:', error);
    throw new Error(`PDF preview failed: ${error.message}`);
  }
};

/**
 * Get PDF blob for email or upload
 * @param {HTMLElement} element - Element to convert
 * @returns {Promise<Blob>}
 */
export const getPDFBlob = async (element) => {
  try {
    if (!element) {
      throw new Error('Element not found');
    }

    const elementClone = element.cloneNode(true);
    const elementsToRemove = elementClone.querySelectorAll(
      '.no-print, .controls, .edit-button, .delete-button'
    );
    elementsToRemove.forEach((el) => el.remove());

    const images = elementClone.querySelectorAll('img');
    const imageLoadPromises = Array.from(images).map((img) => {
      return new Promise((resolve) => {
        if (img.complete) {
          resolve();
        } else {
          img.onload = resolve;
          img.onerror = resolve;
          setTimeout(resolve, 5000);
        }
      });
    });

    await Promise.all(imageLoadPromises);

    // Attach clone temporarily
    try {
      elementClone.style.position = 'fixed';
      elementClone.style.left = '-9999px';
      elementClone.style.top = '0';
      elementClone.style.width = window.getComputedStyle(element).width || `${element.offsetWidth}px`;
      document.body.appendChild(elementClone);

      Array.from(elementClone.querySelectorAll('img')).forEach((img) => {
        try {
          if (!img.getAttribute('crossorigin')) img.setAttribute('crossorigin', 'anonymous');
        } catch (e) {}
      });

      const config = getPDFConfig('quotation.pdf');
      console.debug('[pdfGenerator.getPDFBlob] Using config:', config);
      const pdf = await html2pdf().set(config).from(elementClone).output('blob');
      return pdf;
    } finally {
      try {
        if (elementClone && elementClone.parentNode === document.body) document.body.removeChild(elementClone);
      } catch (e) {}
    }

    return pdf;
  } catch (error) {
    console.error('PDF Blob Error:', error);
    throw new Error(`Failed to generate PDF blob: ${error.message}`);
  }
};

/**
 * Optimized PDF generation with error handling and retries
 * @param {HTMLElement} element
 * @param {string} filename
 * @param {number} maxRetries
 * @returns {Promise<void>}
 */
export const downloadPDFWithRetry = async (
  element,
  filename = 'quotation.pdf',
  maxRetries = 3
) => {
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await downloadPDF(element, filename);
      return; // Success
    } catch (error) {
      lastError = error;
      console.warn(`PDF download attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  // All retries failed
  throw new Error(
    `PDF download failed after ${maxRetries} attempts: ${lastError?.message}`
  );
};
