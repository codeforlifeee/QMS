import { FileStore, newRecordId } from './fileStore.js';
import type { StoredQuotation } from './schema.js';

export interface QuotationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  destination: string;
  duration: number;
  thumbnail_url?: string | null;
  template_data: Partial<StoredQuotation>;
  usage_count: number;
  createdAt: string;
  updatedAt: string;
}

const store = new FileStore<QuotationTemplate>('templates');

export const templateRepo = {
  list: () => store.list(),
  get: (id: string) => store.get(id),
  async create(input: Omit<QuotationTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usage_count'>): Promise<QuotationTemplate> {
    const now = new Date().toISOString();
    const t: QuotationTemplate = {
      ...input,
      id: newRecordId('tpl'),
      usage_count: 0,
      createdAt: now,
      updatedAt: now,
    };
    return store.save(t);
  },
  async update(id: string, patch: Partial<QuotationTemplate>): Promise<QuotationTemplate | null> {
    const existing = await store.get(id);
    if (!existing) return null;
    const next = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
    return store.save(next);
  },
  async incrementUsage(id: string): Promise<void> {
    const existing = await store.get(id);
    if (!existing) return;
    await store.save({ ...existing, usage_count: (existing.usage_count ?? 0) + 1, updatedAt: new Date().toISOString() });
  },
  remove: (id: string) => store.remove(id),
};

export function newTemplateId(): string { return newRecordId('tpl'); }
