import html2pdf from 'html2pdf.js';
import { saveAs } from 'file-saver';

// Threshold in bytes under which a generated PDF blob may be suspiciously small (blank)
export const PDF_BLOB_SMALL_THRESHOLD_BYTES = 2048;

/**
 * PDF Configuration for html2pdf
 */
export const getPDFConfig = (filename = 'quotation.pdf', overrides = {}) => {
  const sanitizeFilename = (name) => {
    return name.replace(/[:\\/*"?|<>]/g, '_');
  };
  const baseConfig = {
    margin: [6, 8, 6, 8], // Minimal margins: top, left, bottom, right (in mm) - FIXED
    filename: sanitizeFilename(filename),
    image: {
      type: 'jpeg',
      quality: 0.98, // Increased quality
    },
    html2canvas: {
      scale: 2.5, // Increased scale for better quality
      useCORS: true,
      allowTaint: true,
      logging: true, // Enable logging to debug black PDF issue
      letterRendering: true,
      backgroundColor: '#ffffff',
      removeContainer: false,
      scrollY: 0,
      scrollX: 0,
      windowWidth: document.body.scrollWidth,
      windowHeight: document.body.scrollHeight,
      onclone: function(clonedDoc) {
        // Additional cleanup in cloned document
        const clonedBody = clonedDoc.body;
        if (clonedBody) {
          clonedBody.style.backgroundColor = '#ffffff';
          // Remove any problematic gradients
          const allEls = clonedBody.querySelectorAll('*');
          allEls.forEach(el => {
            try {
              if (el.style.backgroundImage && el.style.backgroundImage.includes('gradient')) {
                el.style.backgroundImage = 'none';
              }
              // Ensure visibility
              if (el.style.opacity === '0') {
                el.style.opacity = '1';
              }
            } catch (e) {}
          });
        }
      },
    },
    jsPDF: {
      unit: 'pt',
      format: 'a4',
      orientation: 'portrait',
      compress: true,
      compressPdf: true, // Additional compression
      hotfixes: ['px_scaling'],
      enableLinks: true, // Enable clickable links in PDF
    },
    pagebreak: {
      mode: ['avoid-all', 'css', 'legacy'],
      before: '.page-break-before',
      after: '.page-break-after',
      avoid: '.keep-together, .pdf-day-item, .pdf-section, .no-break',
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

    // Extract all links before processing to preserve them
    const links = [];
    const allLinks = elementClone.querySelectorAll('a[href]');
    allLinks.forEach((link, index) => {
      const href = link.getAttribute('href');
      if (href && href !== '#' && !href.startsWith('javascript:')) {
        // Store link information
        links.push({
          href: href,
          text: link.textContent || link.innerText,
          element: link,
          id: `pdf-link-${index}`
        });
        // Add a data attribute to identify this link later
        link.setAttribute('data-pdf-link-id', `pdf-link-${index}`);
        // Ensure link styling is visible
        link.style.color = '#0066cc';
        link.style.textDecoration = 'underline';
      }
    });
    console.debug(`[pdfGenerator] Found ${links.length} links to preserve`);
    
    // Remove elements that shouldn't appear in PDF
    const elementsToRemove = elementClone.querySelectorAll(
      '.no-print, .controls, .edit-button, .delete-button'
    );
    elementsToRemove.forEach((el) => el.remove());

    // Apply compact spacing for PDF - ENHANCED TO FIX WHITE SPACE
    const applyCompactSpacing = (clone) => {
      try {
        // Reduce section margins aggressively
        const sections = clone.querySelectorAll('.pdf-section, section');
        sections.forEach((section) => {
          section.style.marginBottom = '4px';
          section.style.marginTop = '0';
          section.style.paddingBottom = '4px';
          section.style.paddingTop = '4px';
        });

        // Reduce padding in content boxes
        const contentBoxes = clone.querySelectorAll('[style*="padding"]');
        contentBoxes.forEach((box) => {
          const currentPadding = box.style.padding;
          if (currentPadding && currentPadding.includes('px')) {
            const paddingValue = parseInt(currentPadding);
            if (paddingValue > 10) {
              box.style.padding = `${Math.max(6, paddingValue - 6)}px`;
            }
          }
        });

        // Reduce day item spacing
        const dayItems = clone.querySelectorAll('.pdf-day-item');
        dayItems.forEach((item) => {
          item.style.marginBottom = '4px';
          item.style.padding = '8px';
        });

        // Optimize line heights and remove excess spacing
        const textElements = clone.querySelectorAll('p, li, div, h1, h2, h3, h4');
        textElements.forEach((el) => {
          if (!el.style.lineHeight || parseFloat(el.style.lineHeight) > 1.5) {
            el.style.lineHeight = '1.4';
          }
          // Remove excess margins
          const marginBottom = parseInt(window.getComputedStyle(el).marginBottom);
          if (marginBottom > 8) {
            el.style.marginBottom = '6px';
          }
        });
        
        // Remove large gaps between sections
        const allElements = clone.querySelectorAll('*');
        allElements.forEach((el) => {
          const marginTop = parseInt(window.getComputedStyle(el).marginTop);
          const marginBottom = parseInt(window.getComputedStyle(el).marginBottom);
          if (marginTop > 12) el.style.marginTop = '8px';
          if (marginBottom > 12) el.style.marginBottom = '8px';
        });
      } catch (e) {
        console.warn('[pdfGenerator] Compact spacing application failed:', e);
      }
    };

    // FIX BLACK PDF ISSUE: Convert gradients to solid colors and ensure proper rendering
    const fixBackgroundsForPDF = (clone) => {
      try {
        console.debug('[pdfGenerator] Fixing backgrounds for PDF rendering...');
        
        // Get all elements
        const allElements = clone.querySelectorAll('*');
        
        allElements.forEach((el) => {
          try {
            const computedStyle = window.getComputedStyle(el);
            const bgImage = computedStyle.backgroundImage;
            const bgColor = computedStyle.backgroundColor;
            
            // Convert gradient backgrounds to solid colors
            if (bgImage && bgImage !== 'none' && bgImage.includes('gradient')) {
              // Replace gradients with solid colors
              if (bgImage.includes('#075056') || bgImage.includes('teal')) {
                el.style.backgroundImage = 'none';
                el.style.backgroundColor = '#e9f7fa'; // Light teal
              } else if (bgImage.includes('#ff5b04') || bgImage.includes('orange')) {
                el.style.backgroundImage = 'none';
                el.style.backgroundColor = '#fff7ed'; // Light orange
              } else if (bgImage.includes('#00897b') || bgImage.includes('green')) {
                el.style.backgroundImage = 'none';
                el.style.backgroundColor = '#f0fdf4'; // Light green
              } else if (bgImage.includes('blue')) {
                el.style.backgroundImage = 'none';
                el.style.backgroundColor = '#e0f2f1'; // Light blue
              } else {
                // Default: remove gradient, use white
                el.style.backgroundImage = 'none';
                if (!bgColor || bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
                  el.style.backgroundColor = '#ffffff';
                }
              }
            }
            
            // Ensure footer has proper background
            if (el.tagName === 'FOOTER' || el.classList?.contains('footer')) {
              el.style.backgroundImage = 'none';
              el.style.backgroundColor = '#075056'; // Solid teal
              el.style.color = '#ffffff';
            }
            
            // Force all text to have proper color
            const color = computedStyle.color;
            if (!color || color === 'rgba(0, 0, 0, 0)') {
              // If no color or transparent, set to black
              if (el.style.color === 'white' || el.style.color === '#ffffff' || el.style.color === 'rgb(255, 255, 255)') {
                el.style.color = '#ffffff';
              } else {
                el.style.color = '#222222';
              }
            }
            
            // Ensure proper rendering of colored sections
            if (el.style.background && el.style.background.includes('gradient')) {
              const bg = el.style.background;
              el.style.backgroundImage = 'none';
              
              // Extract color from gradient
              if (bg.includes('#075056')) {
                el.style.backgroundColor = '#e9f7fa';
              } else if (bg.includes('#ff5b04')) {
                el.style.backgroundColor = '#fff7ed';
              } else if (bg.includes('#00897b')) {
                el.style.backgroundColor = '#f0fdf4';
              } else {
                el.style.backgroundColor = '#ffffff';
              }
            }
            
            // Force opacity to 1 for all elements
            if (computedStyle.opacity && parseFloat(computedStyle.opacity) < 1) {
              el.style.opacity = '1';
            }
            
          } catch (err) {
            console.warn('[pdfGenerator] Failed to fix background for element:', err);
          }
        });
        
        // Ensure root clone has white background
        clone.style.background = '#ffffff';
        clone.style.backgroundColor = '#ffffff';
        
        console.debug('[pdfGenerator] Background fixes applied successfully');
      } catch (e) {
        console.error('[pdfGenerator] Background fix failed:', e);
      }
    };

    applyCompactSpacing(elementClone);
    
    // FIX BLACK PDF: Apply background fixes AFTER spacing but BEFORE measuring
    fixBackgroundsForPDF(elementClone);

    // Force fixed width BEFORE measuring to avoid viewport-dependent sizing
    const FIXED_CONTENT_WIDTH = 800; // px - fits A4 nicely
    elementClone.style.width = `${FIXED_CONTENT_WIDTH}px`;
    elementClone.style.maxWidth = `${FIXED_CONTENT_WIDTH}px`;
    elementClone.style.minWidth = `${FIXED_CONTENT_WIDTH}px`;
    elementClone.style.boxSizing = 'border-box';

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
    // `finalBlob` must be declared in this (outer) try scope so it's available after recovery/finally
    let finalBlob = null;
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
      // Width already set above to FIXED_CONTENT_WIDTH - don't override
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
        elementClone.style.height = 'auto';
        elementClone.style.maxHeight = 'none';
        elementClone.style.minHeight = 'auto';
        Array.from(elementClone.querySelectorAll('*')).forEach((el) => {
          const style = window.getComputedStyle(el);
          if (style.overflow && style.overflow !== 'visible') {
            el.style.overflow = 'visible';
          }
          if (style.overflowY && style.overflowY !== 'visible') {
            el.style.overflowY = 'visible';
          }
          if (style.overflowX && style.overflowX !== 'visible') {
            el.style.overflowX = 'visible';
          }
          if ((style.maxHeight && style.maxHeight !== 'none')) {
            el.style.maxHeight = 'none';
          }
          if (style.height === 'auto' || style.height.endsWith('%')) {
            el.style.height = 'auto';
          }
          // Expand flex containers
          if (style.display === 'flex' && (style.height || style.maxHeight)) {
            el.style.height = 'auto';
            el.style.maxHeight = 'none';
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
      // Configure html2canvas to capture the fixed-width clone
      try {
        const fullHeight = Math.max(elementClone.scrollHeight || 0, elementClone.offsetHeight || 0);
        if (fullHeight > 0) {
          elementClone.style.height = `${fullHeight}px`;
          elementClone.style.minHeight = `${fullHeight}px`;
        }
        config.html2canvas = config.html2canvas || {};
        config.html2canvas.windowWidth = FIXED_CONTENT_WIDTH;
        config.html2canvas.width = FIXED_CONTENT_WIDTH;
        config.html2canvas.windowHeight = fullHeight;
        config.html2canvas.height = fullHeight;
        config.html2canvas.scale = overrides?.html2canvas?.scale || 2;
      } catch (e) {
        console.debug('[pdfGenerator] config setup skipped:', e);
      }
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
      
      // Use html2pdf with jsPDF's html method for better link preservation
      let blob;
      try {
        const worker = html2pdf().set(config).from(elementClone);
        
        // Get the jsPDF instance to add links manually after rendering
        const pdf = await worker.toPdf().get('pdf');
        
        // Extract link positions and add them to PDF
        if (links.length > 0 && pdf) {
          try {
            // Add clickable links to the PDF
            links.forEach((linkInfo) => {
              const linkElement = elementClone.querySelector(`[data-pdf-link-id="${linkInfo.id}"]`);
              if (linkElement) {
                const rect = linkElement.getBoundingClientRect();
                const cloneRect = elementClone.getBoundingClientRect();
                
                // Calculate relative position within the PDF page
                // Convert pixel coordinates to PDF points (pt)
                const pdfPageWidth = pdf.internal.pageSize.getWidth();
                const pdfPageHeight = pdf.internal.pageSize.getHeight();
                const scale = pdfPageWidth / FIXED_CONTENT_WIDTH;
                
                const x = (rect.left - cloneRect.left) * scale;
                const y = (rect.top - cloneRect.top) * scale;
                const width = rect.width * scale;
                const height = rect.height * scale;
                
                // Add link annotation to PDF
                try {
                  pdf.link(x, y, width, height, { url: linkInfo.href });
                  console.debug(`[pdfGenerator] Added clickable link: ${linkInfo.href}`);
                } catch (linkErr) {
                  console.warn(`[pdfGenerator] Failed to add link ${linkInfo.href}:`, linkErr);
                }
              }
            });
          } catch (linkProcessErr) {
            console.warn('[pdfGenerator] Link processing failed:', linkProcessErr);
          }
        }
        
        blob = await worker.output('blob');
        if (!blob) {
          throw new Error('html2pdf returned empty blob');
        }
        console.debug(`[pdfGenerator] generated blob size: ${blob.size} bytes with ${links.length} clickable links`);
        if (blob.size < PDF_BLOB_SMALL_THRESHOLD_BYTES) {
          console.warn('[pdfGenerator] generated PDF blob is small:', blob.size, 'bytes - may be blank');
        }
        finalBlob = blob;
        try {
          saveAs(finalBlob, filename || 'download.pdf');
        } catch (saveErr) {
          console.warn('[pdfGenerator] saveAs fallback triggered:', saveErr);
          const url = URL.createObjectURL(finalBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename || 'download.pdf';
          document.body.appendChild(a);
          a.click();
          requestAnimationFrame(() => {
            try {
              a.remove();
              URL.revokeObjectURL(url);
            } catch (cleanupErr) {
              console.debug('[pdfGenerator] anchor cleanup failed (ignored):', cleanupErr);
            }
          });
        }
      } catch (err) {
        console.error('[pdfGenerator] html2pdf.save error:', err);
        // Attempt to provide additional diagnostic info
        logElementDebug(elementClone, 'on-error');

        // Fallback: try to create a blob and download manually
        try {
          const fallbackBlob = await html2pdf().set(config).from(elementClone).output('blob');
          if (!fallbackBlob) throw new Error('Fallback html2pdf returned empty blob');
          console.debug('[pdfGenerator] fallback blob size:', fallbackBlob.size);
          if (fallbackBlob.size < PDF_BLOB_SMALL_THRESHOLD_BYTES) {
            console.warn('[pdfGenerator] fallback blob is small:', fallbackBlob.size, 'bytes - attempting download anyway');
          }
          try {
            saveAs(fallbackBlob, filename || 'download.pdf');
          } catch (fallbackSaveErr) {
            console.warn('[pdfGenerator] fallback saveAs failed, using anchor download:', fallbackSaveErr);
            const url = URL.createObjectURL(fallbackBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || 'download.pdf';
            document.body.appendChild(a);
            a.click();
            requestAnimationFrame(() => {
              try {
                a.remove();
                URL.revokeObjectURL(url);
              } catch (cleanupErr) {
                console.debug('[pdfGenerator] anchor cleanup failed (ignored):', cleanupErr);
              }
            });
          }
          finalBlob = fallbackBlob;
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
      console.debug('[pdfGenerator] PDF saved successfully (size: ' + (finalBlob && finalBlob.size) + ')');
      if (!finalBlob) {
        throw new Error('PDF generation completed but produced no blob. This is likely a silent failure from html2pdf.');
      }
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

    return finalBlob;
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
};

// ---------- Server-side PDF generation (Puppeteer) ----------
const PDF_SERVER_URL = (typeof window !== 'undefined' && (window.PDF_SERVER_URL || import.meta.env.VITE_PDF_SERVER_URL)) || 'http://localhost:4000';

const fetchAllCssText = async () => {
  const styles = [];
  // Inline <style> tags
  Array.from(document.querySelectorAll('style')).forEach((s) => {
    if (s.textContent && s.textContent.trim()) styles.push(s.textContent);
  });
  // External stylesheets
  const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  const externalCss = await Promise.all(
    links.map(async (link) => {
      try {
        const href = link.href;
        if (!href) return '';
        const resp = await fetch(href);
        if (!resp.ok) return '';
        return await resp.text();
      } catch (err) {
        console.warn('[pdfGenerator.server] failed to fetch stylesheet', link.href, err);
        return '';
      }
    })
  );
  styles.push(...externalCss.filter(Boolean));
  return styles.join('\n');
};

const buildHtmlWrapper = async (element) => {
  const clone = element.cloneNode(true);
  // Remove interactive elements
  const elementsToRemove = clone.querySelectorAll('.no-print, .controls, .edit-button, .delete-button');
  elementsToRemove.forEach((el) => el.remove());

  // Force consistent width/background for server rendering
  clone.style.maxWidth = '1100px';
  clone.style.width = '100%';
  clone.style.margin = '0 auto';
  clone.style.background = '#ffffff';
  clone.style.boxSizing = 'border-box';
  clone.style.padding = '16px 24px';

  // Fix images that are local paths
  Array.from(clone.querySelectorAll('img')).forEach((img) => {
    try {
      const src = img.getAttribute('src') || '';
      const isExternal = src.startsWith('http') || src.startsWith('https') || src.startsWith('data:') || src.startsWith('//');
      if (src && !isExternal) {
        // Make absolute using current origin
        const base = window.location.origin;
        img.src = new URL(src, base).href;
      }
    } catch (e) {}
  });

  const cssText = await fetchAllCssText();
  const wrapperStyles = `
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #0b1f2a;
    }
    .pdf-root {
      max-width: 1100px;
      margin: 0 auto;
      background: #ffffff;
      padding: 24px 32px;
      box-sizing: border-box;
    }
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      footer, .footer, [class*="footer"] {
        display: block !important;
        visibility: visible !important;
        page-break-inside: avoid !important;
      }
    }
  `;
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${wrapperStyles}${cssText}</style></head><body><div class="pdf-root">${clone.outerHTML}</div></body></html>`;
  return html;
};

export const downloadPDFViaServer = async (element, filename = 'quotation.pdf', overrides = {}) => {
  try {
    if (!element) throw new Error('Element not provided');
    const html = await buildHtmlWrapper(element);
    const resp = await fetch(`${PDF_SERVER_URL}/api/render-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, filename, options: {} }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => null);
      throw new Error(err?.error || `Server responded with ${resp.status}`);
    }
    const buffer = await resp.arrayBuffer();
    const blob = new Blob([buffer], { type: 'application/pdf' });
    // Validate size
    if (blob.size && blob.size < PDF_BLOB_SMALL_THRESHOLD_BYTES) {
      throw new Error(`Server returned a PDF but it is unexpectedly small (${blob.size})`);
    }
    try {
      saveAs(blob, filename || 'download.pdf');
    } catch (saveErr) {
      console.warn('[pdfGenerator.server] saveAs failed, falling back to anchor download:', saveErr);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'download.pdf';
      document.body.appendChild(a);
      a.click();
      requestAnimationFrame(() => {
        try {
          a.remove();
          URL.revokeObjectURL(url);
        } catch (cleanupErr) {
          console.debug('[pdfGenerator.server] anchor cleanup failed (ignored):', cleanupErr);
        }
      });
    }
    return blob;
  } catch (error) {
    console.error('[pdfGenerator.server] download error:', error);
    const baseMessage = error?.message || 'Unknown server error';
    throw new Error(`${baseMessage}. Ensure the PDF server is running at ${PDF_SERVER_URL}`);
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
    
    // Extract all links before processing to preserve them
    const links = [];
    const allLinks = elementClone.querySelectorAll('a[href]');
    allLinks.forEach((link, index) => {
      const href = link.getAttribute('href');
      if (href && href !== '#' && !href.startsWith('javascript:')) {
        links.push({
          href: href,
          text: link.textContent || link.innerText,
          element: link,
          id: `pdf-preview-link-${index}`
        });
        link.setAttribute('data-pdf-link-id', `pdf-preview-link-${index}`);
        link.style.color = '#0066cc';
        link.style.textDecoration = 'underline';
      }
    });
    console.debug(`[pdfGenerator.preview] Found ${links.length} links to preserve`);
    
    const elementsToRemove = elementClone.querySelectorAll(
      '.no-print, .controls, .edit-button, .delete-button'
    );
    elementsToRemove.forEach((el) => el.remove());

    // Force fixed width to avoid viewport-dependent sizing
    const FIXED_CONTENT_WIDTH = 800;
    elementClone.style.width = `${FIXED_CONTENT_WIDTH}px`;
    elementClone.style.maxWidth = `${FIXED_CONTENT_WIDTH}px`;
    elementClone.style.minWidth = `${FIXED_CONTENT_WIDTH}px`;
    elementClone.style.boxSizing = 'border-box';

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
      // Width already set to FIXED_CONTENT_WIDTH above
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
      // Configure for fixed-width capture
      try {
        const fullHeight = Math.max(elementClone.scrollHeight || 0, elementClone.offsetHeight || 0);
        if (fullHeight > 0) {
          elementClone.style.height = `${fullHeight}px`;
          elementClone.style.minHeight = `${fullHeight}px`;
        }
        config.html2canvas = config.html2canvas || {};
        config.html2canvas.windowWidth = FIXED_CONTENT_WIDTH;
        config.html2canvas.width = FIXED_CONTENT_WIDTH;
        config.html2canvas.windowHeight = fullHeight;
        config.html2canvas.height = fullHeight;
        config.html2canvas.scale = 2;
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
        const worker = html2pdf().set(config).from(elementClone);
        const pdf = await worker.toPdf().get('pdf');
        
        // Add clickable links to preview PDF
        if (links.length > 0 && pdf) {
          const FIXED_CONTENT_WIDTH = 800;
          const pdfPageWidth = pdf.internal.pageSize.getWidth();
          const scale = pdfPageWidth / FIXED_CONTENT_WIDTH;
          
          links.forEach((linkInfo) => {
            const linkElement = elementClone.querySelector(`[data-pdf-link-id="${linkInfo.id}"]`);
            if (linkElement) {
              const rect = linkElement.getBoundingClientRect();
              const cloneRect = elementClone.getBoundingClientRect();
              const x = (rect.left - cloneRect.left) * scale;
              const y = (rect.top - cloneRect.top) * scale;
              const width = rect.width * scale;
              const height = rect.height * scale;
              
              try {
                pdf.link(x, y, width, height, { url: linkInfo.href });
              } catch (linkErr) {
                console.warn(`[pdfGenerator.preview] Failed to add link: ${linkInfo.href}`, linkErr);
              }
            }
          });
        }
        
        pdfAsString = await worker.outputPdf('dataurlstring');
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
    
    // Extract all links before processing to preserve them
    const links = [];
    const allLinks = elementClone.querySelectorAll('a[href]');
    allLinks.forEach((link, index) => {
      const href = link.getAttribute('href');
      if (href && href !== '#' && !href.startsWith('javascript:')) {
        links.push({
          href: href,
          text: link.textContent || link.innerText,
          element: link,
          id: `pdf-blob-link-${index}`
        });
        link.setAttribute('data-pdf-link-id', `pdf-blob-link-${index}`);
        link.style.color = '#0066cc';
        link.style.textDecoration = 'underline';
      }
    });
    console.debug(`[pdfGenerator.getPDFBlob] Found ${links.length} links to preserve`);
    
    const elementsToRemove = elementClone.querySelectorAll(
      '.no-print, .controls, .edit-button, .delete-button'
    );
    elementsToRemove.forEach((el) => el.remove());

    // Force fixed width to avoid viewport-dependent sizing
    const FIXED_CONTENT_WIDTH = 800;
    elementClone.style.width = `${FIXED_CONTENT_WIDTH}px`;
    elementClone.style.maxWidth = `${FIXED_CONTENT_WIDTH}px`;
    elementClone.style.minWidth = `${FIXED_CONTENT_WIDTH}px`;
    elementClone.style.boxSizing = 'border-box';

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
      // Width already set to FIXED_CONTENT_WIDTH above
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
      // Configure for fixed-width capture
      try {
        const fullHeight = Math.max(elementClone.scrollHeight || 0, elementClone.offsetHeight || 0);
        if (fullHeight > 0) {
          elementClone.style.height = `${fullHeight}px`;
          elementClone.style.minHeight = `${fullHeight}px`;
        }
        config.html2canvas = config.html2canvas || {};
        config.html2canvas.windowWidth = FIXED_CONTENT_WIDTH;
        config.html2canvas.width = FIXED_CONTENT_WIDTH;
        config.html2canvas.windowHeight = fullHeight;
        config.html2canvas.height = fullHeight;
        config.html2canvas.scale = 2;
      } catch (e) {}
        try {
          await (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve());
        } catch (e) {}
      console.debug('[pdfGenerator.getPDFBlob] Using config:', config);
      // give the browser a short moment to paint the element before capturing
      await new Promise((resolve) => setTimeout(resolve, 150));
      logElementDebug(elementClone, 'after-paint');
      let pdf = null;
      try {
        const worker = html2pdf().set(config).from(elementClone);
        const pdfInstance = await worker.toPdf().get('pdf');
        
        // Add clickable links to PDF blob
        if (links.length > 0 && pdfInstance) {
          const pdfPageWidth = pdfInstance.internal.pageSize.getWidth();
          const scale = pdfPageWidth / FIXED_CONTENT_WIDTH;
          
          links.forEach((linkInfo) => {
            const linkElement = elementClone.querySelector(`[data-pdf-link-id="${linkInfo.id}"]`);
            if (linkElement) {
              const rect = linkElement.getBoundingClientRect();
              const cloneRect = elementClone.getBoundingClientRect();
              const x = (rect.left - cloneRect.left) * scale;
              const y = (rect.top - cloneRect.top) * scale;
              const width = rect.width * scale;
              const height = rect.height * scale;
              
              try {
                pdfInstance.link(x, y, width, height, { url: linkInfo.href });
              } catch (linkErr) {
                console.warn(`[pdfGenerator.getPDFBlob] Failed to add link: ${linkInfo.href}`, linkErr);
              }
            }
          });
        }
        
        pdf = await worker.output('blob');
        if (!pdf) throw new Error('html2pdf returned empty blob');
        console.debug('[pdfGenerator.getPDFBlob] pdf blob size:', pdf.size);
        if (pdf.size < PDF_BLOB_SMALL_THRESHOLD_BYTES) {
          console.warn('[pdfGenerator.getPDFBlob] generated pdf is small:', pdf.size, 'bytes - may be blank');
        }
      } catch (err) {
        console.error('[pdfGenerator.getPDFBlob] html2pdf.output error:', err);
        logElementDebug(elementClone, 'on-error');
        throw err;
      }
      if (!pdf) {
        throw new Error('Failed to generate PDF blob (empty result from html2pdf)');
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
  const serverAttempts = Math.max(1, Math.min(2, maxRetries));

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const isServerAttempt = attempt <= serverAttempts;

    if (isServerAttempt) {
      try {
        console.debug('[pdfGenerator.retry] Attempting server-side PDF (attempt', attempt, ')');
        const blob = await downloadPDFViaServer(element, filename);
        if (blob && blob.size > PDF_BLOB_SMALL_THRESHOLD_BYTES) {
          return blob;
        }
        console.warn('[pdfGenerator.retry] Server PDF returned small blob, falling back to client');
      } catch (serverErr) {
        lastError = serverErr;
        console.warn('[pdfGenerator.retry] Server PDF attempt failed:', serverErr);
      }
    }

    try {
      // Client-side html2pdf fallback
      const overrides = attempt === 1 ? {} : { html2canvas: { scale: attempt === 2 ? 1.5 : 1 } };
      const blob = await downloadPDF(element, filename, overrides);
      if (!blob) {
        throw new Error('downloadPDF returned no blob. Treating as failure so retry will occur.');
      }
      if (blob.size && blob.size < PDF_BLOB_SMALL_THRESHOLD_BYTES && attempt < maxRetries) {
        console.warn(`downloadPDF returned a small blob (${blob.size} bytes), retrying...`);
        throw new Error(`downloadPDF returned a blob but it is unexpectedly small (${blob.size} bytes)`);
      }
      return blob;
    } catch (clientErr) {
      lastError = clientErr;
      console.warn(`PDF download attempt ${attempt} failed:`, clientErr);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw new Error(
    `PDF download failed after ${maxRetries} attempts: ${lastError?.message}`
  );
};
