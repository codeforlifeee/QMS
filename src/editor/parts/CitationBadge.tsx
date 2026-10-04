import React from 'react';
import type { Citation } from '../../ai/citations.js';

interface CitationBadgeProps {
  citation: Citation;
  onClick?: () => void;
}

export function CitationBadge({ citation, onClick }: CitationBadgeProps) {
  const score = citation.source.matchScore;
  let colorClass = 'bg-red-100 text-red-800 border-red-200';
  if (score > 0.8) colorClass = 'bg-green-100 text-green-800 border-green-200';
  else if (score >= 0.5) colorClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';

  return (
    <button
      onClick={onClick}
      title={`Source: ${citation.source.sheetName} | Original: ${citation.source.originalValueAed / 100} AED | Score: ${(score * 100).toFixed(0)}%`}
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border cursor-pointer hover:opacity-80 transition-opacity ml-2 ${colorClass}`}
    >
      {citation.source.productName}
    </button>
  );
}
