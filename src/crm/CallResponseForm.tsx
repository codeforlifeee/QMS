import { useState } from 'react';
import type { Lead, CallResponse } from '../data/leadSchema.js';
import {
  CALL_STATUSES,
  CALL_PROGRESS_OPTIONS,
  HOTEL_CATEGORIES,
  BUDGET_OPTIONS,
  PRIORITY_LEVELS,
  TRANSFER_TYPES,
} from '../data/leadSchema.js';

interface Props {
  lead: Lead;
  latestCall: CallResponse | null;
  onSave: () => void;
  onCancel: () => void;
}

export function CallResponseForm({ lead, latestCall, onSave, onCancel }: Props) {
  const now = new Date();
  const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [form, setForm] = useState({
    call_date_time: nowStr,
    called_by: latestCall?.called_by || '',
    call_status: '' as string,
    call_progress: '',
    wa_status: 'WA Not sent',
    destination_city: latestCall?.destination_city || '',
    travel_date: latestCall?.travel_date || '',
    total_adults: latestCall?.total_adults || 2,
    total_children: latestCall?.total_children || 0,
    child_ages: (latestCall?.child_ages || []).join(', '),
    total_nights: latestCall?.total_nights || 0,
    hotel_category: latestCall?.hotel_category || '',
    visa: latestCall?.visa || '',
    flights: latestCall?.flights || '',
    transfers_type: latestCall?.transfers_type || '',
    requirements: '',
    remarks: '',
    budget: latestCall?.budget || '',
    next_follow_up: '',
    lead_source: latestCall?.lead_source || '',
    priority: latestCall?.priority || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (field: string, value: any) => setForm((p) => ({ ...p, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        call_date_time: new Date(form.call_date_time).toISOString(),
        child_ages: form.child_ages
          ? form.child_ages.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        travel_date: form.travel_date || null,
        next_follow_up: form.next_follow_up || null,
        call_status: form.call_status || null,
        hotel_category: form.hotel_category || null,
        visa: form.visa || null,
        flights: form.flights || null,
        transfers_type: form.transfers_type || null,
        budget: form.budget || null,
        priority: form.priority || null,
      };

      const res = await fetch(`/api/leads/${lead.id}/calls`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.ok) {
        onSave();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Failed to save: ${err.message}`);
    }
    setSaving(false);
  };

  return (
    <div className="crm-inline-form">
      <div className="crm-inline-form-header">
        <h3>📞 New Call Response — {lead.customer_name}</h3>
      </div>

      <div className="crm-modal-body">
        <div className="crm-form-grid">
          <div className="crm-form-field">
            <label>Call Date &amp; Time</label>
            <input
              type="datetime-local"
              value={form.call_date_time}
              onChange={(e) => set('call_date_time', e.target.value)}
            />
          </div>

          <div className="crm-form-field">
            <label>Called By</label>
            <input
              type="text"
              value={form.called_by}
              onChange={(e) => set('called_by', e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="crm-form-field full-width">
            <label>Call Status</label>
            <select
              value={form.call_status || ''}
              onChange={(e) => set('call_status', e.target.value)}
            >
              <option value="">Select status...</option>
              {CALL_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="crm-form-field full-width">
            <label>Call Progress</label>
            <select
              value={form.call_progress}
              onChange={(e) => set('call_progress', e.target.value)}
            >
              <option value="">Select progress...</option>
              {CALL_PROGRESS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="crm-form-field">
            <label>WA Status</label>
            <div className="crm-segment">
              {['WA Sent', 'WA Not sent'].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`crm-segment-btn ${form.wa_status === s ? 'active' : ''}`}
                  onClick={() => set('wa_status', s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="crm-form-field">
            <label>Destination City</label>
            <input
              type="text"
              value={form.destination_city}
              onChange={(e) => set('destination_city', e.target.value)}
              placeholder="Dubai, Bali, etc."
            />
          </div>

          <div className="crm-form-field">
            <label>Travel Date</label>
            <input
              type="date"
              value={form.travel_date}
              onChange={(e) => set('travel_date', e.target.value)}
            />
          </div>

          <div className="crm-form-field">
            <label>Total Adults</label>
            <div className="crm-number-input">
              <button type="button" onClick={() => set('total_adults', Math.max(0, form.total_adults - 1))}>-</button>
              <span>{form.total_adults}</span>
              <button type="button" onClick={() => set('total_adults', form.total_adults + 1)}>+</button>
            </div>
          </div>

          <div className="crm-form-field">
            <label>Total Children</label>
            <div className="crm-number-input">
              <button type="button" onClick={() => set('total_children', Math.max(0, form.total_children - 1))}>-</button>
              <span>{form.total_children}</span>
              <button type="button" onClick={() => set('total_children', form.total_children + 1)}>+</button>
            </div>
          </div>

          {form.total_children > 0 && (
            <div className="crm-form-field">
              <label>Child Ages</label>
              <input
                type="text"
                value={form.child_ages}
                onChange={(e) => set('child_ages', e.target.value)}
                placeholder="5, 8, 12"
              />
            </div>
          )}

          <div className="crm-form-field">
            <label>Total Nights</label>
            <div className="crm-number-input">
              <button type="button" onClick={() => set('total_nights', Math.max(0, form.total_nights - 1))}>-</button>
              <span>{form.total_nights}</span>
              <button type="button" onClick={() => set('total_nights', form.total_nights + 1)}>+</button>
            </div>
          </div>

          <div className="crm-form-field">
            <label>Hotel Category</label>
            <div className="crm-segment">
              {HOTEL_CATEGORIES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`crm-segment-btn ${form.hotel_category === s ? 'active' : ''}`}
                  onClick={() => set('hotel_category', form.hotel_category === s ? '' : s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="crm-form-field">
            <label>Visa</label>
            <div className="crm-segment">
              {['Yes', 'No'].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`crm-segment-btn ${form.visa === s ? 'active' : ''}`}
                  onClick={() => set('visa', form.visa === s ? '' : s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="crm-form-field">
            <label>Flights</label>
            <div className="crm-segment">
              {['Yes', 'No'].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`crm-segment-btn ${form.flights === s ? 'active' : ''}`}
                  onClick={() => set('flights', form.flights === s ? '' : s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="crm-form-field">
            <label>Transfers</label>
            <div className="crm-segment">
              {TRANSFER_TYPES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`crm-segment-btn ${form.transfers_type === s ? 'active' : ''}`}
                  onClick={() => set('transfers_type', form.transfers_type === s ? '' : s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="crm-form-field full-width">
            <label>Requirements / Preferences</label>
            <textarea
              value={form.requirements}
              onChange={(e) => set('requirements', e.target.value)}
              rows={1}
              placeholder="Special requests, interests..."
            />
          </div>

          <div className="crm-form-field full-width">
            <label>Remarks / Takeaways</label>
            <textarea
              value={form.remarks}
              onChange={(e) => set('remarks', e.target.value)}
              rows={1}
              placeholder="Key takeaways from the call..."
            />
          </div>

          <div className="crm-form-field">
            <label>Budget</label>
            <div className="crm-segment">
              {BUDGET_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`crm-segment-btn ${form.budget === s ? 'active' : ''}`}
                  onClick={() => set('budget', form.budget === s ? '' : s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="crm-form-field">
            <label>Next Follow-up</label>
            <input
              type="date"
              value={form.next_follow_up}
              onChange={(e) => set('next_follow_up', e.target.value)}
            />
          </div>

          <div className="crm-form-field">
            <label>Lead Source</label>
            <input
              type="text"
              value={form.lead_source}
              onChange={(e) => set('lead_source', e.target.value)}
              placeholder="Meta, Google, Referral..."
            />
          </div>

          <div className="crm-form-field">
            <label>Priority</label>
            <div className="crm-segment">
              {PRIORITY_LEVELS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`crm-segment-btn ${form.priority === s ? 'active' : ''}`}
                  onClick={() => set('priority', form.priority === s ? '' : s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="crm-modal-footer">
        <button className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Call Response'}
        </button>
      </div>
    </div>
  );
}
