import type { APIRoute } from 'astro';
import { leadRepo } from '../../../data/leadRepo'; // Ensure correct path to your leadRepo

const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'qms_vt_9f8d7b6c5a4b3c2d1e2f3a4b5c6d7e8f';
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || '';

// 1. GET: Facebook uses this to verify your Webhook URL
export const GET: APIRoute = ({ request }) => {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ WEBHOOK_VERIFIED by Facebook');
    return new Response(challenge, { status: 200 });
  } else {
    return new Response('Forbidden', { status: 403 });
  }
};

// 2. POST: Facebook sends the lead data here when a user submits a form
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    if (body.object === 'page') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'leadgen') {
            const leadgenId = change.value.leadgen_id;
            console.log(`🔔 Received Webhook for Lead ID: ${leadgenId}`);

            if (!PAGE_ACCESS_TOKEN) {
              console.error('❌ Missing FB_PAGE_ACCESS_TOKEN in environment.');
              return new Response('Missing Token', { status: 500 });
            }
            
            // 3. Fetch full lead details from Facebook Graph API
            const fbResponse = await fetch(
              `https://graph.facebook.com/v18.0/${leadgenId}?access_token=${PAGE_ACCESS_TOKEN}`
            );
            
            const fbLead = await fbResponse.json();
            
            if (fbLead.error) {
               console.error('❌ Error fetching lead from FB:', fbLead.error);
               continue;
            }

            console.log('🧑‍💼 New Lead Data Fetched:', fbLead);
            
            // Helper to extract field values from the FB array format
            const getField = (name: string) => {
              const field = fbLead.field_data?.find((f: any) => f.name === name);
              return field ? field.values[0] : '';
            };

            // 4. Save to your Supabase Dashboard!
            await leadRepo.upsertByExternalId({
              external_id: fbLead.id,
              customer_name: getField('full_name') || 'Unknown FB Lead',
              phone: getField('phone_number'),
              email: getField('email'),
              source: 'Facebook Ads',
              priority_bucket: 'Untouched Leads'
            });

            console.log('💾 Lead saved to Supabase successfully!');
          }
        }
      }
      return new Response('EVENT_RECEIVED', { status: 200 });
    }
    
    return new Response('Not Found', { status: 404 });
  } catch (err) {
    console.error('❌ Error processing webhook:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
};
