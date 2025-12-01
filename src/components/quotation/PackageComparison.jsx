import React, { useState } from 'react';
import { GitCompare, TrendingUp, TrendingDown, CheckCircle, XCircle, Info, DollarSign, Calendar, Users, Star } from 'lucide-react';
import { Card, Button } from '../ui/index.jsx';

/**
 * Package Comparison Tool (like MakeMyTrip's compare feature)
 * Features:
 * - Side-by-side comparison of up to 3 packages
 * - Highlight differences
 * - Value score calculation
 * - Best deal indicator
 * - Share comparison
 */
const PackageComparison = ({ packages = [], onSelect }) => {
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [comparisonView, setComparisonView] = useState('detailed'); // 'detailed' or 'highlights'

  const COMPARISON_CRITERIA = [
    { key: 'price', label: 'Total Price', icon: DollarSign, format: (val) => `₹${val.toLocaleString()}` },
    { key: 'duration', label: 'Duration', icon: Calendar, format: (val) => `${val.nights}N/${val.days}D` },
    { key: 'pax', label: 'Travelers', icon: Users, format: (val) => `${val} persons` },
    { key: 'activities', label: 'Activities', icon: Star, format: (val) => `${val} included` },
    { key: 'meals', label: 'Meals', icon: Info, format: (val) => val },
    { key: 'accommodation', label: 'Accommodation', icon: Info, format: (val) => val },
    { key: 'transfers', label: 'Transfers', icon: Info, format: (val) => val ? '✅ Included' : '❌ Not Included' },
    { key: 'flights', label: 'Flights', icon: Info, format: (val) => val ? '✅ Included' : '❌ Not Included' },
    { key: 'visa', label: 'Visa', icon: Info, format: (val) => val ? '✅ Included' : '❌ Not Included' },
  ];

  const addToComparison = (pkg) => {
    if (selectedPackages.length >= 3) {
      return; // Max 3 packages
    }
    if (selectedPackages.find(p => p.id === pkg.id)) {
      return; // Already added
    }
    setSelectedPackages([...selectedPackages, pkg]);
  };

  const removeFromComparison = (pkgId) => {
    setSelectedPackages(selectedPackages.filter(p => p.id !== pkgId));
  };

  const calculateValueScore = (pkg) => {
    // Simple value score calculation (0-100)
    let score = 50; // Base score

    // Price per day value
    const pricePerDay = pkg.price / pkg.duration.days;
    if (pricePerDay < 8000) score += 15;
    else if (pricePerDay < 12000) score += 10;
    else if (pricePerDay > 20000) score -= 10;

    // Activities
    if (pkg.activities >= 10) score += 15;
    else if (pkg.activities >= 5) score += 10;
    else score += 5;

    // Inclusions
    if (pkg.flights) score += 10;
    if (pkg.visa) score += 5;
    if (pkg.transfers) score += 5;

    // Meals
    if (pkg.meals === 'All Meals') score += 10;
    else if (pkg.meals.includes('Breakfast')) score += 5;

    return Math.min(100, Math.max(0, score));
  };

  const getBestValue = () => {
    if (selectedPackages.length === 0) return null;
    
    return selectedPackages.reduce((best, current) => {
      const bestScore = calculateValueScore(best);
      const currentScore = calculateValueScore(current);
      return currentScore > bestScore ? current : best;
    });
  };

  const getLowestPrice = () => {
    if (selectedPackages.length === 0) return null;
    return selectedPackages.reduce((lowest, current) => 
      current.price < lowest.price ? current : lowest
    );
  };

  const getValueScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-blue-600 bg-blue-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getValueScoreLabel = (score) => {
    if (score >= 80) return 'Excellent Value';
    if (score >= 60) return 'Good Value';
    if (score >= 40) return 'Fair Value';
    return 'Below Average';
  };

  if (selectedPackages.length === 0) {
    return (
      <Card className="text-center py-12">
        <GitCompare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          Compare Packages Side-by-Side
        </h3>
        <p className="text-gray-600 mb-4">
          Select up to 3 packages to compare features, prices, and inclusions
        </p>
        <div className="text-sm text-gray-500">
          Add packages from your saved quotations to start comparing
        </div>
      </Card>
    );
  }

  const bestValue = getBestValue();
  const lowestPrice = getLowestPrice();

  return (
    <div className="space-y-6">
      {/* Comparison Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <GitCompare className="text-blue-600" />
            Package Comparison
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Comparing {selectedPackages.length} package{selectedPackages.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={comparisonView === 'detailed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setComparisonView('detailed')}
          >
            Detailed
          </Button>
          <Button
            variant={comparisonView === 'highlights' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setComparisonView('highlights')}
          >
            Highlights
          </Button>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <div className="bg-green-600 text-white p-3 rounded-lg">
              <Star size={24} />
            </div>
            <div>
              <div className="text-sm text-green-700 font-medium">Best Value</div>
              <div className="text-lg font-bold text-green-900">
                {bestValue?.title || 'N/A'}
              </div>
            </div>
          </div>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-3 rounded-lg">
              <DollarSign size={24} />
            </div>
            <div>
              <div className="text-sm text-blue-700 font-medium">Lowest Price</div>
              <div className="text-lg font-bold text-blue-900">
                {lowestPrice ? `₹${lowestPrice.price.toLocaleString()}` : 'N/A'}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Comparison Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-4 font-semibold text-gray-900 sticky left-0 bg-gray-50 z-10">
                  Feature
                </th>
                {selectedPackages.map((pkg, index) => (
                  <th key={pkg.id} className="p-4 text-center min-w-[250px]">
                    <div className="space-y-2">
                      <div className="font-bold text-gray-900">Package {index + 1}</div>
                      <div className="text-sm font-normal text-gray-600">{pkg.title}</div>
                      {pkg.id === bestValue?.id && (
                        <div className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          <Star size={12} fill="currentColor" />
                          Best Value
                        </div>
                      )}
                      {pkg.id === lowestPrice?.id && (
                        <div className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          <DollarSign size={12} />
                          Lowest Price
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromComparison(pkg.id)}
                        className="text-red-600"
                      >
                        Remove
                      </Button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Value Score Row */}
              <tr className="border-t border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
                <td className="p-4 font-semibold text-gray-900 sticky left-0 bg-gradient-to-r from-purple-50 to-pink-50">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} />
                    Value Score
                  </div>
                </td>
                {selectedPackages.map((pkg) => {
                  const score = calculateValueScore(pkg);
                  return (
                    <td key={pkg.id} className="p-4 text-center">
                      <div className={`inline-flex flex-col items-center gap-1 px-4 py-2 rounded-lg ${getValueScoreColor(score)}`}>
                        <div className="text-3xl font-bold">{score}</div>
                        <div className="text-xs font-medium">{getValueScoreLabel(score)}</div>
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Comparison Criteria Rows */}
              {COMPARISON_CRITERIA.map((criterion, idx) => {
                // Find min and max values for highlighting
                const values = selectedPackages.map(p => {
                  if (criterion.key === 'price') return p.price;
                  if (criterion.key === 'duration') return p.duration;
                  if (criterion.key === 'pax') return p.pax;
                  if (criterion.key === 'activities') return p.activities;
                  if (criterion.key === 'meals') return p.meals;
                  if (criterion.key === 'accommodation') return p.accommodation;
                  if (criterion.key === 'transfers') return p.transfers;
                  if (criterion.key === 'flights') return p.flights;
                  if (criterion.key === 'visa') return p.visa;
                  return null;
                });

                const numericValues = values.filter(v => typeof v === 'number');
                const minValue = numericValues.length > 0 ? Math.min(...numericValues) : null;
                const maxValue = numericValues.length > 0 ? Math.max(...numericValues) : null;

                return (
                  <tr key={criterion.key} className={`border-t border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="p-4 font-medium text-gray-900 sticky left-0 bg-inherit">
                      <div className="flex items-center gap-2">
                        <criterion.icon size={16} className="text-gray-600" />
                        {criterion.label}
                      </div>
                    </td>
                    {selectedPackages.map((pkg) => {
                      let value;
                      if (criterion.key === 'price') value = pkg.price;
                      else if (criterion.key === 'duration') value = pkg.duration;
                      else if (criterion.key === 'pax') value = pkg.pax;
                      else if (criterion.key === 'activities') value = pkg.activities;
                      else if (criterion.key === 'meals') value = pkg.meals;
                      else if (criterion.key === 'accommodation') value = pkg.accommodation;
                      else if (criterion.key === 'transfers') value = pkg.transfers;
                      else if (criterion.key === 'flights') value = pkg.flights;
                      else if (criterion.key === 'visa') value = pkg.visa;

                      const isMin = typeof value === 'number' && value === minValue && criterion.key === 'price';
                      const isMax = typeof value === 'number' && value === maxValue && criterion.key !== 'price' && criterion.key === 'activities';

                      return (
                        <td key={pkg.id} className="p-4 text-center">
                          <div className={`${isMin ? 'text-green-600 font-bold' : isMax ? 'text-blue-600 font-bold' : 'text-gray-900'}`}>
                            {criterion.format(value)}
                            {isMin && <TrendingDown size={14} className="inline ml-1" />}
                            {isMax && <TrendingUp size={14} className="inline ml-1" />}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Action Row */}
              <tr className="border-t-2 border-gray-300 bg-gray-50">
                <td className="p-4 font-semibold text-gray-900 sticky left-0 bg-gray-50">
                  Action
                </td>
                {selectedPackages.map((pkg) => (
                  <td key={pkg.id} className="p-4 text-center">
                    <Button
                      onClick={() => onSelect && onSelect(pkg)}
                      className="w-full"
                    >
                      Select Package
                    </Button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Price Difference Analysis */}
      <Card className="bg-blue-50 border-blue-200">
        <h4 className="font-semibold text-gray-900 mb-3">💡 Price Analysis</h4>
        <div className="space-y-2 text-sm">
          {selectedPackages.length >= 2 && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-700">Price Range:</span>
                <span className="font-medium text-gray-900">
                  ₹{Math.min(...selectedPackages.map(p => p.price)).toLocaleString()} - 
                  ₹{Math.max(...selectedPackages.map(p => p.price)).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Maximum Difference:</span>
                <span className="font-medium text-gray-900">
                  ₹{(Math.max(...selectedPackages.map(p => p.price)) - Math.min(...selectedPackages.map(p => p.price))).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Average Price:</span>
                <span className="font-medium text-gray-900">
                  ₹{Math.round(selectedPackages.reduce((sum, p) => sum + p.price, 0) / selectedPackages.length).toLocaleString()}
                </span>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default PackageComparison;
