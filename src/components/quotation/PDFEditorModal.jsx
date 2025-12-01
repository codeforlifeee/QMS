import React, { useState, useEffect, useRef } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw, Settings } from 'lucide-react';
import { Button } from '../ui/index.jsx';

export const PDFEditorModal = ({ isOpen, onClose, element, onDownload, filename = 'quotation.pdf' }) => {
  const [spacing, setSpacing] = useState({
    sectionGap: 24,
    padding: 24,
    lineHeight: 1.5,
    margins: {
      top: 12,
      right: 12,
      bottom: 12,
      left: 12
    }
  });
  
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [showSettings, setShowSettings] = useState(true);
  const previewRef = useRef(null);
  const [previewContent, setPreviewContent] = useState(null);

  useEffect(() => {
    if (isOpen && element) {
      generatePreview();
    }
  }, [isOpen, element, spacing]);

  const generatePreview = () => {
    if (!element) return;
    
    const clone = element.cloneNode(true);
    
    // Remove buttons and non-printable elements
    const elementsToRemove = clone.querySelectorAll(
      '.no-print, .controls, .edit-button, .delete-button, button'
    );
    elementsToRemove.forEach((el) => el.remove());

    // Apply spacing settings
    applySpacingToElement(clone);
    
    setPreviewContent(clone);
  };

  const applySpacingToElement = (clone) => {
    // Apply section gaps
    const sections = clone.querySelectorAll('.border-b-2, .border-b, .space-y-4 > div, .space-y-6 > div');
    sections.forEach((section) => {
      section.style.marginBottom = `${spacing.sectionGap}px`;
      section.style.paddingBottom = `${spacing.sectionGap}px`;
    });

    // Apply padding
    clone.style.padding = `${spacing.padding}px`;
    
    // Apply line height to all text elements
    const textElements = clone.querySelectorAll('p, span, div, li, td, th');
    textElements.forEach((el) => {
      el.style.lineHeight = spacing.lineHeight;
    });

    // Reduce excessive spacing in specific areas
    const headers = clone.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headers.forEach((header) => {
      header.style.marginTop = `${spacing.sectionGap * 0.5}px`;
      header.style.marginBottom = `${spacing.sectionGap * 0.3}px`;
    });

    // Adjust table spacing
    const tables = clone.querySelectorAll('table');
    tables.forEach((table) => {
      table.style.marginTop = `${spacing.sectionGap * 0.5}px`;
      table.style.marginBottom = `${spacing.sectionGap * 0.5}px`;
    });

    // Adjust itinerary spacing
    const itineraryItems = clone.querySelectorAll('[class*="itinerary"], [class*="activity"]');
    itineraryItems.forEach((item) => {
      item.style.marginBottom = `${spacing.sectionGap * 0.7}px`;
      item.style.paddingBottom = `${spacing.sectionGap * 0.5}px`;
    });
  };

  const handleDownload = async () => {
    if (!element) return;
    
    // Create a final version with all spacing applied
    const finalElement = element.cloneNode(true);
    
    // Remove buttons and non-printable elements
    const elementsToRemove = finalElement.querySelectorAll(
      '.no-print, .controls, .edit-button, .delete-button, button'
    );
    elementsToRemove.forEach((el) => el.remove());
    
    applySpacingToElement(finalElement);
    
    // Create config with custom margins
    const pdfConfig = {
      margin: [
        spacing.margins.top,
        spacing.margins.right,
        spacing.margins.bottom,
        spacing.margins.left
      ]
    };
    
    // Call the download function with modified element and config
    await onDownload(finalElement, filename, pdfConfig);
    onClose();
  };

  const resetSettings = () => {
    setSpacing({
      sectionGap: 24,
      padding: 24,
      lineHeight: 1.5,
      margins: {
        top: 12,
        right: 12,
        bottom: 12,
        left: 12
      }
    });
    setZoom(100);
    setRotation(0);
  };

  const presets = {
    compact: {
      sectionGap: 12,
      padding: 16,
      lineHeight: 1.3,
      margins: { top: 8, right: 8, bottom: 8, left: 8 }
    },
    normal: {
      sectionGap: 24,
      padding: 24,
      lineHeight: 1.5,
      margins: { top: 12, right: 12, bottom: 12, left: 12 }
    },
    spacious: {
      sectionGap: 36,
      padding: 32,
      lineHeight: 1.8,
      margins: { top: 16, right: 16, bottom: 16, left: 16 }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl w-[95vw] h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center rounded-t-xl">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Edit PDF Layout</h2>
              <p className="text-blue-100 text-sm">Adjust spacing and preview before downloading</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleDownload}
              icon={Download}
              variant="primary"
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              Download PDF
            </Button>
            <button
              onClick={onClose}
              className="text-white hover:bg-blue-800 p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Settings Panel */}
          <div
            className={`${
              showSettings ? 'w-80' : 'w-12'
            } bg-gray-50 border-r border-gray-200 transition-all duration-300 flex flex-col`}
          >
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-3 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center"
            >
              <Settings className={`w-5 h-5 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
            </button>

            {showSettings && (
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Presets */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Quick Presets</h3>
                  <div className="space-y-2">
                    {Object.entries(presets).map(([key, preset]) => (
                      <button
                        key={key}
                        onClick={() => setSpacing(preset)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-500 transition-colors text-left capitalize"
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section Gap */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Section Gap: {spacing.sectionGap}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    value={spacing.sectionGap}
                    onChange={(e) =>
                      setSpacing((prev) => ({ ...prev, sectionGap: parseInt(e.target.value) }))
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Tight</span>
                    <span>Loose</span>
                  </div>
                </div>

                {/* Padding */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Content Padding: {spacing.padding}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    value={spacing.padding}
                    onChange={(e) =>
                      setSpacing((prev) => ({ ...prev, padding: parseInt(e.target.value) }))
                    }
                    className="w-full"
                  />
                </div>

                {/* Line Height */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Line Height: {spacing.lineHeight.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="2.5"
                    step="0.1"
                    value={spacing.lineHeight}
                    onChange={(e) =>
                      setSpacing((prev) => ({ ...prev, lineHeight: parseFloat(e.target.value) }))
                    }
                    className="w-full"
                  />
                </div>

                {/* Page Margins */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Page Margins (mm)</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {['top', 'right', 'bottom', 'left'].map((side) => (
                      <div key={side}>
                        <label className="block text-xs text-gray-600 mb-1 capitalize">
                          {side}: {spacing.margins[side]}mm
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="30"
                          value={spacing.margins[side]}
                          onChange={(e) =>
                            setSpacing((prev) => ({
                              ...prev,
                              margins: { ...prev.margins, [side]: parseInt(e.target.value) }
                            }))
                          }
                          className="w-full"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reset Button */}
                <button
                  onClick={resetSettings}
                  className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors font-medium"
                >
                  <RotateCw className="w-4 h-4 inline mr-2" />
                  Reset to Default
                </button>
              </div>
            )}
          </div>

          {/* Preview Panel */}
          <div className="flex-1 bg-gray-100 overflow-auto p-8">
            <div className="mb-4 flex justify-center gap-4 bg-white p-3 rounded-lg shadow-sm w-fit mx-auto">
              <button
                onClick={() => setZoom(Math.max(50, zoom - 10))}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="px-4 py-2 font-semibold text-gray-700">{zoom}%</span>
              <button
                onClick={() => setZoom(Math.min(200, zoom + 10))}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            </div>

            <div className="flex justify-center">
              <div
                ref={previewRef}
                className="bg-white shadow-2xl origin-top"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transition: 'transform 0.3s ease',
                  width: '210mm',
                  minHeight: '297mm',
                }}
              >
                {previewContent && (
                  <div
                    dangerouslySetInnerHTML={{ __html: previewContent.innerHTML }}
                    className="pdf-preview-content"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 text-sm text-gray-600 flex justify-between items-center">
          <div>
            <span className="font-semibold">Tip:</span> Use presets for quick adjustments or fine-tune each setting
          </div>
          <div className="text-xs text-gray-500">
            Preview updates automatically
          </div>
        </div>
      </div>
    </div>
  );
};
