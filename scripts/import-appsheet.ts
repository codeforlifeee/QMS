/**
 * Importer: "App Sheet .xlsx" -> QMS catalog JSON.
 *
 * The Package Calculator importer covers the main Cost sheet. This one picks up the
 * four sheets that sheet does not have, and which the AI pipeline needs:
 *
 *   EXCURSIONS  attraction + ADULT / CHILD / TODDLER prices  -> products.json (merged)
 *   ADVENTURES  location + attraction + price                -> products.json (merged)
 *   TRANSPORT   route x vehicle-size rate matrix             -> transport.json
 *   CITY TOURS  4 tour products with itinerary bullets       -> city-tours.json
 *
 * EXCURSIONS is the only source of child/toddler pricing anywhere in the business, so
 * without this import every AI-built quotation prices a child at the adult rate (or at
 * the 0.5 multiplier default, which is a guess).
 *
 * Merges rather than overwrites products.json: Package Calculator rows are kept and
 * App Sheet rows are added, deduped by a stable content hash. Re-runnable.
 *
 * Usage: npx tsx scripts/import-appsheet.ts ["C:/path/to/App Sheet .xlsx"]
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { openWorkbook, toMinorUnits, type Cells, type SheetRow } from './lib/xlsx.js';

const DEFAULT_SOURCE = 'C:/Users/LENOVO/Downloads/App Sheet .xlsx';
const TRANSPORT_SUPPLIER = 'Parmar Tours and Transport';

interface ProductWire {
  id: string;
  location: string;
  category: string;
  tour: string;
  product: string;
  transferOption: string;
  costAed: number;
  costUsd: number;
  supplier: string;
  childCostAed?: number;
  toddlerCostAed?: number;
  sourceSheet?: string;
  productGroup?: string;
}

interface TransportWire {
  id: string;
  supplier: string;
  route: string;
  vehicleSize: string;
  rateAed: number;
  parkingAed?: number;
}

interface CityTourWire {
  id: string;
  name: string;
  type: 'sharing' | 'private';
  rateAed: number;
  duration?: string;
  itinerary?: string[];
}

/* ------------------------------------------------------------------ *
 * helpers
 * ------------------------------------------------------------------ */

function hashId(prefix: string, ...parts: string[]): string {
  const key = parts.map((s) => s.toLowerCase().replace(/\s+/g, ' ').trim()).join('|');
  return `${prefix}_${crypto.createHash('sha256').update(key).digest('hex').slice(0, 12)}`;
}

/** Strip the emoji and zero-width junk the CITY TOURS sheet is full of. */
function clean(s: string): string {
  return s
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{2190}-\u{21FF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Rates in TRANSPORT come as "100 + 40 PARKING", "175.0", or "closed".
 * Returns AED major units, or null when the cell is not a price.
 */
function parseRate(raw: string): { rate: number; parking?: number } | null {
  const s = raw.trim();
  if (!s || /closed|n\/?a|tba/i.test(s)) return null;

  const plus = /^([\d.]+)\s*\+\s*([\d.]+)\s*parking/i.exec(s);
  if (plus) {
    const rate = Number(plus[1]);
    const parking = Number(plus[2]);
    if (!Number.isFinite(rate)) return null;
    return Number.isFinite(parking) ? { rate, parking } : { rate };
  }

  const n = Number(s.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? { rate: n } : null;
}

/**
 * "SHARING DUBAI CITY TOUR - 45 AED - 5 HRS" -> name/type/rate/duration
 *
 * Tour headers in this sheet are shouted in caps; itinerary bullets are sentence case.
 * Requiring both the caps styling and the word TOUR is what stops a bullet like
 * "Optional Monorail ride (extra 13 AED)" from being promoted to its own product and
 * stealing the remaining bullets from the tour it belongs to.
 */
function parseCityTourHeader(
  raw: string,
): { name: string; type: 'sharing' | 'private'; rate: number; duration?: string } | null {
  const s = clean(raw);
  if (!/TOUR/.test(s)) return null;

  const letters = s.replace(/[^A-Za-z]/g, '');
  if (letters.length === 0) return null;
  const upperRatio = letters.replace(/[^A-Z]/g, '').length / letters.length;
  if (upperRatio < 0.8) return null;

  const priceMatch = /(\d[\d.]*)\s*AED/i.exec(s);
  if (!priceMatch) return null;
  const rate = Number(priceMatch[1]);
  if (!Number.isFinite(rate) || rate <= 0) return null;

  const type: 'sharing' | 'private' = /private/i.test(s) ? 'private' : 'sharing';
  const duration = /(\d+\s*HRS?)/i.exec(s)?.[1];
  // Name is everything before the price, minus trailing separators.
  const name = s.slice(0, priceMatch.index).replace(/[-–—:\s]+$/, '').trim();
  return { name: name || s, type, rate, ...(duration ? { duration } : {}) };
}

function isSectionHeader(cells: Cells): boolean {
  const keys = Object.keys(cells);
  return keys.length === 1 && keys[0] === 'B';
}

/* ------------------------------------------------------------------ *
 * TRANSPORT
 * ------------------------------------------------------------------ *
 * Layout repeats per section:
 *   B="AIRPORT TRANSFERS"                     <- section label, lone cell
 *   B="DESCRIPTION" C..H="RATE"               <- header marker
 *   C..H="7 Seater","15 Seater",…             <- vehicle sizes for the columns
 *   B=<route>  C..H=<rate>                    <- one row per route
 */

function extractTransport(rows: readonly SheetRow[]): TransportWire[] {
  const out: TransportWire[] = [];
  const RATE_COLS = ['C', 'D', 'E', 'F', 'G', 'H', 'I'];

  let section = '';
  let vehicles: Record<string, string> = {};
  let expectVehicleRow = false;

  for (const { cells } of rows) {
    const b = (cells.B ?? '').trim();

    // Header marker: "DESCRIPTION" + a row of "RATE" labels. The *next* row carries
    // the vehicle sizes for each column.
    if (/^description$/i.test(b)) {
      expectVehicleRow = true;
      continue;
    }

    if (expectVehicleRow) {
      vehicles = {};
      for (const col of RATE_COLS) {
        const v = (cells[col] ?? '').trim();
        if (v) vehicles[col] = v.replace(/\s*\/\s*/g, '/');
      }
      expectVehicleRow = false;
      continue;
    }

    if (isSectionHeader(cells)) {
      // A lone B cell is either the supplier banner or a section label.
      if (!/tours and transport/i.test(b)) section = b;
      continue;
    }

    if (!b || Object.keys(vehicles).length === 0) continue;

    const route = clean(b);
    if (!route) continue;

    for (const [col, vehicleSize] of Object.entries(vehicles)) {
      const parsed = parseRate(cells[col] ?? '');
      if (!parsed) continue;
      const label = section ? `${route} (${titleCase(section)})` : route;
      out.push({
        id: hashId('t', label, vehicleSize),
        supplier: TRANSPORT_SUPPLIER,
        route: label,
        vehicleSize,
        rateAed: toMinorUnits(parsed.rate),
        ...(parsed.parking !== undefined ? { parkingAed: toMinorUnits(parsed.parking) } : {}),
      });
    }
  }
  return out;
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
    .trim();
}

/* ------------------------------------------------------------------ *
 * CITY TOURS
 * ------------------------------------------------------------------ *
 * Two tours sit side by side (column B and column D). A header row carries the name
 * and price; the rows beneath it are that tour's itinerary bullets until the next
 * header appears in the same column.
 */

function extractCityTours(rows: readonly SheetRow[]): CityTourWire[] {
  const tours: CityTourWire[] = [];

  for (const col of ['B', 'D'] as const) {
    let current: CityTourWire | null = null;
    for (const { cells } of rows) {
      const raw = (cells[col] ?? '').trim();
      if (!raw) continue;

      const header = parseCityTourHeader(raw);
      if (header) {
        current = {
          id: hashId('ct', header.name, header.type),
          name: titleCase(header.name),
          type: header.type,
          rateAed: toMinorUnits(header.rate),
          ...(header.duration ? { duration: header.duration } : {}),
          itinerary: [],
        };
        tours.push(current);
        continue;
      }

      if (current) {
        const bullet = clean(raw).replace(/^[✅•\-\s]+/, '').trim();
        if (bullet) current.itinerary!.push(bullet);
      }
    }
  }

  // Drop the itinerary key entirely when empty so the JSON stays tidy.
  return tours.map((t) => (t.itinerary && t.itinerary.length > 0 ? t : { ...t, itinerary: undefined }));
}

/* ------------------------------------------------------------------ *
 * EXCURSIONS  (the only source of child / toddler pricing)
 * ------------------------------------------------------------------ */

function extractExcursions(rows: readonly SheetRow[]): {
  products: ProductWire[];
  warnings: string[];
} {
  const out: ProductWire[] = [];
  const warnings: string[] = [];
  let group = '';

  for (const { cells } of rows) {
    const name = (cells.A ?? '').trim();
    if (!name) continue;
    if (/^attraction$/i.test(name)) continue; // header row

    const adult = Number(cells.B);
    // A row with a name but no adult price is a group banner ("DUBAI MALL ACTIVITIES :-")
    if (!Number.isFinite(adult) || adult <= 0) {
      group = titleCase(name.replace(/[:\-\s]+$/, ''));
      continue;
    }

    const child = Number(cells.C);
    const toddler = Number(cells.D);
    const product = clean(name);
    if (!product) continue;

    // A child price above the adult price means that row's columns are shifted in the
    // source sheet. Importing it would quote a family *more* for bringing a child, so
    // drop the child rate and report it rather than trusting it.
    let childOk = Number.isFinite(child) && child > 0;
    if (childOk && child > adult) {
      warnings.push(`${product}: child ${child} > adult ${adult} — child rate dropped`);
      childOk = false;
    }
    const toddlerOk = Number.isFinite(toddler) && toddler > 0 && toddler <= adult;

    out.push({
      id: hashId('p', 'excursions', product),
      location: /abu dhabi/i.test(`${group} ${product}`) ? 'Abu Dhabi' : 'Dubai',
      category: group || 'Excursions',
      tour: group || product,
      product,
      transferOption: 'Without Transfers',
      costAed: toMinorUnits(adult),
      costUsd: toMinorUnits(adult / 3.65),
      supplier: 'App Sheet',
      ...(childOk ? { childCostAed: toMinorUnits(child) } : {}),
      ...(toddlerOk ? { toddlerCostAed: toMinorUnits(toddler) } : {}),
      sourceSheet: 'App Sheet: EXCURSIONS',
      productGroup: group || undefined,
    });
  }
  return { products: out, warnings };
}

/* ------------------------------------------------------------------ *
 * ADVENTURES
 * ------------------------------------------------------------------ *
 * B = location (sticky — blank means "same as the row above"), C = attraction,
 * D = price, E = remarks (age limit / duration).
 */

function extractAdventures(rows: readonly SheetRow[]): ProductWire[] {
  const out: ProductWire[] = [];
  let location = '';

  for (const { cells } of rows) {
    const b = (cells.B ?? '').trim();
    const attraction = clean((cells.C ?? '').trim());
    if (/^location$/i.test(b)) continue; // header row
    if (b) location = clean(b);
    if (!attraction) continue;

    const parsed = parseRate(cells.D ?? '');
    if (!parsed) continue; // "closed", blank, or 0

    const remarks = clean((cells.E ?? '').trim());

    // The helicopter blocks put the whole product description in B and only a duration
    // in C ("12 MINS"), so naming the row "<C> — <B>" yields "12 Mins — Atlantis Palm…".
    // Detect a bare duration and treat it as a variant of the venue instead.
    const isDuration = /^\d+\s*(mins?|minutes?|hrs?|hours?)$/i.test(attraction);
    const product = isDuration
      ? `${titleCase(location)} (${titleCase(attraction)})`
      : location
        ? `${titleCase(attraction)} — ${titleCase(location)}`
        : titleCase(attraction);

    out.push({
      id: hashId('p', 'adventures', product, remarks),
      location: /abu dhabi/i.test(location) ? 'Abu Dhabi' : 'Dubai',
      category: 'Adventures',
      tour: titleCase(location || attraction),
      product,
      transferOption: 'Without Transfers',
      costAed: toMinorUnits(parsed.rate),
      costUsd: toMinorUnits(parsed.rate / 3.65),
      supplier: 'App Sheet',
      sourceSheet: 'App Sheet: ADVENTURES',
      productGroup: titleCase(location || 'Adventures'),
      ...(remarks && !/^closed$/i.test(remarks) ? {} : {}),
    });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * main
 * ------------------------------------------------------------------ */

function main(): void {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(here, '..');
  const source = process.argv[2] ?? DEFAULT_SOURCE;
  const outDir = path.join(projectRoot, 'data', 'catalog');

  console.log(`Importing: ${source}`);
  const wb = openWorkbook(source);

  const transport = dedupe(extractTransport(wb.rows('TRANSPORT')), (t) => t.id);
  const cityTours = dedupe(extractCityTours(wb.rows('CITY TOURS')), (c) => c.id);
  const { products: excursions, warnings: excursionWarnings } = extractExcursions(
    wb.rows('EXCURSIONS'),
  );
  const adventures = extractAdventures(wb.rows('ADVENTURES'));

  // Merge the new products into whatever the Package Calculator import left behind.
  const productsPath = path.join(outDir, 'products.json');
  const existing: ProductWire[] = fs.existsSync(productsPath)
    ? (JSON.parse(fs.readFileSync(productsPath, 'utf8')) as ProductWire[])
    : [];
  const fromPackageCalculator = existing.filter((p) => !p.sourceSheet?.startsWith('App Sheet'));

  const merged = dedupe(
    [...fromPackageCalculator, ...excursions, ...adventures],
    (p) => p.id,
  ).sort(
    (a, b) =>
      a.location.localeCompare(b.location) ||
      a.category.localeCompare(b.category) ||
      a.product.localeCompare(b.product),
  );

  fs.mkdirSync(outDir, { recursive: true });
  write(productsPath, merged);
  write(path.join(outDir, 'transport.json'), transport);
  write(path.join(outDir, 'city-tours.json'), cityTours);

  // Keep the recorded product count honest for anything that reads defaults.
  const defaultsPath = path.join(outDir, 'defaults.json');
  if (fs.existsSync(defaultsPath)) {
    const defaults = JSON.parse(fs.readFileSync(defaultsPath, 'utf8')) as Record<string, unknown>;
    defaults.productCount = merged.length;
    defaults.importedAt = new Date().toISOString();
    write(defaultsPath, defaults);
  }

  const withChild = merged.filter((p) => p.childCostAed !== undefined).length;
  console.log('');
  console.log(`products.json   : ${merged.length} (${fromPackageCalculator.length} package calculator`
    + ` + ${excursions.length} excursions + ${adventures.length} adventures, deduped)`);
  console.log(`  with child px : ${withChild}`);
  console.log(`transport.json  : ${transport.length} route x vehicle rows`);
  console.log(`city-tours.json : ${cityTours.length} tours`);
  if (transport.length > 0) {
    console.log('');
    console.log('Sample transport:');
    for (const t of transport.slice(0, 3)) {
      console.log(`  ${t.route} [${t.vehicleSize}] = AED ${(t.rateAed / 100).toFixed(2)}`
        + (t.parkingAed ? ` + ${(t.parkingAed / 100).toFixed(2)} parking` : ''));
    }
  }
  if (excursionWarnings.length > 0) {
    console.log('');
    console.log(`Source-data problems (${excursionWarnings.length}):`);
    for (const w of excursionWarnings) console.log(`  ! ${w}`);
  }
}

function dedupe<T>(items: readonly T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    const k = key(it);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

function write(file: string, data: unknown): void {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

main();
