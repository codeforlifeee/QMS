import { mkdir, readFile, readdir, writeFile, rename, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Shared file-based KV store used by lightweight resources (templates,
 * tasks, notes, invoices, notifications) that follow the same JSON-on-disk
 * pattern as the quotation repo. One file per record, named `<id>.json`,
 * inside `data/<namespace>/`.
 */
export class FileStore<T extends { id: string; updatedAt?: string; updated_at?: string }> {
  private readonly dir: string;

  constructor(namespace: string) {
    this.dir = path.resolve(process.cwd(), 'data', namespace);
  }

  private async ensure(): Promise<void> {
    if (!existsSync(this.dir)) await mkdir(this.dir, { recursive: true });
  }

  private fileFor(id: string): string {
    if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error(`Unsafe id: ${id}`);
    return path.join(this.dir, `${id}.json`);
  }

  async list(): Promise<T[]> {
    await this.ensure();
    const files = (await readdir(this.dir)).filter((f) => f.endsWith('.json'));
    const out: T[] = [];
    for (const f of files) {
      try {
        out.push(JSON.parse(await readFile(path.join(this.dir, f), 'utf8')) as T);
      } catch {
        // skip malformed
      }
    }
    out.sort((a, b) => {
      const au = a.updatedAt ?? a.updated_at ?? '';
      const bu = b.updatedAt ?? b.updated_at ?? '';
      return bu.localeCompare(au);
    });
    return out;
  }

  async get(id: string): Promise<T | null> {
    await this.ensure();
    try {
      return JSON.parse(await readFile(this.fileFor(id), 'utf8')) as T;
    } catch {
      return null;
    }
  }

  async save(record: T): Promise<T> {
    await this.ensure();
    const target = this.fileFor(record.id);
    const tmp = `${target}.tmp`;
    await writeFile(tmp, JSON.stringify(record, null, 2), 'utf8');
    await rename(tmp, target);
    return record;
  }

  async remove(id: string): Promise<void> {
    await this.ensure();
    try { await unlink(this.fileFor(id)); } catch { /* already gone */ }
  }
}

export function newRecordId(prefix: string): string {
  const alphabet = 'abcdefghijkmnopqrstuvwxyz23456789';
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  let suffix = '';
  for (const b of bytes) suffix += alphabet[b % alphabet.length];
  return `${prefix}_${Date.now().toString(36)}_${suffix}`;
}
