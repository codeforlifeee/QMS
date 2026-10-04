import React, { useState } from 'react';
import { Button, Input, Select, Card } from '../ui/index.jsx';
import { MEAL_OPTIONS } from '../../constants/config';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

export const ItineraryBuilder = ({
  itinerary,
  onAddDay,
  onRemoveDay,
  onUpdateDay,
}) => {
  const [expandedDay, setExpandedDay] = useState(null);

  const handleAddDay = () => {
    onAddDay();
    setExpandedDay(itinerary.length); // Expand the newly added day
  };

  const handleDayChange = (dayIndex, field, value) => {
    const updatedDay = {
      ...itinerary[dayIndex],
      [field]: value,
    };
    onUpdateDay(dayIndex, updatedDay);
  };

  const toggleDayExpansion = (dayIndex) => {
    setExpandedDay(expandedDay === dayIndex ? null : dayIndex);
  };

  return (
    <div className="space-y-4">
      {/* Add Day Button */}
      <Button
        onClick={handleAddDay}
        icon={Plus}
        className="w-full"
        variant="success"
      >
        Add Day to Itinerary
      </Button>

      {/* Days List */}
      {itinerary.map((day, dayIndex) => (
        <Card key={dayIndex} className="p-0">
          {/* Day Header (Clickable) */}
          <button
            onClick={() => toggleDayExpansion(dayIndex)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b"
          >
            <div className="flex-1 text-left">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100">
                    <span className="text-blue-700 font-bold">
                      {String(day.day).padStart(2, '0')}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{day.title}</h3>
                  <p className="text-sm text-gray-600">
                    {day.meals} • {day.accommodation || 'No accommodation added'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveDay(dayIndex);
                }}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete day"
              >
                <Trash2 className="w-5 h-5" />
              </button>

              {expandedDay === dayIndex ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </button>

          {/* Day Details (Expandable) */}
          {expandedDay === dayIndex && (
            <div className="px-6 py-4 space-y-4 bg-gray-50">
              {/* Day Title */}
              <Input
                label="Day Title"
                placeholder="e.g., HANOI ARRIVAL"
                value={day.title}
                onChange={(e) =>
                  handleDayChange(dayIndex, 'title', e.target.value)
                }
              />

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description & Activities
                </label>
                <textarea
                  value={day.description}
                  onChange={(e) =>
                    handleDayChange(dayIndex, 'description', e.target.value)
                  }
                  placeholder="Add detailed description, activities, timings, and highlights..."
                  rows="6"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Meals */}
                <Select
                  label="Meals"
                  options={MEAL_OPTIONS}
                  value={day.meals}
                  onChange={(e) =>
                    handleDayChange(dayIndex, 'meals', e.target.value)
                  }
                />

                {/* Accommodation */}
                <Input
                  label="Accommodation"
                  placeholder="e.g., Hotel in Hanoi (4-star)"
                  value={day.accommodation}
                  onChange={(e) =>
                    handleDayChange(dayIndex, 'accommodation', e.target.value)
                  }
                />
              </div>

              {/* Image URL (Optional) */}
              <Input
                label="Image URL (Optional)"
                placeholder="https://example.com/image.jpg"
                value={day.imageUrl || ''}
                onChange={(e) =>
                  handleDayChange(dayIndex, 'imageUrl', e.target.value)
                }
              />

              {/* Tips */}
              <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded text-sm text-blue-800">
                <p className="font-semibold mb-1">📝 Tips:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Include specific activities and timings</li>
                  <li>Add historical/cultural context</li>
                  <li>Mention transfer details and distances</li>
                  <li>Specify hotel star category</li>
                </ul>
              </div>
            </div>
          )}
        </Card>
      ))}

      {/* Empty State */}
      {itinerary.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600 mb-4">No days added yet</p>
          <Button
            onClick={handleAddDay}
            icon={Plus}
            variant="primary"
          >
            Add First Day
          </Button>
        </div>
      )}

      {/* Summary */}
      {itinerary.length > 0 && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <p className="text-sm text-green-800">
            ✓ {itinerary.length} day{itinerary.length > 1 ? 's' : ''} added to itinerary
          </p>
        </div>
      )}
    </div>
  );
};

export default ItineraryBuilder;
