import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, MapPin, Calendar, Tag, Star, MessageSquare, Plus, Edit2, Trash2, Search, Filter } from 'lucide-react';
import { Card, Button, Input, Select } from '../ui/index.jsx';
import toast from 'react-hot-toast';

/**
 * Customer Relationship Management (CRM) Module
 * Features:
 * - Customer profiles with contact details
 * - Interaction history
 * - Tags and segments
 * - Notes and preferences
 * - Lead scoring
 * - Follow-up reminders
 */
const CustomerManagement = ({ onSelectCustomer }) => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  const STORAGE_KEY = 'crm_customers';

  const CUSTOMER_STATUSES = [
    { value: 'lead', label: 'Lead', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'contacted', label: 'Contacted', color: 'bg-blue-100 text-blue-800' },
    { value: 'negotiating', label: 'Negotiating', color: 'bg-purple-100 text-purple-800' },
    { value: 'converted', label: 'Converted', color: 'bg-green-100 text-green-800' },
    { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-800' },
  ];

  const CUSTOMER_TAGS = [
    'Honeymoon', 'Family', 'Corporate', 'Solo', 'Group',
    'Luxury', 'Budget', 'Adventure', 'Relaxation',
    'Repeat Customer', 'VIP', 'Referral'
  ];

  const LEAD_SOURCES = [
    'Website', 'WhatsApp', 'Facebook', 'Instagram', 'Google',
    'Referral', 'Walk-in', 'Phone', 'Email', 'Other'
  ];

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCustomers(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  const saveCustomers = (updatedCustomers) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustomers));
      setCustomers(updatedCustomers);
    } catch (err) {
      console.error('Failed to save customers:', err);
      toast.error('Failed to save customer data');
    }
  };

  const addCustomer = (customerData) => {
    const newCustomer = {
      id: Date.now(),
      ...customerData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      interactions: [],
      quotations: [],
      leadScore: calculateLeadScore(customerData),
    };
    
    const updated = [newCustomer, ...customers];
    saveCustomers(updated);
    toast.success('Customer added successfully!');
    return newCustomer;
  };

  const updateCustomer = (customerId, updates) => {
    const updated = customers.map(customer =>
      customer.id === customerId
        ? {
            ...customer,
            ...updates,
            updatedAt: new Date().toISOString(),
            leadScore: calculateLeadScore({ ...customer, ...updates }),
          }
        : customer
    );
    saveCustomers(updated);
    toast.success('Customer updated');
  };

  const deleteCustomer = (customerId) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    
    const updated = customers.filter(c => c.id !== customerId);
    saveCustomers(updated);
    toast.success('Customer deleted');
    setSelectedCustomer(null);
  };

  const addInteraction = (customerId, interaction) => {
    const updated = customers.map(customer =>
      customer.id === customerId
        ? {
            ...customer,
            interactions: [
              {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                ...interaction,
              },
              ...customer.interactions,
            ],
            updatedAt: new Date().toISOString(),
          }
        : customer
    );
    saveCustomers(updated);
    toast.success('Interaction logged');
  };

  const addNote = (customerId, note) => {
    addInteraction(customerId, {
      type: 'note',
      content: note,
    });
  };

  const calculateLeadScore = (customer) => {
    let score = 0;
    
    // Contact completeness
    if (customer.email) score += 10;
    if (customer.phone) score += 10;
    if (customer.location) score += 5;
    
    // Status
    if (customer.status === 'negotiating') score += 30;
    else if (customer.status === 'contacted') score += 20;
    else if (customer.status === 'lead') score += 10;
    
    // Interactions
    const interactionCount = customer.interactions?.length || 0;
    score += Math.min(interactionCount * 5, 25);
    
    // Tags
    if (customer.tags?.includes('VIP')) score += 20;
    if (customer.tags?.includes('Repeat Customer')) score += 15;
    
    // Budget indication
    if (customer.budget && customer.budget > 50000) score += 15;
    
    return Math.min(score, 100);
  };

  const getLeadScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-blue-600 bg-blue-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const filterAndSortCustomers = () => {
    let filtered = [...customers];
    
    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => c.status === filterStatus);
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.phone?.includes(query) ||
        c.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Sort
    if (sortBy === 'recent') {
      filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'score') {
      filtered.sort((a, b) => b.leadScore - a.leadScore);
    }
    
    return filtered;
  };

  const CustomerForm = ({ customer, onSave, onCancel }) => {
    const [formData, setFormData] = useState(customer || {
      name: '',
      email: '',
      phone: '',
      location: '',
      status: 'lead',
      source: 'Website',
      tags: [],
      budget: '',
      travelDate: '',
      destination: '',
      notes: '',
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      onSave(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name *"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Phone *"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
        </div>
        
        <Input
          label="Location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={CUSTOMER_STATUSES.map(s => ({ value: s.value, label: s.label }))}
          />
          <Select
            label="Lead Source"
            value={formData.source}
            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            options={LEAD_SOURCES.map(s => ({ value: s, label: s }))}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Budget (₹)"
            type="number"
            value={formData.budget}
            onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
          />
          <Input
            label="Travel Date"
            type="date"
            value={formData.travelDate}
            onChange={(e) => setFormData({ ...formData, travelDate: e.target.value })}
          />
        </div>
        
        <Input
          label="Destination"
          value={formData.destination}
          onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
        />
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {CUSTOMER_TAGS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  const tags = formData.tags || [];
                  if (tags.includes(tag)) {
                    setFormData({ ...formData, tags: tags.filter(t => t !== tag) });
                  } else {
                    setFormData({ ...formData, tags: [...tags, tag] });
                  }
                }}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  (formData.tags || []).includes(tag)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Add any additional notes..."
          />
        </div>
        
        <div className="flex gap-2 pt-4">
          <Button type="submit" className="flex-1">
            {customer ? 'Update Customer' : 'Add Customer'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    );
  };

  const filteredCustomers = filterAndSortCustomers();

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <User className="text-blue-600" />
              Customer Management
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {customers.length} total customer{customers.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={() => setIsEditing({})}>
            <Plus size={16} className="mr-1" />
            Add Customer
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search size={16} />}
          />
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            options={[
              { value: 'all', label: 'All Statuses' },
              ...CUSTOMER_STATUSES.map(s => ({ value: s.value, label: s.label })),
            ]}
          />
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            options={[
              { value: 'recent', label: 'Most Recent' },
              { value: 'name', label: 'Name (A-Z)' },
              { value: 'score', label: 'Lead Score' },
            ]}
          />
        </div>

        {/* Customer List */}
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-700 mb-2">
              No Customers Found
            </h4>
            <p className="text-gray-600">
              {searchQuery || filterStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'Add your first customer to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCustomers.map((customer) => {
              const status = CUSTOMER_STATUSES.find(s => s.value === customer.status);
              
              return (
                <div
                  key={customer.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-bold text-lg">
                            {customer.name?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {customer.name}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            {customer.phone && (
                              <span className="flex items-center gap-1">
                                <Phone size={12} />
                                {customer.phone}
                              </span>
                            )}
                            {customer.email && (
                              <span className="flex items-center gap-1">
                                <Mail size={12} />
                                {customer.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-1 rounded-full ${status?.color}`}>
                          {status?.label}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getLeadScoreColor(customer.leadScore)}`}>
                          Score: {customer.leadScore}
                        </span>
                        {customer.tags?.slice(0, 3).map(tag => (
                          <span key={tag} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                            {tag}
                          </span>
                        ))}
                      </div>
                      
                      {customer.destination && (
                        <div className="text-sm text-gray-600 mt-2 flex items-center gap-1">
                          <MapPin size={14} />
                          {customer.destination}
                          {customer.travelDate && ` • ${new Date(customer.travelDate).toLocaleDateString()}`}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right">
                      {customer.budget && (
                        <div className="text-lg font-bold text-gray-900">
                          ₹{parseInt(customer.budget).toLocaleString()}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {customer.interactions?.length || 0} interactions
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Add/Edit Customer Modal */}
      {isEditing && (
        <Card className="border-2 border-blue-500">
          <h4 className="text-lg font-bold text-gray-900 mb-4">
            {isEditing.id ? 'Edit Customer' : 'Add New Customer'}
          </h4>
          <CustomerForm
            customer={isEditing}
            onSave={(data) => {
              if (isEditing.id) {
                updateCustomer(isEditing.id, data);
              } else {
                addCustomer(data);
              }
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        </Card>
      )}

      {/* Customer Detail View */}
      {selectedCustomer && !isEditing && (
        <Card className="border-2 border-blue-500">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-2xl">
                  {selectedCustomer.name?.charAt(0) || '?'}
                </span>
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900">{selectedCustomer.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  {CUSTOMER_STATUSES.find(s => s.value === selectedCustomer.status) && (
                    <span className={`text-xs px-2 py-1 rounded-full ${CUSTOMER_STATUSES.find(s => s.value === selectedCustomer.status).color}`}>
                      {CUSTOMER_STATUSES.find(s => s.value === selectedCustomer.status).label}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full ${getLeadScoreColor(selectedCustomer.leadScore)}`}>
                    Lead Score: {selectedCustomer.leadScore}/100
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(selectedCustomer)}
              >
                <Edit2 size={14} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (onSelectCustomer) {
                    onSelectCustomer(selectedCustomer);
                  }
                }}
              >
                Create Quotation
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCustomer(null)}
              >
                ✕
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h5 className="font-semibold text-gray-900 mb-3">Contact Info</h5>
              <div className="space-y-2 text-sm">
                {selectedCustomer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-gray-400" />
                    <span>{selectedCustomer.phone}</span>
                  </div>
                )}
                {selectedCustomer.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-gray-400" />
                    <span>{selectedCustomer.email}</span>
                  </div>
                )}
                {selectedCustomer.location && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-gray-400" />
                    <span>{selectedCustomer.location}</span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <h5 className="font-semibold text-gray-900 mb-3">Trip Details</h5>
              <div className="space-y-2 text-sm">
                {selectedCustomer.destination && (
                  <div><strong>Destination:</strong> {selectedCustomer.destination}</div>
                )}
                {selectedCustomer.travelDate && (
                  <div><strong>Travel Date:</strong> {new Date(selectedCustomer.travelDate).toLocaleDateString()}</div>
                )}
                {selectedCustomer.budget && (
                  <div><strong>Budget:</strong> ₹{parseInt(selectedCustomer.budget).toLocaleString()}</div>
                )}
                {selectedCustomer.source && (
                  <div><strong>Source:</strong> {selectedCustomer.source}</div>
                )}
              </div>
            </div>
          </div>

          {selectedCustomer.tags && selectedCustomer.tags.length > 0 && (
            <div className="mb-6">
              <h5 className="font-semibold text-gray-900 mb-2">Tags</h5>
              <div className="flex flex-wrap gap-2">
                {selectedCustomer.tags.map(tag => (
                  <span key={tag} className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-800">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-semibold text-gray-900">Interactions</h5>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const note = prompt('Add a note:');
                  if (note) addNote(selectedCustomer.id, note);
                }}
              >
                <MessageSquare size={14} className="mr-1" />
                Add Note
              </Button>
            </div>
            {selectedCustomer.interactions && selectedCustomer.interactions.length > 0 ? (
              <div className="space-y-2">
                {selectedCustomer.interactions.map(interaction => (
                  <div key={interaction.id} className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">
                      {new Date(interaction.timestamp).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-900">{interaction.content}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-gray-50 rounded-lg text-sm text-gray-600">
                No interactions yet
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default CustomerManagement;
