/**
 * Minimal .xlsx reader — zero third-party dependencies.
 *
 * Walks the zip central directory, inflates the entries we need, and parses the
 * worksheet XML into row/cell maps with shared strings resolved.
 *
 * Extracted from scripts/import-package-calculator.ts so every importer shares one
 * correct cell parser. The original inline version had a regex bug worth remembering:
 *
 *   /<c\s+r="([A-Z]+)\d+"([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/
 *
 * `([^>]*)` is greedy and `/` is not `>`, so for a self-closing empty cell
 * `<c r="A9" s="113"/>` the attribute group swallowed the closing slash, the
 * alternation then took the `>` branch, and the lazy body ran on to the *next* cell's
 * `</c>`. The empty A-cell therefore reported B's value, under A's column letter and
 * without B's `t="s"` — surfacing raw shared-string indices like "1579" instead of
 * "Dubai Airport to City Hotel". `attrsRe` below is quote-aware and lazy so a
 * self-closing cell terminates where it should.
 */

import fs from 'node:fs';
import zlib from 'node:zlib';

export type Cells = Record<string, string>;

export interface SheetRow {
  readonly r: number;
  readonly cells: Cells;
}

export interface Workbook {
  /** Sheet display name -> worksheet xml path, in workbook order. */
  readonly sheets: ReadonlyMap<string, string>;
  readonly sharedStrings: readonly string[];
  rows(sheetName: string): SheetRow[];
  /** Unparsed worksheet XML — needed to read formulas, which cells don't carry. */
  rawSheet(sheetName: string): string;
}

/* ---------- zip ---------- */

function readZip(file: string): Record<string, string> {
  const buf = fs.readFileSync(file);
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x05 && buf[i + 3] === 0x06) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error(`not a zip (no EOCD): ${file}`);

  const count = buf.readUInt16LE(eocd + 10);
  const offset = buf.readUInt32LE(eocd + 16);
  const out: Record<string, string> = {};
  let p = offset;
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localHeader = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString('utf8');
    p += 46 + nameLen + extraLen + commentLen;

    const lhNameLen = buf.readUInt16LE(localHeader + 26);
    const lhExtraLen = buf.readUInt16LE(localHeader + 28);
    const dataStart = localHeader + 30 + lhNameLen + lhExtraLen;
    const data = buf.subarray(dataStart, dataStart + compSize);
    out[name] =
      method === 0 ? data.toString('utf8') : zlib.inflateRawSync(data).toString('utf8');
  }
  return out;
}

/* ---------- xml helpers ---------- */

export function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function parseSharedStrings(xml: string | undefined): string[] {
  if (!xml) return [];
  const out: string[] = [];
  for (const m of xml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    const texts = [...m[1]!.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]!);
    out.push(decodeXmlEntities(texts.join('')));
  }
  return out;
}

/**
 * Quote-aware, lazy attribute capture. Terminates correctly on `/>` so an empty
 * self-closing cell cannot absorb the following cell's body.
 */
const cellRe = /<c\s((?:[^>"]|"[^"]*")*?)(?:\/>|>([\s\S]*?)<\/c>)/g;

function parseCells(rowXml: string, strings: readonly string[]): Cells {
  const cells: Cells = {};
  for (const m of rowXml.matchAll(cellRe)) {
    const attrs = m[1] ?? '';
    const inner = m[2];
    if (inner === undefined) continue; // self-closing: styling only, no value

    const ref = /\br="([A-Z]+)\d+"/.exec(attrs)?.[1];
    if (!ref) continue;
    const type = /\bt="([^"]+)"/.exec(attrs)?.[1];

    const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
    const inlineStr = /<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>[\s\S]*?<\/is>/.exec(inner)?.[1];

    let value = '';
    if (type === 's' && v !== undefined) value = strings[Number(v)] ?? '';
    else if (type === 'inlineStr' && inlineStr !== undefined) value = decodeXmlEntities(inlineStr);
    else if (type === 'str' && v !== undefined) value = decodeXmlEntities(v);
    else if (v !== undefined) value = v;

    if (value !== '') cells[ref] = value;
  }
  return cells;
}

/* ---------- public ---------- */

export function openWorkbook(file: string): Workbook {
  const entries = readZip(file);
  const sharedStrings = parseSharedStrings(entries['xl/sharedStrings.xml']);

  // rId -> target path
  const rels = new Map<string, string>();
  const relsXml = entries['xl/_rels/workbook.xml.rels'] ?? '';
  for (const m of relsXml.matchAll(/Id="(rId\d+)"[^>]*Target="([^"]+)"/g)) {
    rels.set(m[1]!, m[2]!.replace(/^\/?xl\//, '').replace(/^\.\//, ''));
  }

  const sheets = new Map<string, string>();
  const wbXml = entries['xl/workbook.xml'] ?? '';
  for (const m of wbXml.matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const attrs = m[1]!;
    const name = /\bname="([^"]*)"/.exec(attrs)?.[1];
    const rid = /\br:id="(rId\d+)"/.exec(attrs)?.[1];
    if (!name || !rid) continue;
    const target = rels.get(rid);
    if (target) sheets.set(decodeXmlEntities(name), `xl/${target}`);
  }

  function sheetXml(sheetName: string): string {
    const p = sheets.get(sheetName);
    if (!p) {
      throw new Error(`sheet not found: "${sheetName}" (have: ${[...sheets.keys()].join(', ')})`);
    }
    const xml = entries[p];
    if (!xml) throw new Error(`worksheet xml missing: ${p}`);
    return xml;
  }

  return {
    sheets,
    sharedStrings,
    rawSheet: sheetXml,
    rows(sheetName: string): SheetRow[] {
      const xml = sheetXml(sheetName);
      const out: SheetRow[] = [];
      for (const m of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
        const r = Number(/\br="(\d+)"/.exec(m[1]!)?.[1] ?? 0);
        const cells = parseCells(m[2]!, sharedStrings);
        if (Object.keys(cells).length > 0) out.push({ r, cells });
      }
      return out;
    },
  };
}

/** AED/USD are 2dp — round once at the boundary so the catalog stores integers. */
export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}
