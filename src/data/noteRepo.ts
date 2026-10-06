import { FileStore, newRecordId } from './fileStore.js';

export type NoteEntityType = 'lead' | 'quotation';

export interface Note {
  id: string;
  content: string;
  entity_type: NoteEntityType;
  entity_id: string;
  author_name: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

const store = new FileStore<Note>('notes');

export const noteRepo = {
  async listFor(entityType: NoteEntityType, entityId: string): Promise<Note[]> {
    const all = await store.list();
    const scoped = all.filter((n) => n.entity_type === entityType && n.entity_id === entityId);
    // Pinned first, then newest-first
    scoped.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    return scoped;
  },
  get: (id: string) => store.get(id),
  async create(input: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'pinned'> & { pinned?: boolean }): Promise<Note> {
    const now = new Date().toISOString();
    const n: Note = { ...input, pinned: input.pinned ?? false, id: newRecordId('nte'), createdAt: now, updatedAt: now };
    return store.save(n);
  },
  async update(id: string, patch: Partial<Note>): Promise<Note | null> {
    const existing = await store.get(id);
    if (!existing) return null;
    const next = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
    return store.save(next);
  },
  remove: (id: string) => store.remove(id),
};
