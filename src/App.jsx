import React, { useState, useRef } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { useGoogleSheets } from './hooks/useGoogleSheets';
import { useQuotation } from './hooks/useQuotation';
import { downloadPDFWithRetry } from './utils/pdfGenerator';
import QuotationForm from './components/quotation/QuotationForm';
import ActivitySelector from './components/quotation/ActivitySelector';
import ItineraryBuilder from './components/quotation/ItineraryBuilder';
import QuotationPreview from './components/quotation/QuotationPreview';
import { Button, Spinner, Alert } from './components/ui/index.jsx';
import { RefreshCw, X, Copy } from 'lucide-react';

function App() {
  const previewRef = useRef(null);
  const [pdfLoading, setPdfLoading] = useState(false);

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

  // Handle Download PDF
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

    setPdfLoading(true);
    try {
      const filename = `Quotation_${quotation.guestName || 'Quotation'}_${new Date().toISOString().split('T')[0]}.pdf`;
      await downloadPDFWithRetry(previewRef.current, filename);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error(`Failed to download PDF: ${error.message}`);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Travel Quotation Maker</h1>
              <p className="text-blue-100 mt-1">
                Professional quotation generator for travel packages
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
              
              {/* Quick link to exact UI HTML */}
              <a href="/itt.html" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  Open Editor (Static)
                </Button>
              </a>
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
        {!sheetsLoading && tourData.locations.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Form Inputs */}
            <div className="space-y-6 overflow-y-auto max-h-[90vh] pr-4">
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

            {/* Right Column - Preview */}
            <div className="sticky top-8 h-fit">
              <QuotationPreview
                ref={previewRef}
                quotation={quotation}
                onDownloadPDF={handleDownloadPDF}
                onShareWhatsApp={handleShareWhatsApp}
                loading={pdfLoading}
              />

              {/* Additional Actions */}
              <div className="mt-4 space-y-2">
                <Button
                  onClick={handleCopyQuotation}
                  icon={Copy}
                  variant="outline"
                  className="w-full"
                >
                  Copy Quotation
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!sheetsLoading && tourData.locations.length === 0 && !sheetsError && (
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
