import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Plus, Trash2, Edit3, Package, Car, MapPin, Save } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { SearchInput } from '../ui/SearchInput';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { showToast } from '../ui/Toast';

type Section = 'products' | 'transport' | 'city-tours';

const sectionLabel: Record<Section, string> = {
  'products': 'Products / Activities',
  'transport': 'Transport',
  'city-tours': 'City Tours',
};

const sectionIcon: Record<Section, ReactNode> = {
  'products': <Package className="h-4 w-4" />,
  'transport': <Car className="h-4 w-4" />,
  'city-tours': <MapPin className="h-4 w-4" />,
};

export function CatalogAdmin() {
  const [section, setSection] = useState<Section>('products');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setSearch('');
    void load(section);
  }, [section]);

  async function load(s: Section) {
    setLoading(true);
    try {
      const res = await fetch(`/api/catalog/admin/${s}`);
      const data = await res.json();
      setRows(data.rows || []);
    } catch {
      showToast('Failed to load catalog', 'error');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
  }, [rows, search]);

  async function save(row: any) {
    try {
      if (row.id) {
        const res = await fetch(`/api/catalog/admin/${section}/${row.id}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(row),
        });
        if (!res.ok) throw new Error();
        showToast('Row updated', 'success');
      } else {
        const res = await fetch(`/api/catalog/admin/${section}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(row),
        });
        if (!res.ok) throw new Error();
        showToast('Row created', 'success');
      }
      setEditing(null);
      setCreating(false);
      load(section);
    } catch {
      showToast('Save failed', 'error');
    }
  }

  async function removeRow(id: string) {
    if (!confirm('Delete this entry?')) return;
    try {
      await fetch(`/api/catalog/admin/${section}/${id}`, { method: 'DELETE' });
      setRows((cur) => cur.filter((r) => r.id !== id));
      showToast('Deleted', 'success');
    } catch {
      showToast('Delete failed', 'error');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[color:var(--color-ink)]">Catalog</h1>
          <p className="text-sm text-[color:var(--color-muted-ink)] mt-0.5">
            {loading ? 'Loading…' : `${filtered.length} of ${rows.length} entries`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SegmentedControl
            aria-label="Catalog section"
            value={section}
            onChange={setSection}
            options={(Object.keys(sectionLabel) as Section[]).map((s) => ({
              value: s,
              label: sectionLabel[s],
              icon: sectionIcon[s],
            }))}
          />
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setEditing({}); setCreating(true); }}>Add</Button>
        </div>
      </div>

      <div className="max-w-md">
        <SearchInput placeholder="Search any field…" value={search} onChange={setSearch} />
      </div>

      {loading ? (
        <Skeleton className="h-96" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="h-6 w-6" />}
          title={rows.length === 0 ? 'Nothing in this section yet' : 'No matches'}
          description={rows.length === 0 ? 'Add your first entry to the catalog.' : 'Try a different search.'}
          action={rows.length === 0 ? <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setEditing({}); setCreating(true); }}>Add first entry</Button> : null}
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            {section === 'products' ? (
              <ProductTable rows={filtered} onEdit={setEditing} onDelete={removeRow} />
            ) : section === 'transport' ? (
              <TransportTable rows={filtered} onEdit={setEditing} onDelete={removeRow} />
            ) : (
              <CityToursTable rows={filtered} onEdit={setEditing} onDelete={removeRow} />
            )}
          </div>
        </Card>
      )}

      {editing && (
        <Modal
          open={!!editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          title={creating ? `New ${sectionLabel[section]} entry` : `Edit ${sectionLabel[section]} entry`}
          size="lg"
          footer={<>
            <Button variant="ghost" onClick={() => { setEditing(null); setCreating(false); }}>Cancel</Button>
            <Button leftIcon={<Save className="h-4 w-4" />} onClick={() => save(editing)}>Save</Button>
          </>}
        >
          {section === 'products' ? <ProductForm value={editing} onChange={setEditing} />
            : section === 'transport' ? <TransportForm value={editing} onChange={setEditing} />
              : <CityTourForm value={editing} onChange={setEditing} />}
        </Modal>
      )}
    </div>
  );
}

function Thead({ cols }: { cols: string[] }) {
  return (
    <thead className="bg-[color:var(--color-tint)] text-[11px] uppercase tracking-wide text-[color:var(--color-muted-ink)] font-bold">
      <tr>{cols.map((c) => <th key={c} className="text-left px-3 py-2">{c}</th>)}<th className="px-3 py-2 text-right">Actions</th></tr>
    </thead>
  );
}

function Actions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <td className="px-3 py-2">
      <div className="flex items-center justify-end gap-1">
        <button type="button" onClick={onEdit} aria-label="Edit" className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[color:var(--color-muted-ink)] hover:bg-[color:var(--color-tint)] hover:text-[color:var(--color-ink)]"><Edit3 className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={onDelete} aria-label="Delete" className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[color:var(--color-danger)] hover:bg-rose-50 dark:hover:bg-rose-950/30"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </td>
  );
}

function ProductTable({ rows, onEdit, onDelete }: { rows: any[]; onEdit: (r: any) => void; onDelete: (id: string) => void }) {
  return (
    <table className="w-full text-sm">
      <Thead cols={['Product', 'Category', 'Location', 'Supplier', 'AED', 'USD', 'Transfer']} />
      <tbody className="divide-y divide-[color:var(--color-hairline)]">
        {rows.map((r) => (
          <tr key={r.id} className="hover:bg-[color:var(--color-tint)]/50">
            <td className="px-3 py-2 font-semibold">{r.product}</td>
            <td className="px-3 py-2">{r.category || '—'}</td>
            <td className="px-3 py-2">{r.location || '—'}</td>
            <td className="px-3 py-2">{r.supplier || '—'}</td>
            <td className="px-3 py-2 tabular-nums text-right">{(r.costAed / 100).toFixed(2)}</td>
            <td className="px-3 py-2 tabular-nums text-right">{(r.costUsd / 100).toFixed(2)}</td>
            <td className="px-3 py-2"><Badge size="sm" variant="outline">{r.transferOption || '—'}</Badge></td>
            <Actions onEdit={() => onEdit(r)} onDelete={() => onDelete(r.id)} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TransportTable({ rows, onEdit, onDelete }: { rows: any[]; onEdit: (r: any) => void; onDelete: (id: string) => void }) {
  return (
    <table className="w-full text-sm">
      <Thead cols={['Route', 'Vehicle', 'Supplier', 'Rate AED', 'Parking AED']} />
      <tbody className="divide-y divide-[color:var(--color-hairline)]">
        {rows.map((r) => (
          <tr key={r.id} className="hover:bg-[color:var(--color-tint)]/50">
            <td className="px-3 py-2 font-semibold">{r.route}</td>
            <td className="px-3 py-2">{r.vehicleSize || '—'}</td>
            <td className="px-3 py-2">{r.supplier || '—'}</td>
            <td className="px-3 py-2 tabular-nums text-right">{(r.rateAed / 100).toFixed(2)}</td>
            <td className="px-3 py-2 tabular-nums text-right">{r.parkingAed ? (r.parkingAed / 100).toFixed(2) : '—'}</td>
            <Actions onEdit={() => onEdit(r)} onDelete={() => onDelete(r.id)} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CityToursTable({ rows, onEdit, onDelete }: { rows: any[]; onEdit: (r: any) => void; onDelete: (id: string) => void }) {
  return (
    <table className="w-full text-sm">
      <Thead cols={['Tour', 'Type', 'Duration', 'Rate AED']} />
      <tbody className="divide-y divide-[color:var(--color-hairline)]">
        {rows.map((r) => (
          <tr key={r.id} className="hover:bg-[color:var(--color-tint)]/50">
            <td className="px-3 py-2 font-semibold">{r.name}</td>
            <td className="px-3 py-2"><Badge size="sm" variant={r.type === 'private' ? 'brand' : 'info'}>{r.type}</Badge></td>
            <td className="px-3 py-2">{r.duration || '—'}</td>
            <td className="px-3 py-2 tabular-nums text-right">{(r.rateAed / 100).toFixed(2)}</td>
            <Actions onEdit={() => onEdit(r)} onDelete={() => onDelete(r.id)} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ProductForm({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const upd = (k: string, v: any) => onChange({ ...value, [k]: v });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Input label="Product name" value={value.product || ''} onChange={(e) => upd('product', e.target.value)} />
      <Input label="Category" value={value.category || ''} onChange={(e) => upd('category', e.target.value)} />
      <Input label="Location" value={value.location || ''} onChange={(e) => upd('location', e.target.value)} />
      <Input label="Supplier" value={value.supplier || ''} onChange={(e) => upd('supplier', e.target.value)} />
      <Input label="Tour (parent)" value={value.tour || ''} onChange={(e) => upd('tour', e.target.value)} />
      <Input label="Transfer option" value={value.transferOption || ''} onChange={(e) => upd('transferOption', e.target.value)} />
      <Input label="Cost AED (minor units)" type="number" value={value.costAed ?? 0} onChange={(e) => upd('costAed', Number(e.target.value))} />
      <Input label="Cost USD (minor units)" type="number" value={value.costUsd ?? 0} onChange={(e) => upd('costUsd', Number(e.target.value))} />
      <Input label="Child cost AED" type="number" value={value.childCostAed ?? ''} onChange={(e) => upd('childCostAed', e.target.value === '' ? undefined : Number(e.target.value))} />
      <Input label="Toddler cost AED" type="number" value={value.toddlerCostAed ?? ''} onChange={(e) => upd('toddlerCostAed', e.target.value === '' ? undefined : Number(e.target.value))} />
    </div>
  );
}

function TransportForm({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const upd = (k: string, v: any) => onChange({ ...value, [k]: v });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Input label="Route" value={value.route || ''} onChange={(e) => upd('route', e.target.value)} />
      <Input label="Vehicle size" value={value.vehicleSize || ''} onChange={(e) => upd('vehicleSize', e.target.value)} />
      <Input label="Supplier" value={value.supplier || ''} onChange={(e) => upd('supplier', e.target.value)} />
      <Input label="Rate AED (minor units)" type="number" value={value.rateAed ?? 0} onChange={(e) => upd('rateAed', Number(e.target.value))} />
      <Input label="Parking AED (minor units)" type="number" value={value.parkingAed ?? ''} onChange={(e) => upd('parkingAed', e.target.value === '' ? undefined : Number(e.target.value))} />
    </div>
  );
}

function CityTourForm({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const upd = (k: string, v: any) => onChange({ ...value, [k]: v });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Input label="Tour name" value={value.name || ''} onChange={(e) => upd('name', e.target.value)} />
      <Select label="Type" value={value.type || 'sharing'} onChange={(e) => upd('type', e.target.value)}>
        <option value="sharing">Sharing</option>
        <option value="private">Private</option>
      </Select>
      <Input label="Duration" value={value.duration || ''} onChange={(e) => upd('duration', e.target.value)} placeholder="4 hours" />
      <Input label="Rate AED (minor units)" type="number" value={value.rateAed ?? 0} onChange={(e) => upd('rateAed', Number(e.target.value))} />
    </div>
  );
}
