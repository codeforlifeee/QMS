/**
 * One-off importer: Package Calculator.xlsx -> QMS catalog JSON.
 *
 * The source is Rayna's supplier sheet, mirrored into Google Sheets with IMPORTRANGE
 * and then exported to Excel. Columns on the "Cost sheet":
 *   A Location   B Category   C Tour   D Product variant   E Transfer   F AED   G USD
 *
 * ~1000 rows total, ~390 real products (610 blanks). Column E occasionally contains
 * the concatenation "Without TransfersPrivate Transfers" when a row is priced both
 * ways — the importer splits those into two output rows so each is pickable in the UI.
 *
 * Also reads the Calculator sheet to extract the house defaults: AED/USD rate,
 * INR/USD rate, and markup %. These prefill a new quotation.
 *
 * The script has zero third-party dependencies — it unzips and parses the .xlsx inline
 * with Node builtins. Re-runnable: a stable hash-derived id means re-importing the
 * same product produces the same row id, which future Google-Sheets sync will reuse.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { openWorkbook, toMinorUnits, type Cells, type SheetRow } from './lib/xlsx.js';

interface SourceRow {
  readonly location: string;
  readonly category: string;
  readonly tour: string;
  readonly product: string;
  readonly transferOption: string;
  readonly costAed: number;
  readonly costUsd: number;
}

interface CatalogProductWire {
  id: string;
  location: string;
  category: string;
  tour: string;
  product: string;
  transferOption: string;
  /** AED minor units (fils) — stored as integer-safe cents * 100. */
  costAed: number;
  costUsd: number;
  supplier: string;
  /** Set by import-appsheet on its own rows; absent on Package Calculator rows. */
  sourceSheet?: string;
}

interface DefaultsWire {
  readonly markupPct: number;
  readonly fxAedPerUsd: number;
  readonly fxInrPerUsd: number;
  readonly fxAedPerInr: number;
  readonly importedAt: string;
  readonly productCount: number;
}

/* ---------- Cost sheet extraction ---------- */

/**
 * The IMPORTRANGE source occasionally concatenates two or three transfer labels
 * into one cell when a product is priced in multiple ways. Known labels in order
 * of specificity (longest first so the splitter doesn't false-match "Transfers"
 * inside "Private Transfers").
 */
const TRANSFER_LABELS = [
  'Without Transfers',
  'Sharing Transfers',
  'Private Transfers',
] as const;

function splitTransferOptions(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return ['Without Transfers'];

  // Fast path: the whole cell is a single known label.
  for (const label of TRANSFER_LABELS) {
    if (trimmed === label) return [label];
  }

  // Longer path: walk the string, consuming known labels until nothing remains.
  const parts: string[] = [];
  let cursor = trimmed;
  while (cursor.length > 0) {
    let matched = false;
    for (const label of TRANSFER_LABELS) {
      if (cursor.startsWith(label)) {
        parts.push(label);
        cursor = cursor.slice(label.length).trim();
        matched = true;
        break;
      }
    }
    if (!matched) break; // unexpected content; keep what we got and bail
  }
  return parts.length > 0 ? parts : [trimmed];
}

function extractCostSheet(rows: readonly SheetRow[]): SourceRow[] {
  const out: SourceRow[] = [];
  for (const { r: rowNum, cells } of rows) {
    if (rowNum === 1) continue; // header

    const location = (cells.A ?? '').trim();
    const category = (cells.B ?? '').trim();
    const tour = (cells.C ?? '').trim();
    const product = (cells.D ?? '').trim();
    const transferRaw = (cells.E ?? '').trim();
    const costAed = Number(cells.F);
    const costUsd = Number(cells.G);

    // Reject blank slots. The sheet has ~610 of these.
    if (!product || !Number.isFinite(costAed) || costAed <= 0) continue;

    // Split concatenated transfer labels into one row per option (so "Without
    // TransfersSharing TransfersPrivate Transfers" yields three pickable products).
    const transfers = splitTransferOptions(transferRaw);

    for (const transferOption of transfers) {
      out.push({
        location: location || 'Unknown',
        category: category || 'Uncategorised',
        tour: tour || product,
        product,
        transferOption,
        costAed,
        costUsd: Number.isFinite(costUsd) && costUsd > 0 ? costUsd : costAed / 3.65,
      });
    }
  }
  return out;
}

/* ---------- Calculator defaults extraction ---------- */

interface Defaults {
  readonly markupPct: number;
  readonly fxAedPerUsd: number;
  readonly fxInrPerUsd: number;
}

/**
 * Hunts the Calculator sheet for the three well-known formulas:
 *   `=C28/3.65`      (Net USD) -> AED-per-USD rate
 *   `=E29*85.59`     (Net INR) -> INR-per-USD rate
 *   `=C29+(C29*0.15)` (SP USD) -> 0.15 = 15% markup
 *
 * These are hardcoded in the workbook today; capturing them means a new QMS quotation
 * prefills the house values rather than making the agent remember them.
 */
function extractDefaults(xml: string): Defaults {
  const text = xml;
  // divisor on the "Net USD" row — the AED->USD rate
  const aedPerUsd = Number(/\/\s*([\d.]+)\s*</.exec(text)?.[1] ?? 3.65);
  // multiplier on the "Net INR" row — the INR per USD rate (first match wins)
  const inrMatches = [...text.matchAll(/E29\*([\d.]+)/g)];
  const inrPerUsd = Number(inrMatches[0]?.[1] ?? 85.59);
  // markup from "C29+(C29*0.15)" or similar
  const mkpMatch = /\*\s*0?\.?(\d+)\s*\)/.exec(text);
  // Fall back to 0.15 if we miss. mkpMatch[1] like "15" -> 0.15
  let markupPct = 0.15;
  if (mkpMatch) {
    const n = Number('0.' + mkpMatch[1]);
    if (Number.isFinite(n) && n > 0 && n < 1) markupPct = n;
  }
  return { markupPct, fxAedPerUsd: aedPerUsd, fxInrPerUsd: inrPerUsd };
}

/* ---------- id generation ---------- */

function stableId(row: SourceRow): string {
  const key = [row.location, row.category, row.tour, row.product, row.transferOption]
    .map((s) => s.toLowerCase().replace(/\s+/g, ' ').trim())
    .join('|');
  // 12 hex chars = 48 bits = negligible collision risk at ~400 rows
  const hash = crypto.createHash('sha256').update(key).digest('hex').slice(0, 12);
  return `p_${hash}`;
}

/* ---------- main ---------- */

function main(): void {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(here, '..');
  const source =
    process.argv[2] ?? 'C:/Users/LENOVO/Downloads/Package Calculator.xlsx';
  const outDir = path.join(projectRoot, 'data', 'catalog');

  console.log('Importing: ' + source);
  const wb = openWorkbook(source);

  const rows = extractCostSheet(wb.rows('Cost sheet'));
  const defaults = extractDefaults(wb.rawSheet('Calculator'));

  // Sort for human-readable JSON diffs.
  rows.sort(
    (a, b) =>
      a.location.localeCompare(b.location) ||
      a.category.localeCompare(b.category) ||
      a.tour.localeCompare(b.tour) ||
      a.product.localeCompare(b.product) ||
      a.transferOption.localeCompare(b.transferOption),
  );

  const products: CatalogProductWire[] = rows.map((r) => ({
    id: stableId(r),
    location: r.location,
    category: r.category,
    tour: r.tour,
    product: r.product,
    transferOption: r.transferOption,
    costAed: toMinorUnits(r.costAed),
    costUsd: toMinorUnits(r.costUsd),
    supplier: 'Rayna Tours',
  }));

  // deduplicate by id — different source rows that collapse to the same key keep the
  // first occurrence, which is stable thanks to the sort above.
  const seen = new Set<string>();
  const unique = products.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));

  // Keep rows contributed by import-appsheet (EXCURSIONS / ADVENTURES) so the two
  // importers compose in either order instead of overwriting each other's work.
  fs.mkdirSync(outDir, { recursive: true });
  const productsPath = path.join(outDir, 'products.json');
  const previous: CatalogProductWire[] = fs.existsSync(productsPath)
    ? (JSON.parse(fs.readFileSync(productsPath, 'utf8')) as CatalogProductWire[])
    : [];
  const fromAppSheet = previous.filter((p) => p.sourceSheet?.startsWith('App Sheet'));
  const merged = [...unique, ...fromAppSheet.filter((p) => !seen.has(p.id))];

  fs.writeFileSync(productsPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');

  const defaultsOut: DefaultsWire = {
    markupPct: defaults.markupPct,
    fxAedPerUsd: defaults.fxAedPerUsd,
    fxInrPerUsd: defaults.fxInrPerUsd,
    fxAedPerInr: defaults.fxInrPerUsd / defaults.fxAedPerUsd,
    importedAt: new Date().toISOString(),
    productCount: merged.length,
  };
  fs.writeFileSync(
    path.join(outDir, 'defaults.json'),
    JSON.stringify(defaultsOut, null, 2) + '\n',
    'utf8',
  );

  const byLocation = new Map<string, number>();
  const byCategory = new Map<string, number>();
  for (const p of unique) {
    byLocation.set(p.location, (byLocation.get(p.location) ?? 0) + 1);
    byCategory.set(p.category, (byCategory.get(p.category) ?? 0) + 1);
  }
  console.log('');
  console.log('Wrote ' + unique.length + ' products (deduped from ' + rows.length + ' source rows).');
  console.log('Locations : ' + [...byLocation.entries()].map(([k, v]) => `${k} (${v})`).join(', '));
  console.log('Categories: ' + byCategory.size);
  console.log('Defaults  : markup=' + (defaults.markupPct * 100).toFixed(1) +
    '%, AED/USD=' + defaults.fxAedPerUsd +
    ', INR/USD=' + defaults.fxInrPerUsd +
    ', INR/AED=' + defaultsOut.fxAedPerInr.toFixed(4));
}

main();
