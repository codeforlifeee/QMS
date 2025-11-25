import html2pdf from 'html2pdf.js';

/**
 * PDF Configuration for html2pdf
 */
export const getPDFConfig = (filename = 'quotation.pdf', overrides = {}) => {
  const sanitizeFilename = (name) => {
    return name.replace(/[:\\/*"?|<>]/g, '_');
  };
  const baseConfig = {
    margin: [12, 12, 12, 12], // top, left, bottom, right (in mm)
    filename: sanitizeFilename(filename),
    image: {
      type: 'jpeg',
      quality: 0.95,
    },
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: true,
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
  // Deep merge with overrides (shallow merge for nested objects as a simple approach)
  if (overrides && typeof overrides === 'object') {
    Object.keys(overrides).forEach((key) => {
      if (typeof overrides[key] === 'object' && baseConfig[key]) {
        baseConfig[key] = { ...baseConfig[key], ...overrides[key] };
      } else {
        baseConfig[key] = overrides[key];
      }
    });
  }
  return baseConfig;
};

/**
 * Generate and download PDF from HTML element
 * @param {HTMLElement} element - Element to convert to PDF
 * @param {string} filename - Output filename
 * @returns {Promise<void>}
 */
export const downloadPDF = async (element, filename = 'quotation.pdf', overrides = {}) => {
  try {
    // Check if element exists
    if (!element) {
      throw new Error('Element not found for PDF generation');
    }

    // Initial diagnostics: element metadata
    try {
      console.debug('[pdfGenerator] element meta width/height/nodes/textLen:', element.offsetWidth, element.offsetHeight, element.querySelectorAll ? element.querySelectorAll('*').length : 0, element.innerText ? element.innerText.length : 0);
    } catch (e) {}

    // Ensure the original element is visible and sized (common cause of blank PDFs)
    try {
      const rect = element.getBoundingClientRect ? element.getBoundingClientRect() : { width: element.offsetWidth, height: element.offsetHeight };
      if (!rect.width || !rect.height) {
        throw new Error('Source element is not visible or has zero width/height. Ensure the element is displayed and not hidden before exporting.');
      }
    } catch (e) {
      console.error('[pdfGenerator] Element visibility/size check failed:', e);
      throw e;
    }

    // Clone the element to avoid modifying original
    try {
      console.debug('[pdfGenerator.getPDFBlob] element meta width/height/nodes/textLen:', element.offsetWidth, element.offsetHeight, element.querySelectorAll ? element.querySelectorAll('*').length : 0, element.innerText ? element.innerText.length : 0);
    } catch (e) {}
    try {
      console.debug('[pdfGenerator.preview] element meta width/height/nodes/textLen:', element.offsetWidth, element.offsetHeight, element.querySelectorAll ? element.querySelectorAll('*').length : 0, element.innerText ? element.innerText.length : 0);
    } catch (e) {}
    const elementClone = element.cloneNode(true);

    // Remove elements that shouldn't appear in PDF
    const elementsToRemove = elementClone.querySelectorAll(
      '.no-print, .controls, .edit-button, .delete-button'
    );
    elementsToRemove.forEach((el) => el.remove());

    // Ensure all images are fully loaded before PDF generation
    const images = elementClone.querySelectorAll('img');
    // Replace local file paths with placeholders (file:// or C: paths won't load in browser)
    Array.from(images).forEach((img) => {
      try {
        // Treat any non-http/data-src as a local path (C:/ or file:) and replace with placeholder
        const src = img.src || '';
        const isExternal = src.startsWith('http') || src.startsWith('https') || src.startsWith('data:') || src.startsWith('//');
        if (src && !isExternal) {
          console.warn('[pdfGenerator] Replacing non-http image src for PDF capture:', src);
          img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="200"><rect width="100%" height="100%" fill="#ddd"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="20" fill="#333">Image Not Available</text></svg>';
        }
      } catch (e) {}
    });
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

    // Diagnostic helper: print element and images info to console
    const logElementDebug = (el, tag = '') => {
      try {
        const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : { width: el.offsetWidth, height: el.offsetHeight };
        const images = el.querySelectorAll ? el.querySelectorAll('img') : [];
        console.debug(`[pdfGenerator.debug ${tag}] rect:`, rect.width, 'x', rect.height, 'offset:', el.offsetWidth, 'x', el.offsetHeight);
        console.debug(`[pdfGenerator.debug ${tag}] nodes:`, el.querySelectorAll ? el.querySelectorAll('*').length : 0, 'textLen:', el.innerText ? el.innerText.length : 0);
        Array.from(images).forEach((img, i) => {
          console.debug(`[pdfGenerator.debug ${tag}] image[${i}] src:`, img.src, 'complete:', img.complete, 'natural:', img.naturalWidth + 'x' + img.naturalHeight, 'crossorigin:', img.getAttribute('crossorigin'));
        });
      } catch (e) {
        console.debug('[pdfGenerator.debug] failed to log element debug info', e);
      }
    };

    // Create PDF
    // Make sure the cloned element is attached to the DOM and not visible
    try {
      console.debug('[pdfGenerator] Preparing PDF for:', filename);
      console.debug('[pdfGenerator] Element width:', element.offsetWidth, 'height:', element.offsetHeight);
        // Position inside the viewport so the browser paints it and html2canvas can capture it
        elementClone.style.position = 'fixed';
        elementClone.style.left = '0';
        elementClone.style.top = '0';
        elementClone.style.zIndex = '99999'; // ensure it's painted above other elements
        elementClone.style.opacity = '1'; // Keep visible for html2canvas capture
        // Force background so white background applies in PDF capture
        elementClone.style.background = '#ffffff';
        elementClone.style.boxSizing = 'border-box';
        elementClone.style.pointerEvents = 'none';
      // preserve width so canvas sizing behaves as expected
      const originalStyle = window.getComputedStyle(element);
      const width = originalStyle.width || `${element.offsetWidth}px`;
      elementClone.style.width = width;
      // Force minHeight & height so the clone layout isn't collapsed
      try {
        const height = element.offsetHeight || element.getBoundingClientRect().height || 0;
        if (height > 0) elementClone.style.minHeight = `${height}px`;
        elementClone.style.height = 'auto';
      } catch (e) {}
      // Ensure clone and all children are visible to html2canvas
      try {
        elementClone.style.visibility = 'visible';
        Array.from(elementClone.querySelectorAll('*')).forEach((el) => {
          try { el.style.visibility = 'visible'; } catch (e) {}
        });
      } catch (e) {}
      document.body.appendChild(elementClone);
      try {
        elementClone.style.visibility = 'visible';
        Array.from(elementClone.querySelectorAll('*')).forEach((el) => {
          try { el.style.visibility = 'visible'; } catch (e) {}
        });
      } catch (e) {}
      // Ensure elements are visible to prevent CSS hiding
      try {
        elementClone.style.visibility = 'visible';
        Array.from(elementClone.querySelectorAll('*')).forEach((el) => {
          try { el.style.visibility = 'visible'; } catch (e) {}
        });
      } catch (e) {}
      try {
        await (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve());
      } catch (e) {}
      await new Promise((resolve) => setTimeout(resolve, 200));
      // Give the browser a brief moment to paint the clone before capture
      try {
        await (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve());
      } catch (e) {}
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Log clone diagnostics before capture
      try {
        const computed = window.getComputedStyle(elementClone);
        console.debug('[pdfGenerator.debug] clone computed style display/visibility/opacity:', computed.display, computed.visibility, computed.opacity);
      } catch (e) {}
      
      logElementDebug(elementClone, 'before-capture');
      try {
        const computed = window.getComputedStyle(elementClone);
        console.debug('[pdfGenerator.preview.debug] clone computed style after paint display/visibility/opacity:', computed.display, computed.visibility, computed.opacity);
      } catch (e) {}
      try {
        const computed = window.getComputedStyle(elementClone);
        console.debug('[pdfGenerator.getPDFBlob.debug] clone computed style after paint display/visibility/opacity:', computed.display, computed.visibility, computed.opacity);
      } catch (e) {}

      // Make sure any scrollable/overflow content expands in the clone so html2canvas captures it all
      try {
        elementClone.style.overflow = 'visible';
        Array.from(elementClone.querySelectorAll('*')).forEach((el) => {
          const style = window.getComputedStyle(el);
          if (style.overflow && style.overflow !== 'visible') {
            el.style.overflow = 'visible';
          }
          if ((style.maxHeight && style.maxHeight !== 'none') || (style.height && style.height.endsWith('px') && Number(style.height.replace('px', '')) > 0 && style.overflow === 'auto')) {
            el.style.maxHeight = 'none';
            el.style.height = 'auto';
          }
        });
      } catch (e) {}

      // Make sure any scrollable/overflow content expands in the clone so html2canvas captures it all
      try {
        // unhide any overflowed content inside clone
        elementClone.style.overflow = 'visible';
        Array.from(elementClone.querySelectorAll('*')).forEach((el) => {
          const style = window.getComputedStyle(el);
          if (style.overflow && style.overflow !== 'visible') {
            el.style.overflow = 'visible';
          }
          if ((style.maxHeight && style.maxHeight !== 'none') || (style.height && style.height.endsWith('px') && Number(style.height.replace('px', '')) > 0 && style.overflow === 'auto')) {
            el.style.maxHeight = 'none';
            el.style.height = 'auto';
          }
        });
      } catch (e) {
        // ignore style adjustments
      }

      // set crossOrigin on images to attempt CORS loading (if allowed by host)
      Array.from(elementClone.querySelectorAll('img')).forEach((img) => {
        try {
          if (!img.getAttribute('crossorigin')) img.setAttribute('crossorigin', 'anonymous');
        } catch (e) {
          // ignore
        }
      });

      const config = getPDFConfig(filename, overrides);
      // Lock html2canvas window size to the element's width to prevent rendering mismatch
      try {
        const elWidth = Math.round(elementClone.getBoundingClientRect().width || elementClone.offsetWidth || element.offsetWidth);
        config.html2canvas = config.html2canvas || {};
        config.html2canvas.windowWidth = Math.max(window.innerWidth, elWidth);
        config.html2canvas.width = elWidth;
      } catch (e) {}
      console.debug('[pdfGenerator] Using config:', config);
        // ensure custom fonts load - improves canvas rendering quality
        try {
          await (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve());
        } catch (e) {
          // ignore font readiness issues
        }
      // give the browser a short moment to paint the element before capturing
      await new Promise((resolve) => setTimeout(resolve, 150));
      // Re-check diagnostics after paint
      try {
        const computed = window.getComputedStyle(elementClone);
        console.debug('[pdfGenerator.debug] clone computed style after paint display/visibility/opacity:', computed.display, computed.visibility, computed.opacity);
      } catch (e) {}
      logElementDebug(elementClone, 'after-paint');
      try {
        const blob = await html2pdf().set(config).from(elementClone).output('blob');
        try {
          console.debug('[pdfGenerator] generated blob size:', blob.size);
          if (blob.size && blob.size < 2048) console.warn('[pdfGenerator] generated PDF blob looks too small; it may be blank');
        } catch (e) {}
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'download.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('[pdfGenerator] html2pdf.save error:', err);
        // Attempt to provide additional diagnostic info
        logElementDebug(elementClone, 'on-error');

        // Fallback: try to create a blob and download manually
        try {
          const fallbackBlob = await html2pdf().set(config).from(elementClone).output('blob');
          const url = URL.createObjectURL(fallbackBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename || 'download.pdf';
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          console.debug('[pdfGenerator] fallback blob download success');
        } catch (fallbackErr) {
          console.error('[pdfGenerator] fallback blob download failed:', fallbackErr);
          // Provide a debug preview to help diagnose blank content
          try {
            const debugDataUrl = await html2pdf().set(config).from(elementClone).outputPdf('dataurlstring');
            const dbgTab = window.open();
            dbgTab.document.write(`<iframe src="${debugDataUrl}" style="width:100%;height:100%;border:none;"></iframe>`);
          } catch (previewErr) {
            console.error('[pdfGenerator] debug preview failed:', previewErr);
          }
          throw err; // throw original error since fallback didn't help
        }
      }
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
      // Position inside the viewport so the browser paints it and html2canvas can capture it
      elementClone.style.position = 'fixed';
      elementClone.style.left = '0';
      elementClone.style.top = '0';
      elementClone.style.opacity = '1'; // Keep visible for html2canvas capture
      elementClone.style.pointerEvents = 'none';
      elementClone.style.width = window.getComputedStyle(element).width || `${element.offsetWidth}px`;
      document.body.appendChild(elementClone);

      // Diagnostic helper - reuse from above scope if present
      const logElementDebug = (el, tag = '') => {
        try {
          const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : { width: el.offsetWidth, height: el.offsetHeight };
          const images = el.querySelectorAll ? el.querySelectorAll('img') : [];
          console.debug(`[pdfGenerator.preview.debug ${tag}] rect:`, rect.width, 'x', rect.height, 'offset:', el.offsetWidth, 'x', el.offsetHeight);
          console.debug(`[pdfGenerator.preview.debug ${tag}] nodes:`, el.querySelectorAll ? el.querySelectorAll('*').length : 0, 'textLen:', el.innerText ? el.innerText.length : 0);
          Array.from(images).forEach((img, i) => {
            console.debug(`[pdfGenerator.preview.debug ${tag}] image[${i}] src:`, img.src, 'complete:', img.complete, 'natural:', img.naturalWidth + 'x' + img.naturalHeight, 'crossorigin:', img.getAttribute('crossorigin'));
          });
        } catch (e) {
          console.debug('[pdfGenerator.preview.debug] failed to log element debug info', e);
        }
      };
      logElementDebug(elementClone, 'before-capture');
      // Make sure any scrollable/overflow content expands so html2canvas captures it all
      try {
        elementClone.style.overflow = 'visible';
        Array.from(elementClone.querySelectorAll('*')).forEach((el) => {
          const style = window.getComputedStyle(el);
          if (style.overflow && style.overflow !== 'visible') {
            el.style.overflow = 'visible';
          }
          if ((style.maxHeight && style.maxHeight !== 'none') || (style.height && style.height.endsWith('px') && Number(style.height.replace('px', '')) > 0 && style.overflow === 'auto')) {
            el.style.maxHeight = 'none';
            el.style.height = 'auto';
          }
        });
      } catch (e) {}

      // set crossOrigin on images (best-effort)
      Array.from(elementClone.querySelectorAll('img')).forEach((img) => {
        try {
          if (!img.getAttribute('crossorigin')) img.setAttribute('crossorigin', 'anonymous');
        } catch (e) {}
      });

      const config = getPDFConfig('preview.pdf');
      // set html2canvas sizing to better match the element
      try {
        const elWidth = Math.round(elementClone.getBoundingClientRect().width || elementClone.offsetWidth || element.offsetWidth);
        config.html2canvas = config.html2canvas || {};
        config.html2canvas.windowWidth = Math.max(window.innerWidth, elWidth);
        config.html2canvas.width = elWidth;
      } catch (e) {}
        try {
          await (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve());
        } catch (e) {}
      console.debug('[pdfGenerator.preview] Using preview config:', config);
      // give the browser a short moment to paint the element before capturing
      await new Promise((resolve) => setTimeout(resolve, 150));
      logElementDebug(elementClone, 'after-paint');
      let pdfAsString;
      try {
        pdfAsString = await html2pdf().set(config).from(elementClone).outputPdf('dataurlstring');
      } catch (err) {
        console.error('[pdfGenerator.preview] html2pdf outputPdf error:', err);
        logElementDebug(elementClone, 'on-error');
        throw err;
      }
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
      // Keep clone in viewport and visible so the browser paints CSS and fonts
      elementClone.style.position = 'fixed';
      elementClone.style.left = '0';
      elementClone.style.top = '0';
      elementClone.style.opacity = '1';
      elementClone.style.pointerEvents = 'none';
      elementClone.style.width = window.getComputedStyle(element).width || `${element.offsetWidth}px`;
      document.body.appendChild(elementClone);

      // Diagnostic helper
      const logElementDebug = (el, tag = '') => {
        try {
          const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : { width: el.offsetWidth, height: el.offsetHeight };
          const images = el.querySelectorAll ? el.querySelectorAll('img') : [];
          console.debug(`[pdfGenerator.getPDFBlob.debug ${tag}] rect:`, rect.width, 'x', rect.height, 'offset:', el.offsetWidth, 'x', el.offsetHeight);
          console.debug(`[pdfGenerator.getPDFBlob.debug ${tag}] nodes:`, el.querySelectorAll ? el.querySelectorAll('*').length : 0, 'textLen:', el.innerText ? el.innerText.length : 0);
          Array.from(images).forEach((img, i) => {
            console.debug(`[pdfGenerator.getPDFBlob.debug ${tag}] image[${i}] src:`, img.src, 'complete:', img.complete, 'natural:', img.naturalWidth + 'x' + img.naturalHeight, 'crossorigin:', img.getAttribute('crossorigin'));
          });
        } catch (e) {
          console.debug('[pdfGenerator.getPDFBlob.debug] failed to log element debug info', e);
        }
      };
      logElementDebug(elementClone, 'before-capture');

      Array.from(elementClone.querySelectorAll('img')).forEach((img) => {
        try {
          if (!img.getAttribute('crossorigin')) img.setAttribute('crossorigin', 'anonymous');
        } catch (e) {}
      });

      const config = getPDFConfig('quotation.pdf');
      // set html2canvas sizing to better match the element
      try {
        const elWidth = Math.round(elementClone.getBoundingClientRect().width || elementClone.offsetWidth || element.offsetWidth);
        config.html2canvas = config.html2canvas || {};
        config.html2canvas.windowWidth = Math.max(window.innerWidth, elWidth);
        config.html2canvas.width = elWidth;
      } catch (e) {}
        try {
          await (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve());
        } catch (e) {}
      console.debug('[pdfGenerator.getPDFBlob] Using config:', config);
      // give the browser a short moment to paint the element before capturing
      await new Promise((resolve) => setTimeout(resolve, 150));
      logElementDebug(elementClone, 'after-paint');
      let pdf;
      try {
        pdf = await html2pdf().set(config).from(elementClone).output('blob');
        try {
          console.debug('[pdfGenerator.getPDFBlob] pdf blob size:', pdf.size);
          if (pdf.size && pdf.size < 2048) {
            console.warn('[pdfGenerator.getPDFBlob] pdf blob size is unexpectedly small and may be blank');
          }
        } catch (e) {}
      } catch (err) {
        console.error('[pdfGenerator.getPDFBlob] html2pdf.output error:', err);
        logElementDebug(elementClone, 'on-error');
        throw err;
      }
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
      // Try a normal download first. If it fails, retries will attempt with different html2canvas scale.
      const overrides = attempt === 1 ? {} : { html2canvas: { scale: attempt === 2 ? 1.2 : 1 } };
      await downloadPDF(element, filename, overrides);
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
