import React, { useRef } from 'react';
import { formatCurrency, formatDate, formatDuration } from '../../utils/calculations';
import { COMPANY_INFO, PAYMENT_POLICY } from '../../constants/config';
import { Download, Share2, Copy } from 'lucide-react';
import { Button } from '../ui/index.jsx';

export const QuotationPreview = React.forwardRef(
  (
    {
      quotation,
      onDownloadPDF,
      onShareWhatsApp,
      loading = false,
    },
    ref
  ) => {
    const totalPax = quotation.totalAdults + quotation.totalChildren;

    const renderPriceRow = (label, amount, isBold = false) => (
      <div className="flex justify-between items-center py-2 border-b">
        <span className={isBold ? 'font-semibold' : 'text-gray-700'}>
          {label}
        </span>
        <span className={isBold ? 'font-bold text-lg' : 'font-semibold'}>
          {formatCurrency(amount)}
        </span>
      </div>
    );

    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col h-full">
        {/* Header with Actions */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Quotation Preview</h2>
            <p className="text-blue-100 text-sm mt-1">
              {quotation.guestName || 'New Quotation'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={onDownloadPDF}
              icon={Download}
              size="sm"
              variant="primary"
              loading={loading}
              className="bg-white text-blue-600 hover:bg-blue-50"
              disabled={!quotation.guestName || quotation.selectedActivities.length === 0}
              title={!quotation.guestName ? 'Enter guest name to enable PDF' : quotation.selectedActivities.length === 0 ? 'Add at least one activity to enable PDF' : 'Download PDF'}
            >
              PDF
            </Button>
            <Button
              onClick={onShareWhatsApp}
              icon={Share2}
              size="sm"
              variant="secondary"
              className="bg-white text-blue-600 hover:bg-blue-50"
              disabled={!quotation.guestName}
            >
              Share
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div
          ref={ref}
          className="flex-1 overflow-y-auto p-6 space-y-6"
          id="quotation-preview"
        >
          {/* Guest Header */}
          <div className="border-b-2 pb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {quotation.guestName || 'Travel Package Quotation'}
            </h1>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Guest Name</p>
                <p className="font-semibold text-gray-900">
                  {quotation.guestName || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Total Pax</p>
                <p className="font-semibold text-gray-900">
                  {quotation.totalAdults} Adults
                  {quotation.totalChildren > 0 && `, ${quotation.totalChildren} Children`}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Travel Dates</p>
                <p className="font-semibold text-gray-900">
                  {quotation.travelDates.from && quotation.travelDates.to
                    ? `${formatDate(quotation.travelDates.from)} - ${formatDate(
                        quotation.travelDates.to
                      )}`
                    : 'Not specified'}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Duration</p>
                <p className="font-semibold text-gray-900">
                  {quotation.tripDuration.days > 0
                    ? formatDuration(
                        quotation.tripDuration.days,
                        quotation.tripDuration.nights
                      )
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Activities/Tours Section */}
          {quotation.selectedActivities.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Selected Activities & Tours
              </h3>
              <div className="space-y-3">
                {quotation.selectedActivities.map((activity, idx) => (
                  <div
                    key={activity.id || idx}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-gray-900">
                          {activity.tour}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {activity.location} • {activity.category}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {activity.product} • {activity.transfer}
                        </p>
                      </div>
                      <span className="text-lg font-bold text-blue-600">
                        {formatCurrency(activity.costAED)} AED
                      </span>
                    </div>
                    {activity.markup && (
                      <p className="text-xs text-gray-600">
                        With ₹5 Markup: {formatCurrency(activity.markup)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Itinerary Section */}
          {quotation.itinerary.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Day-Wise Itinerary
              </h3>
              <div className="space-y-4">
                {quotation.itinerary.map((day, idx) => (
                  <div
                    key={idx}
                    className="border-l-4 border-orange-500 bg-orange-50 p-4 rounded"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                        {String(day.day).padStart(2, '0')}
                      </div>
                      <h4 className="font-bold text-gray-900">{day.title}</h4>
                    </div>

                    {day.description && (
                      <p className="text-gray-700 text-sm mb-3 whitespace-pre-wrap">
                        {day.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-600">Meals</p>
                        <p className="font-semibold text-gray-900">
                          {day.meals}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Accommodation</p>
                        <p className="font-semibold text-gray-900">
                          {day.accommodation || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pricing Section */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Cost Breakdown
            </h3>

            <div className="space-y-2">
              {renderPriceRow(
                'Activities & Tours',
                quotation.costs.subtotal - 
                  (quotation.flights.included 
                    ? quotation.flights.adultCost * quotation.totalAdults + 
                      quotation.flights.childCost * quotation.totalChildren 
                    : 0) -
                  (quotation.visa.included 
                    ? quotation.visa.adultCost * quotation.totalAdults + 
                      quotation.visa.childCost * quotation.totalChildren 
                    : 0)
              )}

              {quotation.flights.included &&
                renderPriceRow(
                  'Flights',
                  quotation.flights.adultCost * quotation.totalAdults +
                    quotation.flights.childCost * quotation.totalChildren
                )}

              {quotation.visa.included &&
                renderPriceRow(
                  'Visa',
                  quotation.visa.adultCost * quotation.totalAdults +
                    quotation.visa.childCost * quotation.totalChildren
                )}

              <div className="py-3 border-b border-gray-300">
                <div className="flex justify-between items-center font-semibold">
                  <span>Subtotal</span>
                  <span>{formatCurrency(quotation.costs.subtotal)}</span>
                </div>
              </div>

              {quotation.includeGST && quotation.costs.gstAmount > 0 && (
                <div className="py-2">
                  <div className="flex justify-between items-center text-sm">
                    <span>GST (5%)</span>
                    <span className="font-semibold">
                      {formatCurrency(quotation.costs.gstAmount)}
                    </span>
                  </div>
                </div>
              )}

              <div className="py-3 border-t-2 border-gray-400 bg-white p-3 rounded">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">Total Cost</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {formatCurrency(quotation.costs.finalTotal)}
                  </span>
                </div>
              </div>

              {totalPax > 0 && (
                <div className="pt-3 text-center bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="text-sm text-gray-600">Per Person Cost</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(quotation.costs.perPersonCost)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Policy */}
          <div className="border border-gray-200 p-6 rounded-lg">
            <h4 className="font-bold text-gray-900 mb-3">Payment Policy</h4>
            <ul className="space-y-2">
              {PAYMENT_POLICY.map((policy, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  {policy}
                </li>
              ))}
            </ul>
          </div>

          {/* Footer */}
          <div className="border-t-2 pt-6 text-xs text-gray-600">
            <p className="font-semibold text-gray-900 mb-2">
              {COMPANY_INFO.name}
            </p>
            <p>{COMPANY_INFO.uae_address}</p>
            <p>{COMPANY_INFO.india_address}</p>
            <p className="mt-2">
              Website: <span className="text-blue-600">{COMPANY_INFO.website}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }
);

QuotationPreview.displayName = 'QuotationPreview';

export default QuotationPreview;
