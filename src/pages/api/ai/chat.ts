import type { APIRoute } from 'astro';
import { runReactAgent } from '../../../ai/chat/agent.js';
import { jsonRepo } from '../../../data/repo.js';
import type { ChatSession, ChatTurn } from '../../../ai/chat/types.js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { quotationId, message, history, provider } = body ?? {};

    if (!quotationId || typeof quotationId !== 'string') {
      return json({ error: 'quotationId is required' }, 400);
    }
    if (typeof message !== 'string' || !message.trim()) {
      return json({ error: 'message is required' }, 400);
    }

    const quotation = await jsonRepo.get(quotationId);
    if (!quotation) return json({ error: 'Quotation not found' }, 404);

    const safeHistory: ChatTurn[] = Array.isArray(history) ? history : [];
    const result = await runReactAgent(quotation, message, safeHistory, provider || 'groq');

    // Persist the full session (user turn + assistant turn) so the editor can
    // reload the thread on refresh.
    const assistantTurn: ChatTurn = {
      id: Math.random().toString(36).slice(2),
      role: 'assistant',
      content: result.response,
      timestamp: new Date().toISOString(),
      proposedChanges: result.proposedChanges,
    };
    const session: ChatSession = {
      quotationId,
      provider: provider || 'groq',
      turns: [...safeHistory, assistantTurn],
    };
    await jsonRepo.saveChat(quotationId, session);

    return json({ response: result.response, proposedChanges: result.proposedChanges });
  } catch (err: any) {
    return json({ error: err?.message || String(err) }, 500);
  }
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
