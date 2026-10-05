import type { APIRoute } from 'astro';
import { leadRepo } from '../../../data/leadRepo.js';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const followUps = await leadRepo.getFollowUpsDue();
    return new Response(
      JSON.stringify({ ok: true, count: followUps.length, followUps }),
      { headers: { 'content-type': 'application/json' } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }
};
