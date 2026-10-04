import React from 'react';
import type { CitationMap, Citation } from '../../ai/citations.js';
import type { StoredQuotation, StoredLine } from '../../data/schema.js';

interface SourcesPanelProps {
  citations: CitationMap;
  quotation: StoredQuotation;
  onClose: () => void;
}

export function SourcesPanel({ citations, quotation, onClose }: SourcesPanelProps) {
  const lines = quotation.lines;
  const groundedCount = Object.keys(citations).length;
  
  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 w-80">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Sources & Citations</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl font-bold">
          ×
        </button>
      </div>
      <div className="p-4 bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
        {groundedCount} of {lines.length} lines grounded in catalog.
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {lines.map((line: StoredLine) => {
          const lineCitations = citations[line.id];
          return (
            <div key={line.id} className="border border-gray-200 rounded p-3 bg-gray-50 shadow-sm">
              <div className="font-medium text-sm mb-2">{line.label}</div>
              {lineCitations && lineCitations.length > 0 ? (
                lineCitations.map((c: Citation, i: number) => (
                  <div key={i} className="text-xs bg-white border border-gray-100 rounded p-2 mb-2 last:mb-0">
                    <div className="text-green-700 font-medium truncate" title={c.source.productName}>{c.source.productName}</div>
                    <div className="text-gray-500 mt-1">Sheet: {c.source.sheetName}</div>
                    <div className="text-gray-500 truncate" title={c.source.matchedQuery}>Matched: "{c.source.matchedQuery}"</div>
                    <div className="text-gray-500">Score: {(c.source.matchScore * 100).toFixed(0)}%</div>
                    <div className="text-gray-500">Original AED: {c.source.originalValueAed / 100}</div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-red-600 font-medium">
                  Manual entry — no catalog match
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
