import type { APIRoute } from 'astro';

export const prerender = false;

type Template = {
  id: 'quote_ready' | 'follow_up' | 'invoice' | 'payment_confirmation' | 'booking_confirmation';
  label: string;
  description: string;
  subject: (ctx: Record<string, string>) => string;
  body: (ctx: Record<string, string>) => string;
};

const TEMPLATES: Template[] = [
  {
    id: 'quote_ready',
    label: 'Quote ready',
    description: 'Send the quotation link + PDF',
    subject: (c) => `Your travel quote: ${c.title || 'Traverse Globe'}`,
    body: (c) => `Hi ${c.clientName || 'there'},\n\nYour tailored itinerary is ready. You can view it here:\n${c.shareLink || ''}\n\nLet me know if you'd like any changes.\n\n— Traverse Globe`,
  },
  {
    id: 'follow_up',
    label: 'Follow-up',
    description: 'Friendly check-in on a quote',
    subject: (c) => `Checking in — ${c.title || 'your trip'}`,
    body: (c) => `Hi ${c.clientName || 'there'},\n\nJust checking in on the trip we discussed. Any questions I can help with?\n\n— Traverse Globe`,
  },
  {
    id: 'invoice',
    label: 'Invoice',
    description: 'Invoice issued',
    subject: (c) => `Invoice ${c.invoiceNumber || ''} from Traverse Globe`,
    body: (c) => `Hi ${c.clientName || 'there'},\n\nPlease find your invoice ${c.invoiceNumber || ''} for ${c.total || ''}.\n\n— Traverse Globe`,
  },
  {
    id: 'payment_confirmation',
    label: 'Payment confirmation',
    description: 'Thank you + receipt',
    subject: () => 'Payment received — thank you!',
    body: (c) => `Hi ${c.clientName || 'there'},\n\nThanks for your payment of ${c.amount || ''}. We'll see you soon.\n\n— Traverse Globe`,
  },
  {
    id: 'booking_confirmation',
    label: 'Booking confirmation',
    description: 'Trip is confirmed',
    subject: (c) => `Booking confirmed: ${c.title || 'your trip'}`,
    body: (c) => `Hi ${c.clientName || 'there'},\n\nYour trip is confirmed! Travel dates: ${c.travelStart || ''} — ${c.travelEnd || ''}.\n\n— Traverse Globe`,
  },
];

export const GET: APIRoute = async () => {
  const payload = TEMPLATES.map((t) => ({
    id: t.id,
    label: t.label,
    description: t.description,
    subject: t.subject({}),
    body: t.body({}),
  }));
  return new Response(JSON.stringify({ ok: true, templates: payload }), { headers: { 'content-type': 'application/json' } });
};
