import React, { useState } from 'react';
import { BookTemplate, Star, Copy, Download, Upload, Search, Filter, Plus, Edit2, Trash2, Eye } from 'lucide-react';
import { Card, Button, Input, Select } from '../ui/index.jsx';
import toast from 'react-hot-toast';

/**
 * Package Template Library
 * Features:
 * - Pre-built package templates
 * - Quick-start packages by destination
 * - Customizable templates
 * - Import/Export templates
 * - Template categories
 * - Popular templates
 */
const TemplateLibrary = ({ onUseTemplate }) => {
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);

  const CATEGORIES = [
    { value: 'all', label: 'All Templates' },
    { value: 'beach', label: '🏖️ Beach Destinations' },
    { value: 'adventure', label: '🏔️ Adventure' },
    { value: 'cultural', label: '🏛️ Cultural' },
    { value: 'luxury', label: '💎 Luxury' },
    { value: 'budget', label: '💰 Budget' },
    { value: 'honeymoon', label: '💑 Honeymoon' },
    { value: 'family', label: '👨‍👩‍👧 Family' },
    { value: 'corporate', label: '💼 Corporate' },
  ];

  const useTemplate = (template) => {
    if (onUseTemplate) {
      onUseTemplate(template.quotationData);
      toast.success(`Using template: ${template.name}`);
    }
  };

  const saveAsTemplate = (quotation, name, category) => {
    const newTemplate = {
      id: Date.now(),
      name: name,
      category: category,
      destination: quotation.selectedActivities?.[0]?.location || 'Custom',
      duration: quotation.tripDuration || { nights: 4, days: 5 },
      basePrice: quotation.costs?.subtotal || 0,
      activities: quotation.selectedActivities?.length || 0,
      quotationData: quotation,
      createdAt: new Date().toISOString(),
      isCustom: true,
      popularity: 0,
    };

    setTemplates([...templates, newTemplate]);
    toast.success('Template saved!');
  };

  const deleteTemplate = (templateId) => {
    if (!confirm('Delete this template?')) return;
    setTemplates(templates.filter(t => t.id !== templateId));
    toast.success('Template deleted');
  };

  const exportTemplate = (template) => {
    const dataStr = JSON.stringify(template, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `template_${template.name.replace(/\s+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Template exported');
  };

  const importTemplate = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const template = JSON.parse(e.target.result);
        template.id = Date.now();
        template.isCustom = true;
        setTemplates([...templates, template]);
        toast.success('Template imported!');
      } catch (err) {
        toast.error('Invalid template file');
      }
    };
    reader.readAsText(file);
  };

  const filteredTemplates = templates.filter(template => {
    if (filterCategory !== 'all' && template.category !== filterCategory) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        template.name.toLowerCase().includes(query) ||
        template.destination.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BookTemplate className="text-blue-600" />
              Package Template Library
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {templates.length} template{templates.length !== 1 ? 's' : ''} available
            </p>
          </div>
          <div className="flex gap-2">
            <label>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={importTemplate}
              />
              <Button variant="outline" size="sm" as="span">
                <Upload size={14} className="mr-1" />
                Import
              </Button>
            </label>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search size={16} />}
          />
          <Select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            options={CATEGORIES}
          />
        </div>

        {/* Popular Templates */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Star className="text-yellow-500" size={16} />
            Popular Templates
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {templates
              .filter(t => !t.isCustom)
              .sort((a, b) => b.popularity - a.popularity)
              .slice(0, 3)
              .map(template => (
                <button
                  key={template.id}
                  onClick={() => useTemplate(template)}
                  className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4 text-left hover:shadow-md transition-all"
                >
                  <div className="font-semibold text-gray-900 mb-1">
                    {template.name}
                  </div>
                  <div className="text-xs text-gray-600">
                    {template.destination} • {template.duration.nights}N/{template.duration.days}D
                  </div>
                  <div className="text-lg font-bold text-blue-600 mt-2">
                    From ₹{Math.round(template.basePrice).toLocaleString()}
                  </div>
                </button>
              ))}
          </div>
        </div>

        {/* All Templates Grid */}
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <BookTemplate className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-700 mb-2">
              No Templates Found
            </h4>
            <p className="text-gray-600">
              {searchQuery || filterCategory !== 'all'
                ? 'Try adjusting your filters'
                : 'No templates available'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredTemplates.map(template => {
              const category = CATEGORIES.find(c => c.value === template.category);
              
              return (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-900">{template.name}</h4>
                        {template.isCustom && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                            Custom
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {template.destination} • {template.duration.nights}N/{template.duration.days}D
                      </div>
                      {category && (
                        <div className="text-xs text-gray-500 mt-1">{category.label}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        ₹{Math.round(template.basePrice).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">base price</div>
                    </div>
                  </div>

                  {template.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-600 mb-3 pb-3 border-b border-gray-200">
                    <span>{template.activities} activities</span>
                    <span>★ {template.popularity} uses</span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => useTemplate(template)}
                      className="flex-1"
                    >
                      <Plus size={14} className="mr-1" />
                      Use Template
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <Eye size={14} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportTemplate(template)}
                    >
                      <Download size={14} />
                    </Button>
                    {template.isCustom && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTemplate(template.id)}
                        className="text-red-600"
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <Card className="border-2 border-blue-500">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="text-xl font-bold text-gray-900">{selectedTemplate.name}</h4>
              <p className="text-gray-600 mt-1">{selectedTemplate.destination}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedTemplate(null)}>
              ✕
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h5 className="font-semibold text-gray-900 mb-3">Package Details</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">
                    {selectedTemplate.duration.nights}N / {selectedTemplate.duration.days}D
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Activities:</span>
                  <span className="font-medium">{selectedTemplate.activities}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Base Price:</span>
                  <span className="font-medium text-blue-600">
                    ₹{Math.round(selectedTemplate.basePrice).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Category:</span>
                  <span className="font-medium">
                    {CATEGORIES.find(c => c.value === selectedTemplate.category)?.label}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h5 className="font-semibold text-gray-900 mb-3">Inclusions</h5>
              <div className="space-y-1 text-sm">
                {selectedTemplate.quotationData?.flights?.included && (
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Flight tickets</span>
                  </div>
                )}
                {selectedTemplate.quotationData?.visa?.included && (
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Visa assistance</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Accommodation</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Activities & Tours</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => useTemplate(selectedTemplate)} className="flex-1">
              Use This Template
            </Button>
            <Button variant="outline" onClick={() => exportTemplate(selectedTemplate)}>
              <Download size={14} className="mr-1" />
              Export
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

// Default template library
const DEFAULT_TEMPLATES = [
  {
    id: 1,
    name: 'Dubai Deluxe 5N/6D',
    category: 'luxury',
    destination: 'Dubai',
    duration: { nights: 5, days: 6 },
    basePrice: 68000,
    activities: 12,
    popularity: 245,
    description: 'Luxury Dubai experience with Burj Khalifa, Desert Safari, Marina Dhow Cruise, and premium hotels',
    quotationData: {
      guestName: '',
      totalAdults: 2,
      totalChildren: 0,
      travelType: 'Leisure',
      tripDuration: { nights: 5, days: 6 },
      flights: { included: true, adultCost: 18000, childCost: 15000 },
      visa: { included: true, adultCost: 2500, childCost: 2000 },
      selectedActivities: [],
      itinerary: [],
    },
  },
  {
    id: 2,
    name: 'Bali Budget Escape 4N/5D',
    category: 'budget',
    destination: 'Bali',
    duration: { nights: 4, days: 5 },
    basePrice: 32000,
    activities: 8,
    popularity: 189,
    description: 'Affordable Bali package with Ubud, Tanah Lot, water sports, and 3-star hotels',
    quotationData: {
      guestName: '',
      totalAdults: 2,
      totalChildren: 0,
      travelType: 'Leisure',
      tripDuration: { nights: 4, days: 5 },
    },
  },
  {
    id: 3,
    name: 'Singapore Family Fun 3N/4D',
    category: 'family',
    destination: 'Singapore',
    duration: { nights: 3, days: 4 },
    basePrice: 45000,
    activities: 10,
    popularity: 156,
    description: 'Family-friendly Singapore with Universal Studios, Gardens by the Bay, and Sentosa',
    quotationData: {
      guestName: '',
      totalAdults: 2,
      totalChildren: 2,
      travelType: 'Family',
      tripDuration: { nights: 3, days: 4 },
    },
  },
  {
    id: 4,
    name: 'Thailand Adventure 6N/7D',
    category: 'adventure',
    destination: 'Thailand',
    duration: { nights: 6, days: 7 },
    basePrice: 52000,
    activities: 15,
    popularity: 198,
    description: 'Bangkok + Pattaya + Phuket adventure with island hopping, water sports, and cultural tours',
    quotationData: {
      guestName: '',
      totalAdults: 2,
      totalChildren: 0,
      travelType: 'Adventure',
      tripDuration: { nights: 6, days: 7 },
    },
  },
  {
    id: 5,
    name: 'Maldives Honeymoon 4N/5D',
    category: 'honeymoon',
    destination: 'Maldives',
    duration: { nights: 4, days: 5 },
    basePrice: 95000,
    activities: 6,
    popularity: 223,
    description: 'Romantic Maldives getaway with overwater villa, spa, private dining, and water activities',
    quotationData: {
      guestName: '',
      totalAdults: 2,
      totalChildren: 0,
      travelType: 'Honeymoon',
      tripDuration: { nights: 4, days: 5 },
    },
  },
  {
    id: 6,
    name: 'Vietnam Heritage Tour 5N/6D',
    category: 'cultural',
    destination: 'Vietnam',
    duration: { nights: 5, days: 6 },
    basePrice: 42000,
    activities: 11,
    popularity: 134,
    description: 'Explore Hanoi, Halong Bay, Hoi An with cultural immersion and UNESCO sites',
    quotationData: {
      guestName: '',
      totalAdults: 2,
      totalChildren: 0,
      travelType: 'Cultural',
      tripDuration: { nights: 5, days: 6 },
    },
  },
];

export default TemplateLibrary;
