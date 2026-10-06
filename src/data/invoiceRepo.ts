import { FileStore, newRecordId } from './fileStore.js';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
export type InvoiceCurrency = 'INR' | 'AED' | 'USD';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number; // minor units
  amount: number;     // minor units
}

export interface PaymentRecord {
  date: string;
  amount: number;     // minor units
  method: string;
  reference: string;
  notes: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  quotation_id?: string | null;
  lead_id?: string | null;
  client_name: string;
  client_email: string;
  client_phone: string;
  items: InvoiceItem[];
  subtotal: number;    // minor units
  tax_amount: number;
  total: number;
  currency: InvoiceCurrency;
  status: InvoiceStatus;
  issued_date: string;
  due_date: string;
  paid_amount: number;
  payment_history: PaymentRecord[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const store = new FileStore<Invoice>('invoices');

async function nextInvoiceNumber(): Promise<string> {
  const all = await store.list();
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const nums = all
    .map((i) => i.invoice_number)
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10))
    .filter((n) => Number.isFinite(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

export const invoiceRepo = {
  list: () => store.list(),
  get: (id: string) => store.get(id),
  async create(input: Omit<Invoice, 'id' | 'invoice_number' | 'createdAt' | 'updatedAt' | 'payment_history' | 'paid_amount'> & { payment_history?: PaymentRecord[]; paid_amount?: number }): Promise<Invoice> {
    const now = new Date().toISOString();
    const inv: Invoice = {
      ...input,
      id: newRecordId('inv'),
      invoice_number: await nextInvoiceNumber(),
      payment_history: input.payment_history ?? [],
      paid_amount: input.paid_amount ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    return store.save(inv);
  },
  async update(id: string, patch: Partial<Invoice>): Promise<Invoice | null> {
    const existing = await store.get(id);
    if (!existing) return null;
    const next = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
    return store.save(next);
  },
  async recordPayment(id: string, payment: PaymentRecord): Promise<Invoice | null> {
    const existing = await store.get(id);
    if (!existing) return null;
    const history = [...(existing.payment_history ?? []), payment];
    const paid = history.reduce((sum, p) => sum + (p.amount || 0), 0);
    let status: InvoiceStatus = existing.status;
    if (paid >= existing.total && existing.total > 0) status = 'paid';
    else if (paid > 0) status = 'partial';
    const next: Invoice = { ...existing, payment_history: history, paid_amount: paid, status, updatedAt: new Date().toISOString() };
    return store.save(next);
  },
  remove: (id: string) => store.remove(id),
};
