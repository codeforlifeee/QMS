import { APP_CONFIG } from '../constants/config';

/**
 * Calculate total cost for an activity
 * @param {number} costAED - Base cost in AED
 * @param {number} numAdults - Number of adults
 * @param {number} numChildren - Number of children
 * @param {number} adultCost - Cost multiplier for adults
 * @param {number} childCost - Cost multiplier for children
 * @returns {number} Total cost
 */
export const calculateActivityCost = (
  costAED,
  numAdults,
  numChildren,
  adultCost = 1,
  childCost = 0.5
) => {
  return costAED * ((numAdults * adultCost) + (numChildren * childCost));
};

/**
 * Calculate grand total from all selected activities
 * @param {Array} selectedActivities - Array of selected activity objects
 * @param {number} numAdults - Total adults
 * @param {number} numChildren - Total children
 * @returns {Object} Breakdown of costs
 */
export const calculateGrandTotal = (selectedActivities, numAdults, numChildren) => {
  let activitiesTotal = 0;
  
  selectedActivities.forEach((activity) => {
    const { costAED = 0 } = activity;
    const activityCost = costAED * ((numAdults * 1) + (numChildren * 0.5));
    activitiesTotal += activityCost;
  });
  
  return {
    activitiesTotal,
    totalPax: numAdults + numChildren,
    perPersonCost: (activitiesTotal / (numAdults + numChildren)) || 0,
  };
};

/**
 * Calculate all costs including GST
 * @param {number} subtotal - Subtotal before GST
 * @param {boolean} includeGST - Whether to include GST
 * @returns {Object} Cost breakdown
 */
export const calculateFinalCost = (subtotal, includeGST = false) => {
  const gstAmount = includeGST ? subtotal * APP_CONFIG.GST_RATE : 0;
  const finalTotal = subtotal + gstAmount;
  
  return {
    subtotal,
    gstAmount,
    gstRate: APP_CONFIG.GST_RATE * 100,
    finalTotal,
  };
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
  
  const symbol = symbols[currency] || APP_CONFIG.CURRENCY_SYMBOL;
  const formatted = amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return `${symbol} ${formatted}`;
};

/**
 * Format date to readable string
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} Formatted date
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
};

/**
 * Calculate trip duration
 * @param {string} startDate - Start date in YYYY-MM-DD
 * @param {string} endDate - End date in YYYY-MM-DD
 * @returns {Object} Days and nights
 */
export const calculateTripDuration = (startDate, endDate) => {
  if (!startDate || !endDate) return { days: 0, nights: 0 };
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return {
    days: diffDays + 1,
    nights: diffDays,
  };
};

/**
 * Format trip duration for display
 * @param {number} days - Number of days
 * @param {number} nights - Number of nights
 * @returns {string} Formatted string
 */
export const formatDuration = (days, nights) => {
  return `${String(nights).padStart(2, '0')} Nights / ${String(days).padStart(2, '0')} Days`;
};

/**
 * Calculate per-person cost
 * @param {number} totalCost - Total cost
 * @param {number} totalPax - Total persons
 * @returns {number} Per-person cost
 */
export const calculatePerPersonCost = (totalCost, totalPax) => {
  if (totalPax === 0) return 0;
  return totalCost / totalPax;
};

/**
 * Generate quotation summary text
 * @param {Object} quotation - Quotation object
 * @returns {string} Summary text
 */
export const generateQuotationSummary = (quotation) => {
  const {
    guestName,
    totalAdults,
    totalChildren,
    travelDates,
    tripDuration,
    finalTotal,
  } = quotation;
  
  return `
Quotation Summary
=================
Guest Name: ${guestName}
Total Pax: ${totalAdults} Adults${totalChildren > 0 ? `, ${totalChildren} Children` : ''}
Travel Dates: ${formatDate(travelDates.from)} - ${formatDate(travelDates.to)}
Duration: ${formatDuration(tripDuration.days, tripDuration.nights)}
Total Cost: ${formatCurrency(finalTotal)}
  `.trim();
};

/**
 * Round to nearest rupee
 * @param {number} value - Value to round
 * @returns {number} Rounded value
 */
export const roundToNearestRupee = (value) => {
  return Math.round(value);
};
