export interface Citation {
  lineId: string;
  field: 'adultRate' | 'label' | 'childRate' | 'supplier' | 'description';
  source: {
    catalogId: string;
    productName: string;
    sheetName: string;
    originalValueAed: number;
    matchScore: number;
    matchedQuery: string;
  };
  alternatives?: Array<{
    catalogId: string;
    productName: string;
    costAed: number;
    score: number;
  }>;
}

export type CitationMap = Record<string, Citation[]>;
