import type { Lead, CallResponse } from '../data/leadSchema.js';

export function buildPromptFromCall(lead: Lead, call: CallResponse): string {
  const parts: string[] = [];

  const dest = call.destination_city || 'a destination';
  const nights = call.total_nights || 5;
  const adults = call.total_adults || 2;

  let paxStr = `${adults} adult${adults !== 1 ? 's' : ''}`;
  if (call.total_children > 0) {
    paxStr += ` and ${call.total_children} child${call.total_children !== 1 ? 'ren' : ''}`;
    if (call.child_ages?.length) {
      paxStr += ` (ages ${call.child_ages.join(', ')})`;
    }
  }

  parts.push(`${dest} trip for ${paxStr} for ${nights} nights.`);

  if (call.hotel_category) {
    parts.push(`${call.hotel_category} hotel accommodation.`);
  }

  if (call.transfers_type) {
    parts.push(`${call.transfers_type}.`);
  }

  if (call.visa === 'Yes') {
    parts.push('Include visa.');
  }

  if (call.flights === 'Yes') {
    const from = lead.city ? ` from ${lead.city}` : '';
    parts.push(`Include flights${from}.`);
  }

  if (call.budget) {
    parts.push(`Budget: ${call.budget}.`);
  }

  if (call.requirements) {
    parts.push(`Requirements: ${call.requirements}`);
  }

  if (call.remarks) {
    parts.push(`Notes: ${call.remarks}`);
  }

  if (lead.customer_name) {
    let clientLine = `Client: ${lead.customer_name}`;
    if (lead.phone) clientLine += `, ${lead.phone}`;
    if (lead.email) clientLine += `, ${lead.email}`;
    parts.push(clientLine);
  }

  return parts.join('\n');
}
