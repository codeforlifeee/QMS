import { useEffect, useRef, useState } from 'react';
import type { CatalogProduct, SearchFilters } from '../../catalog/types.js';

/**
 * Catalog picker — a search-first typeahead with Location + Category filter chips.
 *
 * The replacement for VLOOKUP: the agent types a few letters of a product name, the
 * dropdown lists matching rows from `/api/catalog/search`, and clicking one calls
 * `onPick` which the parent uses to prefill the line's label, cost and currency.
 *
 * The filters are optional. An empty query with filters set gives "browse by
 * location/category" behaviour (useful when you don't know the exact product name).
 */

interface Props {
  readonly onPick: (product: CatalogProduct) => void;
}

interface SearchResponse {
  readonly results: CatalogProduct[];
  readonly facets: { readonly locations: string[]; readonly categories: string[] };
  readonly total: number;
}

export default function CatalogPicker({ onPick }: Props) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<CatalogProduct[]>([]);
  const [facets, setFacets] = useState<SearchResponse['facets']>({
    locations: [],
    categories: [],
  });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const latestReqId = useRef(0);

  // Debounced search. 150ms is below the "feels laggy" threshold but high enough that
  // typing a 10-char query doesn't fire 10 fetches.
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (filters.location) params.set('loc', filters.location);
    if (filters.category) params.set('cat', filters.category);
    params.set('limit', '10');

    const reqId = ++latestReqId.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/catalog/search?' + params.toString());
        if (!res.ok) throw new Error(res.statusText);
        const data: SearchResponse = await res.json();
        // Guard against out-of-order responses: only commit the latest request.
        if (reqId !== latestReqId.current) return;
        setResults(data.results);
        setFacets(data.facets);
      } catch {
        setResults([]);
      } finally {
        if (reqId === latestReqId.current) setLoading(false);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [query, filters.location, filters.category]);

  const pick = (p: CatalogProduct) => {
    onPick(p);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="catalog-picker">
      <div className="catalog-picker-head">
        <label>Pick from catalog</label>
        <button
          type="button"
          className="btn-link"
          onClick={() => setShowFilters((v) => !v)}
        >
          {showFilters ? 'hide filters' : 'filters'}
          {filters.location || filters.category ? ' •' : ''}
        </button>
      </div>

      {showFilters && (
        <div className="catalog-filters">
          <ChipGroup
            label="Location"
            options={facets.locations}
            value={filters.location}
            onChange={(location) => setFilters((f) => ({ ...f, location }))}
          />
          <ChipGroup
            label="Category"
            options={facets.categories}
            value={filters.category}
            onChange={(category) => setFilters((f) => ({ ...f, category }))}
          />
        </div>
      )}

      <div className="catalog-input-wrap">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // delay so a mousedown on a result still fires
            setTimeout(() => setOpen(false), 150);
          }}
          placeholder="Type a product name, e.g. burj, safari, monorail…"
          className="catalog-input"
        />
        {loading && <span className="catalog-spinner">…</span>}
      </div>

      {open && results.length > 0 && (
        <ul className="catalog-results">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="catalog-result"
                onMouseDown={(e) => {
                  e.preventDefault(); // keep input focused
                  pick(p);
                }}
              >
                <div className="catalog-result-top">
                  <span className="catalog-crumb">
                    {p.location} · {p.category}
                  </span>
                  <span className="catalog-cost">AED {(p.costAed / 100).toFixed(0)}</span>
                </div>
                <div className="catalog-result-name">{p.product}</div>
                {p.transferOption && (
                  <div className="catalog-result-sub">{p.transferOption}</div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !loading && query && results.length === 0 && (
        <div className="catalog-empty">No matches. Clear filters or type a different term.</div>
      )}
    </div>
  );
}

function ChipGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="chip-group">
      <span className="chip-group-label">{label}</span>
      <button
        type="button"
        className={`chip ${!value ? 'chip-active' : ''}`}
        onClick={() => onChange(undefined)}
      >
        All
      </button>
      {options.slice(0, 10).map((opt) => (
        <button
          type="button"
          key={opt}
          className={`chip ${value === opt ? 'chip-active' : ''}`}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
