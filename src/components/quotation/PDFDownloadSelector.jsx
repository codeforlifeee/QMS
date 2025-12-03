import React, { useState } from 'react';
import { Download, Server, FileText, Printer, CheckCircle, AlertCircle, Loader, Cloud } from 'lucide-react';
import {
  generatePDFViaPuppeteer,
  generatePDFViaHtml2Pdf,
  generatePDFViaJsPDF,
  generatePDFViaPrint,
  generatePDFSmart,
  validateBeforeGeneration,
  PDF_METHODS
} from '../../utils/pdfGeneratorUnified';
import CloudSaveSelector from './CloudSaveSelector';

/**
 * PDF Download Selector Component
 * Allows users to choose from multiple PDF generation methods
 * Now includes cloud storage option
 */
const PDFDownloadSelector = ({ element, filename = 'quotation.pdf', quotationData = {}, onSuccess, onError }) => {
  const [selectedMethod, setSelectedMethod] = useState('jspdf');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [showValidation, setShowValidation] = useState(false);
  const [validation, setValidation] = useState(null);
  const [showCloudSave, setShowCloudSave] = useState(false);
  const [generatedBlob, setGeneratedBlob] = useState(null);

  const methods = [
    {
      id: PDF_METHODS.JSPDF,
      name: 'Download PDF',
      description: 'High quality PDF with selectable text',
      icon: FileText,
      quality: 'Excellent',
      color: 'green',
      recommended: true
    },
    {
      id: PDF_METHODS.PRINT,
      name: 'Print',
      description: 'Browser print dialog',
      icon: Printer,
      quality: 'Varies',
      color: 'gray'
    }
  ];

  const handleValidate = () => {
    if (!element) return;
    
    const result = validateBeforeGeneration(element);
    setValidation(result);
    setShowValidation(true);
  };

  const handleGenerate = async () => {
    if (!element) {
      const error = 'No element to generate PDF from';
      setLastResult({ success: false, error });
      onError?.(error);
      return;
    }

    setIsGenerating(true);
    setLastResult(null);

    try {
      let result;
      const startTime = Date.now();

      switch (selectedMethod) {
        case PDF_METHODS.JSPDF:
          result = { blob: await generatePDFViaJsPDF(element, filename), method: 'jsPDF' };
          break;
        case PDF_METHODS.PRINT:
          result = { blob: await generatePDFViaPrint(element, filename), method: 'Print' };
          break;
        default:
          result = { blob: await generatePDFViaJsPDF(element, filename), method: 'jsPDF' };
      }

      const elapsed = Date.now() - startTime;
      const size = result.blob ? (result.blob.size / 1024).toFixed(2) : 'N/A';

      setLastResult({
        success: true,
        method: result.method,
        size: `${size} KB`,
        time: `${(elapsed / 1000).toFixed(2)}s`
      });

      // Store blob for cloud save option
      setGeneratedBlob(result.blob);

      onSuccess?.(result);

    } catch (error) {
      console.error('[PDF Download] Error:', error);
      setLastResult({
        success: false,
        error: error.message
      });
      onError?.(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="pdf-download-selector">
      <style jsx>{`
        .pdf-download-selector {
          padding: 20px;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .selector-header {
          margin-bottom: 20px;
        }

        .selector-title {
          font-size: 18px;
          font-weight: 700;
          color: #333;
          margin: 0 0 8px 0;
        }

        .selector-subtitle {
          font-size: 13px;
          color: #666;
          margin: 0;
        }

        .methods-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }

        .method-card {
          padding: 15px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .method-card:hover {
          border-color: #008B8B;
          box-shadow: 0 2px 8px rgba(0, 139, 139, 0.1);
        }

        .method-card.selected {
          border-color: #008B8B;
          background: #f0fafa;
        }

        .method-card.recommended::before {
          content: 'Recommended';
          position: absolute;
          top: -8px;
          right: 10px;
          background: #008B8B;
          color: white;
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 600;
        }

        .method-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .method-icon {
          width: 20px;
          height: 20px;
          color: #008B8B;
        }

        .method-name {
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }

        .method-description {
          font-size: 12px;
          color: #666;
          margin-bottom: 8px;
        }

        .method-badges {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .badge {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 3px;
          font-weight: 600;
        }

        .badge-green {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .badge-yellow {
          background: #fff7ed;
          color: #c2410c;
        }

        .badge-blue {
          background: #e3f2fd;
          color: #1565c0;
        }

        .actions {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }

        .btn {
          flex: 1;
          padding: 12px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #008B8B;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #006666;
        }

        .btn-secondary {
          background: #f5f5f5;
          color: #333;
          border: 1px solid #e0e0e0;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #e0e0e0;
        }

        .btn-cloud {
          background: linear-gradient(135deg, #075056 0%, #0a6b72 100%);
          color: white;
        }

        .btn-cloud:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(7, 80, 86, 0.3);
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .result-card {
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
        }

        .result-success {
          background: #e8f5e9;
          border: 1px solid #a5d6a7;
        }

        .result-error {
          background: #ffebee;
          border: 1px solid #ef5350;
        }

        .result-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .result-title {
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }

        .result-details {
          font-size: 12px;
          color: #666;
        }

        .validation-panel {
          background: #f9f9f9;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 20px;
        }

        .validation-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .validation-title {
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }

        .validation-issues {
          font-size: 12px;
          color: #666;
        }

        .validation-issue {
          margin: 4px 0;
          padding-left: 16px;
          position: relative;
        }

        .validation-issue::before {
          content: '•';
          position: absolute;
          left: 0;
          color: #f57c00;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="selector-header">
        <h3 className="selector-title">Download PDF</h3>
        <p className="selector-subtitle">Select download method</p>
      </div>

      <div className="methods-grid">
        {methods.map(method => (
          <div
            key={method.id}
            className={`method-card ${selectedMethod === method.id ? 'selected' : ''} ${method.recommended ? 'recommended' : ''}`}
            onClick={() => setSelectedMethod(method.id)}
          >
            <div className="method-header">
              <method.icon className="method-icon" />
              <span className="method-name">{method.name}</span>
            </div>
            <p className="method-description">{method.description}</p>
            <div className="method-badges">
              {method.quality && (
                <span className={`badge badge-${method.quality === 'Highest' ? 'green' : method.quality === 'Good' ? 'blue' : 'yellow'}`}>
                  {method.quality} Quality
                </span>
              )}
              {method.requiresServer && (
                <span className="badge badge-yellow">Requires Server</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {showValidation && validation && (
        <div className="validation-panel">
          <div className="validation-header">
            {validation.valid ? (
              <CheckCircle size={18} color="#2e7d32" />
            ) : (
              <AlertCircle size={18} color="#f57c00" />
            )}
            <span className="validation-title">
              {validation.valid ? 'Quality Check Passed' : 'Quality Issues Found'}
            </span>
          </div>
          {!validation.valid && (
            <div className="validation-issues">
              {validation.issues.slice(0, 5).map((issue, i) => (
                <div key={i} className="validation-issue">{issue}</div>
              ))}
              {validation.issues.length > 5 && (
                <div className="validation-issue">...and {validation.issues.length - 5} more</div>
              )}
              <p style={{ marginTop: '12px', fontSize: '11px', color: '#666' }}>
                Don't worry! These will be automatically fixed during generation.
              </p>
            </div>
          )}
        </div>
      )}

      {lastResult && (
        <div className={`result-card ${lastResult.success ? 'result-success' : 'result-error'}`}>
          <div className="result-header">
            {lastResult.success ? (
              <CheckCircle size={18} color="#2e7d32" />
            ) : (
              <AlertCircle size={18} color="#c62828" />
            )}
            <span className="result-title">
              {lastResult.success ? 'PDF Generated Successfully!' : 'Generation Failed'}
            </span>
          </div>
          {lastResult.success ? (
            <div className="result-details">
              Method: {lastResult.method} | Size: {lastResult.size} | Time: {lastResult.time}
            </div>
          ) : (
            <div className="result-details">
              {lastResult.error}
            </div>
          )}
        </div>
      )}

      <div className="actions">
        <button
          className="btn btn-secondary"
          onClick={handleValidate}
          disabled={isGenerating || !element}
        >
          <CheckCircle size={18} />
          Validate Quality
        </button>
        <button
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={isGenerating || !element}
        >
          {isGenerating ? (
            <>
              <Loader size={18} className="spinner" />
              Generating...
            </>
          ) : (
            <>
              <Download size={18} />
              Generate & Download PDF
            </>
          )}
        </button>
        
        {/* Cloud Save Button - shows after PDF is generated */}
        {generatedBlob && (
          <button
            className="btn btn-cloud"
            onClick={() => setShowCloudSave(!showCloudSave)}
            style={{
              background: showCloudSave ? '#6b7280' : 'linear-gradient(135deg, #075056 0%, #0a6b72 100%)',
              color: '#ffffff',
              border: 'none'
            }}
          >
            <Cloud size={18} />
            {showCloudSave ? 'Hide Cloud Options' : 'Save to Cloud Storage'}
          </button>
        )}
      </div>

      {/* Cloud Save Component */}
      {showCloudSave && generatedBlob && (
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #e0e0e0' }}>
          <CloudSaveSelector
            pdfBlob={generatedBlob}
            quotationData={{
              filename,
              ...quotationData
            }}
            onSuccess={(result) => {
              console.log('[Cloud Save] Success:', result);
              // Keep the cloud save UI visible to show success
            }}
            onError={(error) => {
              console.error('[Cloud Save] Error:', error);
            }}
            showDownload={false}
          />
        </div>
      )}
    </div>
  );
};

export default PDFDownloadSelector;
