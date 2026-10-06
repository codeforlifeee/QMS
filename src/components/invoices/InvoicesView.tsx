import { useEffect, useMemo, useState } from 'react';
import { Plus, Receipt, Trash2, Edit3, DollarSign, FileText, Calendar } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Chip } from '../ui/Chip';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { SearchInput } from '../ui/SearchInput';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { showToast } from '../ui/Toast';

interface Invoice {
  id: string;
  invoice_number: string;
  quotation_id?: string | null;
  client_name: string;
  client_email: string;
  client_phone: string;
  items: Array<{ description: string; quantity: number; unit_price: number; amount: number }>;
  subtotal: number;
  tax_amount: number;
  total: number;
  currency: 'INR' | 'AED' | 'USD';
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  issued_date: string;
  due_date: string;
  paid_amount: number;
  payment_history: Array<{ date: string; amount: number; method: string; reference: string; notes: string }>;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const STATUSES: Invoice['status'][] = ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'];
const STATUS_VARIANT: Record<Invoice['status'], 'warning' | 'info' | 'success' | 'default' | 'danger'> = {
  draft: 'warning', sent: 'info', paid: 'success', partial: 'brand' as any, overdue: 'danger', cancelled: 'default',
};

function fmt(amountMinor: number, currency: string): string {
  const n = (amountMinor || 0) / 100;
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n); }
  catch { return `${currency} ${n.toLocaleString()}`; }
}
function daysBetween(a: string, b: string): number {
  return Math.floor((new Date(a).getTime() - new Date(b).getTime()) / 86400_000);
}

export function InvoicesView() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Invoice['status'] | ''>('');
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentRef, setPaymentRef] = useState('');
  const [creating, setCreating] = useState(false);
  const [cQuotId, setCQuotId] = useState('');

  useEffect(() => { void load(); }, []);
  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/invoices');
      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch { showToast('Failed to load invoices', 'error'); }
    finally { setLoading(false); }
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    invoices.forEach((i) => { c[i.status] = (c[i.status] || 0) + 1; });
    return c;
  }, [invoices]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return invoices.filter((inv) => {
      if (statusFilter && inv.status !== statusFilter) return false;
      if (q) {
        const hay = `${inv.invoice_number} ${inv.client_name} ${inv.client_email} ${inv.notes}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [invoices, statusFilter, search]);

  async function generateFromQuote() {
    if (!cQuotId.trim()) return showToast('Quotation ID required', 'warning');
    try {
      const res = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ quotationId: cQuotId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setCreating(false);
      setCQuotId('');
      showToast('Invoice generated', 'success');
      load();
    } catch (e: any) {
      showToast(e.message || 'Failed', 'error');
    }
  }

  async function recordPayment() {
    if (!paying) return;
    const amtMinor = Math.round(Number(paymentAmount || '0') * 100);
    if (amtMinor <= 0) return showToast('Amount required', 'warning');
    try {
      const res = await fetch(`/api/invoices/${paying.id}/payment`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amount: amtMinor, method: paymentMethod, reference: paymentRef }),
      });
      if (!res.ok) throw new Error();
      setPaying(null); setPaymentAmount(''); setPaymentRef('');
      showToast('Payment recorded', 'success');
      load();
    } catch { showToast('Failed to record payment', 'error'); }
  }

  async function markSent(inv: Invoice) {
    await fetch(`/api/invoices/${inv.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'sent' }),
    });
    showToast('Marked as sent', 'success');
    load();
  }

  async function removeInvoice(id: string) {
    if (!confirm('Delete this invoice? This cannot be undone.')) return;
    await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
    setInvoices((cur) => cur.filter((i) => i.id !== id));
    showToast('Invoice deleted', 'success');
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[color:var(--color-ink)]">Invoices</h1>
          <p className="text-sm text-[color:var(--color-muted-ink)] mt-0.5">
            {loading ? 'Loading…' : `${filtered.length} of ${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>Generate from quote</Button>
      </div>

      {/* Status chip row */}
      <div className="flex flex-wrap gap-2">
        <Chip active={statusFilter === ''} onClick={() => setStatusFilter('')}>All ({invoices.length})</Chip>
        {STATUSES.map((s) => (
          <Chip key={s} active={statusFilter === s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)}>
            {s} ({counts[s] || 0})
          </Chip>
        ))}
      </div>

      <div className="max-w-md">
        <SearchInput placeholder="Search invoices…" value={search} onChange={setSearch} />
      </div>

      {loading ? (
        <Skeleton className="h-96" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-7 w-7" />}
          title={invoices.length === 0 ? 'No invoices yet' : 'No invoices match'}
          description={invoices.length === 0 ? 'Convert an accepted quotation into an invoice to get started.' : 'Try adjusting your filters.'}
          action={invoices.length === 0 ? <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>Generate from quote</Button> : null}
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--color-tint)] text-[11px] uppercase tracking-wide text-[color:var(--color-muted-ink)] font-bold">
                <tr>
                  <th className="text-left px-4 py-2.5">Number</th>
                  <th className="text-left px-4 py-2.5">Client</th>
                  <th className="text-left px-4 py-2.5">Issued</th>
                  <th className="text-left px-4 py-2.5">Due</th>
                  <th className="text-right px-4 py-2.5">Total</th>
                  <th className="text-right px-4 py-2.5">Paid</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-hairline)]">
                {filtered.map((inv) => {
                  const overdue = inv.status !== 'paid' && inv.status !== 'cancelled' && inv.due_date < today;
                  const status = overdue && inv.status === 'sent' ? 'overdue' : inv.status;
                  return (
                    <tr key={inv.id} className="hover:bg-[color:var(--color-tint)]/50">
                      <td className="px-4 py-2.5 font-mono text-xs">{inv.invoice_number}</td>
                      <td className="px-4 py-2.5 font-semibold">{inv.client_name}</td>
                      <td className="px-4 py-2.5 text-xs text-[color:var(--color-muted-ink)]">{inv.issued_date}</td>
                      <td className="px-4 py-2.5 text-xs">
                        <span className={overdue ? 'text-[color:var(--color-danger)] font-semibold' : 'text-[color:var(--color-muted-ink)]'}>
                          {inv.due_date}
                          {overdue && ` · ${daysBetween(today, inv.due_date)}d overdue`}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-right">{fmt(inv.total, inv.currency)}</td>
                      <td className="px-4 py-2.5 tabular-nums text-right">
                        <span className={inv.paid_amount >= inv.total && inv.total > 0 ? 'text-[color:var(--color-success)] font-semibold' : ''}>
                          {fmt(inv.paid_amount, inv.currency)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5"><Badge size="sm" variant={STATUS_VARIANT[status as Invoice['status']] ?? 'default'}>{status}</Badge></td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {inv.status === 'draft' && (
                            <Button size="sm" variant="ghost" onClick={() => markSent(inv)}>Mark sent</Button>
                          )}
                          {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                            <Button size="sm" variant="outline" leftIcon={<DollarSign className="h-3.5 w-3.5" />} onClick={() => { setPaying(inv); setPaymentAmount(''); }}>Record payment</Button>
                          )}
                          {inv.quotation_id && (
                            <a href={`/edit/${inv.quotation_id}`} aria-label="View quote" className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[color:var(--color-muted-ink)] hover:bg-[color:var(--color-tint)]"><FileText className="h-3.5 w-3.5" /></a>
                          )}
                          <button type="button" onClick={() => removeInvoice(inv.id)} aria-label="Delete" className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[color:var(--color-danger)] hover:bg-rose-50 dark:hover:bg-rose-950/30"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Generate from quote */}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Generate invoice from quotation"
        description="Enter a quotation ID (visible in the editor URL /edit/<id>). This creates a draft invoice using the quote's grand total."
        size="md"
        footer={<>
          <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
          <Button onClick={generateFromQuote}>Generate</Button>
        </>}
      >
        <Input label="Quotation ID" value={cQuotId} onChange={(e) => setCQuotId(e.target.value)} placeholder="q_abcdef_123456" autoFocus />
      </Modal>

      {/* Record payment */}
      <Modal
        open={!!paying}
        onClose={() => setPaying(null)}
        title={paying ? `Record payment for ${paying.invoice_number}` : 'Record payment'}
        size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setPaying(null)}>Cancel</Button>
          <Button onClick={recordPayment}>Record</Button>
        </>}
      >
        {paying && (
          <div className="space-y-3">
            <div className="text-sm">
              <div className="text-xs text-[color:var(--color-muted-ink)]">Outstanding</div>
              <div className="font-heading text-xl font-bold">{fmt(Math.max(0, paying.total - paying.paid_amount), paying.currency)}</div>
            </div>
            <Input label={`Amount (${paying.currency})`} type="number" step="0.01" min="0" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} autoFocus />
            <Select label="Method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option>Bank Transfer</option>
              <option>UPI</option>
              <option>Card</option>
              <option>Cash</option>
              <option>Wire</option>
            </Select>
            <Input label="Reference" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="UTR / Txn ID" />
          </div>
        )}
      </Modal>
    </div>
  );
}
