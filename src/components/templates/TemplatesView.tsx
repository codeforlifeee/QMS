import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2, Edit3, Rocket, Layout, Package } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Chip } from '../ui/Chip';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { SearchInput } from '../ui/SearchInput';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { showToast } from '../ui/Toast';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  destination: string;
  duration: number;
  thumbnail_url?: string | null;
  usage_count: number;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = ['All', 'Honeymoon', 'Family', 'Adventure', 'Luxury', 'Budget', 'Group', 'General'];

export function TemplatesView() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [showCreate, setShowCreate] = useState(false);
  const [using, setUsing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state for create modal
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cat, setCat] = useState('General');
  const [destination, setDestination] = useState('');
  const [duration, setDuration] = useState('5');

  useEffect(() => { void load(); }, []);
  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch {
      showToast('Failed to load templates', 'error');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return templates.filter((t) => {
      if (category !== 'All' && t.category !== category) return false;
      if (q) {
        const hay = `${t.name} ${t.description} ${t.destination} ${t.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [templates, category, search]);

  async function createTemplate() {
    if (!name.trim()) return showToast('Name is required', 'warning');
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, description, category: cat, destination, duration: Number(duration) || 0 }),
      });
      if (!res.ok) throw new Error();
      setShowCreate(false);
      setName(''); setDescription(''); setDestination(''); setDuration('5'); setCat('General');
      showToast('Template created', 'success');
      load();
    } catch {
      showToast('Failed to create template', 'error');
    }
  }

  async function useTemplate(id: string) {
    setUsing(id);
    try {
      const res = await fetch('/api/templates/use', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ templateId: id }),
      });
      const data = await res.json();
      if (data.editUrl) {
        showToast('Created from template — opening editor', 'success', 1500);
        setTimeout(() => (window.location.href = data.editUrl), 400);
      } else {
        throw new Error(data.error || 'Failed');
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to use template', 'error');
    } finally {
      setUsing(null);
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      setTemplates((cur) => cur.filter((t) => t.id !== id));
      showToast('Template deleted', 'success');
    } catch {
      showToast('Failed to delete', 'error');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[color:var(--color-ink)]">Templates</h1>
          <p className="text-sm text-[color:var(--color-muted-ink)] mt-0.5">
            {loading ? 'Loading…' : `${filtered.length} of ${templates.length} template${templates.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>New template</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(c)}>{c}</Chip>
        ))}
      </div>
      <div className="max-w-md">
        <SearchInput placeholder="Search templates…" value={search} onChange={setSearch} />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><Skeleton className="h-24 mb-3" /><Skeleton className="h-4 w-2/3 mb-2" /><Skeleton className="h-4 w-full" /></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Layout className="h-7 w-7" />}
          title={templates.length === 0 ? 'No templates yet' : 'No templates match'}
          description={templates.length === 0
            ? 'Save a quotation as a template or create one from scratch to speed up future quotes.'
            : 'Try a different search or category.'}
          action={templates.length === 0 ? <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>Create first template</Button> : null}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <Card key={t.id} variant="interactive" padding="none" className="flex flex-col overflow-hidden">
              <div className="h-24 bg-gradient-to-br from-[color:var(--color-brand-orange)]/20 via-[color:var(--color-brand-teal)]/20 to-[color:var(--color-brand-green)]/20 flex items-center justify-center relative">
                <Package className="h-10 w-10 text-[color:var(--color-ink)]/30" />
                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                  <Badge size="sm" variant="brand">{t.category}</Badge>
                  {t.destination && <Badge size="sm" variant="outline">{t.destination}</Badge>}
                </div>
                <div className="absolute bottom-2 right-2">
                  <Badge size="sm" variant="outline">{t.duration}N</Badge>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col gap-2">
                <h3 className="font-heading text-base font-semibold text-[color:var(--color-ink)] truncate">{t.name}</h3>
                {t.description && <p className="text-xs text-[color:var(--color-muted-ink)] line-clamp-3">{t.description}</p>}
                <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-[color:var(--color-hairline)]">
                  <span className="text-[11px] text-[color:var(--color-muted-ink)]">Used {t.usage_count}×</span>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" leftIcon={<Rocket className="h-3.5 w-3.5" />} loading={using === t.id} onClick={() => useTemplate(t.id)}>Use</Button>
                    <button
                      type="button"
                      onClick={() => deleteTemplate(t.id)}
                      aria-label="Delete template"
                      disabled={deleting === t.id}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[color:var(--color-danger)] hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New template"
        description="A starting structure for future quotations. Clients and dates stay empty until you use it."
        size="md"
        footer={<>
          <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button onClick={createTemplate}>Create template</Button>
        </>}
      >
        <div className="space-y-3">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dubai 5N Honeymoon" />
          <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What makes this template distinctive…" />
          <div className="grid grid-cols-3 gap-2">
            <Select label="Category" value={cat} onChange={(e) => setCat(e.target.value)}>
              {CATEGORIES.filter((c) => c !== 'All').map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Input label="Destination" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Dubai" />
            <Input label="Duration (nights)" type="number" min={0} value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
