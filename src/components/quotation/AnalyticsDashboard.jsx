import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Users, Package, Calendar, PieChart, Download } from 'lucide-react';
import { Card, Button, Select } from '../ui/index.jsx';

/**
 * Analytics & Insights Dashboard
 * Features:
 * - Quotation conversion rates
 * - Revenue tracking
 * - Popular destinations
 * - Performance trends
 * - Customer insights
 * - Export reports
 */
const AnalyticsDashboard = () => {
  const [timeRange, setTimeRange] = useState('30days');
  const [analytics, setAnalytics] = useState(null);

  const TIME_RANGES = [
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' },
    { value: 'year', label: 'This Year' },
    { value: 'all', label: 'All Time' },
  ];

  useEffect(() => {
    calculateAnalytics();
  }, [timeRange]);

  const calculateAnalytics = () => {
    try {
      // Load data from localStorage
      const quotationHistory = JSON.parse(localStorage.getItem('quotation_history') || '[]');
      const customers = JSON.parse(localStorage.getItem('crm_customers') || '[]');

      // Filter by time range
      const filterDate = getFilterDate(timeRange);
      const filteredQuotations = quotationHistory.filter(q => 
        new Date(q.timestamp) >= filterDate
      );
      const filteredCustomers = customers.filter(c =>
        new Date(c.createdAt) >= filterDate
      );

      // Calculate metrics
      const totalQuotations = filteredQuotations.length;
      const totalRevenue = filteredQuotations.reduce((sum, q) => sum + (q.price || 0), 0);
      const avgQuotationValue = totalQuotations > 0 ? totalRevenue / totalQuotations : 0;

      // Conversion rate (customers with 'converted' status)
      const convertedCustomers = filteredCustomers.filter(c => c.status === 'converted').length;
      const conversionRate = filteredCustomers.length > 0 
        ? (convertedCustomers / filteredCustomers.length) * 100 
        : 0;

      // Destination popularity
      const destinationCounts = {};
      filteredQuotations.forEach(q => {
        const dest = q.destination || 'Unknown';
        destinationCounts[dest] = (destinationCounts[dest] || 0) + 1;
      });

      const topDestinations = Object.entries(destinationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([destination, count]) => ({ destination, count }));

      // Duration analysis
      const durationCounts = {};
      filteredQuotations.forEach(q => {
        const duration = `${q.duration?.nights || 0}N/${q.duration?.days || 0}D`;
        durationCounts[duration] = (durationCounts[duration] || 0) + 1;
      });

      // Customer status distribution
      const statusCounts = {};
      filteredCustomers.forEach(c => {
        statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
      });

      // Lead source performance
      const sourceCounts = {};
      filteredCustomers.forEach(c => {
        const source = c.source || 'Unknown';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });

      // Monthly trend
      const monthlyData = {};
      filteredQuotations.forEach(q => {
        const month = new Date(q.timestamp).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        });
        if (!monthlyData[month]) {
          monthlyData[month] = { count: 0, revenue: 0 };
        }
        monthlyData[month].count += 1;
        monthlyData[month].revenue += q.price || 0;
      });

      setAnalytics({
        totalQuotations,
        totalRevenue,
        avgQuotationValue,
        conversionRate,
        totalCustomers: filteredCustomers.length,
        convertedCustomers,
        topDestinations,
        durationCounts,
        statusCounts,
        sourceCounts,
        monthlyData,
      });
    } catch (err) {
      console.error('Analytics calculation error:', err);
    }
  };

  const getFilterDate = (range) => {
    const now = new Date();
    switch (range) {
      case '7days':
        return new Date(now.setDate(now.getDate() - 7));
      case '30days':
        return new Date(now.setDate(now.getDate() - 30));
      case '90days':
        return new Date(now.setDate(now.getDate() - 90));
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(0); // All time
    }
  };

  const exportReport = () => {
    const reportData = {
      timeRange,
      generatedAt: new Date().toISOString(),
      analytics,
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics_report_${timeRange}_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!analytics) {
    return (
      <Card className="text-center py-12">
        <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-pulse" />
        <p className="text-gray-600">Loading analytics...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="text-blue-600" />
            Analytics & Insights
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Performance overview and business metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            options={TIME_RANGES}
          />
          <Button variant="outline" onClick={exportReport}>
            <Download size={14} className="mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <Package className="text-blue-600" size={24} />
            <div className="text-xs text-blue-700 font-medium">Total Quotations</div>
          </div>
          <div className="text-3xl font-bold text-blue-900">
            {analytics.totalQuotations}
          </div>
          <div className="text-xs text-blue-700 mt-1">
            Generated in selected period
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="text-green-600" size={24} />
            <div className="text-xs text-green-700 font-medium">Total Revenue</div>
          </div>
          <div className="text-3xl font-bold text-green-900">
            ₹{Math.round(analytics.totalRevenue / 1000)}K
          </div>
          <div className="text-xs text-green-700 mt-1">
            Potential revenue value
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="text-purple-600" size={24} />
            <div className="text-xs text-purple-700 font-medium">Conversion Rate</div>
          </div>
          <div className="text-3xl font-bold text-purple-900">
            {analytics.conversionRate.toFixed(1)}%
          </div>
          <div className="text-xs text-purple-700 mt-1">
            {analytics.convertedCustomers} converted customers
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <Users className="text-orange-600" size={24} />
            <div className="text-xs text-orange-700 font-medium">Avg. Value</div>
          </div>
          <div className="text-3xl font-bold text-orange-900">
            ₹{Math.round(analytics.avgQuotationValue / 1000)}K
          </div>
          <div className="text-xs text-orange-700 mt-1">
            Per quotation average
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top Destinations */}
        <Card>
          <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <PieChart size={18} className="text-blue-600" />
            Top Destinations
          </h4>
          <div className="space-y-3">
            {analytics.topDestinations.length > 0 ? (
              analytics.topDestinations.map((dest, index) => {
                const percentage = (dest.count / analytics.totalQuotations) * 100;
                return (
                  <div key={dest.destination}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                        <span className="font-medium text-gray-900">{dest.destination}</span>
                      </div>
                      <span className="text-gray-600">{dest.count} quotes</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">No data available</div>
            )}
          </div>
        </Card>

        {/* Customer Status Distribution */}
        <Card>
          <h4 className="font-bold text-gray-900 mb-4">Customer Pipeline</h4>
          <div className="space-y-3">
            {Object.entries(analytics.statusCounts).length > 0 ? (
              Object.entries(analytics.statusCounts).map(([status, count]) => {
                const percentage = (count / analytics.totalCustomers) * 100;
                const statusConfig = {
                  lead: { color: 'bg-yellow-500', label: 'Leads' },
                  contacted: { color: 'bg-blue-500', label: 'Contacted' },
                  negotiating: { color: 'bg-purple-500', label: 'Negotiating' },
                  converted: { color: 'bg-green-500', label: 'Converted' },
                  lost: { color: 'bg-red-500', label: 'Lost' },
                }[status] || { color: 'bg-gray-500', label: status };

                return (
                  <div key={status}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-gray-900">{statusConfig.label}</span>
                      <span className="text-gray-600">
                        {count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`${statusConfig.color} h-2 rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">No customer data</div>
            )}
          </div>
        </Card>
      </div>

      {/* Lead Sources */}
      <Card>
        <h4 className="font-bold text-gray-900 mb-4">Lead Source Performance</h4>
        <div className="grid grid-cols-5 gap-4">
          {Object.entries(analytics.sourceCounts).length > 0 ? (
            Object.entries(analytics.sourceCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([source, count]) => (
                <div key={source} className="text-center">
                  <div className="bg-blue-100 rounded-lg p-4 mb-2">
                    <div className="text-3xl font-bold text-blue-600">{count}</div>
                  </div>
                  <div className="text-sm font-medium text-gray-900">{source}</div>
                  <div className="text-xs text-gray-500">
                    {((count / analytics.totalCustomers) * 100).toFixed(0)}%
                  </div>
                </div>
              ))
          ) : (
            <div className="col-span-5 text-center py-8 text-gray-500">
              No lead source data
            </div>
          )}
        </div>
      </Card>

      {/* Monthly Trend */}
      <Card>
        <h4 className="font-bold text-gray-900 mb-4">Monthly Performance</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-semibold text-gray-900">Month</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-900">Quotations</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-900">Revenue</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-900">Avg. Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(analytics.monthlyData).length > 0 ? (
                Object.entries(analytics.monthlyData)
                  .sort((a, b) => new Date(b[0]) - new Date(a[0]))
                  .map(([month, data]) => (
                    <tr key={month} className="border-b border-gray-100">
                      <td className="py-2 px-3 text-gray-900">{month}</td>
                      <td className="py-2 px-3 text-right text-gray-900">{data.count}</td>
                      <td className="py-2 px-3 text-right text-gray-900">
                        ₹{Math.round(data.revenue).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-900">
                        ₹{Math.round(data.revenue / data.count).toLocaleString()}
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-gray-500">
                    No monthly data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Insights & Recommendations */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <h4 className="font-bold text-gray-900 mb-3">💡 Key Insights</h4>
        <div className="space-y-2 text-sm">
          {analytics.conversionRate < 20 && (
            <div className="bg-yellow-100 text-yellow-900 p-3 rounded-lg">
              ⚠️ Low conversion rate. Focus on follow-ups and customer engagement.
            </div>
          )}
          {analytics.avgQuotationValue > 60000 && (
            <div className="bg-green-100 text-green-900 p-3 rounded-lg">
              ✅ Strong average quotation value. Focus on premium offerings.
            </div>
          )}
          {analytics.topDestinations.length > 0 && (
            <div className="bg-blue-100 text-blue-900 p-3 rounded-lg">
              📊 Top destination: {analytics.topDestinations[0].destination}. Consider creating more packages for this destination.
            </div>
          )}
          {analytics.totalQuotations > 50 && (
            <div className="bg-purple-100 text-purple-900 p-3 rounded-lg">
              🎉 Great job! You've generated {analytics.totalQuotations} quotations. Keep up the momentum!
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;
