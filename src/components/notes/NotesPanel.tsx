import { useEffect, useState } from 'react';
import { Pin, PinOff, Trash2, Send } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { Input } from '../ui/Input';
import { showToast } from '../ui/Toast';

interface Note {
  id: string;
  content: string;
  entity_type: 'lead' | 'quotation';
  entity_id: string;
  author_name: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export function NotesPanel({
  entityType,
  entityId,
  defaultAuthor = '',
}: {
  entityType: 'lead' | 'quotation';
  entityId: string;
  defaultAuthor?: string;
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState(defaultAuthor);
  const [posting, setPosting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/notes?entity_type=${entityType}&entity_id=${entityId}`);
      const data = await res.json();
      setNotes(data.notes || []);
    } catch { showToast('Failed to load notes', 'error'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [entityType, entityId]);

  async function post() {
    if (!content.trim()) return;
    setPosting(true);
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content, entity_type: entityType, entity_id: entityId, author_name: author }),
      });
      if (!res.ok) throw new Error();
      setContent('');
      load();
    } catch { showToast('Failed to post note', 'error'); }
    finally { setPosting(false); }
  }

  async function togglePin(n: Note) {
    await fetch(`/api/notes/${n.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pinned: !n.pinned }),
    });
    load();
  }

  async function remove(n: Note) {
    if (!confirm('Delete this note?')) return;
    await fetch(`/api/notes/${n.id}`, { method: 'DELETE' });
    setNotes((cur) => cur.filter((x) => x.id !== n.id));
    showToast('Note deleted', 'success');
  }

  return (
    <Card>
      <CardHeader>
        <div><CardTitle>Notes</CardTitle></div>
        <Badge size="sm" variant="outline">{notes.length}</Badge>
      </CardHeader>
      {/* Composer */}
      <div className="space-y-2 mb-4">
        <Textarea placeholder="Add an internal note…" value={content} onChange={(e) => setContent(e.target.value)} rows={2} />
        <div className="flex items-center gap-2">
          <Input placeholder="Your name" value={author} onChange={(e) => setAuthor(e.target.value)} className="max-w-[180px]" />
          <Button
            size="sm"
            leftIcon={<Send className="h-4 w-4" />}
            onClick={post}
            loading={posting}
            disabled={!content.trim()}
          >
            Post note
          </Button>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-20" />
      ) : notes.length === 0 ? (
        <EmptyState icon={<Send className="h-5 w-5" />} title="No notes yet" description="Jot down context, questions, or follow-ups here." />
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className={`rounded-xl border p-3 ${n.pinned ? 'border-[color:var(--color-brand-orange)]/40 bg-[color:var(--color-brand-orange)]/5' : 'border-[color:var(--color-hairline)]'}`}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-[color:var(--color-muted-ink)]">
                    {n.author_name && <span className="font-semibold">{n.author_name}</span>}
                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                    {n.pinned && <Badge size="sm" variant="brand">Pinned</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => togglePin(n)} aria-label={n.pinned ? 'Unpin' : 'Pin'} className="rounded-lg p-1 text-[color:var(--color-muted-ink)] hover:bg-[color:var(--color-tint)]">
                    {n.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </button>
                  <button type="button" onClick={() => remove(n)} aria-label="Delete" className="rounded-lg p-1 text-[color:var(--color-danger)] hover:bg-rose-50 dark:hover:bg-rose-950/30">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
