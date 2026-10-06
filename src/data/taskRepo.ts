import { FileStore, newRecordId } from './fileStore.js';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Task {
  id: string;
  title: string;
  description: string;
  due_date?: string | null;
  due_time?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  lead_id?: string | null;
  quotation_id?: string | null;
  createdAt: string;
  updatedAt: string;
  completed_at?: string | null;
}

const store = new FileStore<Task>('tasks');

export const taskRepo = {
  list: () => store.list(),
  get: (id: string) => store.get(id),
  async create(input: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completed_at'>): Promise<Task> {
    const now = new Date().toISOString();
    const t: Task = { ...input, id: newRecordId('tsk'), createdAt: now, updatedAt: now, completed_at: null };
    return store.save(t);
  },
  async update(id: string, patch: Partial<Task>): Promise<Task | null> {
    const existing = await store.get(id);
    if (!existing) return null;
    const now = new Date().toISOString();
    const nextStatus = (patch.status ?? existing.status) as TaskStatus;
    const next: Task = {
      ...existing,
      ...patch,
      id: existing.id,
      updatedAt: now,
      completed_at: nextStatus === 'completed' ? (existing.completed_at || now) : null,
    };
    return store.save(next);
  },
  remove: (id: string) => store.remove(id),
};
