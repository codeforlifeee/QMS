const TEMPLATES = {
  greeting: (vars: Record<string, string>) =>
    `Hi ${vars.name || 'there'}! This is Traverse Globe. We received your travel inquiry for ${vars.destination || 'your trip'}. When would be a good time to discuss your travel plans?`,

  quote_ready: (vars: Record<string, string>) =>
    `Hi ${vars.name || 'there'}! Your travel quotation for ${vars.destination || 'your trip'} is ready. View it here: ${vars.link || ''}`,

  follow_up: (vars: Record<string, string>) =>
    `Hi ${vars.name || 'there'}! Just following up on your ${vars.destination || ''} travel inquiry. Have you had a chance to review the details? Let me know if you have any questions!`,
} as const;

export type WATemplate = keyof typeof TEMPLATES;

export function generateWALink(
  phone: string,
  template: WATemplate,
  vars: Record<string, string>,
): string {
  const cleaned = phone.replace(/[\s\-()]/g, '').replace(/^\+/, '');
  const message = TEMPLATES[template](vars);
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

export function generateCustomWALink(phone: string, message: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, '').replace(/^\+/, '');
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}
