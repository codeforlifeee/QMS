import React, { useState } from 'react';
import { Input, Select, Button, Card } from '../ui/index.jsx';
import { TRAVEL_TYPES } from '../../constants/config';
import { Calendar, Users, MapPin } from 'lucide-react';

export const QuotationForm = ({
  quotation,
  tourData,
  onUpdateBasicDetails,
  onAddActivity,
  onRemoveActivity,
  totalPax,
}) => {
  const [formErrors, setFormErrors] = useState({});

  const handleBasicDetailsChange = (field, value) => {
    if (field === 'flights' || field === 'visa') {
      // These are objects, handle them specially
      onUpdateBasicDetails({ [field]: value });
    } else if (field === 'includeGST') {
      onUpdateBasicDetails({ includeGST: value });
    } else {
      onUpdateBasicDetails({ [field]: value });
    }
  };

  const handleDateRangeChange = (field, value) => {
    onUpdateBasicDetails({
      travelDates: {
        ...quotation.travelDates,
        [field]: value,
      },
    });
  };

  const handlePaxChange = (field, value) => {
    const numValue = Math.max(0, parseInt(value) || 0);
    onUpdateBasicDetails({ [field]: numValue });
  };

  return (
    <div className="space-y-6">
      {/* Guest Details Section */}
      <Card>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Guest Details</h3>
        <div className="space-y-4">
          <Input
            label="Guest Name"
            placeholder="e.g., Mr. Rajat or ABC Travel Agency"
            value={quotation.guestName}
            onChange={(e) =>
              handleBasicDetailsChange('guestName', e.target.value)
            }
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Number of Adults"
              type="number"
              min="1"
              max="20"
              value={quotation.totalAdults}
              onChange={(e) => handlePaxChange('totalAdults', e.target.value)}
              icon={Users}
            />

            <Input
              label="Number of Children"
              type="number"
              min="0"
              max="20"
              value={quotation.totalChildren}
              onChange={(e) => handlePaxChange('totalChildren', e.target.value)}
              icon={Users}
            />
          </div>

          <Select
            label="Travel Type"
            options={TRAVEL_TYPES}
            value={quotation.travelType}
            onChange={(e) =>
              handleBasicDetailsChange('travelType', e.target.value)
            }
          />
        </div>
      </Card>

      {/* Travel Dates Section */}
      <Card>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Travel Dates</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Departure Date"
              type="date"
              value={quotation.travelDates.from}
              onChange={(e) => handleDateRangeChange('from', e.target.value)}
              icon={Calendar}
            />

            <Input
              label="Return Date"
              type="date"
              value={quotation.travelDates.to}
              onChange={(e) => handleDateRangeChange('to', e.target.value)}
              icon={Calendar}
            />
          </div>

          {quotation.tripDuration.days > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Trip Duration</p>
              <p className="text-lg font-bold text-blue-600">
                {quotation.tripDuration.nights} Nights / {quotation.tripDuration.days} Days
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Cost Options Section */}
      <Card>
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Cost Options
        </h3>
        <div className="space-y-4">
          {/* Flights Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-semibold text-gray-900">Include Flights</p>
              <p className="text-sm text-gray-600">
                Per Adult: ₹{quotation.flights.adultCost} | Per Child: ₹
                {quotation.flights.childCost}
              </p>
            </div>
            <input
              type="checkbox"
              checked={quotation.flights.included}
              onChange={(e) => {
                handleBasicDetailsChange('flights', {
                  ...quotation.flights,
                  included: e.target.checked,
                });
              }}
              className="w-5 h-5 cursor-pointer"
            />
          </div>

          {/* Visa Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-semibold text-gray-900">Include Visa</p>
              <p className="text-sm text-gray-600">
                Per Adult: ₹{quotation.visa.adultCost} | Per Child: ₹
                {quotation.visa.childCost}
              </p>
            </div>
            <input
              type="checkbox"
              checked={quotation.visa.included}
              onChange={(e) => {
                handleBasicDetailsChange('visa', {
                  ...quotation.visa,
                  included: e.target.checked,
                });
              }}
              className="w-5 h-5 cursor-pointer"
            />
          </div>

          {/* GST Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-semibold text-gray-900">Include GST (5%)</p>
              <p className="text-sm text-gray-600">
                GST will be added to final total
              </p>
            </div>
            <input
              type="checkbox"
              checked={quotation.includeGST}
              onChange={(e) => {
                handleBasicDetailsChange('includeGST', e.target.checked);
              }}
              className="w-5 h-5 cursor-pointer"
            />
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Pax</p>
            <p className="text-2xl font-bold text-blue-600">{totalPax}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Duration</p>
            <p className="text-2xl font-bold text-blue-600">
              {quotation.tripDuration.days > 0
                ? `${quotation.tripDuration.nights}N/${quotation.tripDuration.days}D`
                : '-'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default QuotationForm;
