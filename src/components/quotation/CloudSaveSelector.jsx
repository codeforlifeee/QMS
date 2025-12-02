import React, { useState } from 'react';
import { Cloud, Download, Check, AlertCircle, Loader, Database, Server } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { uploadQuotationToCloud, initializeCloudStorage } from '../../utils/cloudStorage';

/**
 * Cloud Save Component - Save quotations to cloud storage
 * Supports both Download and Save to Cloud
 */
const CloudSaveSelector = ({ 
  pdfBlob, 
  quotationData = {}, 
  onSuccess, 
  onError,
  showDownload = true 
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [savedToCloud, setSavedToCloud] = useState(false);
  const [cloudURL, setCloudURL] = useState(null);

  const handleSaveToCloud = async () => {
    try {
      setIsSaving(true);
      
      // Initialize cloud storage if not already done
      const initialized = await initializeCloudStorage();
      if (!initialized) {
        throw new Error('Please configure Firebase first. See src/utils/cloudStorage.js');
      }

      // Prepare metadata
      const metadata = {
        filename: quotationData.filename || `quotation_${Date.now()}.pdf`,
        guestName: quotationData.guestName || 'Unknown',
        destination: quotationData.destination || quotationData.packageTitle || 'Unknown',
        packageTitle: quotationData.packageTitle || '',
        totalCost: quotationData.totalCost || 0,
        numberOfPax: quotationData.numberOfPax || 1
      };

      console.log('[Cloud Save] Uploading to cloud...', metadata);

      // Upload to cloud
      const result = await uploadQuotationToCloud(pdfBlob, metadata);

      console.log('[Cloud Save] Upload successful:', result);

      setSavedToCloud(true);
      setCloudURL(result.downloadURL);
      
      if (onSuccess) {
        onSuccess(result);
      }

      toast.success(
        <div>
          <div className="font-bold">Saved to Cloud!</div>
          <div className="text-sm">Quotation uploaded successfully</div>
        </div>
      );

    } catch (error) {
      console.error('[Cloud Save] Failed:', error);
      
      if (onError) {
        onError(error);
      }

      // Check if it's a configuration error
      if (error.message.includes('Firebase') || error.message.includes('configure') || error.message.includes('YOUR_API_KEY')) {
        toast.error(
          <div>
            <div className="font-bold">⚙️ Firebase Not Configured</div>
            <div className="text-sm">Update firebaseConfig in src/utils/cloudStorage.js with your Firebase project credentials</div>
          </div>,
          { duration: 6000 }
        );
      } else if (error.message.includes('not initialized')) {
        toast.error(
          <div>
            <div className="font-bold">🔧 Setup Required</div>
            <div className="text-sm">Cloud storage initialization failed. Check console for details.</div>
          </div>,
          { duration: 5000 }
        );
      } else {
        toast.error(`Save failed: ${error.message}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    try {
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = quotationData.filename || 'quotation.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('[Download] Failed:', error);
      toast.error('Download failed');
    }
  };

  return (
    <div style={{ 
      padding: '20px',
      background: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '700', 
          color: '#1f2937',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Database size={20} />
          Save Quotation
        </h3>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          Download or save to cloud for future access
        </p>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'grid', gap: '12px' }}>
        
        {/* Save to Cloud Button */}
        <button
          onClick={handleSaveToCloud}
          disabled={isSaving || savedToCloud}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '16px 24px',
            background: savedToCloud ? '#10b981' : 'linear-gradient(135deg, #075056 0%, #0a6b72 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: savedToCloud ? 'default' : (isSaving ? 'wait' : 'pointer'),
            transition: 'all 0.3s ease',
            opacity: savedToCloud ? '0.8' : '1'
          }}
          onMouseOver={(e) => {
            if (!savedToCloud && !isSaving) {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(7, 80, 86, 0.3)';
            }
          }}
          onMouseOut={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = 'none';
          }}
        >
          {isSaving ? (
            <>
              <Loader className="animate-spin" size={20} />
              <span>Uploading to Cloud...</span>
            </>
          ) : savedToCloud ? (
            <>
              <Check size={20} />
              <span>Saved to Cloud ✓</span>
            </>
          ) : (
            <>
              <Cloud size={20} />
              <span>Save to Cloud Storage</span>
            </>
          )}
        </button>

        {/* Download Button */}
        {showDownload && (
          <button
            onClick={handleDownload}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '16px 24px',
              background: '#ffffff',
              color: '#075056',
              border: '2px solid #075056',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.background = '#075056';
              e.target.style.color = '#ffffff';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(7, 80, 86, 0.2)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = '#ffffff';
              e.target.style.color = '#075056';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            <Download size={20} />
            <span>Download to Device</span>
          </button>
        )}
      </div>

      {/* Success Info */}
      {savedToCloud && cloudURL && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: '#d1fae5',
          border: '1px solid #10b981',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#065f46'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Check size={16} />
            <strong>Saved Successfully!</strong>
          </div>
          <div style={{ fontSize: '13px' }}>
            Your quotation is now stored in the cloud and can be accessed anytime.
          </div>
          <a 
            href={cloudURL} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              display: 'inline-block',
              marginTop: '8px',
              color: '#075056',
              textDecoration: 'underline',
              fontWeight: '600'
            }}
          >
            View in Cloud Storage →
          </a>
        </div>
      )}

      {/* Info Box */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: '#eff6ff',
        border: '1px solid #3b82f6',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#1e40af'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Cloud Storage Benefits:</strong>
            <ul style={{ marginLeft: '16px', marginTop: '4px' }}>
              <li>Access from any device</li>
              <li>Never lose your quotations</li>
              <li>Share with team members</li>
              <li>Automatic backup</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Setup Notice */}
      {!savedToCloud && (
        <div style={{
          marginTop: '12px',
          fontSize: '12px',
          color: '#6b7280',
          textAlign: 'center'
        }}>
          First time? Configure Firebase in <code>src/utils/cloudStorage.js</code>
        </div>
      )}
    </div>
  );
};

export default CloudSaveSelector;
