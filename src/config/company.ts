/** Ported from the previous app's constants/config.js — the only part worth keeping. */

export const COMPANY = {
  name: 'Traverse Globe',
  tagline: 'Travel the world, the right way',
  website: 'www.traverseglobe.com',
  email: 'holidays@traverseglobe.com',
  uaeAddress: '75 Arabian Square Business Centre, Al Fahidi, Dubai 12202, UAE',
  indiaAddress: '352, Diwan Colony, Near Virk Hospital, Karnal, Haryana 132001, India',
  whatsapp: ['919997085457', '919520232324'],
} as const;

export const DEFAULT_PAYMENT_POLICY = [
  '50% at the time of confirmation',
  'Rest 30%, 20 days before travel date',
  'Remaining 20%, 7 days before travel date',
] as const;

export const DEFAULT_TERMS = [
  'Rates are subject to availability at the time of confirmation.',
  'Hotel check-in is typically 1500 hrs and check-out 1200 hrs.',
  'Any increase in government taxes or fuel surcharge will be charged extra.',
  'Cancellation charges apply as per the policy shared at the time of booking.',
] as const;

export const DEFAULT_INCLUSIONS = [
  'Hotel accommodation as per itinerary',
  'All transfers as mentioned in the itinerary',
  'All sightseeing and activities as per itinerary',
  'All applicable hotel taxes (tourism dirham, municipality fee)',
  '24/7 on-tour assistance',
] as const;

export const DEFAULT_EXCLUSIONS = [
  'International or domestic airfare (unless mentioned)',
  'Travel insurance',
  'Personal expenses (laundry, telephone, tips, minibar)',
  'Any services not mentioned in the inclusions',
  'Visa fees (unless mentioned in inclusions)',
  'Early check-in or late check-out charges',
  'Any optional tours or excursions not listed',
] as const;

/** Brand palette. Kept in one place so the document and the app cannot drift apart. */
export const BRAND = {
  orange: '#FF5B04',
  ink: '#16232A',
  teal: '#075056',
  mutedInk: '#5A6B73',
  hairline: '#E4EEF0',
  canvas: '#F7FAFB',
} as const;
