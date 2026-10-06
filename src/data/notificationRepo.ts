import { FileStore, newRecordId } from './fileStore.js';

export type NotificationType =
  | 'new_lead'
  | 'follow_up_due'
  | 'follow_up_overdue'
  | 'quote_status'
  | 'quote_viewed'
  | 'payment_received'
  | 'invoice_overdue'
  | 'sync_complete'
  | 'ai_complete'
  | 'info';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

const store = new FileStore<AppNotification>('notifications');

export const notificationRepo = {
  async list(limit = 100): Promise<AppNotification[]> {
    const all = await store.list();
    return all.slice(0, limit);
  },
  async unreadCount(): Promise<number> {
    const all = await store.list();
    return all.filter((n) => !n.read).length;
  },
  async create(input: Omit<AppNotification, 'id' | 'createdAt' | 'updatedAt' | 'read'> & { read?: boolean }): Promise<AppNotification> {
    const now = new Date().toISOString();
    const n: AppNotification = { ...input, read: input.read ?? false, id: newRecordId('ntf'), createdAt: now, updatedAt: now };
    return store.save(n);
  },
  async markRead(id: string): Promise<AppNotification | null> {
    const existing = await store.get(id);
    if (!existing) return null;
    return store.save({ ...existing, read: true, updatedAt: new Date().toISOString() });
  },
  async markAllRead(): Promise<number> {
    const all = await store.list();
    let count = 0;
    for (const n of all) {
      if (!n.read) {
        await store.save({ ...n, read: true, updatedAt: new Date().toISOString() });
        count++;
      }
    }
    return count;
  },
  remove: (id: string) => store.remove(id),
};
