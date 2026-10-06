import type { APIRoute } from 'astro';
import { getRepo } from '../../../data/repo.js';
import { taskRepo } from '../../../data/taskRepo.js';

export const prerender = false;

export type CalendarEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'follow_up' | 'travel' | 'quote_deadline' | 'task' | 'overdue';
  title: string;
  description?: string;
  link?: string;
  priority?: string;
};

export const GET: APIRoute = async ({ url }) => {
  const month = url.searchParams.get('month'); // "YYYY-MM"
  let since: Date;
  let until: Date;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-').map((n) => parseInt(n, 10));
    since = new Date(y!, m! - 1, 1);
    until = new Date(y!, m!, 0, 23, 59, 59);
  } else {
    const now = new Date();
    since = new Date(now.getFullYear(), now.getMonth(), 1);
    until = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }

  const events: CalendarEvent[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Tasks
  const tasks = await taskRepo.list();
  for (const t of tasks) {
    if (!t.due_date) continue;
    const d = new Date(t.due_date);
    if (d < since || d > until) continue;
    const overdue = d < today && t.status !== 'completed' && t.status !== 'cancelled';
    events.push({
      id: `task-${t.id}`,
      date: t.due_date,
      type: overdue ? 'overdue' : 'task',
      title: t.title,
      description: t.description,
      priority: t.priority,
    });
  }

  // Quotations
  const repo = await getRepo();
  const quotations = await repo.list();
  for (const q of quotations) {
    if (q.validUntil) {
      const d = new Date(q.validUntil);
      if (d >= since && d <= until) {
        events.push({
          id: `deadline-${q.id}`,
          date: q.validUntil.slice(0, 10),
          type: 'quote_deadline',
          title: `Quote expires: ${q.title || q.reference}`,
          description: q.client?.name,
          link: `/edit/${q.id}`,
        });
      }
    }
    if (q.status === 'accepted' && q.travelStart) {
      const d = new Date(q.travelStart);
      if (d >= since && d <= until) {
        events.push({
          id: `travel-${q.id}`,
          date: q.travelStart.slice(0, 10),
          type: 'travel',
          title: `Trip departure: ${q.title || q.reference}`,
          description: `${q.client?.name} · ${q.destination || ''}`,
          link: `/edit/${q.id}`,
        });
      }
    }
  }

  // Follow-ups (requires supabase; swallow errors)
  try {
    const { leadRepo } = await import('../../../data/leadRepo.js');
    const followUps = await leadRepo.getFollowUpsDue();
    for (const f of followUps as any[]) {
      if (!f.next_follow_up) continue;
      const d = new Date(f.next_follow_up);
      if (d < since || d > until) continue;
      const overdue = d < today;
      events.push({
        id: `follow-${f.id}`,
        date: f.next_follow_up.slice(0, 10),
        type: overdue ? 'overdue' : 'follow_up',
        title: `Follow-up: ${f.customer_name || 'Lead'}`,
        description: f.city || f.destination,
        link: `/leads/${f.lead_id || f.id}`,
      });
    }
  } catch { /* no supabase */ }

  events.sort((a, b) => a.date.localeCompare(b.date));
  return json({ ok: true, events });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
