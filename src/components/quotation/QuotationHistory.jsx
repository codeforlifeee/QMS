import React, { useState, useEffect } from 'react';
import { History, Clock, Save, RotateCcw, GitBranch, Eye, Trash2, Download, Search } from 'lucide-react';
import { Card, Button, Input } from '../ui/index.jsx';
import toast from 'react-hot-toast';

/**
 * Quotation Version Control & History
 * Features:
 * - Auto-save with version tracking
 * - Manual version creation
 * - Compare versions
 * - Restore previous versions
 * - Version notes/comments
 * - Search history
 */
const QuotationHistory = ({ currentQuotation, onRestore }) => {
  const [history, setHistory] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'auto', 'manual'

  const STORAGE_KEY = 'quotation_history';
  const MAX_HISTORY_ITEMS = 50;

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistory(parsed);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
      toast.error('Failed to load quotation history');
    }
  };

  const saveVersion = (quotation, type = 'auto', note = '') => {
    const version = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type: type, // 'auto' or 'manual'
      note: note,
      data: quotation,
      guestName: quotation.guestName || 'Unnamed',
      destination: quotation.selectedActivities?.[0]?.location || 'N/A',
      price: quotation.costs?.finalTotal || 0,
      duration: quotation.tripDuration || { nights: 0, days: 0 },
    };

    try {
      // Add new version at the beginning
      const updated = [version, ...history];
      
      // Keep only MAX_HISTORY_ITEMS
      const trimmed = updated.slice(0, MAX_HISTORY_ITEMS);
      
      setHistory(trimmed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      
      if (type === 'manual') {
        toast.success('Version saved successfully!');
      }
      
      return version;
    } catch (err) {
      console.error('Failed to save version:', err);
      toast.error('Failed to save version');
      return null;
    }
  };

  const restoreVersion = (version) => {
    if (onRestore) {
      onRestore(version.data);
      toast.success(`Restored version from ${formatDate(version.timestamp)}`);
    }
  };

  const deleteVersion = (versionId) => {
    if (!confirm('Are you sure you want to delete this version?')) return;
    
    const updated = history.filter(v => v.id !== versionId);
    setHistory(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    toast.success('Version deleted');
  };

  const clearHistory = () => {
    if (!confirm('Are you sure you want to clear all history? This cannot be undone.')) return;
    
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
    toast.success('History cleared');
  };

  const exportVersion = (version) => {
    const dataStr = JSON.stringify(version.data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quotation_${version.guestName}_${version.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Version exported');
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeAgo = (isoString) => {
    const date = new Date(isoString);
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const filteredHistory = history.filter(version => {
    // Type filter
    if (filterType !== 'all' && version.type !== filterType) return false;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        version.guestName.toLowerCase().includes(query) ||
        version.destination.toLowerCase().includes(query) ||
        version.note.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  const compareVersions = (v1, v2) => {
    const differences = [];
    
    if (v1.price !== v2.price) {
      differences.push({
        field: 'Price',
        old: `₹${v1.price.toLocaleString()}`,
        new: `₹${v2.price.toLocaleString()}`,
      });
    }
    
    if (v1.duration.nights !== v2.duration.nights) {
      differences.push({
        field: 'Duration',
        old: `${v1.duration.nights}N/${v1.duration.days}D`,
        new: `${v2.duration.nights}N/${v2.duration.days}D`,
      });
    }
    
    const v1Activities = v1.data.selectedActivities?.length || 0;
    const v2Activities = v2.data.selectedActivities?.length || 0;
    if (v1Activities !== v2Activities) {
      differences.push({
        field: 'Activities',
        old: v1Activities,
        new: v2Activities,
      });
    }
    
    return differences;
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <History className="text-blue-600" />
              Quotation History
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {history.length} version{history.length !== 1 ? 's' : ''} saved
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const note = prompt('Add a note for this version:');
                if (note !== null) {
                  saveVersion(currentQuotation, 'manual', note);
                }
              }}
            >
              <Save size={14} className="mr-1" />
              Save Version
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              className="text-red-600"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Search by guest name, destination, or note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={16} />}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
            >
              All
            </Button>
            <Button
              variant={filterType === 'auto' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('auto')}
            >
              Auto-saved
            </Button>
            <Button
              variant={filterType === 'manual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('manual')}
            >
              Manual
            </Button>
          </div>
        </div>

        {/* History List */}
        {filteredHistory.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-700 mb-2">
              No History Found
            </h4>
            <p className="text-gray-600">
              {searchQuery
                ? 'No versions match your search'
                : 'Versions will appear here as you save quotations'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((version, index) => {
              const isRecent = index === 0;
              const prevVersion = filteredHistory[index + 1];
              const differences = prevVersion ? compareVersions(prevVersion, version) : [];

              return (
                <div
                  key={version.id}
                  className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                    isRecent ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  } ${selectedVersion?.id === version.id ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Timeline Indicator */}
                    <div className="flex flex-col items-center pt-1">
                      <div className={`w-3 h-3 rounded-full ${
                        isRecent ? 'bg-blue-600' : 'bg-gray-400'
                      }`} />
                      {index < filteredHistory.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-300 mt-2" />
                      )}
                    </div>

                    {/* Version Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900">
                              {version.guestName}
                            </h4>
                            {isRecent && (
                              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                                Latest
                              </span>
                            )}
                            {version.type === 'manual' && (
                              <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
                                Saved
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              {getTimeAgo(version.timestamp)}
                            </span>
                            <span>•</span>
                            <span>{version.destination}</span>
                            <span>•</span>
                            <span>
                              {version.duration.nights}N/{version.duration.days}D
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">
                            ₹{version.price.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(version.timestamp)}
                          </div>
                        </div>
                      </div>

                      {/* Version Note */}
                      {version.note && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-2 text-sm text-yellow-900">
                          💡 {version.note}
                        </div>
                      )}

                      {/* Changes from Previous Version */}
                      {differences.length > 0 && (
                        <div className="bg-gray-50 rounded p-2 mb-2">
                          <div className="text-xs font-medium text-gray-700 mb-1">
                            Changes from previous:
                          </div>
                          <div className="space-y-1">
                            {differences.map((diff, i) => (
                              <div key={i} className="text-xs text-gray-600">
                                <span className="font-medium">{diff.field}:</span>{' '}
                                <span className="line-through text-red-600">{diff.old}</span>
                                {' → '}
                                <span className="text-green-600">{diff.new}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedVersion(version)}
                        >
                          <Eye size={14} className="mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => restoreVersion(version)}
                        >
                          <RotateCcw size={14} className="mr-1" />
                          Restore
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportVersion(version)}
                        >
                          <Download size={14} className="mr-1" />
                          Export
                        </Button>
                        {!isRecent && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteVersion(version.id)}
                            className="text-red-600"
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Stats Footer */}
        {history.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {history.length}
                </div>
                <div className="text-xs text-gray-600">Total Versions</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {history.filter(v => v.type === 'manual').length}
                </div>
                <div className="text-xs text-gray-600">Manually Saved</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {new Set(history.map(v => v.guestName)).size}
                </div>
                <div className="text-xs text-gray-600">Unique Guests</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  ₹{Math.round(history.reduce((sum, v) => sum + v.price, 0) / history.length).toLocaleString()}
                </div>
                <div className="text-xs text-gray-600">Avg. Price</div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Version Detail Modal */}
      {selectedVersion && (
        <Card className="bg-white border-2 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-gray-900">Version Details</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedVersion(null)}
            >
              ✕
            </Button>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">Guest Name</div>
                <div className="font-semibold text-gray-900">
                  {selectedVersion.guestName}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Destination</div>
                <div className="font-semibold text-gray-900">
                  {selectedVersion.destination}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Duration</div>
                <div className="font-semibold text-gray-900">
                  {selectedVersion.duration.nights}N / {selectedVersion.duration.days}D
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Price</div>
                <div className="font-semibold text-gray-900">
                  ₹{selectedVersion.price.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Activities</div>
                <div className="font-semibold text-gray-900">
                  {selectedVersion.data.selectedActivities?.length || 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Travelers</div>
                <div className="font-semibold text-gray-900">
                  {selectedVersion.data.totalAdults || 0} Adults, 
                  {selectedVersion.data.totalChildren || 0} Children
                </div>
              </div>
            </div>
            <div className="pt-3 border-t border-gray-200">
              <Button
                onClick={() => restoreVersion(selectedVersion)}
                className="w-full"
              >
                <RotateCcw size={16} className="mr-2" />
                Restore This Version
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default QuotationHistory;

// Export utility function for auto-saving
export const autoSaveQuotation = (quotation) => {
  const STORAGE_KEY = 'quotation_history';
  const MAX_HISTORY_ITEMS = 50;

  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    const history = existing ? JSON.parse(existing) : [];

    const version = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type: 'auto',
      note: '',
      data: quotation,
      guestName: quotation.guestName || 'Unnamed',
      destination: quotation.selectedActivities?.[0]?.location || 'N/A',
      price: quotation.costs?.finalTotal || 0,
      duration: quotation.tripDuration || { nights: 0, days: 0 },
    };

    const updated = [version, ...history].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    
    return true;
  } catch (err) {
    console.error('Auto-save failed:', err);
    return false;
  }
};
