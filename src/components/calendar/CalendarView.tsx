import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Plus, ChevronLeft, ChevronRight, Phone, Plane, Clock, CheckSquare, AlertTriangle,
  Calendar as CalendarIcon, Trash2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { SegmentedControl } from '../ui/SegmentedControl';
import { showToast } from '../ui/Toast';
import { cn } from '../../lib/cn';

interface CalEvent {
  id: string;
  date: string;
  type: 'follow_up' | 'travel' | 'quote_deadline' | 'task' | 'overdue';
  title: string;
  description?: string;
  link?: string;
  priority?: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  due_time: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

const EVENT_META: Record<CalEvent['type'], { icon: ReactNode; color: string; label: string }> = {
  follow_up: { icon: <Phone className="h-3 w-3" />, color: 'bg-orange-500', label: 'Follow-up' },
  travel: { icon: <Plane className="h-3 w-3" />, color: 'bg-sky-500', label: 'Travel' },
  quote_deadline: { icon: <Clock className="h-3 w-3" />, color: 'bg-amber-500', label: 'Deadline' },
  task: { icon: <CheckSquare className="h-3 w-3" />, color: 'bg-slate-500', label: 'Task' },
  overdue: { icon: <AlertTriangle className="h-3 w-3" />, color: 'bg-rose-500', label: 'Overdue' },
};

function monthKey(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
function daysInMonth(y: number, m: number): number { return new Date(y, m + 1, 0).getDate(); }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function CalendarView() {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'month' | 'agenda'>('month');
  const [selected, setSelected] = useState<Date | null>(today);
  const [showAddTask, setShowAddTask] = useState(false);

  // Task form state
  const [tTitle, setTTitle] = useState('');
  const [tDesc, setTDesc] = useState('');
  const [tDate, setTDate] = useState(today.toISOString().slice(0, 10));
  const [tPriority, setTPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');

  useEffect(() => { void load(); }, [cursor]);

  async function load() {
    setLoading(true);
    try {
      const [eRes, tRes] = await Promise.all([
        fetch(`/api/calendar/events?month=${monthKey(cursor)}`),
        fetch(`/api/tasks`),
      ]);
      const eData = await eRes.json();
      const tData = await tRes.json();
      setEvents(eData.events || []);
      setTasks(tData.tasks || []);
    } catch {
      showToast('Failed to load calendar', 'error');
    } finally {
      setLoading(false);
    }
  }

  const grid = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const start = new Date(y, m, 1);
    const dow = start.getDay(); // 0 = Sunday
    const total = daysInMonth(y, m);
    const cells: Array<{ date: Date; inMonth: boolean }> = [];
    // Previous month fillers
    const prevTotal = daysInMonth(y, m - 1);
    for (let i = dow - 1; i >= 0; i--) {
      cells.push({ date: new Date(y, m - 1, prevTotal - i), inMonth: false });
    }
    for (let d = 1; d <= total; d++) cells.push({ date: new Date(y, m, d), inMonth: true });
    while (cells.length % 7 !== 0 || cells.length < 42) {
      const last = cells[cells.length - 1]!.date;
      cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: last.getMonth() !== m });
      if (cells.length >= 42) break;
    }
    return cells;
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    for (const e of events) {
      const list = m.get(e.date) || [];
      list.push(e);
      m.set(e.date, list);
    }
    return m;
  }, [events]);

  const selectedKey = selected ? selected.toISOString().slice(0, 10) : '';
  const selectedEvents = selected ? (eventsByDay.get(selectedKey) || []) : [];

  const openTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress');

  async function createTask() {
    if (!tTitle.trim()) return showToast('Title required', 'warning');
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: tTitle, description: tDesc, due_date: tDate, priority: tPriority }),
      });
      if (!res.ok) throw new Error();
      setShowAddTask(false);
      setTTitle(''); setTDesc(''); setTPriority('medium');
      showToast('Task created', 'success');
      load();
    } catch {
      showToast('Failed to create task', 'error');
    }
  }

  async function toggleTask(id: string, done: boolean) {
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: done ? 'completed' : 'pending' }),
      });
      setTasks((cur) => cur.map((t) => t.id === id ? { ...t, status: done ? 'completed' : 'pending' } : t));
    } catch {
      showToast('Failed to update task', 'error');
    }
  }

  async function deleteTask(id: string) {
    if (!confirm('Delete this task?')) return;
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    setTasks((cur) => cur.filter((t) => t.id !== id));
    showToast('Task deleted', 'success');
  }

  // Keyboard shortcut "T" to add task
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 't' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (document.activeElement?.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        e.preventDefault();
        setShowAddTask(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[color:var(--color-ink)]">Calendar</h1>
          <p className="text-sm text-[color:var(--color-muted-ink)] mt-0.5">Follow-ups, travel dates, and tasks.</p>
        </div>
        <div className="flex items-center gap-2">
          <SegmentedControl
            aria-label="View"
            value={view}
            onChange={setView}
            options={[
              { value: 'month', label: 'Month', icon: <CalendarIcon className="h-4 w-4" /> },
              { value: 'agenda', label: 'Agenda' },
            ]}
          />
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowAddTask(true)}>Add task <kbd className="ml-1 rounded border border-white/30 px-1 py-0.5 text-[9px] bg-white/10">T</kbd></Button>
        </div>
      </div>

      {/* Month nav */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous month"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="font-heading text-lg font-bold flex-1 text-center">{monthLabel}</h2>
        <Button
          variant="outline"
          size="icon"
          aria-label="Next month"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { setCursor(new Date(today.getFullYear(), today.getMonth(), 1)); setSelected(today); }}>Today</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {view === 'month' ? (
          <Card className="lg:col-span-2" padding="none">
            <div className="grid grid-cols-7 text-[11px] font-bold uppercase tracking-wide text-[color:var(--color-muted-ink)] border-b border-[color:var(--color-hairline)]">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="p-2 text-center">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {grid.map((cell, idx) => {
                const key = cell.date.toISOString().slice(0, 10);
                const dayEvents = eventsByDay.get(key) || [];
                const isToday = sameDay(cell.date, today);
                const isSelected = selected && sameDay(cell.date, selected);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelected(cell.date)}
                    className={cn(
                      'relative min-h-[76px] text-left p-1.5 border-r border-b border-[color:var(--color-hairline)] transition-colors',
                      !cell.inMonth && 'bg-[color:var(--color-tint)]/40 text-[color:var(--color-muted-ink)]/60',
                      isSelected && 'ring-2 ring-[color:var(--color-brand-orange)] ring-inset bg-[color:var(--color-brand-orange)]/5',
                      !isSelected && 'hover:bg-[color:var(--color-tint)]',
                    )}
                  >
                    <span className={cn(
                      'inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] tabular-nums font-semibold',
                      isToday && 'bg-[color:var(--color-brand-orange)] text-white',
                    )}>{cell.date.getDate()}</span>
                    {dayEvents.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-0.5">
                        {dayEvents.slice(0, 3).map((e) => (
                          <span key={e.id} className={cn('h-1.5 w-1.5 rounded-full', EVENT_META[e.type].color)} title={e.title} />
                        ))}
                        {dayEvents.length > 3 && <span className="text-[9px] text-[color:var(--color-muted-ink)]">+{dayEvents.length - 3}</span>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        ) : (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Agenda · {monthLabel}</CardTitle>
            </CardHeader>
            {loading ? <Skeleton className="h-24" /> : events.length === 0 ? (
              <EmptyState icon={<CalendarIcon className="h-6 w-6" />} title="Nothing scheduled" description="Your follow-ups, deadlines, and tasks appear here." />
            ) : (
              <ul className="space-y-2">
                {events.map((e) => <EventRow key={e.id} e={e} />)}
              </ul>
            )}
          </Card>
        )}

        {/* Side panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{selected ? selected.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' }) : 'Select a day'}</CardTitle>
            </CardHeader>
            {selected && selectedEvents.length === 0 ? (
              <p className="text-sm text-[color:var(--color-muted-ink)]">No events on this day.</p>
            ) : (
              <ul className="space-y-2">
                {selectedEvents.map((e) => <EventRow key={e.id} e={e} compact />)}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader>
              <div><CardTitle>Open tasks</CardTitle></div>
              <Badge size="sm" variant="outline">{openTasks.length}</Badge>
            </CardHeader>
            {openTasks.length === 0 ? (
              <p className="text-sm text-[color:var(--color-muted-ink)]">All caught up.</p>
            ) : (
              <ul className="space-y-1.5">
                {openTasks.slice(0, 10).map((t) => (
                  <li key={t.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      aria-label={`Complete ${t.title}`}
                      checked={t.status === 'completed'}
                      onChange={(e) => toggleTask(t.id, e.target.checked)}
                      className="h-4 w-4 shrink-0"
                    />
                    <span className="flex-1 min-w-0 truncate">{t.title}</span>
                    {t.due_date && <span className="text-[11px] text-[color:var(--color-muted-ink)]">{t.due_date.slice(5)}</span>}
                    <Badge size="sm" variant={t.priority === 'urgent' ? 'danger' : t.priority === 'high' ? 'warning' : 'default'}>{t.priority}</Badge>
                    <button type="button" onClick={() => deleteTask(t.id)} aria-label="Delete task" className="text-[color:var(--color-danger)] hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded p-0.5"><Trash2 className="h-3.5 w-3.5" /></button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader><CardTitle>Legend</CardTitle></CardHeader>
            <ul className="space-y-1.5 text-xs">
              {Object.entries(EVENT_META).map(([k, meta]) => (
                <li key={k} className="flex items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full', meta.color)} />
                  <span>{meta.label}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Modal
        open={showAddTask}
        onClose={() => setShowAddTask(false)}
        title="New task"
        size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setShowAddTask(false)}>Cancel</Button>
          <Button onClick={createTask}>Create</Button>
        </>}
      >
        <div className="space-y-3">
          <Input label="Title" value={tTitle} onChange={(e) => setTTitle(e.target.value)} placeholder="Call back John Doe" autoFocus />
          <Textarea label="Description" value={tDesc} onChange={(e) => setTDesc(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Due date" type="date" value={tDate} onChange={(e) => setTDate(e.target.value)} />
            <Select label="Priority" value={tPriority} onChange={(e) => setTPriority(e.target.value as any)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function EventRow({ e, compact }: { e: CalEvent; compact?: boolean }) {
  const meta = EVENT_META[e.type];
  return (
    <li className="flex items-start gap-2 rounded-xl border border-[color:var(--color-hairline)] p-2.5">
      <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white', meta.color)} aria-hidden="true">{meta.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate">{e.title}</span>
          {!compact && <span className="text-xs text-[color:var(--color-muted-ink)] shrink-0">{e.date}</span>}
        </div>
        {e.description && <div className="text-xs text-[color:var(--color-muted-ink)] truncate">{e.description}</div>}
      </div>
      {e.link && <a href={e.link} className="text-xs font-semibold text-[color:var(--color-brand-orange)] hover:underline shrink-0">Open</a>}
    </li>
  );
}
