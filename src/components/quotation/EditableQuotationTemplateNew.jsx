import React, { useState, useRef, useEffect, forwardRef } from 'react';
import html2pdf from 'html2pdf.js';
import { formatCurrency } from '../../utils/formatters';
import { Download, Edit } from 'lucide-react';
import { PDFEditorModal } from './PDFEditorModal';
import { downloadPDF as downloadPDFUtil } from '../../utils/pdfGenerator';

// Print-specific styles and PDF rendering styles
const printStyles = `
  @media print {
    .no-print {
      display: none !important;
      visibility: hidden !important;
    }
    body {
      margin: 0;
      padding: 0;
    }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
  }
  
  /* Ensure colors and styles render in PDF */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  
  /* Pulse animation for PDF generation progress */
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.02);
    }
  }
`;

const EditableQuotationTemplateNew = forwardRef(({ quotationData = {}, tourData = {}, onDownloadPDF, loading }, ref) => {
  // State management
  const [pageTitle, setPageTitle] = useState('');
  const [logoSrc, setLogoSrc] = useState('');
  const [bannerSrc, setBannerSrc] = useState('https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200');
  const [accommodationImage, setAccommodationImage] = useState('https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200');
  const [showPDFEditor, setShowPDFEditor] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  
  // Create internal ref if none provided
  const internalRef = useRef(null);
  const printableRef = ref || internalRef;

  // Additional state for dynamic content
  const [packageTitle, setPackageTitle] = useState('3-Star Dubai Supersaver Package - 3N/4D');
  const [duration, setDuration] = useState('5 Days / 4 Nights');
  const [pricePerPerson, setPricePerPerson] = useState('35,999');
  const [placesCovered, setPlacesCovered] = useState('Dubai City Tour, Desert Safari, Burj Khalifa, Dhow Cruise');
  const [totalCost, setTotalCost] = useState('');
  const [paxInfo, setPaxInfo] = useState('');
  
  // Sync with quotation data - ENHANCED FOR BETTER SYNCHRONIZATION
  useEffect(() => {
    if (!quotationData) return;
    
    console.log('[Template] Syncing quotation data:', quotationData);
    
    // Sync guest name to page title
    if (quotationData.guestName && quotationData.guestName.trim()) {
      setPageTitle(`${quotationData.guestName} - Travel Quotation`);
    } else {
      setPageTitle('Travel Quotation');
    }
    
    // Sync package title from first location or guest name
    if (quotationData.guestName || quotationData.selectedActivities?.length > 0) {
      const firstLocation = quotationData.selectedActivities?.[0]?.location || 'Dubai';
      const nights = quotationData.tripDuration?.nights || 4;
      const days = quotationData.tripDuration?.days || 5;
      const guestName = quotationData.guestName?.trim() || 'Guest';
      setPackageTitle(`${guestName} - ${firstLocation} Package - ${nights}N/${days}D`);
    } else {
      setPackageTitle('3-Star Dubai Supersaver Package - 3N/4D');
    }
    
    // Sync duration
    if (quotationData.tripDuration && (quotationData.tripDuration.days > 0 || quotationData.tripDuration.nights > 0)) {
      const { days, nights } = quotationData.tripDuration;
      setDuration(`${days} Day${days !== 1 ? 's' : ''} / ${nights} Night${nights !== 1 ? 's' : ''}`);
    } else if (quotationData.travelDates?.from && quotationData.travelDates?.to) {
      // Calculate from dates if tripDuration not available
      const from = new Date(quotationData.travelDates.from);
      const to = new Date(quotationData.travelDates.to);
      const daysDiff = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;
      const nightsDiff = daysDiff - 1;
      setDuration(`${daysDiff} Day${daysDiff !== 1 ? 's' : ''} / ${nightsDiff} Night${nightsDiff !== 1 ? 's' : ''}`);
    }
    
    // Sync pax info
    if (quotationData.totalAdults || quotationData.totalChildren) {
      const adults = quotationData.totalAdults || 0;
      const children = quotationData.totalChildren || 0;
      const paxText = `${adults} Adult${adults !== 1 ? 's' : ''}${children > 0 ? ` + ${children} Child${children !== 1 ? 'ren' : ''}` : ''}`;
      setPaxInfo(paxText);
      console.log('[Template] Pax updated:', paxText);
    } else {
      setPaxInfo('');
    }
    
    // Sync places covered from selected activities
    if (quotationData.selectedActivities && quotationData.selectedActivities.length > 0) {
      const places = quotationData.selectedActivities
        .map(activity => activity.product || activity.tour || activity.category)
        .filter(Boolean)
        .slice(0, 5) // Limit to 5 activities for display
        .join(', ');
      setPlacesCovered(places || 'Selected activities will appear here');
      console.log('[Template] Places updated:', places);
    } else {
      setPlacesCovered('Dubai City Tour, Desert Safari, Burj Khalifa, Dhow Cruise');
    }
    
    // Sync costs with proper formatting
    if (quotationData.costs) {
      const { finalTotal, perPersonCost, subtotal } = quotationData.costs;
      
      if (finalTotal && finalTotal > 0) {
        setTotalCost(formatCurrency(finalTotal));
        console.log('[Template] Total cost updated:', finalTotal);
      } else {
        setTotalCost('0');
      }
      
      if (perPersonCost && perPersonCost > 0) {
        setPricePerPerson(formatCurrency(perPersonCost));
        console.log('[Template] Per person cost updated:', perPersonCost);
      } else if (subtotal && subtotal > 0) {
        const pax = (quotationData.totalAdults || 0) + (quotationData.totalChildren || 0);
        if (pax > 0) {
          setPricePerPerson(formatCurrency(subtotal / pax));
        }
      } else {
        setPricePerPerson('0');
      }
    }
    
    // Sync days from itinerary with better handling
    if (quotationData.itinerary && quotationData.itinerary.length > 0) {
      const syncedDays = quotationData.itinerary.map((day, index) => {
        const dayNum = index + 1;
        const location = day.location || quotationData.selectedActivities?.[0]?.location || 'Destination';
        
        return {
          id: day.id || Date.now() + index,
          title: day.title || `Day ${dayNum}: ${location}`,
          description: day.description || day.activities?.join(', ') || `Day ${dayNum} itinerary details will appear here`,
          image: day.image || `https://images.unsplash.com/photo-${1505765050516 + index}?q=80&w=800`
        };
      });
      setDays(syncedDays);
      console.log('[Template] Days updated:', syncedDays.length, 'days');
    }
  }, [quotationData]);
  
  const [days, setDays] = useState([
    {
      id: 1,
      title: 'Day 1: Arrive in Dubai',
      description: 'Arrive in Dubai. Meet and greet at airport, private transfer to hotel. Evening Desert Safari and overnight in Dubai.',
      image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=800'
    },
    {
      id: 2,
      title: 'Day 2: Dubai City Tour',
      description: 'Guided city tour, visit Burj Khalifa, Dubai Mall, Dubai Fountain and overnight in Dubai.',
      image: 'https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?q=80&w=800'
    }
  ]);

  const [similarPackages, setSimilarPackages] = useState([
    { id: 1, title: '4N/5D – Dubai Delight Tour', price: '₹55,499', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=400', link: '' },
    { id: 2, title: '5N/6D – Dubai Adventure', price: '₹68,999', image: 'https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?q=80&w=400', link: '' },
    { id: 3, title: '3N/4D – Dubai Express', price: '₹42,499', image: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?q=80&w=400', link: '' },
    { id: 4, title: '6N/7D – Dubai Luxury', price: '₹85,999', image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=400', link: '' }
  ]);

  const [packageLink, setPackageLink] = useState('');
  const [packageLinkInput, setPackageLinkInput] = useState('');
  const [showPackageLinkInput, setShowPackageLinkInput] = useState(true);

  // Image upload handlers
  const handleImageUpload = (e, setter) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setter(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleDayImageUpload = (e, dayId) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setDays(prev => prev.map(day => 
          day.id === dayId ? { ...day, image: ev.target.result } : day
        ));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSimilarPackageImageUpload = (e, pkgId) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSimilarPackages(prev => prev.map(pkg => 
          pkg.id === pkgId ? { ...pkg, image: ev.target.result } : pkg
        ));
      };
      reader.readAsDataURL(file);
    }
  };

  // Add new day
  const addNewDay = () => {
    const newDay = {
      id: Date.now(),
      title: `Day ${days.length + 1}: Enter Title`,
      description: 'Enter itinerary details for this day here...',
      image: 'https://images.unsplash.com/photo-1505765051693-9de34a6fca1b?q=80&w=800'
    };
    setDays([...days, newDay]);
  };

  // Delete day
  const deleteDay = (dayId) => {
    if (window.confirm('Delete this day?')) {
      setDays(prev => prev.filter(day => day.id !== dayId));
    }
  };

  // Attach package link
  const attachPackageLink = () => {
    if (packageLinkInput.trim()) {
      setPackageLink(packageLinkInput.trim());
      setShowPackageLinkInput(false);
      alert('✅ Link attached successfully!');
    } else {
      alert('⚠️ Please enter a valid link first.');
    }
  };

  // Attach similar package link
  const attachSimilarPackageLink = (pkgId, link) => {
    if (link.trim()) {
      setSimilarPackages(prev => prev.map(pkg => 
        pkg.id === pkgId ? { ...pkg, link: link.trim() } : pkg
      ));
      alert('✅ Link attached successfully!');
    } else {
      alert('⚠️ Please enter a valid link first.');
    }
  };

  // WhatsApp Book Now
  const handleBookNow = () => {
    const whatsappNumber = "9520232324";
    const packageTitle = document.getElementById('mainPackageTitle')?.innerText.trim() || "Package";
    const message = `Hello, I would like to confirm my interest in the package: ${packageTitle}`;
    const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappLink, '_blank');
  };

  // Enhanced PDF download with quality presets
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfProgress, setPdfProgress] = useState('');
  
  const downloadPDF = async (quality = 'high') => {
    // Use external handler if provided
    if (onDownloadPDF) {
      onDownloadPDF();
      return;
    }

    const element = printableRef.current;
    if (!element) {
      alert('Error: Template not found. Please refresh the page.');
      return;
    }

    try {
      setPdfGenerating(true);
      setPdfProgress('Preparing document...');
      console.log('[Template] Starting PDF generation with quality:', quality);
      
      // Clone the element to avoid modifying the original
      const elementClone = element.cloneNode(true);
      
      // Remove no-print elements from clone
      const noPrintElements = elementClone.querySelectorAll('.no-print');
      noPrintElements.forEach(el => el.remove());
      
      // Apply compact spacing for PDF
      setPdfProgress('Optimizing layout...');
      const sections = elementClone.querySelectorAll('.pdf-section, section');
      sections.forEach((section) => {
        section.style.marginBottom = '8px';
        section.style.marginTop = '0';
      });
      
      // Reduce padding in day items
      const dayItems = elementClone.querySelectorAll('.pdf-day-item');
      dayItems.forEach((item) => {
        item.style.marginBottom = '6px';
        item.style.padding = '10px';
      });

      // Optimize line heights to reduce spacing
      const textElements = elementClone.querySelectorAll('p, li, div');
      textElements.forEach((el) => {
        if (!el.style.lineHeight || parseFloat(el.style.lineHeight) > 1.6) {
          el.style.lineHeight = '1.5';
        }
      });
      
      setPdfProgress('Loading images...');
      // Ensure all images are loaded and handle CORS
      const images = elementClone.querySelectorAll('img');
      await Promise.all(
        Array.from(images).map(img => {
          // Set crossOrigin for CORS support
          if (!img.getAttribute('crossorigin')) {
            img.setAttribute('crossorigin', 'anonymous');
          }
          
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
            setTimeout(resolve, 3000); // Timeout after 3s
          });
        })
      );

      // Generate filename
      const guestName = quotationData?.guestName || 'Guest';
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${guestName.replace(/[^a-z0-9]/gi, '_')}_Quotation_${timestamp}.pdf`;

      // Prepare clone for rendering
      elementClone.style.position = 'absolute';
      elementClone.style.left = '-9999px';
      elementClone.style.top = '0';
      elementClone.style.width = '1100px'; // Match preview width
      elementClone.style.maxWidth = '1100px';
      elementClone.style.background = '#ffffff';
      elementClone.style.padding = '0';
      elementClone.style.margin = '0';
      elementClone.style.visibility = 'visible';
      elementClone.style.display = 'block';
      
      // Append to body temporarily
      document.body.appendChild(elementClone);
      
      setPdfProgress('Loading fonts...');
      // Wait for fonts and layout
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 300));

      // Quality presets
      const qualityPresets = {
        'ultra': { scale: 3, imgQuality: 0.99, margin: [6, 8, 6, 8] },
        'high': { scale: 2.5, imgQuality: 0.98, margin: [8, 10, 8, 10] },
        'medium': { scale: 2, imgQuality: 0.95, margin: [10, 12, 10, 12] },
        'compact': { scale: 2, imgQuality: 0.95, margin: [6, 8, 6, 8] }
      };

      const preset = qualityPresets[quality] || qualityPresets['high'];

      // PDF generation options - OPTIMIZED FOR REDUCED SPACING
      const opt = {
        margin: preset.margin, // Compact margins
        filename: filename,
        image: { 
          type: 'jpeg', 
          quality: preset.imgQuality
        },
        html2canvas: {
          scale: preset.scale,
          useCORS: true,
          allowTaint: true,
          letterRendering: true,
          logging: false,
          width: 1100, // Match preview width
          windowWidth: 1100,
          windowHeight: elementClone.scrollHeight,
          scrollY: 0,
          scrollX: 0,
          backgroundColor: '#ffffff',
          removeContainer: false,
          imageTimeout: 0
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait',
          compress: true,
          compressPdf: true
        },
        pagebreak: { 
          mode: ['avoid-all', 'css', 'legacy'],
          before: '.page-break-before',
          after: '.page-break-after',
          avoid: ['.no-break', 'img', '.keep-together', '.pdf-day-item']
        }
      };

      setPdfProgress('Generating PDF...');
      console.log('[Template] Generating PDF with config:', opt);
      
      // Generate and download PDF
      await html2pdf().set(opt).from(elementClone).save();

      // Clean up clone
      document.body.removeChild(elementClone);

      console.log('[Template] PDF generated successfully:', filename);
      setPdfProgress('Complete!');
      setTimeout(() => {
        setPdfGenerating(false);
        setPdfProgress('');
      }, 1500);
    } catch (error) {
      console.error('[Template] PDF generation error:', error);
      setPdfGenerating(false);
      setPdfProgress('');
      alert('Failed to generate PDF. Please try again or contact support.');
    }
  };

  return (
    <>
      {/* Inject print styles */}
      <style>{printStyles}</style>
      
      <div style={{ background: '#efefef', padding: '20px', fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontSize: '14px' }}>
        {/* Controls - NO PRINT */}
      <div className="no-print" style={{ maxWidth: '1100px', margin: '0 auto', marginBottom: '14px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', background: 'white', padding: '12px 16px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        
        <button 
          onClick={() => downloadPDF('high')}
          disabled={loading || pdfGenerating}
          style={{ 
            background: (loading || pdfGenerating) ? '#666' : 'linear-gradient(135deg, #075056 0%, #0a6b72 100%)', 
            color: 'white', 
            border: 'none', 
            padding: '12px 24px', 
            borderRadius: '8px', 
            cursor: (loading || pdfGenerating) ? 'not-allowed' : 'pointer', 
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s',
            boxShadow: (loading || pdfGenerating) ? 'none' : '0 3px 8px rgba(7,80,86,0.3)',
            fontSize: '15px'
          }}
          onMouseOver={(e) => !(loading || pdfGenerating) && (e.target.style.transform = 'translateY(-2px)')}
          onMouseOut={(e) => !(loading || pdfGenerating) && (e.target.style.transform = 'translateY(0)')}>
          <Download size={20} />
          {pdfGenerating ? pdfProgress || 'Generating...' : loading ? 'Loading...' : 'Download PDF'}
        </button>
        
        <button 
          onClick={() => setShowPDFEditor(true)}
          disabled={loading || pdfGenerating}
          style={{ 
            background: (loading || pdfGenerating) ? '#666' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', 
            color: 'white', 
            border: 'none', 
            padding: '12px 24px', 
            borderRadius: '8px', 
            cursor: (loading || pdfGenerating) ? 'not-allowed' : 'pointer', 
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s',
            boxShadow: (loading || pdfGenerating) ? 'none' : '0 3px 8px rgba(37,99,235,0.3)',
            fontSize: '15px'
          }}
          onMouseOver={(e) => !(loading || pdfGenerating) && (e.target.style.transform = 'translateY(-2px)')}
          onMouseOut={(e) => !(loading || pdfGenerating) && (e.target.style.transform = 'translateY(0)')}>
          <Edit size={20} />
          Edit PDF Layout
        </button>
        
        {/* Quick Quality Selector */}
        {!pdfGenerating && !loading && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              onClick={() => downloadPDF('compact')}
              title="Compact: Smallest file, tight spacing, fewer pages"
              style={{ 
                background: 'linear-gradient(135deg, #ff5b04 0%, #ff7b34 100%)', 
                color: 'white', 
                border: 'none', 
                padding: '8px 14px', 
                borderRadius: '6px', 
                cursor: 'pointer', 
                fontWeight: '600',
                fontSize: '13px',
                transition: 'all 0.3s'
              }}
              onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.target.style.transform = 'scale(1)'}>
              📄 Compact
            </button>
            <button 
              onClick={() => downloadPDF('ultra')}
              title="Ultra HD: Best quality, sharpest text & images"
              style={{ 
                background: 'linear-gradient(135deg, #01579b 0%, #0277bd 100%)', 
                color: 'white', 
                border: 'none', 
                padding: '8px 14px', 
                borderRadius: '6px', 
                cursor: 'pointer', 
                fontWeight: '600',
                fontSize: '13px',
                transition: 'all 0.3s'
              }}
              onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.target.style.transform = 'scale(1)'}>
              ⭐ Ultra HD
            </button>
          </div>
        )}
        
        {/* PDF Generation Progress Indicator */}
        {pdfGenerating && (
          <div style={{ 
            background: 'linear-gradient(135deg, #fff3cd 0%, #fff8e1 100%)', 
            border: '2px solid #ffc107', 
            borderRadius: '8px', 
            padding: '8px 16px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}>
            <span style={{ fontSize: '16px' }}>⏳</span>
            <span style={{ color: '#856404', fontWeight: '600', fontSize: '14px' }}>{pdfProgress}</span>
          </div>
        )}
        
        {quotationData && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '13px', color: '#666', marginLeft: 'auto', flexWrap: 'wrap' }}>
            {quotationData.guestName && (
              <span style={{ background: '#e9f7fa', padding: '6px 12px', borderRadius: '6px', color: '#075056', fontWeight: '500' }}>
                👤 {quotationData.guestName}
              </span>
            )}
            {paxInfo && (
              <span style={{ background: '#e9f7fa', padding: '6px 12px', borderRadius: '6px', color: '#075056', fontWeight: '500' }}>
                👥 {paxInfo}
              </span>
            )}
            {totalCost && totalCost !== '0' && (
              <span style={{ background: '#c9f1ff', padding: '6px 12px', borderRadius: '6px', color: '#01579b', fontWeight: '600' }}>
                💰 AED {totalCost}
              </span>
            )}
          </div>
        )}
        
        <label style={{ fontSize: '13px', color: '#444', display: 'none' }}>
          Page title:
          <input 
            type="text" 
            value={pageTitle} 
            onChange={(e) => setPageTitle(e.target.value)}
            style={{ marginLeft: '8px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </label>
      </div>

      {/* Helper Instructions - NO PRINT */}
      {(!quotationData?.guestName || !quotationData?.selectedActivities?.length) && (
        <div className="no-print" style={{ maxWidth: '1100px', margin: '0 auto 16px', background: 'linear-gradient(135deg, #fff3cd 0%, #fff8e1 100%)', border: '2px solid #ffc107', borderRadius: '10px', padding: '16px', boxShadow: '0 2px 8px rgba(255,193,7,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
            <div style={{ fontSize: '24px' }}>💡</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#856404', fontSize: '16px', fontWeight: '600' }}>Quick Start Guide</h3>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#856404', fontSize: '14px', lineHeight: '1.6' }}>
                <li><strong>Left Panel:</strong> Fill in guest details, select activities, and build itinerary</li>
                <li><strong>This Preview:</strong> Updates automatically as you type in the left form</li>
                <li><strong>Edit Text:</strong> Click any text in this preview to edit directly</li>
                <li><strong>Add Images:</strong> Click "Upload" buttons to add logos, banners, and photos</li>
                <li><strong>Download:</strong> Click "Download PDF" button above when ready</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Main Page */}
      <div ref={printableRef} style={{ maxWidth: '1100px', margin: '0 auto', background: '#ffffff', padding: '20px', boxShadow: '0 6px 20px rgba(0,0,0,0.08)', color: '#222', position: 'relative' }}>
        
        {/* Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '18px', gap: '16px', paddingTop: '20px' }}>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {logoSrc && (
                  <img src={logoSrc} alt="Company Logo" style={{ width: '215px', height: '100px', objectFit: 'contain', borderRadius: '6px', background: 'white', padding: '4px' }} />
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleImageUpload(e, setLogoSrc)}
                  id="logoUpload"
                  style={{ display: 'none' }}
                />
                <label htmlFor="logoUpload" className="no-print" style={{ background: '#eee', color: '#333', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  {logoSrc ? 'Change Logo' : 'Upload Logo'}
                </label>
              </div>
              <div>
                <h1 
                  contentEditable 
                  suppressContentEditableWarning
                  style={{ fontFamily: '"The Season", serif', paddingLeft: '20px', fontSize: '50px', color: 'black', margin: 0 }}>
                  Dubai
                </h1>
              </div>
            </div>
          </div>
        </header>

        {/* Package Summary Banner (16:9) */}
        <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', borderRadius: '20px', padding: '0', marginBottom: '20px' }}>
          {/* Left: Banner Image */}
          <div style={{ flex: 1, minWidth: '300px', position: 'relative', width: '100%', maxWidth: '450px', aspectRatio: '16/9', overflow: 'hidden', borderRadius: '16px', border: '2px solid #07505640', cursor: 'pointer' }}>
            <img 
              src={bannerSrc} 
              alt="Package Banner" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onClick={() => document.getElementById('bannerUpload').click()}
            />
            <input 
              type="file" 
              id="bannerUpload" 
              accept="image/*" 
              style={{ display: 'none' }}
              onChange={(e) => handleImageUpload(e, setBannerSrc)}
            />
          </div>

          {/* Right: Text Content */}
          <div style={{ flex: 1, minWidth: '250px' }}>
            <h1 
              contentEditable 
              suppressContentEditableWarning
              style={{ fontSize: '24px', color: 'black', marginBottom: '10px' }}>
              {quotationData.guestName ? `${quotationData.guestName} - Dubai Quotation` : 'Package summary details Dubai Quotation'}
            </h1>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '14px', color: '#075056', marginBottom: '10px' }}>
              <div><strong>Duration:</strong> <span contentEditable suppressContentEditableWarning>{duration}</span></div>
              <br/>
              <div><strong>Price:</strong> AED <span contentEditable suppressContentEditableWarning>{pricePerPerson}</span> per person</div>
              {paxInfo && <div><strong>Pax:</strong> {paxInfo}</div>}
              {totalCost && <div><strong>Total:</strong> AED {totalCost}</div>}
            </div>

            <div style={{ fontSize: '14px', color: '#075056' }}>
              <strong>Places Covered:</strong>
              <br/> 
              <span contentEditable suppressContentEditableWarning>{placesCovered}</span>
            </div>
          </div>
        </section>

        {/* Package Title */}
        <div>
          <h1 
            id="mainPackageTitle"
            contentEditable 
            suppressContentEditableWarning
            style={{ color: 'black', fontSize: '20px', margin: '0 0 10px 0' }}>
            {packageTitle}
          </h1>
        </div>

        <hr style={{ border: 'none', borderTop: '4px solid black', margin: '14px 0 20px 0' }} />

        {/* Book Now CTA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #075056 0%, #0a6b72 100%)', color: '#fff', fontWeight: '700', fontSize: '20px', padding: '18px 28px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(7,80,86,0.3)', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ flex: 1, textAlign: 'center', fontFamily: 'Poppins, sans-serif' }}>To Confirm This Package, Click Here</span>
          <button 
            onClick={handleBookNow}
            style={{ background: 'linear-gradient(135deg, #ff5b04 0%, #ff7b34 100%)', color: '#fff', fontWeight: '700', padding: '10px 24px', borderRadius: '40px', fontFamily: 'Poppins, sans-serif', border: 'none', cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 2px 8px rgba(255,91,4,0.3)' }}
            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}>
            Book Now
          </button>
        </div>

        {/* Selected Activities from Google Sheets */}
        {quotationData.selectedActivities && quotationData.selectedActivities.length > 0 && (
          <section style={{ marginBottom: '10px' }} className="pdf-section">
            <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', color: 'black', borderLeft: '4px solid #075056', paddingLeft: '10px', fontWeight: '600' }}>Selected Activities</h3>
            <div style={{ background: 'linear-gradient(135deg, #e9f7fa 0%, #f0fafb 100%)', borderLeft: '6px solid #075056', padding: '14px', borderRadius: '10px', color: '#075056', boxShadow: '0 2px 8px rgba(7,80,86,0.08)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {quotationData.selectedActivities.map((activity, index) => (
                  <div key={activity.id || index} style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.12)', transition: 'all 0.3s', border: '1px solid rgba(7,80,86,0.1)' }} onMouseOver={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(7,80,86,0.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseOut={(e) => { e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: '#075056', marginBottom: '4px' }}>
                          {activity.product || activity.tour}
                        </div>
                        <div style={{ fontSize: '13px', color: '#666', marginBottom: '2px' }}>
                          <strong>Location:</strong> {activity.location} | <strong>Category:</strong> {activity.category}
                        </div>
                        {activity.transfer && (
                          <div style={{ fontSize: '13px', color: '#666' }}>
                            <strong>Transfer:</strong> {activity.transfer}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '120px' }}>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#ff5b04' }}>
                          AED {activity.costAED || 0}
                        </div>
                        {activity.costUSD && (
                          <div style={{ fontSize: '13px', color: '#666' }}>
                            USD {activity.costUSD}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Cost Summary */}
              {quotationData.costs && (
                <div style={{ marginTop: '14px', padding: '14px', background: 'linear-gradient(135deg, #c9f1ff 0%, #d9f5ff 100%)', borderRadius: '10px', boxShadow: '0 2px 6px rgba(1,87,155,0.15)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
                    <span><strong>Subtotal:</strong></span>
                    <span>AED {formatCurrency(quotationData.costs.subtotal || 0)}</span>
                  </div>
                  {quotationData.includeGST && quotationData.costs.gstAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
                      <span><strong>GST (5%):</strong></span>
                      <span>AED {formatCurrency(quotationData.costs.gstAmount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '2px solid #075056', fontSize: '16px', fontWeight: '700', color: '#075056' }}>
                    <span>Total Cost:</span>
                    <span>AED {formatCurrency(quotationData.costs.finalTotal || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '14px', color: '#ff5b04' }}>
                    <span>Per Person:</span>
                    <span>AED {formatCurrency(quotationData.costs.perPersonCost || 0)}</span>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Overview */}
        <section style={{ marginBottom: '10px' }} className="pdf-section">
          <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', color: 'black', borderLeft: '4px solid #075056', paddingLeft: '10px', fontWeight: '600' }}>Overview</h3>
          <div style={{ background: 'linear-gradient(135deg, #e9f7fa 0%, #f0fafb 100%)', borderLeft: '6px solid #075056', padding: '14px', borderRadius: '10px', color: '#075056', boxShadow: '0 2px 8px rgba(7,80,86,0.08)' }}>
            <p contentEditable suppressContentEditableWarning>
              You start in Paris — the City of Lights — then travel through Switzerland, Austria and Italy. Enjoy guided tours, scenic
              train rides, alpine vistas, romantic gondola rides in Venice and the timeless history of Rome.
            </p>

            <div style={{ background: 'linear-gradient(135deg, #c9f1ff 0%, #d9f5ff 100%)', borderRadius: '8px', padding: '12px', marginTop: '10px', boxShadow: '0 1px 4px rgba(1,87,155,0.1)' }}>
              <h4 contentEditable suppressContentEditableWarning style={{ color: '#01579b', margin: '0 0 8px 0', fontWeight: '600' }}>Package Highlights</h4>
              <ul contentEditable suppressContentEditableWarning style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Paris city tour, Seine River Cruise, Versailles</li>
                <li>Mt Titlis & Lucerne, Jungfraujoch (optional), Rhine Falls</li>
                <li>Venice gondola ride, Florence & Pisa, Rome guided tour</li>
                <li>Swarovski World, scenic long-distance coach transfers</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Accommodation Details */}
        <section style={{ marginBottom: '10px' }} className="pdf-section">
          <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', color: 'black', borderLeft: '4px solid #075056', paddingLeft: '10px', fontWeight: '600' }}>Accommodation Details</h3>
          <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderRadius: '20px', padding: '0', marginBottom: '10px' }}>
            
            {/* Left: Text Content */}
            <div style={{ flex: 1, minWidth: '250px' }}>
              <h1 contentEditable suppressContentEditableWarning style={{ fontSize: '24px', color: 'black', marginBottom: '10px' }}>
                Package summary details Dubai Quotation
              </h1>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '14px', color: '#075056', marginBottom: '10px' }}>
                <div><strong>Duration:</strong> <span contentEditable suppressContentEditableWarning>5 Days / 4 Nights</span></div>
                <br/>
                <div><strong>Room Category:</strong> <span contentEditable suppressContentEditableWarning>Standard</span></div>
                <br/>
                <div><strong>Meal Plan:</strong> <span contentEditable suppressContentEditableWarning>Breakfast</span></div>
              </div>

              <div style={{ fontSize: '14px', color: '#075056' }}>
                <strong>Note:</strong>
                <br/> 
                <span contentEditable suppressContentEditableWarning>Dubai City Tour, Desert Safari, Burj Khalifa, Dhow Cruise</span>
              </div>
            </div>

            {/* Right: Accommodation Image */}
            <div style={{ flex: 1, minWidth: '300px', position: 'relative', width: '100%', maxWidth: '450px', aspectRatio: '16/9', overflow: 'hidden', borderRadius: '16px', border: '2px solid #07505640', cursor: 'pointer' }}>
              <img 
                src={accommodationImage} 
                alt="Accommodation" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onClick={() => document.getElementById('accommodationUpload').click()}
              />
              <input 
                type="file" 
                id="accommodationUpload" 
                accept="image/*" 
                style={{ display: 'none' }}
                onChange={(e) => handleImageUpload(e, setAccommodationImage)}
              />
            </div>
          </section>
        </section>

        {/* Day-wise Itinerary */}
        <section style={{ marginBottom: '10px' }} className="pdf-section">
          <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', color: 'black', borderLeft: '4px solid #075056', paddingLeft: '10px', fontWeight: '600' }}>Day-wise Itinerary</h3>
          <div style={{ marginBottom: '10px' }}>
            <button 
              onClick={addNewDay}
              className="no-print"
              style={{ background: 'linear-gradient(135deg, #075056 0%, #0a6b72 100%)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', boxShadow: '0 2px 6px rgba(7,80,86,0.3)', transition: 'all 0.3s' }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}>
              + Add New Day
            </button>
          </div>

          <div>
            {days.map((day, index) => (
              <div key={day.id} style={{ background: 'linear-gradient(135deg, #e4eef0 0%, #ebf3f5 100%)', borderLeft: '6px solid #ff5b04', padding: '12px', borderRadius: '10px', marginBottom: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', transition: 'all 0.3s' }} className="pdf-day-item" onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'} onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}>
                <div style={{ display: 'flex', width: '100%', gap: '12px' }}>
                  <img 
                    src={day.image} 
                    alt="Day" 
                    style={{ width: '140px', height: '90px', objectFit: 'cover', borderRadius: '10px', border: '2px solid rgba(7,80,86,0.2)', cursor: 'pointer', transition: 'all 0.3s' }}
                    onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                    onClick={() => document.getElementById(`dayImg${day.id}`).click()}
                  />
                  <input 
                    type="file" 
                    id={`dayImg${day.id}`}
                    accept="image/*" 
                    style={{ display: 'none' }}
                    onChange={(e) => handleDayImageUpload(e, day.id)}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 
                        contentEditable 
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const newTitle = e.target.innerText;
                          setDays(prev => prev.map(d => d.id === day.id ? {...d, title: newTitle} : d));
                        }}
                        style={{ color: '#e65100', margin: 0 }}>
                        {day.title}
                      </h4>
                      <div>
                        <label 
                          className="no-print"
                          onClick={() => document.getElementById(`dayImg${day.id}`).click()}
                          style={{ background: '#eee', color: '#333', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', marginRight: '8px' }}>
                          Change image
                        </label>
                        <button 
                          onClick={() => deleteDay(day.id)}
                          className="no-print"
                          style={{ background: '#d32f2f', color: 'white', border: 'none', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                          Delete
                        </button>
                      </div>
                    </div>
                    <p 
                      contentEditable 
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const newDesc = e.target.innerText;
                        setDays(prev => prev.map(d => d.id === day.id ? {...d, description: newDesc} : d));
                      }}
                      style={{ marginTop: '8px' }}>
                      {day.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Inclusions & Exclusions */}
        <section style={{ marginBottom: '10px' }} className="pdf-section">
          <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', color: 'black', borderLeft: '4px solid #075056', paddingLeft: '10px', fontWeight: '600' }}>Inclusions & Exclusions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: 'linear-gradient(135deg, #e9f7fa 0%, #f0fafb 100%)', borderLeft: '6px solid #00897b', padding: '14px', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,137,123,0.1)' }}>
              <h4 style={{ color: '#00695c', marginTop: 0, fontWeight: '600' }}>✅ What's Included</h4>
              <ul contentEditable suppressContentEditableWarning style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Accommodation as per itinerary</li>
                <li>Meals mentioned in itinerary</li>
                <li>Transfers & sightseeing as per itinerary</li>
                <li>Services of a professional tour manager</li>
              </ul>
            </div>

            <div style={{ background: 'linear-gradient(135deg, #fdeaea 0%, #fef0f0 100%)', borderLeft: '6px solid #d32f2f', padding: '14px', borderRadius: '10px', boxShadow: '0 2px 6px rgba(211,47,47,0.1)' }}>
              <h4 style={{ color: '#b71c1c', marginTop: 0, fontWeight: '600' }}>❌ What's Not Included</h4>
              <ul contentEditable suppressContentEditableWarning style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Airfare, visa, insurance</li>
                <li>Personal expenses</li>
                <li>Any services not mentioned</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Terms & Conditions */}
        <section style={{ marginBottom: '10px' }} className="pdf-section">
          <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', color: 'black', borderLeft: '4px solid black', paddingLeft: '10px' }}>Terms & Conditions</h3>
          <div style={{ background: '#f5f9ff', borderLeft: '6px solid black', padding: '14px', borderRadius: '8px' }}>
            <ul contentEditable suppressContentEditableWarning style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
              <li>Rates are valid for a minimum of 2 passengers traveling together.</li>
              <li>Hotel rooms are subject to availability at the time of booking.</li>
              <li>Any increase in airfare, taxes, or other charges will be borne by the client.</li>
              <li>All sightseeing and transfers are as per itinerary unless stated otherwise.</li>
              <li>Cancellation charges apply as per company policy.</li>
              <li>We reserve the right to make changes in the itinerary due to unforeseen circumstances.</li>
              <li>All payments must be cleared before the travel date.</li>
            </ul>
          </div>
          
          {/* Package Link Input */}
          {showPackageLinkInput && (
            <div className="no-print" style={{ textAlign: 'center', marginTop: '12px', marginBottom: '12px' }}>
              <input 
                type="text" 
                value={packageLinkInput}
                onChange={(e) => setPackageLinkInput(e.target.value)}
                placeholder="Enter package URL here..." 
                style={{ width: '70%', maxWidth: '400px', padding: '8px 10px', border: '2px solid black', borderRadius: '6px', outline: 'none' }}
              />
              <button 
                onClick={attachPackageLink}
                style={{ background: 'black', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '6px', marginLeft: '6px', cursor: 'pointer', fontWeight: '600', transition: '0.3s' }}>
                Attach Link
              </button>
            </div>
          )}

          {/* View Package Button */}
          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <a 
              href={packageLink || '#'} 
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: 'linear-gradient(135deg, black, #0d4b80)', color: '#fff', padding: '10px 26px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', letterSpacing: '0.5px', boxShadow: '0 3px 8px rgba(27,108,168,0.3)', transition: '0.3s', display: 'inline-block' }}>
              View Full Package
            </a>
          </div>
        </section>

        {/* Similar Packages */}
        <section style={{ padding: '20px 0', background: 'linear-gradient(180deg, #f8fbfc 0%, #ffffff 100%)', marginLeft: '-20px', marginRight: '-20px', paddingLeft: '20px', paddingRight: '20px' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
            <h2 contentEditable suppressContentEditableWarning style={{ fontSize: '26px', fontWeight: '700', color: '#075056', marginBottom: '25px' }}>
              Similar Packages You May Like
            </h2>

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px' }}>
              {similarPackages.map((pkg) => (
                <SimilarPackageCard 
                  key={pkg.id}
                  pkg={pkg}
                  onImageUpload={(e) => handleSimilarPackageImageUpload(e, pkg.id)}
                  onLinkAttach={(link) => attachSimilarPackageLink(pkg.id, link)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ marginTop: '22px', borderTop: '1px solid #eee', paddingTop: '10px', paddingBottom: '20px', fontSize: '13px', color: '#666' }}>
          <div>
            Prepared by: <span contentEditable suppressContentEditableWarning>Traverse Globe</span> — Address: <span contentEditable suppressContentEditableWarning>129 First Floor, Antriksh Bhavan, Connaught Place, New Delhi, Delhi, Pin 110001</span>
          </div>
          <div>
            Website: <a href="https://traverseglobe.com" target="_blank" rel="noopener noreferrer" style={{ color: 'black', fontWeight: '600', textDecoration: 'underline' }}>
              <span contentEditable suppressContentEditableWarning>traverseglobe.com</span>
            </a>
          </div>
        </footer>
      </div>
    </div>
    
    {/* PDF Editor Modal */}
    <PDFEditorModal
      isOpen={showPDFEditor}
      onClose={() => setShowPDFEditor(false)}
      element={printableRef?.current}
      filename={`${pageTitle?.replace(/\s+/g, '_') || packageTitle?.replace(/\s+/g, '_') || 'quotation'}_${new Date().toISOString().split('T')[0]}.pdf`}
      onDownload={async (element, filename, config) => {
        setPdfDownloading(true);
        try {
          await downloadPDFUtil(element, filename, config);
        } catch (error) {
          console.error('PDF download failed:', error);
        } finally {
          setPdfDownloading(false);
        }
      }}
    />
    </>
  );
});

// Similar Package Card Component
const SimilarPackageCard = ({ pkg, onImageUpload, onLinkAttach }) => {
  const [linkInput, setLinkInput] = useState('');
  const [showInput, setShowInput] = useState(true);

  const handleAttachLink = () => {
    if (linkInput.trim()) {
      onLinkAttach(linkInput);
      setShowInput(false);
    } else {
      alert('⚠️ Please enter a valid link first.');
    }
  };

  return (
    <div style={{ width: '23%', minWidth: '220px', height: '270px', background: 'white', borderRadius: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', overflow: 'hidden', transition: 'all 0.3s', border: '1px solid rgba(7,80,86,0.1)' }} onMouseOver={(e) => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(7,80,86,0.25)'; e.currentTarget.style.transform = 'translateY(-4px)'; }} onMouseOut={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
      <div style={{ position: 'relative', height: '100px', cursor: 'pointer' }} onClick={() => document.getElementById(`similarImg${pkg.id}`).click()}>
        <img 
          src={pkg.image} 
          alt="Package" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
        <input 
          type="file" 
          id={`similarImg${pkg.id}`}
          accept="image/*" 
          style={{ display: 'none' }}
          onChange={onImageUpload}
        />
      </div>
      <div style={{ paddingLeft: '10px', paddingRight: '10px', textAlign: 'left' }}>
        <h3 contentEditable suppressContentEditableWarning style={{ fontWeight: '600', color: '#075056', marginBottom: '8px', fontSize: '14px' }}>
          {pkg.title}
        </h3>
        <div contentEditable suppressContentEditableWarning style={{ fontWeight: '500', color: 'black', marginBottom: '12px', fontSize: '14px' }}>
          {pkg.price} / person
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {showInput && (
            <div className="no-print" style={{ textAlign: 'center', marginBottom: '12px', width: '100%' }}>
              <input 
                type="text" 
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="Enter URL..." 
                style={{ width: '100%', padding: '6px 8px', border: '2px solid black', borderRadius: '6px', outline: 'none', fontSize: '12px', marginBottom: '6px' }}
              />
              <button 
                onClick={handleAttachLink}
                style={{ background: 'black', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', width: '100%' }}>
                Attach Link
              </button>
            </div>
          )}

          {!showInput && (
            <div style={{ textAlign: 'center', marginTop: '10px', width: '100%' }}>
              <a 
                href={pkg.link || '#'} 
                target="_blank"
                rel="noopener noreferrer"
                style={{ background: 'linear-gradient(135deg, black, #0d4b80)', color: '#fff', padding: '8px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '12px', display: 'inline-block' }}>
                View Package
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

EditableQuotationTemplateNew.displayName = 'EditableQuotationTemplateNew';

export default EditableQuotationTemplateNew;
