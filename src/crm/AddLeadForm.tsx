import { useState } from 'react';
import { LEAD_SOURCES } from '../data/leadSchema.js';
import { showToast } from '../components/Toast.js';

interface Props {
  onSave: () => void;
  onClose: () => void;
}

export function AddLeadForm({ onSave, onClose }: Props) {
  const [form, setForm] = useState({
    customer_name: '',
    phone: '',
    email: '',
    city: '',
    travelling_month: '',
    planning_with: '',
    pax_summary: '',
    budget: '',
    preferred_call_time: '',
    special_arrangements: '',
    source: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.customer_name.trim()) {
      showToast('Customer name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create lead');
      showToast(`Lead "${form.customer_name}" added`, 'success');
      onSave();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="crm-modal-overlay" onClick={onClose}>
      <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="crm-modal-header">
          <h3>Add Lead</h3>
          <button className="crm-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="crm-modal-body">
          <div className="crm-form-grid">
            <div className="crm-form-field">
              <label>Customer Name *</label>
              <input
                type="text"
                value={form.customer_name}
                onChange={(e) => set('customer_name', e.target.value)}
                placeholder="Full name"
                autoFocus
              />
            </div>

            <div className="crm-form-field">
              <label>Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+91..."
              />
            </div>

            <div className="crm-form-field">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="email@example.com"
              />
            </div>

            <div className="crm-form-field">
              <label>City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                placeholder="Customer's city"
              />
            </div>

            <div className="crm-form-field">
              <label>Travelling Month</label>
              <input
                type="text"
                value={form.travelling_month}
                onChange={(e) => set('travelling_month', e.target.value)}
                placeholder="e.g. December 2026"
              />
            </div>

            <div className="crm-form-field">
              <label>Planning With</label>
              <input
                type="text"
                value={form.planning_with}
                onChange={(e) => set('planning_with', e.target.value)}
                placeholder="Family, Friends, Couple..."
              />
            </div>

            <div className="crm-form-field">
              <label>Pax Summary</label>
              <input
                type="text"
                value={form.pax_summary}
                onChange={(e) => set('pax_summary', e.target.value)}
                placeholder="e.g. 2A + 1C"
              />
            </div>

            <div className="crm-form-field">
              <label>Lead Source</label>
              <select
                value={form.source}
                onChange={(e) => set('source', e.target.value)}
              >
                <option value="">Select source...</option>
                {LEAD_SOURCES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="crm-form-field">
              <label>Budget</label>
              <input
                type="text"
                value={form.budget}
                onChange={(e) => set('budget', e.target.value)}
                placeholder="e.g. 50k - 1 lakh"
              />
            </div>

            <div className="crm-form-field">
              <label>Preferred Call Time</label>
              <input
                type="text"
                value={form.preferred_call_time}
                onChange={(e) => set('preferred_call_time', e.target.value)}
                placeholder="e.g. 2pm - 5pm"
              />
            </div>

            <div className="crm-form-field full-width">
              <label>Special Arrangements</label>
              <textarea
                value={form.special_arrangements}
                onChange={(e) => set('special_arrangements', e.target.value)}
                placeholder="Any special requirements..."
                rows={2}
              />
            </div>
          </div>
        </div>

        <div className="crm-modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Add Lead'}
          </button>
        </div>
      </div>
    </div>
  );
}
