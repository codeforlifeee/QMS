import { useState } from 'react';
import type { Lead, CallResponse, PriorityBucket } from '../data/leadSchema.js';
import { PRIORITY_BUCKETS } from '../data/leadSchema.js';
import { CallResponseForm } from './CallResponseForm.js';
import { generateWALink } from '../lib/whatsapp.js';

interface Props {
  lead: Lead;
  calls: CallResponse[];
  onBack: () => void;
  onCallSaved: () => void;
  onBucketChange: (bucket: PriorityBucket) => void;
  onQuickGenerate?: (lead: Lead, call: CallResponse) => void;
  onCustomQuote?: (lead: Lead, call: CallResponse) => void;
}

export function LeadDetail({
  lead,
  calls,
  onBack,
  onCallSaved,
  onBucketChange,
  onQuickGenerate,
  onCustomQuote,
}: Props) {
  const [showCallForm, setShowCallForm] = useState(false);
  const latestCall = calls[0] ?? null;

  const waLink = lead.phone
    ? generateWALink(lead.phone, 'greeting', {
        name: lead.customer_name,
        destination: lead.city || '',
      })
    : null;

  return (
    <div className="crm-detail">
      <div className="crm-detail-header">
        <button className="btn btn-sm" onClick={onBack}>
          &larr; Back
        </button>
        <h2>{lead.customer_name}</h2>
        <select
          className="crm-bucket-select"
          value={lead.priority_bucket}
          onChange={(e) => onBucketChange(e.target.value as PriorityBucket)}
        >
          {PRIORITY_BUCKETS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <div className="crm-detail-body">
        <div className="crm-detail-info">
          <div className="crm-info-card">
            <h3>Contact Info</h3>
            <div className="crm-info-grid">
              <div className="crm-info-item">
                <label>Phone</label>
                <span>{lead.phone || '-'}</span>
              </div>
              <div className="crm-info-item">
                <label>Email</label>
                <span>{lead.email || '-'}</span>
              </div>
              <div className="crm-info-item">
                <label>City</label>
                <span>{lead.city || '-'}</span>
              </div>
              <div className="crm-info-item">
                <label>Travelling Month</label>
                <span>{lead.travelling_month || '-'}</span>
              </div>
              <div className="crm-info-item">
                <label>Planning With</label>
                <span>{lead.planning_with || '-'}</span>
              </div>
              <div className="crm-info-item">
                <label>Pax</label>
                <span>{lead.pax_summary || '-'}</span>
              </div>
              {lead.special_arrangements && (
                <div className="crm-info-item full-width">
                  <label>Special Arrangements</label>
                  <span>{lead.special_arrangements}</span>
                </div>
              )}
            </div>
          </div>

          <div className="crm-detail-actions">
            <button className="btn btn-primary" onClick={() => setShowCallForm(true)}>
              + New Call
            </button>
            {latestCall && onQuickGenerate && (
              <button
                className="btn"
                onClick={() => onQuickGenerate(lead, latestCall)}
              >
                Quick Generate
              </button>
            )}
            {latestCall && onCustomQuote && (
              <button
                className="btn"
                onClick={() => onCustomQuote(lead, latestCall)}
              >
                Custom Quote
              </button>
            )}
            {waLink && (
              <a href={waLink} target="_blank" rel="noopener" className="btn btn-wa">
                WhatsApp
              </a>
            )}
          </div>
        </div>

        <div className="crm-call-history">
          <h3>Call History ({calls.length})</h3>
          {calls.length === 0 ? (
            <div className="crm-empty-calls">
              No calls yet. Click "+ New Call" to log your first call.
            </div>
          ) : (
            <div className="crm-call-timeline">
              {calls.map((call) => (
                <CallCard key={call.id} call={call} lead={lead} onQuickGenerate={onQuickGenerate} onCustomQuote={onCustomQuote} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showCallForm && (
        <CallResponseForm
          lead={lead}
          latestCall={latestCall}
          onSave={() => {
            setShowCallForm(false);
            onCallSaved();
          }}
          onClose={() => setShowCallForm(false)}
        />
      )}
    </div>
  );
}

function CallCard({
  call,
  lead,
  onQuickGenerate,
  onCustomQuote,
}: {
  call: CallResponse;
  lead: Lead;
  onQuickGenerate?: (lead: Lead, call: CallResponse) => void;
  onCustomQuote?: (lead: Lead, call: CallResponse) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="crm-call-card">
      <button type="button" className="crm-call-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="crm-call-card-left">
          <span className={`crm-call-status-dot ${statusClass(call.call_status)}`} />
          <span className="crm-call-status">{call.call_status || 'No status'}</span>
        </div>
        <div className="crm-call-card-right">
          <span className="crm-call-date">
            {new Date(call.call_date_time).toLocaleString()}
          </span>
          <span className="crm-call-expand">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="crm-call-card-body">
          <div className="crm-call-grid">
            {call.destination_city && (
              <div className="crm-call-field">
                <label>Destination</label>
                <span>{call.destination_city}</span>
              </div>
            )}
            {call.travel_date && (
              <div className="crm-call-field">
                <label>Travel Date</label>
                <span>{call.travel_date}</span>
              </div>
            )}
            {(call.total_adults > 0 || call.total_children > 0) && (
              <div className="crm-call-field">
                <label>Pax</label>
                <span>
                  {call.total_adults}A + {call.total_children}C
                </span>
              </div>
            )}
            {call.total_nights > 0 && (
              <div className="crm-call-field">
                <label>Nights</label>
                <span>{call.total_nights}N</span>
              </div>
            )}
            {call.hotel_category && (
              <div className="crm-call-field">
                <label>Hotel</label>
                <span>{call.hotel_category}</span>
              </div>
            )}
            {call.budget && (
              <div className="crm-call-field">
                <label>Budget</label>
                <span>{call.budget}</span>
              </div>
            )}
            {call.transfers_type && (
              <div className="crm-call-field">
                <label>Transfers</label>
                <span>{call.transfers_type}</span>
              </div>
            )}
            {call.visa && (
              <div className="crm-call-field">
                <label>Visa</label>
                <span>{call.visa}</span>
              </div>
            )}
            {call.flights && (
              <div className="crm-call-field">
                <label>Flights</label>
                <span>{call.flights}</span>
              </div>
            )}
            {call.priority && (
              <div className="crm-call-field">
                <label>Priority</label>
                <span>{call.priority}</span>
              </div>
            )}
            {call.next_follow_up && (
              <div className="crm-call-field">
                <label>Follow-up</label>
                <span>{call.next_follow_up}</span>
              </div>
            )}
          </div>

          {call.call_progress && (
            <div className="crm-call-notes">
              <label>Progress</label>
              <p>{call.call_progress}</p>
            </div>
          )}
          {call.requirements && (
            <div className="crm-call-notes">
              <label>Requirements</label>
              <p>{call.requirements}</p>
            </div>
          )}
          {call.remarks && (
            <div className="crm-call-notes">
              <label>Remarks</label>
              <p>{call.remarks}</p>
            </div>
          )}

          <div className="crm-call-card-actions">
            {onQuickGenerate && call.destination_city && (
              <button className="btn btn-sm" onClick={() => onQuickGenerate(lead, call)}>
                Quick Generate
              </button>
            )}
            {onCustomQuote && call.destination_city && (
              <button className="btn btn-sm" onClick={() => onCustomQuote(lead, call)}>
                Custom Quote
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function statusClass(status?: string): string {
  if (!status) return '';
  if (status.includes('not connected')) return 'status-warn';
  if (status.includes('Progress')) return 'status-info';
  if (status.includes('Hot')) return 'status-hot';
  if (status.includes('Warm')) return 'status-good';
  if (status.includes('Rejected')) return 'status-bad';
  return '';
}
