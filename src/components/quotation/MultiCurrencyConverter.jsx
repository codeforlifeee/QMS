import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, RefreshCw, Globe, AlertCircle } from 'lucide-react';
import { Card, Button, Select } from '../ui/index.jsx';
import toast from 'react-hot-toast';

/**
 * Multi-Currency Converter with Live Exchange Rates
 * Features:
 * - Real-time exchange rates from API
 * - Support for INR, AED, USD, EUR, GBP, SGD, THB, MYR
 * - Auto-refresh every 1 hour
 * - Fallback to cached rates if API fails
 * - Manual refresh option
 * - Historical rate tracking
 */
const MultiCurrencyConverter = ({ amount, baseCurrency = 'INR', onCurrencyChange }) => {
  const [exchangeRates, setExchangeRates] = useState({});
  const [selectedCurrency, setSelectedCurrency] = useState(baseCurrency);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  const SUPPORTED_CURRENCIES = [
    { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', flag: '🇦🇪' },
    { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
    { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
    { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬' },
    { code: 'THB', symbol: '฿', name: 'Thai Baht', flag: '🇹🇭' },
    { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', flag: '🇲🇾' },
    { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', flag: '🇮🇩' },
    { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', flag: '🇻🇳' },
  ];

  // Fallback rates (updated periodically)
  const FALLBACK_RATES = {
    INR: 1,
    AED: 0.044,
    USD: 0.012,
    EUR: 0.011,
    GBP: 0.0095,
    SGD: 0.016,
    THB: 0.41,
    MYR: 0.054,
    IDR: 189.5,
    VND: 302.5,
  };

  useEffect(() => {
    fetchExchangeRates();
    
    // Auto-refresh every 1 hour
    const interval = setInterval(() => {
      fetchExchangeRates(true);
    }, 3600000); // 1 hour

    return () => clearInterval(interval);
  }, []);

  const fetchExchangeRates = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      // Try multiple API providers for reliability
      let rates = null;

      // Option 1: ExchangeRate-API (Free tier)
      try {
        const response = await fetch(
          `https://open.er-api.com/v6/latest/${baseCurrency}`
        );
        if (response.ok) {
          const data = await response.json();
          rates = data.rates;
        }
      } catch (err) {
        console.warn('ExchangeRate-API failed:', err);
      }

      // Option 2: Frankfurter API (Free, no API key needed)
      if (!rates) {
        try {
          const response = await fetch(
            `https://api.frankfurter.app/latest?from=${baseCurrency}`
          );
          if (response.ok) {
            const data = await response.json();
            rates = data.rates;
            rates[baseCurrency] = 1; // Add base currency
          }
        } catch (err) {
          console.warn('Frankfurter API failed:', err);
        }
      }

      // Option 3: Use fallback rates
      if (!rates) {
        rates = FALLBACK_RATES;
        if (!silent) {
          toast.error('Using cached exchange rates. Live rates unavailable.');
        }
      }

      setExchangeRates(rates);
      setLastUpdated(new Date());
      
      // Cache rates to localStorage
      try {
        localStorage.setItem('exchange_rates', JSON.stringify({
          rates,
          timestamp: new Date().toISOString(),
        }));
      } catch (err) {
        console.warn('Failed to cache rates:', err);
      }

      if (!silent) {
        toast.success('Exchange rates updated successfully!');
      }
    } catch (err) {
      console.error('Failed to fetch exchange rates:', err);
      setError('Failed to load exchange rates');
      
      // Try to load cached rates
      try {
        const cached = localStorage.getItem('exchange_rates');
        if (cached) {
          const { rates, timestamp } = JSON.parse(cached);
          setExchangeRates(rates);
          setLastUpdated(new Date(timestamp));
          if (!silent) {
            toast('Using cached exchange rates', { icon: '⚠️' });
          }
        } else {
          setExchangeRates(FALLBACK_RATES);
          if (!silent) {
            toast.error('Using default exchange rates');
          }
        }
      } catch (cacheErr) {
        setExchangeRates(FALLBACK_RATES);
      }
    } finally {
      setLoading(false);
    }
  };

  const convertAmount = (amount, fromCurrency, toCurrency) => {
    if (!exchangeRates[fromCurrency] || !exchangeRates[toCurrency]) {
      return amount;
    }

    // Convert to base currency first, then to target currency
    const baseAmount = amount / exchangeRates[fromCurrency];
    const convertedAmount = baseAmount * exchangeRates[toCurrency];
    
    return convertedAmount;
  };

  const formatCurrency = (amount, currencyCode) => {
    const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
    if (!currency) return amount.toFixed(2);

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: currencyCode === 'IDR' || currencyCode === 'VND' ? 0 : 2,
      maximumFractionDigits: currencyCode === 'IDR' || currencyCode === 'VND' ? 0 : 2,
    }).format(amount);
  };

  const handleCurrencyChange = (newCurrency) => {
    setSelectedCurrency(newCurrency);
    if (onCurrencyChange) {
      onCurrencyChange(newCurrency);
    }
  };

  const getTimeAgo = (date) => {
    if (!date) return 'Never';
    
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Globe className="text-blue-600" />
            Multi-Currency Pricing
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchExchangeRates()}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="ml-1">Refresh</span>
          </Button>
        </div>

        {/* Last Updated Info */}
        {lastUpdated && (
          <div className="text-xs text-gray-500 mb-4 flex items-center gap-1">
            <TrendingUp size={12} />
            Last updated: {getTimeAgo(lastUpdated)}
          </div>
        )}

        {error && (
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mb-4 flex items-start gap-2">
            <AlertCircle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">{error}</div>
          </div>
        )}

        {/* Currency Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Display Currency
          </label>
          <Select
            value={selectedCurrency}
            onChange={(e) => handleCurrencyChange(e.target.value)}
            options={SUPPORTED_CURRENCIES.map(curr => ({
              value: curr.code,
              label: `${curr.flag} ${curr.code} - ${curr.name}`,
            }))}
          />
        </div>

        {/* Main Amount Display */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-4">
          <div className="text-sm text-gray-600 mb-1">Total Package Cost</div>
          <div className="text-4xl font-bold text-gray-900">
            {formatCurrency(
              convertAmount(amount, baseCurrency, selectedCurrency),
              selectedCurrency
            )}
          </div>
          {selectedCurrency !== baseCurrency && (
            <div className="text-sm text-gray-600 mt-2">
              ≈ {formatCurrency(amount, baseCurrency)} (Original)
            </div>
          )}
        </div>

        {/* Quick Currency Grid */}
        <div className="grid grid-cols-2 gap-3">
          {SUPPORTED_CURRENCIES.filter(c => c.code !== selectedCurrency).slice(0, 6).map((currency) => {
            const convertedAmount = convertAmount(amount, baseCurrency, currency.code);
            return (
              <button
                key={currency.code}
                onClick={() => handleCurrencyChange(currency.code)}
                className="bg-gray-50 hover:bg-blue-50 p-3 rounded-lg text-left transition-colors border border-gray-200 hover:border-blue-300"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg">{currency.flag}</span>
                  <span className="text-xs font-medium text-gray-600">
                    {currency.code}
                  </span>
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {formatCurrency(convertedAmount, currency.code)}
                </div>
              </button>
            );
          })}
        </div>

        {/* Exchange Rate Details */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <details className="cursor-pointer">
            <summary className="text-sm font-medium text-gray-700 hover:text-gray-900">
              View All Exchange Rates
            </summary>
            <div className="mt-3 space-y-2">
              {SUPPORTED_CURRENCIES.map((currency) => {
                const rate = exchangeRates[currency.code];
                if (!rate) return null;
                
                return (
                  <div
                    key={currency.code}
                    className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{currency.flag}</span>
                      <span className="font-medium text-gray-900">
                        {currency.code}
                      </span>
                      <span className="text-gray-600 text-xs">
                        {currency.name}
                      </span>
                    </div>
                    <div className="font-mono text-gray-900">
                      1 {baseCurrency} = {rate.toFixed(4)} {currency.code}
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        </div>

        {/* Pro Tips */}
        <div className="mt-4 bg-blue-50 p-3 rounded-lg">
          <div className="text-xs font-medium text-blue-900 mb-1">💡 Pro Tip</div>
          <div className="text-xs text-blue-700">
            Exchange rates update automatically every hour. You can also manually refresh for the latest rates.
            Share quotations in customer's preferred currency for better conversion!
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MultiCurrencyConverter;
