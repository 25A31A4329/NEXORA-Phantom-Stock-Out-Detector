/**
 * NEXORA Shared Currency Formatter & Conversion Utility
 *
 * All monetary displays across NEXORA use Indian Rupees (INR, ₹)
 * formatted with locale 'en-IN' following Indian numbering format (Lakhs / Crores).
 *
 * Documented Exchange Rate Assumption:
 * 1 USD = 83 INR (Standard commercial retail conversion rate)
 */

export const USD_TO_INR_EXCHANGE_RATE = 83;

// Formatter without paise for large aggregate figures (e.g. ₹2,26,009)
export const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

// Formatter with paise for unit prices and item level precision (e.g. ₹414.17)
export const inrFormatterExact = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format any numerical amount in Indian Rupees (INR, ₹)
 * @param amount Number in INR
 * @param exact If true, formats with 2 decimal places (paise)
 */
export function formatINR(amount: number, exact: boolean = false): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return exact ? '₹0.00' : '₹0';
  }
  return exact ? inrFormatterExact.format(amount) : inrFormatter.format(amount);
}

/**
 * Compact Indian Rupee format for tight charts or badges (e.g. ₹2.3L)
 */
export function formatCompactINR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '₹0';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}
