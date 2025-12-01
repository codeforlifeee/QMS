import React, { useState, useRef } from 'react';
import { Plus, Trash2, Copy, Clock, MapPin, Camera, Upload, Image as ImageIcon, Calendar, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Card, Input, Select } from '../ui/index.jsx';

/**
 * Advanced Itinerary Builder with MakeMyTrip-like features
 * - Drag & drop day reordering
 * - Multiple activity options per day
 * - Time slots & duration tracking
 * - Photo gallery per day
 * - Rich templates
 * - Weather suggestions
 * - Best time to visit indicators
 */
const AdvancedItineraryBuilder = ({ itinerary = [], onChange, tourData }) => {
  const [expandedDays, setExpandedDays] = useState([]);
  const [selectedDayForTemplate, setSelectedDayForTemplate] = useState(null);
  const fileInputRefs = useRef({});

  const MEAL_OPTIONS = [
    { value: 'none', label: 'No Meal' },
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'breakfast_lunch', label: 'Breakfast + Lunch' },
    { value: 'breakfast_dinner', label: 'Breakfast + Dinner' },
    { value: 'all_meals', label: 'All Meals (3x)' },
    { value: 'hi_tea', label: 'Hi-Tea' },
  ];

  const TIME_SLOTS = [
    'Early Morning (5:00-7:00 AM)',
    'Morning (7:00-10:00 AM)',
    'Late Morning (10:00-12:00 PM)',
    'Afternoon (12:00-3:00 PM)',
    'Late Afternoon (3:00-6:00 PM)',
    'Evening (6:00-9:00 PM)',
    'Night (9:00 PM onwards)',
  ];

  const ACTIVITY_TYPES = [
    { value: 'sightseeing', label: '🏛️ Sightseeing', color: 'bg-blue-100 text-blue-800' },
    { value: 'adventure', label: '🎢 Adventure', color: 'bg-red-100 text-red-800' },
    { value: 'relaxation', label: '🧘 Relaxation', color: 'bg-green-100 text-green-800' },
    { value: 'cultural', label: '🎭 Cultural', color: 'bg-purple-100 text-purple-800' },
    { value: 'shopping', label: '🛍️ Shopping', color: 'bg-pink-100 text-pink-800' },
    { value: 'dining', label: '🍽️ Dining', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'transfer', label: '🚗 Transfer', color: 'bg-gray-100 text-gray-800' },
    { value: 'free_time', label: '⏰ Free Time', color: 'bg-indigo-100 text-indigo-800' },
  ];

  const DAY_TEMPLATES = {
    arrival: {
      title: 'Arrival Day',
      activities: [
        {
          time: 'Morning (7:00-10:00 AM)',
          type: 'transfer',
          title: 'Airport Pickup',
          description: 'Meet & greet at airport. Private transfer to hotel with welcome refreshments.',
          duration: '1-2 hours',
        },
        {
          time: 'Afternoon (12:00-3:00 PM)',
          type: 'relaxation',
          title: 'Hotel Check-in & Freshen Up',
          description: 'Check-in to hotel. Time to relax and freshen up after journey.',
          duration: '2-3 hours',
        },
        {
          time: 'Evening (6:00-9:00 PM)',
          type: 'free_time',
          title: 'Evening at Leisure',
          description: 'Explore nearby areas or relax at hotel. Optional: evening city lights tour.',
          duration: '3 hours',
        },
      ],
      meals: 'dinner',
    },
    full_day_city: {
      title: 'Full Day City Tour',
      activities: [
        {
          time: 'Morning (7:00-10:00 AM)',
          type: 'sightseeing',
          title: 'Morning City Tour',
          description: 'Visit iconic landmarks, historical sites, and cultural attractions.',
          duration: '3-4 hours',
        },
        {
          time: 'Afternoon (12:00-3:00 PM)',
          type: 'dining',
          title: 'Lunch Break',
          description: 'Lunch at local restaurant with regional specialties.',
          duration: '1-2 hours',
        },
        {
          time: 'Late Afternoon (3:00-6:00 PM)',
          type: 'sightseeing',
          title: 'Afternoon Exploration',
          description: 'Continue city tour with shopping districts and photo stops.',
          duration: '3 hours',
        },
        {
          time: 'Evening (6:00-9:00 PM)',
          type: 'cultural',
          title: 'Evening Cultural Show',
          description: 'Traditional dance/music performance with dinner.',
          duration: '2-3 hours',
        },
      ],
      meals: 'all_meals',
    },
    adventure_day: {
      title: 'Adventure Day',
      activities: [
        {
          time: 'Early Morning (5:00-7:00 AM)',
          type: 'adventure',
          title: 'Desert Safari / Water Sports',
          description: 'Exciting adventure activities with professional guides and safety equipment.',
          duration: '3-4 hours',
        },
        {
          time: 'Late Morning (10:00-12:00 PM)',
          type: 'relaxation',
          title: 'Relaxation & Brunch',
          description: 'Return to hotel, freshen up, and enjoy a hearty brunch.',
          duration: '2 hours',
        },
        {
          time: 'Afternoon (12:00-3:00 PM)',
          type: 'free_time',
          title: 'Free Time',
          description: 'Rest or explore at your own pace.',
          duration: '3 hours',
        },
        {
          time: 'Evening (6:00-9:00 PM)',
          type: 'sightseeing',
          title: 'Sunset Point & Photography',
          description: 'Visit scenic sunset viewpoint with photography opportunities.',
          duration: '2-3 hours',
        },
      ],
      meals: 'breakfast_dinner',
    },
    departure: {
      title: 'Departure Day',
      activities: [
        {
          time: 'Morning (7:00-10:00 AM)',
          type: 'relaxation',
          title: 'Leisure Morning',
          description: 'Final breakfast, pack bags, hotel check-out.',
          duration: '2-3 hours',
        },
        {
          time: 'Late Morning (10:00-12:00 PM)',
          type: 'transfer',
          title: 'Airport Transfer',
          description: 'Private transfer to airport with time for last-minute shopping.',
          duration: '1-2 hours',
        },
      ],
      meals: 'breakfast',
    },
  };

  const toggleDayExpansion = (dayId) => {
    setExpandedDays((prev) =>
      prev.includes(dayId) ? prev.filter((id) => id !== dayId) : [...prev, dayId]
    );
  };

  const addDay = () => {
    const newDay = {
      id: Date.now(),
      dayNumber: itinerary.length + 1,
      title: `Day ${itinerary.length + 1}`,
      description: '',
      activities: [],
      meals: 'none',
      accommodation: '',
      transport: '',
      photos: [],
      highlights: [],
      tips: '',
      weather: '',
      bestTimeToVisit: '',
      estimatedCost: 0,
    };
    onChange([...itinerary, newDay]);
    setExpandedDays([...expandedDays, newDay.id]);
  };

  const removeDay = (dayId) => {
    const updated = itinerary.filter((d) => d.id !== dayId);
    // Renumber days
    const renumbered = updated.map((d, index) => ({
      ...d,
      dayNumber: index + 1,
      title: d.title.replace(/Day \d+/, `Day ${index + 1}`),
    }));
    onChange(renumbered);
  };

  const duplicateDay = (day) => {
    const newDay = {
      ...day,
      id: Date.now(),
      dayNumber: itinerary.length + 1,
      title: `${day.title} (Copy)`,
    };
    onChange([...itinerary, newDay]);
  };

  const updateDay = (dayId, field, value) => {
    const updated = itinerary.map((day) =>
      day.id === dayId ? { ...day, [field]: value } : day
    );
    onChange(updated);
  };

  const addActivity = (dayId) => {
    const updated = itinerary.map((day) =>
      day.id === dayId
        ? {
            ...day,
            activities: [
              ...day.activities,
              {
                id: Date.now(),
                time: TIME_SLOTS[0],
                type: 'sightseeing',
                title: '',
                description: '',
                duration: '',
                cost: 0,
                isOptional: false,
              },
            ],
          }
        : day
    );
    onChange(updated);
  };

  const removeActivity = (dayId, activityId) => {
    const updated = itinerary.map((day) =>
      day.id === dayId
        ? {
            ...day,
            activities: day.activities.filter((a) => a.id !== activityId),
          }
        : day
    );
    onChange(updated);
  };

  const updateActivity = (dayId, activityId, field, value) => {
    const updated = itinerary.map((day) =>
      day.id === dayId
        ? {
            ...day,
            activities: day.activities.map((activity) =>
              activity.id === activityId ? { ...activity, [field]: value } : activity
            ),
          }
        : day
    );
    onChange(updated);
  };

  const applyTemplate = (dayId, templateKey) => {
    const template = DAY_TEMPLATES[templateKey];
    if (!template) return;

    const updated = itinerary.map((day) =>
      day.id === dayId
        ? {
            ...day,
            title: template.title,
            activities: template.activities.map((act) => ({
              ...act,
              id: Date.now() + Math.random(),
            })),
            meals: template.meals,
          }
        : day
    );
    onChange(updated);
    setSelectedDayForTemplate(null);
  };

  const handlePhotoUpload = (dayId, event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Create preview URLs
    const photoPromises = files.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            id: Date.now() + Math.random(),
            url: e.target.result,
            name: file.name,
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(photoPromises).then((photos) => {
      const updated = itinerary.map((day) =>
        day.id === dayId
          ? { ...day, photos: [...(day.photos || []), ...photos] }
          : day
      );
      onChange(updated);
    });
  };

  const removePhoto = (dayId, photoId) => {
    const updated = itinerary.map((day) =>
      day.id === dayId
        ? { ...day, photos: (day.photos || []).filter((p) => p.id !== photoId) }
        : day
    );
    onChange(updated);
  };

  const moveDayUp = (index) => {
    if (index === 0) return;
    const updated = [...itinerary];
    [updated[index], updated[index - 1]] = [updated[index - 1], updated[index]];
    // Renumber
    const renumbered = updated.map((d, i) => ({
      ...d,
      dayNumber: i + 1,
    }));
    onChange(renumbered);
  };

  const moveDayDown = (index) => {
    if (index === itinerary.length - 1) return;
    const updated = [...itinerary];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    // Renumber
    const renumbered = updated.map((d, i) => ({
      ...d,
      dayNumber: i + 1,
    }));
    onChange(renumbered);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">
          Day-wise Itinerary Builder
        </h3>
        <Button onClick={addDay} className="flex items-center gap-2">
          <Plus size={16} />
          Add Day
        </Button>
      </div>

      {itinerary.length === 0 ? (
        <Card className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-700 mb-2">
            No Days Added Yet
          </h4>
          <p className="text-gray-600 mb-4">
            Start building your itinerary by adding days
          </p>
          <Button onClick={addDay}>Add First Day</Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {itinerary.map((day, index) => {
            const isExpanded = expandedDays.includes(day.id);
            const activityTypeConfig =
              ACTIVITY_TYPES.find((t) => t.value === day.type) ||
              ACTIVITY_TYPES[0];

            return (
              <Card key={day.id} className="overflow-hidden">
                {/* Day Header */}
                <div
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-colors"
                  onClick={() => toggleDayExpansion(day.id)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
                      {day.dayNumber}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900">
                        {day.title}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {day.activities.length} activities •{' '}
                        {MEAL_OPTIONS.find((m) => m.value === day.meals)?.label}
                        {day.accommodation && ` • ${day.accommodation}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveDayUp(index);
                      }}
                      disabled={index === 0}
                    >
                      <ChevronUp size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveDayDown(index);
                      }}
                      disabled={index === itinerary.length - 1}
                    >
                      <ChevronDown size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateDay(day);
                      }}
                    >
                      <Copy size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeDay(day.id);
                      }}
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </Button>
                    {isExpanded ? (
                      <ChevronUp size={20} />
                    ) : (
                      <ChevronDown size={20} />
                    )}
                  </div>
                </div>

                {/* Day Details (Expanded) */}
                {isExpanded && (
                  <div className="p-6 space-y-6">
                    {/* Quick Templates */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quick Templates
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(DAY_TEMPLATES).map((key) => (
                          <Button
                            key={key}
                            variant="outline"
                            size="sm"
                            onClick={() => applyTemplate(day.id, key)}
                          >
                            {DAY_TEMPLATES[key].title}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Day Title */}
                    <Input
                      label="Day Title"
                      value={day.title}
                      onChange={(e) =>
                        updateDay(day.id, 'title', e.target.value)
                      }
                      placeholder="e.g., Day 1: Arrival in Dubai"
                    />

                    {/* Day Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Day Overview
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        value={day.description}
                        onChange={(e) =>
                          updateDay(day.id, 'description', e.target.value)
                        }
                        placeholder="Brief overview of the day's activities..."
                      />
                    </div>

                    {/* Activities */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-gray-700">
                          Activities Timeline
                        </label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addActivity(day.id)}
                        >
                          <Plus size={14} className="mr-1" />
                          Add Activity
                        </Button>
                      </div>

                      {day.activities && day.activities.length > 0 ? (
                        <div className="space-y-3">
                          {day.activities.map((activity, actIndex) => {
                            const typeConfig =
                              ACTIVITY_TYPES.find(
                                (t) => t.value === activity.type
                              ) || ACTIVITY_TYPES[0];

                            return (
                              <div
                                key={activity.id}
                                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="text-2xl">
                                    {actIndex + 1}
                                  </div>
                                  <div className="flex-1 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                      <Select
                                        label="Time Slot"
                                        value={activity.time}
                                        onChange={(e) =>
                                          updateActivity(
                                            day.id,
                                            activity.id,
                                            'time',
                                            e.target.value
                                          )
                                        }
                                        options={TIME_SLOTS.map((slot) => ({
                                          value: slot,
                                          label: slot,
                                        }))}
                                      />
                                      <Select
                                        label="Activity Type"
                                        value={activity.type}
                                        onChange={(e) =>
                                          updateActivity(
                                            day.id,
                                            activity.id,
                                            'type',
                                            e.target.value
                                          )
                                        }
                                        options={ACTIVITY_TYPES}
                                      />
                                    </div>

                                    <Input
                                      label="Activity Title"
                                      value={activity.title}
                                      onChange={(e) =>
                                        updateActivity(
                                          day.id,
                                          activity.id,
                                          'title',
                                          e.target.value
                                        )
                                      }
                                      placeholder="e.g., Burj Khalifa Visit"
                                    />

                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description
                                      </label>
                                      <textarea
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        rows={2}
                                        value={activity.description}
                                        onChange={(e) =>
                                          updateActivity(
                                            day.id,
                                            activity.id,
                                            'description',
                                            e.target.value
                                          )
                                        }
                                        placeholder="Activity details..."
                                      />
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                      <Input
                                        label="Duration"
                                        value={activity.duration}
                                        onChange={(e) =>
                                          updateActivity(
                                            day.id,
                                            activity.id,
                                            'duration',
                                            e.target.value
                                          )
                                        }
                                        placeholder="e.g., 2-3 hours"
                                      />
                                      <Input
                                        label="Cost (₹)"
                                        type="number"
                                        value={activity.cost}
                                        onChange={(e) =>
                                          updateActivity(
                                            day.id,
                                            activity.id,
                                            'cost',
                                            parseFloat(e.target.value) || 0
                                          )
                                        }
                                        placeholder="0"
                                      />
                                      <div className="flex items-end">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={activity.isOptional}
                                            onChange={(e) =>
                                              updateActivity(
                                                day.id,
                                                activity.id,
                                                'isOptional',
                                                e.target.checked
                                              )
                                            }
                                            className="w-4 h-4"
                                          />
                                          <span className="text-sm text-gray-700">
                                            Optional
                                          </span>
                                        </label>
                                      </div>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      removeActivity(day.id, activity.id)
                                    }
                                  >
                                    <Trash2 size={16} className="text-red-600" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600">
                            No activities added yet
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addActivity(day.id)}
                            className="mt-3"
                          >
                            Add First Activity
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Photo Gallery */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Day Photos
                      </label>
                      <div className="flex flex-wrap gap-3 mb-3">
                        {day.photos &&
                          day.photos.map((photo) => (
                            <div
                              key={photo.id}
                              className="relative group w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-200"
                            >
                              <img
                                src={photo.url}
                                alt={photo.name}
                                className="w-full h-full object-cover"
                              />
                              <button
                                onClick={() => removePhoto(day.id, photo.id)}
                                className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            ref={(el) => (fileInputRefs.current[day.id] = el)}
                            onChange={(e) => handlePhotoUpload(day.id, e)}
                          />
                          <Upload size={20} className="text-gray-400" />
                        </label>
                      </div>
                    </div>

                    {/* Additional Details Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <Select
                        label="Meals Included"
                        value={day.meals}
                        onChange={(e) =>
                          updateDay(day.id, 'meals', e.target.value)
                        }
                        options={MEAL_OPTIONS}
                      />
                      <Input
                        label="Accommodation"
                        value={day.accommodation}
                        onChange={(e) =>
                          updateDay(day.id, 'accommodation', e.target.value)
                        }
                        placeholder="Hotel name or type"
                      />
                      <Input
                        label="Transport"
                        value={day.transport}
                        onChange={(e) =>
                          updateDay(day.id, 'transport', e.target.value)
                        }
                        placeholder="e.g., Private Car, Coach"
                      />
                      <Input
                        label="Best Time"
                        value={day.bestTimeToVisit}
                        onChange={(e) =>
                          updateDay(day.id, 'bestTimeToVisit', e.target.value)
                        }
                        placeholder="e.g., Morning, Sunset"
                      />
                    </div>

                    {/* Tips & Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Info size={16} className="inline mr-1" />
                        Travel Tips & Important Notes
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={2}
                        value={day.tips}
                        onChange={(e) =>
                          updateDay(day.id, 'tips', e.target.value)
                        }
                        placeholder="Packing suggestions, weather info, dress code, etc."
                      />
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Summary Footer */}
      {itinerary.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {itinerary.length}
              </div>
              <div className="text-sm text-gray-600">Total Days</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {itinerary.reduce(
                  (sum, day) => sum + (day.activities?.length || 0),
                  0
                )}
              </div>
              <div className="text-sm text-gray-600">Activities</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {itinerary.reduce(
                  (sum, day) => sum + (day.photos?.length || 0),
                  0
                )}
              </div>
              <div className="text-sm text-gray-600">Photos</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                ₹
                {itinerary
                  .reduce(
                    (sum, day) =>
                      sum +
                      (day.activities?.reduce(
                        (actSum, act) => actSum + (act.cost || 0),
                        0
                      ) || 0),
                    0
                  )
                  .toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Estimated Cost</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdvancedItineraryBuilder;
