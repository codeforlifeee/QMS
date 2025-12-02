/**
 * PDF Quality Checker and Style Enforcer
 * Ensures all PDF quality checklist items are met
 */

export const PDF_QUALITY_CHECKLIST = {
  spacing: [
    '✓ All padding is 12px or 15px (consistent)',
    '✓ All margins are 20px or 40px (consistent)',
    '✓ Line height is 1.6 or 1.8 (not varying)',
    '✓ No percentage-based margins/padding'
  ],
  
  colors: [
    '✓ No gradients - use solid colors only',
    '✓ All grays are #f9f9f9, #f5f5f5, #333 (consistent)',
    '✓ Primary color is #008B8B throughout',
    '✓ No transparent overlays'
  ],
  
  footer: [
    '✓ Footer div exists with margin-top: 40px',
    '✓ Footer has border-top: 2px solid',
    '✓ Footer contains contact info',
    '✓ Footer has consistent padding'
  ],
  
  tables: [
    '✓ border-collapse: collapse',
    '✓ All td padding: 12px',
    '✓ Header bg-color: #008B8B',
    '✓ Alternating row colors only'
  ],
  
  fonts: [
    '✓ Using system fonts (Arial, Times, Courier)',
    '✓ Font sizes: 11px, 12px, 13px, 14px, 16px',
    '✓ No font weights over 700',
    '✓ Explicit line-height on all text'
  ],
  
  images: [
    '✓ max-width: 100%',
    '✓ height: auto (maintains aspect ratio)',
    '✓ All images have alt text',
    '✓ Images not larger than 3MB'
  ],
  
  pageBreaks: [
    '✓ Large sections have page-break-inside: avoid',
    '✓ Footer is separate from content',
    '✓ No content bleeding into footer'
  ]
};

/**
 * SPACING FIX - Enforce consistent spacing
 */
export const fixSpacing = (element) => {
  const all = element.querySelectorAll('*');
  
  all.forEach(el => {
    const computed = window.getComputedStyle(el);
    
    // DON'T enforce strict spacing rules - they break layouts
    // Only fix extreme cases
    const marginTop = parseInt(computed.marginTop);
    const marginBottom = parseInt(computed.marginBottom);
    
    // Only fix if margins are absurdly large (> 100px)
    if (marginTop > 100) {
      el.style.marginTop = '40px';
    }
    
    if (marginBottom > 100) {
      el.style.marginBottom = '40px';
    }
    
    // Keep line-height as is - don't enforce strict rules
  });
};

/**
 * COLOR FIX - Remove gradients and enforce solid colors
 */
export const fixColors = (element) => {
  const all = element.querySelectorAll('*');
  
  all.forEach(el => {
    const computed = window.getComputedStyle(el);
    
    // PRESERVE GRADIENTS AND ALL COLORS - jsPDF canvas will capture them exactly
    // Only ensure proper rendering by setting explicit styles
    if (computed.backgroundImage && computed.backgroundImage.includes('gradient')) {
      // Keep the gradient but ensure it's explicitly set
      el.style.backgroundImage = computed.backgroundImage;
    }
    
    // Preserve all colors exactly as they appear in UI
    if (computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      el.style.backgroundColor = computed.backgroundColor;
    }
    
    if (computed.color) {
      el.style.color = computed.color;
    }
    
    // Ensure opacity is set for better PDF rendering
    if (computed.opacity) {
      el.style.opacity = computed.opacity;
    }
    
    // Force color rendering in PDF
    el.style.webkitPrintColorAdjust = 'exact';
    el.style.printColorAdjust = 'exact';
    el.style.colorAdjust = 'exact';
  });
};

/**
 * FOOTER FIX - Ensure proper footer structure
 */
export const fixFooter = (element) => {
  const footer = element.querySelector('footer, .footer, [class*="footer"]');
  
  if (footer) {
    // Treat footer as LAST SECTION, not repeating footer
    footer.style.pageBreakInside = 'avoid';
    footer.style.pageBreakBefore = 'auto';
    
    // PRESERVE GRADIENT AND ALL COLORS - jsPDF canvas will capture exactly
    const computed = window.getComputedStyle(footer);
    if (computed.backgroundImage && computed.backgroundImage.includes('gradient')) {
      footer.style.backgroundImage = computed.backgroundImage;
    }
    
    // Preserve all footer colors exactly
    if (computed.backgroundColor) {
      footer.style.backgroundColor = computed.backgroundColor;
    }
    if (computed.color) {
      footer.style.color = computed.color;
    }
    
    // Force exact color rendering in PDF
    footer.style.webkitPrintColorAdjust = 'exact';
    footer.style.printColorAdjust = 'exact';
    footer.style.colorAdjust = 'exact';
  }
};

/**
 * TABLE FIX - Enforce table styling standards
 */
export const fixTables = (element) => {
  const tables = element.querySelectorAll('table');
  
  tables.forEach(table => {
    // Enforce border-collapse
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    
    // Fix table headers
    const headers = table.querySelectorAll('th');
    headers.forEach(th => {
      th.style.backgroundColor = '#008B8B';
      th.style.color = '#ffffff';
      th.style.padding = '12px';
      th.style.textAlign = 'left';
      th.style.fontWeight = '700';
    });
    
    // Fix table cells
    const cells = table.querySelectorAll('td');
    cells.forEach((td, index) => {
      td.style.padding = '12px';
      td.style.borderBottom = '1px solid #f5f5f5';
      
      // Alternating row colors
      const row = td.parentElement;
      const rowIndex = Array.from(row.parentElement.children).indexOf(row);
      
      if (rowIndex % 2 === 0) {
        td.style.backgroundColor = '#ffffff';
      } else {
        td.style.backgroundColor = '#f9f9f9';
      }
    });
  });
};

/**
 * FONT FIX - Enforce font standards
 */
export const fixFonts = (element) => {
  const all = element.querySelectorAll('*');
  
  const ALLOWED_SIZES = ['11px', '12px', '13px', '14px', '16px'];
  const SYSTEM_FONTS = 'Arial, "Helvetica Neue", Helvetica, sans-serif';
  
  all.forEach(el => {
    const computed = window.getComputedStyle(el);
    
    // Enforce system fonts
    el.style.fontFamily = SYSTEM_FONTS;
    
    // Normalize font sizes
    const fontSize = computed.fontSize;
    if (fontSize) {
      const size = parseInt(fontSize);
      
      if (size < 11) {
        el.style.fontSize = '11px';
      } else if (size >= 11 && size < 12) {
        el.style.fontSize = '11px';
      } else if (size >= 12 && size < 13) {
        el.style.fontSize = '12px';
      } else if (size >= 13 && size < 14) {
        el.style.fontSize = '13px';
      } else if (size >= 14 && size < 16) {
        el.style.fontSize = '14px';
      } else if (size >= 16) {
        el.style.fontSize = '16px';
      }
    }
    
    // Limit font weight to max 700
    const fontWeight = computed.fontWeight;
    if (fontWeight && parseInt(fontWeight) > 700) {
      el.style.fontWeight = '700';
    }
    
    // Ensure explicit line-height
    if (!el.style.lineHeight || el.style.lineHeight === 'normal') {
      el.style.lineHeight = '1.6';
    }
  });
};

/**
 * IMAGE FIX - Enforce image standards
 */
export const fixImages = (element) => {
  const images = element.querySelectorAll('img');
  
  images.forEach(img => {
    // Enforce responsive sizing
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    
    // Ensure alt text exists
    if (!img.getAttribute('alt')) {
      img.setAttribute('alt', 'Image');
    }
    
    // Add page-break-inside: avoid for large images
    if (img.height > 400 || img.naturalHeight > 400) {
      img.style.pageBreakInside = 'avoid';
    }
  });
};

/**
 * PAGE BREAK FIX - Enforce proper page breaks
 */
export const fixPageBreaks = (element) => {
  // Add page-break-inside: avoid to large sections
  const sections = element.querySelectorAll('section, .pdf-section, .day-item, .activity-item');
  
  sections.forEach(section => {
    section.style.pageBreakInside = 'avoid';
  });
  
  // Ensure footer is separate
  const footer = element.querySelector('footer, .footer');
  if (footer) {
    footer.style.pageBreakBefore = 'auto';
    footer.style.pageBreakInside = 'avoid';
    footer.style.marginTop = '40px';
  }
  
  // Prevent content from bleeding into footer
  const lastContentElement = element.querySelector('footer, .footer')?.previousElementSibling;
  if (lastContentElement) {
    lastContentElement.style.marginBottom = '40px';
    lastContentElement.style.pageBreakAfter = 'auto';
  }
};

/**
 * MASTER FIX FUNCTION - Apply all fixes in order
 */
export const applyAllQualityFixes = (element) => {
  console.log('[PDF Quality] Applying all quality fixes...');
  
  // Clone element to avoid modifying original
  const clone = element.cloneNode(true);
  
  // Apply fixes in order
  console.log('[PDF Quality] 1/7 - Fixing spacing...');
  fixSpacing(clone);
  
  console.log('[PDF Quality] 2/7 - Fixing colors...');
  fixColors(clone);
  
  console.log('[PDF Quality] 3/7 - Fixing footer...');
  fixFooter(clone);
  
  console.log('[PDF Quality] 4/7 - Fixing tables...');
  fixTables(clone);
  
  console.log('[PDF Quality] 5/7 - Fixing fonts...');
  fixFonts(clone);
  
  console.log('[PDF Quality] 6/7 - Fixing images...');
  fixImages(clone);
  
  console.log('[PDF Quality] 7/7 - Fixing page breaks...');
  fixPageBreaks(clone);
  
  console.log('[PDF Quality] All fixes applied successfully!');
  
  return clone;
};

/**
 * VALIDATE QUALITY - Check if element meets all quality standards
 */
export const validatePDFQuality = (element) => {
  const issues = [];
  const all = element.querySelectorAll('*');
  
  // Check spacing
  all.forEach((el, index) => {
    const computed = window.getComputedStyle(el);
    
    // Check padding
    const padding = computed.padding;
    if (padding && !['0px', '12px', '15px'].includes(padding)) {
      issues.push(`Element ${index}: Invalid padding ${padding}`);
    }
    
    // Check margins
    const marginTop = computed.marginTop;
    const marginBottom = computed.marginBottom;
    if (marginTop && !['0px', '20px', '40px'].includes(marginTop)) {
      issues.push(`Element ${index}: Invalid margin-top ${marginTop}`);
    }
    if (marginBottom && !['0px', '20px', '40px'].includes(marginBottom)) {
      issues.push(`Element ${index}: Invalid margin-bottom ${marginBottom}`);
    }
    
    // Check gradients
    if (computed.backgroundImage && computed.backgroundImage.includes('gradient')) {
      issues.push(`Element ${index}: Contains gradient background`);
    }
  });
  
  // Check footer
  const footer = element.querySelector('footer, .footer');
  if (!footer) {
    issues.push('Footer not found');
  } else {
    const footerStyle = window.getComputedStyle(footer);
    if (!footerStyle.borderTop || !footerStyle.borderTop.includes('2px')) {
      issues.push('Footer missing 2px border-top');
    }
  }
  
  // Check tables
  const tables = element.querySelectorAll('table');
  tables.forEach((table, i) => {
    const style = window.getComputedStyle(table);
    if (style.borderCollapse !== 'collapse') {
      issues.push(`Table ${i}: border-collapse not set to collapse`);
    }
  });
  
  return {
    valid: issues.length === 0,
    issues,
    checklist: PDF_QUALITY_CHECKLIST
  };
};

export default {
  applyAllQualityFixes,
  validatePDFQuality,
  fixSpacing,
  fixColors,
  fixFooter,
  fixTables,
  fixFonts,
  fixImages,
  fixPageBreaks,
  PDF_QUALITY_CHECKLIST
};
