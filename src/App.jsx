import React, { useState, useRef, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { useGoogleSheets } from './hooks/useGoogleSheets';
import { useQuotation } from './hooks/useQuotation';
import { downloadPDFWithRetry, previewPDF, PDF_BLOB_SMALL_THRESHOLD_BYTES } from './utils/pdfGenerator';
import QuotationForm from './components/quotation/QuotationForm';
import ActivitySelector from './components/quotation/ActivitySelector';
import ItineraryBuilder from './components/quotation/ItineraryBuilder';
import EditableQuotationTemplateNew from './components/quotation/EditableQuotationTemplateNew';
import { Button, Spinner, Alert } from './components/ui/index.jsx';
import { RefreshCw, X, Copy } from 'lucide-react';

function App() {
  const previewRef = useRef(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfServerPreferred, setPdfServerPreferred] = useState(() => {
    try {
      const stored = localStorage.getItem('pdfServerPreferred');
      if (stored !== null) return stored === 'true';
    } catch (e) {}
    return false; // Default to client-side rendering
  });
  const [pdfServerUrl, setPdfServerUrl] = useState(() => {
    try {
      return localStorage.getItem('pdfServerUrl') || import.meta.env.VITE_PDF_SERVER_URL || 'http://localhost:4000';
    } catch (e) {
      return import.meta.env.VITE_PDF_SERVER_URL || 'http://localhost:4000';
    }
  });
  const [serverChecking, setServerChecking] = useState(false);

  // Google Sheets Data
  const { data: tourData, loading: sheetsLoading, error: sheetsError, refetch: refetchSheets } = useGoogleSheets();

  // Quotation State Management
  const {
    quotation,
    isSaved,
    saveError,
    updateBasicDetails,
    addActivity,
    removeActivity,
    addDay,
    removeDay,
    updateDay,
    toggleFlights,
    toggleVisa,
    toggleGST,
    clearAll,
  } = useQuotation();

  const totalPax = quotation.totalAdults + quotation.totalChildren;

  useEffect(() => {
    try {
      window.PDF_SERVER_PREFERRED = pdfServerPreferred;
      localStorage.setItem('pdfServerPreferred', pdfServerPreferred);
    } catch (e) {}
  }, [pdfServerPreferred]);

  useEffect(() => {
    try {
      window.PDF_SERVER_URL = pdfServerUrl;
      localStorage.setItem('pdfServerUrl', pdfServerUrl);
    } catch (e) {}
  }, [pdfServerUrl]);

  const testPdfServer = async () => {
    setServerChecking(true);
    try {
      const url = `${pdfServerUrl.replace(/\/$/, '')}/health`;
      const resp = await fetch(url, { method: 'GET' });
      if (resp.ok) {
        toast.success('PDF server is online');
      } else {
        toast.error(`PDF server responded with ${resp.status}`);
      }
    } catch (err) {
      toast.error(`Failed to reach PDF server: ${err.message}`);
    } finally {
      setServerChecking(false);
    }
  };

  // Handle Download PDF - Enhanced for exact preview match
  const handleDownloadPDF = async () => {
    if (!previewRef.current) {
      toast.error('Preview not ready. Please try again.');
      return;
    }

    // Quick validation: preview should be visible and have some width/height
    const el = previewRef.current;
    if (el.offsetWidth === 0 || el.offsetHeight === 0) {
      toast.error('Preview is not visible. Scroll to preview or resize window and try again.');
      return;
    }
    console.log('[App] Starting PDF generation for element:', {
      width: el.offsetWidth,
      height: el.offsetHeight,
      scrollHeight: el.scrollHeight,
      boundingRect: el.getBoundingClientRect()
    });

    setPdfLoading(true);
    try {
      const guestName = quotation?.guestName || 'Guest';
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${guestName.replace(/[^a-z0-9]/gi, '_')}_Quotation_${timestamp}.pdf`;
      
      // Set PDF server preference in window object for the utility to use
      window.PDF_SERVER_PREFERRED = pdfServerPreferred;
      window.PDF_SERVER_URL = pdfServerUrl;
      
      console.log('[App] Attempting PDF generation with:', { filename, serverPreferred: pdfServerPreferred, serverUrl: pdfServerUrl });
      
      const blob = await downloadPDFWithRetry(previewRef.current, filename);
      
      if (blob && blob.size && blob.size < PDF_BLOB_SMALL_THRESHOLD_BYTES) {
        toast.warning('Generated PDF looks small. Opening preview for verification...');
        try { 
          await previewPDF(previewRef.current); 
        } catch (err) { 
          console.error('[App] Preview failed:', err); 
        }
      } else {
        toast.success(`PDF downloaded successfully! (${(blob?.size / 1024).toFixed(2)} KB)`);
        console.log('[App] PDF generated successfully:', {
          filename,
          size: blob?.size,
          sizeKB: (blob?.size / 1024).toFixed(2)
        });
      }
    } catch (error) {
      console.error('[App] PDF download error:', error);
      toast.error(`Failed to download PDF: ${error.message}`);
      
      // Offer to try preview instead
      toast((t) => (
        <div>
          <p>Would you like to preview the PDF instead?</p>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await previewPDF(previewRef.current);
                toast.success('PDF preview opened in new tab');
              } catch (err) {
                toast.error('Preview also failed: ' + err.message);
              }
            }}
            style={{ marginTop: '8px', padding: '6px 12px', background: '#075056', color: 'white', borderRadius: '6px' }}
          >
            Try Preview
          </button>
        </div>
      ), { duration: 8000 });
    } finally {
      setPdfLoading(false);
    }
  };

  // Handle WhatsApp Share
  const handleShareWhatsApp = () => {
    const message = `Hi,\n\nI'm sharing a travel quotation for you:\n\n*${quotation.guestName}*\n${quotation.tripDuration.days > 0 ? `Duration: ${quotation.tripDuration.nights}N/${quotation.tripDuration.days}D\n` : ''}Total Cost: ${quotation.costs.finalTotal ? `₹${quotation.costs.finalTotal.toLocaleString('en-IN')}` : 'TBD'}\n\nPlease find the detailed PDF attached or visit our website for more details.`;

    const encodedMessage = encodeURIComponent(message);
    window.open(
      `https://wa.me/?text=${encodedMessage}`,
      '_blank'
    );
  };

  // Handle Copy Quotation
  const handleCopyQuotation = () => {
    const summary = `
TRAVEL QUOTATION
================

Guest: ${quotation.guestName}
Pax: ${quotation.totalAdults} Adults${quotation.totalChildren > 0 ? `, ${quotation.totalChildren} Children` : ''}
Dates: ${quotation.travelDates.from || 'TBD'} to ${quotation.travelDates.to || 'TBD'}
Duration: ${quotation.tripDuration.days > 0 ? `${quotation.tripDuration.nights}N/${quotation.tripDuration.days}D` : 'N/A'}

TOTAL COST: ₹${quotation.costs.finalTotal.toLocaleString('en-IN')}
Per Person: ₹${quotation.costs.perPersonCost.toLocaleString('en-IN')}
    `.trim();

    navigator.clipboard.writeText(summary);
    toast.success('Quotation summary copied to clipboard!');
  };

  // Handle Clear All
  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      clearAll();
      toast.success('All data cleared!');
    }
  };

  console.debug('[App] sheetsLoading:', sheetsLoading, 'tourData.locations:', tourData?.locations?.length);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Travel Quotation Maker</h1>
              <p className="text-teal-100 mt-1">
                Automated quotation generator with Google Sheets integration
              </p>
            </div>
            <div className="flex items-center gap-3">
            <Button
                onClick={refetchSheets}
                icon={RefreshCw}
                variant="secondary"
                size="sm"
                loading={sheetsLoading}
              >
                Refresh Data
              </Button>
              <Button
                onClick={handleClearAll}
                icon={X}
                variant="danger"
                size="sm"
              >
                Clear All
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts */}
        {sheetsError && (
          <Alert
            type="warning"
            title="Google Sheets Connection"
            message={sheetsError}
            onClose={() => {}}
          />
        )}

        {saveError && (
          <Alert
            type="error"
            title="Save Error"
            message={saveError}
            onClose={() => {}}
          />
        )}

        {isSaved && (
          <Alert
            type="success"
            title="Auto-saved"
            message="Your quotation has been automatically saved."
            onClose={() => {}}
          />
        )}

        {/* Loading State */}
        {sheetsLoading && (
          <div className="text-center py-12">
            <Spinner />
            <p className="text-gray-600 mt-4">Loading tour data from Google Sheets...</p>
          </div>
        )}

        {/* Two-Column Layout */}
        {!sheetsLoading && Array.isArray(tourData.locations) && tourData.locations.length > 0 && (
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            {/* Left Column - Form Inputs (2/5 width) */}
            <div className="xl:col-span-2 space-y-6 pr-2">
              {/* Basic Details */}
              <QuotationForm
                quotation={quotation}
                tourData={tourData}
                onUpdateBasicDetails={updateBasicDetails}
                onAddActivity={addActivity}
                onRemoveActivity={removeActivity}
                totalPax={totalPax}
              />

              {/* Activity Selection */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Select Activities & Tours
                </h3>
                <ActivitySelector
                  tourData={tourData}
                  onAddActivity={addActivity}
                  selectedActivities={quotation.selectedActivities}
                />
              </div>

              {/* Itinerary Builder */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Build Itinerary
                </h3>
                <ItineraryBuilder
                  itinerary={quotation.itinerary}
                  onAddDay={addDay}
                  onRemoveDay={removeDay}
                  onUpdateDay={updateDay}
                />
              </div>
            </div>

            {/* Right Column - Live Preview (3/5 width) */}
            <div className="xl:col-span-3">
              <EditableQuotationTemplateNew
                ref={previewRef}
                quotationData={quotation}
                tourData={tourData}
                onDownloadPDF={handleDownloadPDF}
                loading={pdfLoading}
              />
            </div>
          </div>
        )}

        {/* Empty State */}
        {!sheetsLoading && Array.isArray(tourData.locations) && tourData.locations.length === 0 && !sheetsError && (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-600 mb-4">
              No tour data found. Please check your Google Sheets API configuration.
            </p>
            <Button onClick={refetchSheets} icon={RefreshCw}>
              Retry
            </Button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 text-center py-4 mt-12">
        <p>
          Traverse Globe • Travel Quotation Maker v1.0 •{' '}
          <a href="mailto:support@traverseglobe.com" className="text-blue-400 hover:text-blue-300">
            support@traverseglobe.com
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
