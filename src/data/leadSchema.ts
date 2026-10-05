export const PRIORITY_BUCKETS = [
  'Untouched Leads',
  'Call Not Connected',
  'In Progress',
  'My Hot',
  'Warm Lead',
  'Rejected',
] as const;

export type PriorityBucket = (typeof PRIORITY_BUCKETS)[number];

export const CALL_STATUSES = [
  'Not Connected',
  'Follow-up',
  'Leave the Lead',
  'Not Sure about the Plan',
  'Already Booked',
  'Send Quote',
  'Initial Stage - Quote Not Seen',
  'Getting Customisation',
  'Negociating',
  'Converted',
  'Interested - Will Book later',
  'Warm Lead',
  'Group Tour',
  'WA Only',
] as const;

export type CallStatus = (typeof CALL_STATUSES)[number];

export const LEAD_SOURCES = ['Meta', 'Google Sheet', 'Referral', 'Direct Call', 'FB/IG Message', 'Website', 'Other'] as const;

export const HOTEL_CATEGORIES = ['3 Star', '4 Star', '5 Star'] as const;
export const BUDGET_OPTIONS = ['Affordable', 'Medium', 'Premium', 'Luxury'] as const;
export const PRIORITY_LEVELS = ['P1', 'P2', 'P3'] as const;
export const TRANSFER_TYPES = ['Private Transfers', 'Sharing Transfers'] as const;
export const WA_STATUSES = ['WA Sent', 'WA Not sent'] as const;
export const YES_NO = ['Yes', 'No'] as const;

export interface Lead {
  id: string;
  external_id?: string;
  date: string;
  customer_name: string;
  phone?: string;
  email?: string;
  city?: string;
  travelling_month?: string;
  planning_with?: string;
  pax_summary?: string;
  special_arrangements?: string;
  source?: string;
  priority_bucket: PriorityBucket;
  latest_status?: string;
  created_at: string;
  updated_at: string;
}

export interface CallResponse {
  id: string;
  lead_id: string;
  call_date_time: string;
  called_by?: string;
  call_status?: CallStatus;
  call_progress?: string;
  wa_status?: string;
  destination_city?: string;
  travel_date?: string;
  total_adults: number;
  total_children: number;
  child_ages: string[];
  total_nights: number;
  hotel_category?: string;
  visa?: string;
  flights?: string;
  transfers_type?: string;
  requirements?: string;
  remarks?: string;
  budget?: string;
  next_follow_up?: string;
  wa_link?: string;
  quote_link?: string;
  lead_source?: string;
  priority?: string;
  created_at: string;
}

export function callStatusToBucket(status: CallStatus): PriorityBucket {
  switch (status) {
    case 'Not Connected':
      return 'Call Not Connected';
    case 'Leave the Lead':
    case 'Already Booked':
      return 'Rejected';
    case 'Negociating':
    case 'Converted':
      return 'My Hot';
    case 'Interested - Will Book later':
    case 'Warm Lead':
      return 'Warm Lead';
    default:
      return 'In Progress';
  }
}
