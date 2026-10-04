import { mkdir, readFile, readdir, writeFile, rename, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { StoredQuotation } from './schema.js';
import type { CitationMap } from '../ai/citations.js';

/**
 * Persistence port.
 *
 * Phase 1 is backed by JSON files on disk so the document and PDF can be built and seen
 * without signing up for anything. Moving to Supabase later means writing a second
 * implementation of this interface — no caller changes.
 */
export interface QuotationRepo {
  list(): Promise<StoredQuotation[]>;
  get(id: string): Promise<StoredQuotation | null>;
  getByToken(token: string): Promise<StoredQuotation | null>;
  save(q: StoredQuotation): Promise<void>;
  remove(id: string): Promise<void>;
  getCitations(id: string): Promise<CitationMap | null>;
  saveCitations(id: string, citations: CitationMap): Promise<void>;
  getChat(id: string): Promise<any | null>;
  saveChat(id: string, session: any): Promise<void>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data', 'quotations');

async function ensureDir(): Promise<void> {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
}

function fileFor(id: string): string {
  // ids come from our own generator, but never let one escape the data directory
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error(`Unsafe quotation id: ${id}`);
  return path.join(DATA_DIR, `${id}.json`);
}

function citationsFileFor(id: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error(`Unsafe quotation id: ${id}`);
  return path.join(DATA_DIR, `${id}.citations.json`);
}

function chatFileFor(id: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error(`Unsafe quotation id: ${id}`);
  return path.join(DATA_DIR, `${id}.chat.json`);
}

export const jsonRepo: QuotationRepo = {
  async list() {
    await ensureDir();
    const files = (await readdir(DATA_DIR)).filter((f) => f.endsWith('.json') && !f.endsWith('.citations.json') && !f.endsWith('.chat.json'));
    const all: StoredQuotation[] = [];
    for (const f of files) {
      try {
        all.push(JSON.parse(await readFile(path.join(DATA_DIR, f), 'utf8')) as StoredQuotation);
      } catch {
        // a malformed file should not take down the list view
      }
    }
    return all.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  },

  async get(id) {
    await ensureDir();
    try {
      return JSON.parse(await readFile(fileFor(id), 'utf8')) as StoredQuotation;
    } catch {
      return null;
    }
  },

  async getByToken(token) {
    const all = await this.list();
    return all.find((q) => q.token === token) ?? null;
  },

  async save(q) {
    await ensureDir();
    const target = fileFor(q.id);
    // write-then-rename so a crash mid-write cannot truncate an existing quotation
    const tmp = `${target}.tmp`;
    await writeFile(tmp, JSON.stringify(q, null, 2), 'utf8');
    await rename(tmp, target);
  },

  async remove(id) {
    await ensureDir();
    try {
      await unlink(fileFor(id));
    } catch {
      // already gone
    }
  },

  async getCitations(id) {
    await ensureDir();
    try {
      return JSON.parse(await readFile(citationsFileFor(id), 'utf8')) as CitationMap;
    } catch {
      return null;
    }
  },

  async saveCitations(id, citations) {
    await ensureDir();
    const target = citationsFileFor(id);
    const tmp = `${target}.tmp`;
    await writeFile(tmp, JSON.stringify(citations, null, 2), 'utf8');
    await rename(tmp, target);
  },

  async getChat(id) {
    await ensureDir();
    try {
      return JSON.parse(await readFile(chatFileFor(id), 'utf8'));
    } catch {
      return null;
    }
  },

  async saveChat(id, session) {
    await ensureDir();
    const target = chatFileFor(id);
    const tmp = `${target}.tmp`;
    await writeFile(tmp, JSON.stringify(session, null, 2), 'utf8');
    await rename(tmp, target);
  },
};

/** URL-safe, unguessable, and free of dots — see the Sanity id constraint in the PRD. */
export function newToken(length = 22): string {
  const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

export function newId(): string {
  return `q_${Date.now().toString(36)}_${newToken(6)}`;
}
