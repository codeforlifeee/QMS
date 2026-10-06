import { readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import type { CatalogProduct, CatalogTransport, CatalogCityTour, CatalogHotel } from './types.js';

/**
 * Direct-to-disk CRUD against the catalog JSON files.
 *
 * The regular catalog loader (src/catalog/catalog.ts) keeps a per-process cache
 * of parsed rows for fast AI-grounding reads. This module intentionally reads
 * from disk every time so admin writes are reflected without having to export
 * a cache-busting hook — the admin flow is low frequency and the files are
 * small (< 200 KB total).
 */

const DATA_DIR = path.resolve(process.cwd(), 'data', 'catalog');
const PRODUCTS = path.join(DATA_DIR, 'products.json');
const TRANSPORT = path.join(DATA_DIR, 'transport.json');
const CITY_TOURS = path.join(DATA_DIR, 'city-tours.json');
const HOTELS = path.join(DATA_DIR, 'hotels.json');

async function readJson<T>(file: string): Promise<T[]> {
  try { return JSON.parse(await readFile(file, 'utf8')) as T[]; }
  catch { return []; }
}

async function writeAtomic(file: string, data: unknown): Promise<void> {
  const tmp = `${file}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await rename(tmp, file);
}

function newId(prefix: string): string {
  const alphabet = 'abcdef0123456789';
  const bytes = new Uint8Array(12);
  globalThis.crypto.getRandomValues(bytes);
  let hex = '';
  for (const b of bytes) hex += alphabet[b % alphabet.length];
  return `${prefix}_${hex}`;
}

/* -------- Products -------- */
export const productsAdmin = {
  async list(): Promise<CatalogProduct[]> { return readJson<CatalogProduct>(PRODUCTS); },
  async create(input: Omit<CatalogProduct, 'id'>): Promise<CatalogProduct> {
    const all = await this.list();
    const item = { ...input, id: newId('p') } as CatalogProduct;
    await writeAtomic(PRODUCTS, [item, ...all]);
    return item;
  },
  async update(id: string, patch: Partial<CatalogProduct>): Promise<CatalogProduct | null> {
    const all = await this.list();
    const i = all.findIndex((r) => r.id === id);
    if (i < 0) return null;
    const next = { ...all[i], ...patch, id: all[i]!.id } as CatalogProduct;
    all[i] = next;
    await writeAtomic(PRODUCTS, all);
    return next;
  },
  async remove(id: string): Promise<boolean> {
    const all = await this.list();
    const next = all.filter((r) => r.id !== id);
    await writeAtomic(PRODUCTS, next);
    return next.length !== all.length;
  },
};

/* -------- Transport -------- */
export const transportAdmin = {
  async list(): Promise<CatalogTransport[]> { return readJson<CatalogTransport>(TRANSPORT); },
  async create(input: Omit<CatalogTransport, 'id'>): Promise<CatalogTransport> {
    const all = await this.list();
    const item = { ...input, id: newId('t') } as CatalogTransport;
    await writeAtomic(TRANSPORT, [item, ...all]);
    return item;
  },
  async update(id: string, patch: Partial<CatalogTransport>): Promise<CatalogTransport | null> {
    const all = await this.list();
    const i = all.findIndex((r) => r.id === id);
    if (i < 0) return null;
    const next = { ...all[i], ...patch, id: all[i]!.id } as CatalogTransport;
    all[i] = next;
    await writeAtomic(TRANSPORT, all);
    return next;
  },
  async remove(id: string): Promise<boolean> {
    const all = await this.list();
    const next = all.filter((r) => r.id !== id);
    await writeAtomic(TRANSPORT, next);
    return next.length !== all.length;
  },
};

/* -------- Hotels -------- */
export const hotelsAdmin = {
  async list(): Promise<CatalogHotel[]> { return readJson<CatalogHotel>(HOTELS); },
  async create(input: Omit<CatalogHotel, 'id'>): Promise<CatalogHotel> {
    const all = await this.list();
    const item = { ...input, id: newId('h') } as CatalogHotel;
    await writeAtomic(HOTELS, [item, ...all]);
    return item;
  },
  async update(id: string, patch: Partial<CatalogHotel>): Promise<CatalogHotel | null> {
    const all = await this.list();
    const i = all.findIndex((r) => r.id === id);
    if (i < 0) return null;
    const next = { ...all[i], ...patch, id: all[i]!.id } as CatalogHotel;
    all[i] = next;
    await writeAtomic(HOTELS, all);
    return next;
  },
  async remove(id: string): Promise<boolean> {
    const all = await this.list();
    const next = all.filter((r) => r.id !== id);
    await writeAtomic(HOTELS, next);
    return next.length !== all.length;
  },
};

/* -------- City tours -------- */
export const cityToursAdmin = {
  async list(): Promise<CatalogCityTour[]> { return readJson<CatalogCityTour>(CITY_TOURS); },
  async create(input: Omit<CatalogCityTour, 'id'>): Promise<CatalogCityTour> {
    const all = await this.list();
    const item = { ...input, id: newId('ct') } as CatalogCityTour;
    await writeAtomic(CITY_TOURS, [item, ...all]);
    return item;
  },
  async update(id: string, patch: Partial<CatalogCityTour>): Promise<CatalogCityTour | null> {
    const all = await this.list();
    const i = all.findIndex((r) => r.id === id);
    if (i < 0) return null;
    const next = { ...all[i], ...patch, id: all[i]!.id } as CatalogCityTour;
    all[i] = next;
    await writeAtomic(CITY_TOURS, all);
    return next;
  },
  async remove(id: string): Promise<boolean> {
    const all = await this.list();
    const next = all.filter((r) => r.id !== id);
    await writeAtomic(CITY_TOURS, next);
    return next.length !== all.length;
  },
};
