/**
 * Formatting utilities for dates, currency, and other data
 */

/**
 * Format date to readable string
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} Formatted date like "Nov 25, 2025"
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  } catch {
    return dateString;
  }
};

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (INR, AED, USD)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'INR') => {
  const symbols = {
    INR: '₹',
    AED: 'AED',
    USD: '$',
  };

  const symbol = symbols[currency] || '₹';

  if (!amount || isNaN(amount)) {
    return `${symbol} 0.00`;
  }

  const formatted = parseFloat(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${symbol} ${formatted}`;
};

/**
 * Format trip duration for display
 * @param {number} days - Number of days
 * @param {number} nights - Number of nights
 * @returns {string} Formatted string like "04 Nights / 05 Days"
 */
export const formatDuration = (days, nights) => {
  return `${String(nights).padStart(2, '0')} Nights / ${String(days).padStart(2, '0')} Days`;
};

/**
 * Format large numbers with thousand separators
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export const formatNumber = (num) => {
  if (!num || isNaN(num)) return '0';
  return num.toLocaleString('en-IN');
};

/**
 * Format phone number
 * @param {string} phone - Phone number string
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
};

/**
 * Format text to title case
 * @param {string} text - Text to format
 * @returns {string} Title cased text
 */
export const toTitleCase = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} length - Max length
 * @returns {string} Truncated text
 */
export const truncateText = (text, length = 50) => {
  if (!text) return '';
  return text.length > length ? text.substring(0, length) + '...' : text;
};

/**
 * Get initials from name
 * @param {string} name - Full name
 * @returns {string} Initials
 */
export const getInitials = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
};

/**
 * Format time ago
 * @param {Date} date - Date object
 * @returns {string} Time ago string (e.g., "2 hours ago")
 */
export const formatTimeAgo = (date) => {
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';

  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';

  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';

  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';

  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';

  return Math.floor(seconds) + ' seconds ago';
};
