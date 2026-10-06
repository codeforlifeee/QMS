import { useEffect, useState } from 'react';
import { Save, DollarSign } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { showToast } from '../ui/Toast';

type Status = 'pending' | 'invoiced' | 'received' | 'paid_out';

interface Commission {
  supplier_commission_pct: number;
  supplier_commission_amount: number;
  agent_commission_pct: number;
  agent_commission_amount: number;
  status: Status;
  notes: string;
  updatedAt?: string;
}

const STATUS_VARIANT: Record<Status, 'warning' | 'info' | 'success' | 'default'> = {
  pending: 'warning', invoiced: 'info', received: 'success', paid_out: 'default',
};

function fmt(minor: number, currency: string): string {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format((minor || 0) / 100); }
  catch { return `${currency} ${(minor || 0) / 100}`; }
}

export function CommissionPanel({ quotationId, currency = 'INR' }: { quotationId: string; currency?: string }) {
  const [c, setC] = useState<Commission | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/quotations/${quotationId}/commission`);
      const data = await res.json();
      setC(data.commission);
    } catch { showToast('Failed to load commission', 'error'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [quotationId]);

  async function save() {
    if (!c) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/quotations/${quotationId}/commission`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          supplier_commission_pct: c.supplier_commission_pct,
          agent_commission_pct: c.agent_commission_pct,
          status: c.status,
          notes: c.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setC(data.commission);
      showToast('Commission saved', 'success');
    } catch (e: any) { showToast(e.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  }

  return (
    <Card>
      <CardHeader>
        <div><CardTitle>Commission</CardTitle></div>
        {c && <Badge size="sm" variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>}
      </CardHeader>
      {loading || !c ? (
        <p className="text-sm text-[color:var(--color-muted-ink)]">Loading…</p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Supplier commission %"
              type="number" step="0.1" min={0} max={100}
              value={c.supplier_commission_pct}
              onChange={(e) => setC({ ...c, supplier_commission_pct: Number(e.target.value) })}
              helperText={`= ${fmt(c.supplier_commission_amount, currency)} on this quote`}
            />
            <Input
              label="Agent commission (% of supplier)"
              type="number" step="0.1" min={0} max={100}
              value={c.agent_commission_pct}
              onChange={(e) => setC({ ...c, agent_commission_pct: Number(e.target.value) })}
              helperText={`= ${fmt(c.agent_commission_amount, currency)}`}
            />
          </div>
          <Select label="Status" value={c.status} onChange={(e) => setC({ ...c, status: e.target.value as Status })}>
            <option value="pending">Pending</option>
            <option value="invoiced">Invoiced</option>
            <option value="received">Received</option>
            <option value="paid_out">Paid out</option>
          </Select>
          <Textarea label="Notes" value={c.notes} onChange={(e) => setC({ ...c, notes: e.target.value })} rows={2} />
          <div className="flex items-center justify-between">
            <div className="text-xs text-[color:var(--color-muted-ink)] inline-flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Supplier owes {fmt(c.supplier_commission_amount, currency)}, agent share {fmt(c.agent_commission_amount, currency)}
            </div>
            <Button size="sm" leftIcon={<Save className="h-4 w-4" />} onClick={save} loading={saving}>Save</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
