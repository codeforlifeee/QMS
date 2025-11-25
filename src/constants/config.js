// Google Sheets Configuration
export const SHEETS_CONFIG = {
  SHEET_ID: import.meta.env.VITE_SHEET_ID || '1gEu2lwx835VciZOGC6DZNTpbWkvp9EYM', // Set in .env.local
  API_KEY: import.meta.env.VITE_GOOGLE_SHEETS_API_KEY || '', // Set in .env.local
  COST_SHEET_RANGE: 'Rayna_cost!A1:G1000', // Specify exact range instead of full columns
};

// App Settings
export const APP_CONFIG = {
  CURRENCY_SYMBOL: '₹',
  DEFAULT_CURRENCY: 'INR',
  GST_RATE: 0.05, // 5%
  MARKUP: 5, // ₹5 per item
  VISA_COST_INR: 295,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
};

// Company Details (for footer)
export const COMPANY_INFO = {
  name: 'Traverse Globe',
  uae_address: '75 Arabian Square Business Centre, Al Fahidi, Dubai 12202, UAE',
  india_address: '352, Diwan Colony, Near Virk Hospital, Karnal, Haryana, India',
  website: 'www.traverseglobe.com',
  whatsapp_numbers: ['919997085457', '919520232324'],
};

// Payment Policy
export const PAYMENT_POLICY = [
  '50% at the time of confirmation',
  'Rest 30%, 20 days before travel date',
  'Remaining 20%, 7 days before travel date',
];

// Travel Types
export const TRAVEL_TYPES = ['Leisure', 'Business', 'Family', 'Couple', 'Adventure', 'Honeymoon'];

// Meal Options
export const MEAL_OPTIONS = ['No Meal', 'Breakfast', 'Lunch', 'Dinner', 'All Meals', 'Breakfast & Dinner'];

// Transfer Options
export const TRANSFER_OPTIONS = ['Without Transfers', 'With Transfers', 'Private Transfer'];
