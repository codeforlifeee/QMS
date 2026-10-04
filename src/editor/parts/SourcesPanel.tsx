import React from 'react';
import type { CitationMap, Citation } from '../../ai/citations.js';
import type { StoredQuotation, StoredLine } from '../../data/schema.js';

interface SourcesPanelProps {
  citations: CitationMap;
  quotation: StoredQuotation;
  onClose: () => void;
}

function scoreBadge(score: number): string {
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'mid';
  return 'low';
}

export function SourcesPanel({ citations, quotation, onClose }: SourcesPanelProps) {
  const lines = quotation.lines;
  const groundedCount = lines.filter(l => citations[l.id]?.length).length;
  const pct = lines.length > 0 ? Math.round((groundedCount / lines.length) * 100) : 0;

  return (
    <div className="inline-panel sources-panel">
      <div className="inline-panel-header sources-header">
        <div className="inline-panel-title">
          <span className="inline-panel-icon sources-icon">S</span>
          <span>Sources &amp; Citations</span>
        </div>
        <button onClick={onClose} className="inline-panel-close" aria-label="Close sources">
          &times;
        </button>
      </div>

      <div className="sources-summary">
        <div className="sources-summary-text">
          <strong>{groundedCount}</strong> of <strong>{lines.length}</strong> lines grounded in catalog
        </div>
        <div className="sources-progress-bar">
          <div className="sources-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="sources-list">
        {lines.map((line: StoredLine) => {
          const lineCitations = citations[line.id];
          const isGrounded = lineCitations && lineCitations.length > 0;
          return (
            <div key={line.id} className={`sources-card ${isGrounded ? 'grounded' : 'manual'}`}>
              <div className="sources-card-header">
                <span className={`sources-status-dot ${isGrounded ? 'grounded' : 'manual'}`} />
                <span className="sources-card-label">{line.label}</span>
              </div>
              {isGrounded ? (
                lineCitations.map((c: Citation, i: number) => (
                  <div key={i} className="sources-citation">
                    <div className="sources-citation-name" title={c.source.productName}>
                      {c.source.productName}
                    </div>
                    <div className="sources-citation-meta">
                      <span className="sources-citation-sheet">{c.source.sheetName}</span>
                      <span className={`sources-score ${scoreBadge(c.source.matchScore)}`}>
                        {(c.source.matchScore * 100).toFixed(0)}%
                      </span>
                      <span className="sources-citation-cost">
                        AED {(c.source.originalValueAed / 100).toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="sources-manual-tag">Manual entry</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
