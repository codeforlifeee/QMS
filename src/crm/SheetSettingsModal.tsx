import { useState, useEffect } from 'react';
import { showToast } from '../components/Toast.js';

interface Props {
  onClose: () => void;
}

export function SheetSettingsModal({ onClose }: Props) {
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetId, setSheetId] = useState('');
  const [tabs, setTabs] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load current config
    fetch('/api/sheets/config')
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.config) {
          setSheetId(data.config.sheetId);
          setSelectedTab(data.config.tabName);
          setSheetUrl(`https://docs.google.com/spreadsheets/d/${data.config.sheetId}/edit`);
          if (data.config.sheetId) {
            fetchTabs(data.config.sheetId);
          }
        }
      })
      .catch(console.error);
  }, []);

  const extractSheetId = (url: string) => {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : url.trim();
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSheetUrl(val);
    const id = extractSheetId(val);
    if (id && id !== sheetId && id.length > 20) {
      setSheetId(id);
      fetchTabs(id);
    }
  };

  const fetchTabs = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sheets/tabs?sheetId=${id}`);
      const data = await res.json();
      if (data.ok) {
        setTabs(data.tabs);
        if (data.tabs.length > 0 && !data.tabs.includes(selectedTab)) {
          setSelectedTab(data.tabs[0]);
        }
      } else {
        showToast(data.error || 'Failed to fetch tabs', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!sheetId || !selectedTab) {
      showToast('Please enter a valid sheet URL and select a tab', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/sheets/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetId, tabName: selectedTab })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Sheet settings saved', 'success');
        onClose();
      } else {
        showToast(data.error || 'Failed to save settings', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="crm-modal-overlay" onClick={onClose}>
      <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="crm-modal-header">
          <h3>Google Sheets Settings</h3>
          <button className="crm-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="crm-modal-body">
          <div className="crm-form-field full-width" style={{ marginBottom: '16px' }}>
            <label>Google Sheet Link</label>
            <input
              type="text"
              value={sheetUrl}
              onChange={handleUrlChange}
              placeholder="Paste Google Sheet URL here..."
            />
            {sheetId && (
              <small style={{ display: 'block', marginTop: '4px', color: 'var(--color-muted-ink)' }}>
                Sheet ID: {sheetId}
              </small>
            )}
          </div>

          <div className="crm-form-field full-width">
            <label>Select Tab</label>
            {loading ? (
              <div>Loading tabs...</div>
            ) : tabs.length > 0 ? (
              <select
                value={selectedTab}
                onChange={(e) => setSelectedTab(e.target.value)}
              >
                {tabs.map((tab) => (
                  <option key={tab} value={tab}>{tab}</option>
                ))}
              </select>
            ) : (
              <div style={{ color: 'var(--color-muted-ink)', fontSize: '0.9rem' }}>
                Enter a valid Sheet URL to load tabs.
              </div>
            )}
          </div>
        </div>

        <div className="crm-modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !sheetId || !selectedTab}>
            {saving ? 'Saving...' : 'Save Default Sheet'}
          </button>
        </div>
      </div>
    </div>
  );
}
