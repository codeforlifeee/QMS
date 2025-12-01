import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Percent, DollarSign, Users, Calendar, Gift, AlertCircle } from 'lucide-react';
import { Card, Input, Select, Button } from '../ui/index.jsx';

/**
 * Smart Pricing Engine with Dynamic Markups (like MakeMyTrip)
 * Features:
 * - Seasonal pricing adjustments
 * - Group size discounts
 * - Early bird / last minute pricing
 * - Competitor price comparison
 * - Dynamic markup suggestions
 * - Profit margin calculator
 */
const SmartPricingEngine = ({ quotation, onChange, tourData }) => {
  const [pricingStrategy, setPricingStrategy] = useState({
    baseMarkup: 15, // 15% default
    seasonalAdjustment: 0,
    groupDiscount: 0,
    earlyBirdDiscount: 0,
    lastMinuteSurcharge: 0,
    competitorPricing: [],
    customMarkup: {},
  });

  const [priceAnalysis, setPriceAnalysis] = useState({
    baseCost: 0,
    markup: 0,
    discounts: 0,
    finalPrice: 0,
    profitMargin: 0,
    competitiveRating: 'Fair',
  });

  const SEASON_TYPES = [
    { value: 'peak', label: '🔥 Peak Season', adjustment: 25, color: 'text-red-600' },
    { value: 'high', label: '📈 High Season', adjustment: 15, color: 'text-orange-600' },
    { value: 'mid', label: '➡️ Mid Season', adjustment: 0, color: 'text-blue-600' },
    { value: 'low', label: '📉 Low Season', adjustment: -10, color: 'text-green-600' },
    { value: 'off', label: '❄️ Off Season', adjustment: -20, color: 'text-gray-600' },
  ];

  const GROUP_SIZE_TIERS = [
    { min: 1, max: 2, discount: 0, label: 'Solo/Couple' },
    { min: 3, max: 5, discount: 5, label: 'Small Group' },
    { min: 6, max: 10, discount: 10, label: 'Medium Group' },
    { min: 11, max: 20, discount: 15, label: 'Large Group' },
    { min: 21, max: 999, discount: 20, label: 'Corporate/Bulk' },
  ];

  const BOOKING_WINDOW = [
    { value: 'early_bird', label: '🐦 Early Bird (90+ days)', discount: 10 },
    { value: 'advance', label: '⏰ Advance (30-89 days)', discount: 5 },
    { value: 'regular', label: '✅ Regular (15-29 days)', discount: 0 },
    { value: 'late', label: '⚡ Late (7-14 days)', surcharge: 5 },
    { value: 'last_minute', label: '🔥 Last Minute (<7 days)', surcharge: 15 },
  ];

  const SPECIAL_OFFERS = [
    { id: 'honeymoon', label: '💑 Honeymoon Special', discount: 8, minNights: 4 },
    { id: 'family', label: '👨‍👩‍👧‍👦 Family Package', discount: 10, minPax: 4 },
    { id: 'senior', label: '👴 Senior Citizen', discount: 5, minAge: 60 },
    { id: 'repeat', label: '🔄 Repeat Customer', discount: 7 },
    { id: 'referral', label: '🤝 Referral Discount', discount: 5 },
    { id: 'festival', label: '🎉 Festival Offer', discount: 12, limited: true },
  ];

  const COMPETITIVE_BENCHMARKS = {
    Dubai: {
      '3N4D': { low: 35000, avg: 42000, high: 55000 },
      '4N5D': { low: 45000, avg: 55000, high: 70000 },
      '5N6D': { low: 55000, avg: 68000, high: 85000 },
    },
    Singapore: {
      '3N4D': { low: 32000, avg: 38000, high: 48000 },
      '4N5D': { low: 42000, avg: 50000, high: 65000 },
    },
    Thailand: {
      '4N5D': { low: 28000, avg: 35000, high: 45000 },
      '5N6D': { low: 35000, avg: 43000, high: 55000 },
    },
    'Bali': {
      '4N5D': { low: 32000, avg: 40000, high: 52000 },
      '5N6D': { low: 40000, avg: 50000, high: 65000 },
    },
  };

  useEffect(() => {
    calculateSmartPricing();
  }, [quotation, pricingStrategy]);

  const calculateSmartPricing = () => {
    // Base cost from activities
    const baseCost = quotation.selectedActivities?.reduce((sum, activity) => {
      return sum + (activity.costAED || 0) * (quotation.totalAdults + quotation.totalChildren * 0.5);
    }, 0) || 0;

    // Add flights and visa
    const flightsCost = quotation.flights?.included
      ? (quotation.flights.adultCost * quotation.totalAdults) + (quotation.flights.childCost * quotation.totalChildren)
      : 0;

    const visaCost = quotation.visa?.included
      ? (quotation.visa.adultCost * quotation.totalAdults) + (quotation.visa.childCost * quotation.totalChildren)
      : 0;

    const totalBaseCost = baseCost + flightsCost + visaCost;

    // Calculate dynamic markup
    const baseMarkupAmount = totalBaseCost * (pricingStrategy.baseMarkup / 100);
    const seasonalAmount = totalBaseCost * (pricingStrategy.seasonalAdjustment / 100);
    
    // Calculate group discount
    const totalPax = quotation.totalAdults + quotation.totalChildren;
    const groupTier = GROUP_SIZE_TIERS.find(tier => totalPax >= tier.min && totalPax <= tier.max);
    const groupDiscountAmount = totalBaseCost * ((groupTier?.discount || 0) / 100);

    // Apply early bird or last minute
    const timingAdjustment = totalBaseCost * ((pricingStrategy.earlyBirdDiscount || pricingStrategy.lastMinuteSurcharge) / 100);

    // Final calculations
    const totalMarkup = baseMarkupAmount + seasonalAmount;
    const totalDiscounts = groupDiscountAmount + (pricingStrategy.earlyBirdDiscount > 0 ? timingAdjustment : 0);
    const finalPrice = totalBaseCost + totalMarkup - totalDiscounts + (pricingStrategy.lastMinuteSurcharge > 0 ? timingAdjustment : 0);
    const profitMargin = ((totalMarkup - totalDiscounts) / finalPrice) * 100;

    // Competitive analysis
    const competitiveRating = analyzeCompetitivePosition(finalPrice, quotation);

    setPriceAnalysis({
      baseCost: totalBaseCost,
      markup: totalMarkup,
      discounts: totalDiscounts,
      finalPrice: finalPrice,
      profitMargin: profitMargin,
      competitiveRating: competitiveRating,
    });

    // Update quotation with calculated price
    if (onChange) {
      onChange({
        ...quotation,
        costs: {
          ...quotation.costs,
          subtotal: finalPrice,
          finalTotal: quotation.includeGST ? finalPrice * 1.05 : finalPrice,
          perPersonCost: finalPrice / totalPax,
        },
      });
    }
  };

  const analyzeCompetitivePosition = (price, quotation) => {
    const destination = quotation.selectedActivities?.[0]?.location || 'Dubai';
    const nights = quotation.tripDuration?.nights || 4;
    const packageKey = `${nights}N${nights + 1}D`;
    
    const benchmark = COMPETITIVE_BENCHMARKS[destination]?.[packageKey];
    if (!benchmark) return 'Unknown';

    if (price < benchmark.low * 0.9) return 'Too Low';
    if (price <= benchmark.low) return 'Budget';
    if (price <= benchmark.avg) return 'Competitive';
    if (price <= benchmark.high) return 'Premium';
    return 'Luxury';
  };

  const handleSeasonChange = (seasonType) => {
    const season = SEASON_TYPES.find(s => s.value === seasonType);
    setPricingStrategy({
      ...pricingStrategy,
      seasonalAdjustment: season?.adjustment || 0,
    });
  };

  const handleBookingWindowChange = (window) => {
    const windowConfig = BOOKING_WINDOW.find(w => w.value === window);
    setPricingStrategy({
      ...pricingStrategy,
      earlyBirdDiscount: windowConfig?.discount || 0,
      lastMinuteSurcharge: windowConfig?.surcharge || 0,
    });
  };

  const applySpecialOffer = (offerId) => {
    const offer = SPECIAL_OFFERS.find(o => o.id === offerId);
    if (!offer) return;

    // Validate offer eligibility
    let eligible = true;
    if (offer.minNights && quotation.tripDuration?.nights < offer.minNights) eligible = false;
    if (offer.minPax && (quotation.totalAdults + quotation.totalChildren) < offer.minPax) eligible = false;

    if (eligible) {
      const discountAmount = priceAnalysis.baseCost * (offer.discount / 100);
      setPriceAnalysis({
        ...priceAnalysis,
        discounts: priceAnalysis.discounts + discountAmount,
        finalPrice: priceAnalysis.finalPrice - discountAmount,
      });
    }
  };

  const getRatingColor = (rating) => {
    const colors = {
      'Too Low': 'text-red-600 bg-red-50',
      'Budget': 'text-green-600 bg-green-50',
      'Competitive': 'text-blue-600 bg-blue-50',
      'Fair': 'text-blue-600 bg-blue-50',
      'Premium': 'text-purple-600 bg-purple-50',
      'Luxury': 'text-yellow-600 bg-yellow-50',
    };
    return colors[rating] || 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="text-green-600" />
          Smart Pricing Engine
        </h3>

        {/* Pricing Overview */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Base Cost</div>
            <div className="text-2xl font-bold text-blue-600">
              ₹{Math.round(priceAnalysis.baseCost).toLocaleString()}
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Markup</div>
            <div className="text-2xl font-bold text-green-600">
              +₹{Math.round(priceAnalysis.markup).toLocaleString()}
            </div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Discounts</div>
            <div className="text-2xl font-bold text-orange-600">
              -₹{Math.round(priceAnalysis.discounts).toLocaleString()}
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Final Price</div>
            <div className="text-2xl font-bold text-purple-600">
              ₹{Math.round(priceAnalysis.finalPrice).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Profit Margin & Competitive Rating */}
        <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b">
          <div className="flex items-center gap-3">
            <Percent className="text-blue-600" size={24} />
            <div>
              <div className="text-sm text-gray-600">Profit Margin</div>
              <div className="text-xl font-bold text-gray-900">
                {priceAnalysis.profitMargin.toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <TrendingUp className="text-green-600" size={24} />
            <div>
              <div className="text-sm text-gray-600">Market Position</div>
              <div className={`text-xl font-bold px-3 py-1 rounded-lg inline-block ${getRatingColor(priceAnalysis.competitiveRating)}`}>
                {priceAnalysis.competitiveRating}
              </div>
            </div>
          </div>
        </div>

        {/* Markup Settings */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Base Markup Percentage
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="50"
                value={pricingStrategy.baseMarkup}
                onChange={(e) => setPricingStrategy({
                  ...pricingStrategy,
                  baseMarkup: parseInt(e.target.value)
                })}
                className="flex-1"
              />
              <Input
                type="number"
                value={pricingStrategy.baseMarkup}
                onChange={(e) => setPricingStrategy({
                  ...pricingStrategy,
                  baseMarkup: parseInt(e.target.value) || 0
                })}
                className="w-20"
              />
              <span className="text-sm font-medium text-gray-700">%</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Minimal (0%)</span>
              <span>Standard (15%)</span>
              <span>Premium (30%)</span>
              <span>Luxury (50%)</span>
            </div>
          </div>

          {/* Seasonal Pricing */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar size={16} className="inline mr-1" />
              Seasonal Pricing
            </label>
            <div className="grid grid-cols-5 gap-2">
              {SEASON_TYPES.map((season) => (
                <button
                  key={season.value}
                  onClick={() => handleSeasonChange(season.value)}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    pricingStrategy.seasonalAdjustment === season.adjustment
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={season.color}>{season.label}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {season.adjustment > 0 ? '+' : ''}{season.adjustment}%
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Booking Window */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Booking Window Pricing
            </label>
            <Select
              options={BOOKING_WINDOW.map(w => ({
                value: w.value,
                label: `${w.label} ${w.discount ? `(-${w.discount}%)` : w.surcharge ? `(+${w.surcharge}%)` : ''}`
              }))}
              value={BOOKING_WINDOW.find(w => 
                w.discount === pricingStrategy.earlyBirdDiscount || 
                w.surcharge === pricingStrategy.lastMinuteSurcharge
              )?.value || 'regular'}
              onChange={(e) => handleBookingWindowChange(e.target.value)}
            />
          </div>

          {/* Group Size Discount (Auto-calculated) */}
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="text-green-600" />
                <span className="font-medium text-gray-900">
                  Group Size Discount
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">
                  {GROUP_SIZE_TIERS.find(tier => 
                    (quotation.totalAdults + quotation.totalChildren) >= tier.min && 
                    (quotation.totalAdults + quotation.totalChildren) <= tier.max
                  )?.label || 'N/A'}
                </div>
                <div className="text-lg font-bold text-green-600">
                  {GROUP_SIZE_TIERS.find(tier => 
                    (quotation.totalAdults + quotation.totalChildren) >= tier.min && 
                    (quotation.totalAdults + quotation.totalChildren) <= tier.max
                  )?.discount || 0}% OFF
                </div>
              </div>
            </div>
          </div>

          {/* Special Offers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Gift size={16} className="inline mr-1" />
              Special Offers & Promotions
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SPECIAL_OFFERS.map((offer) => (
                <button
                  key={offer.id}
                  onClick={() => applySpecialOffer(offer.id)}
                  className="p-3 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-left"
                >
                  <div className="font-medium text-gray-900">{offer.label}</div>
                  <div className="text-sm text-green-600">
                    Save {offer.discount}%
                  </div>
                  {offer.limited && (
                    <div className="text-xs text-red-600 mt-1">⏰ Limited Time</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Competitive Benchmarking */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <TrendingUp size={16} />
              Market Comparison
            </h4>
            <div className="space-y-2 text-sm">
              {Object.entries(COMPETITIVE_BENCHMARKS).slice(0, 3).map(([dest, packages]) => {
                const pkg = packages['4N5D'] || packages['3N4D'];
                return (
                  <div key={dest} className="flex justify-between items-center">
                    <span className="text-gray-700">{dest} (4N/5D)</span>
                    <span className="text-gray-900 font-medium">
                      ₹{pkg.low.toLocaleString()} - ₹{pkg.high.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pricing Alerts */}
          {priceAnalysis.competitiveRating === 'Too Low' && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-red-900">Price Too Low</div>
                <div className="text-sm text-red-700">
                  Your pricing is significantly below market rates. Consider increasing markup to maintain profitability.
                </div>
              </div>
            </div>
          )}

          {priceAnalysis.profitMargin < 5 && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-yellow-900">Low Profit Margin</div>
                <div className="text-sm text-yellow-700">
                  Profit margin is below 5%. Review discounts and markups to ensure sustainability.
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default SmartPricingEngine;
