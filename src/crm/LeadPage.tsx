import { useState, useEffect } from 'react';
import type { Lead, CallResponse, PriorityBucket } from '../data/leadSchema.js';
import { PRIORITY_BUCKETS } from '../data/leadSchema.js';
import { CallResponseForm } from './CallResponseForm.js';
import { generateWALink } from '../lib/whatsapp.js';
import { showToast } from '../components/Toast.js';
import { EmailComposer } from '../components/email/EmailComposer.js';
import { WhatsAppComposer } from '../components/whatsapp/WhatsAppComposer.js';
import { formatPhone, copyAndToast } from '../lib/contact.js';

interface Quotation {
  id: string;
  title: string;
  reference: string;
  status: string;
  createdAt: string;
}

interface Props {
  leadId: string;
}

export function LeadPage({ leadId }: Props) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [calls, setCalls] = useState<CallResponse[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCallForm, setShowCallForm] = useState(false);
  const [expandedCalls, setExpandedCalls] = useState<Set<string>>(new Set());
  const [showEmail, setShowEmail] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);

  const fetchData = async () => {
    try {
      const [leadRes, quotRes] = await Promise.all([
        fetch(`/api/leads/${leadId}`),
        fetch(`/api/quotations?lead_id=${leadId}`),
      ]);

      const leadData = await leadRes.json();
      if (leadData.lead) {
        setLead(leadData.lead);
        setCalls(leadData.calls ?? []);
      }

      const quotData = await quotRes.json();
      if (quotData.ok) {
        setQuotations(quotData.quotations ?? []);
      }
    } catch (err: any) {
      showToast(`Failed to load lead: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [leadId]);

  const handleBucketChange = async (bucket: PriorityBucket) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ priority_bucket: bucket }),
      });
      const data = await res.json();
      if (data.ok || data.lead) {
        setLead((prev) => (prev ? { ...prev, priority_bucket: bucket } : prev));
        showToast(`Bucket updated to "${bucket}"`, 'success');
      } else {
        showToast(`Failed to update bucket: ${data.error || 'Unknown error'}`, 'error');
      }
    } catch (err: any) {
      showToast(`Failed to update bucket: ${err.message}`, 'error');
    }
  };

  const [editingCallId, setEditingCallId] = useState<string | null>(null);

  const toggleCall = (callId: string) => {
    setExpandedCalls((prev) => {
      const next = new Set(prev);
      if (next.has(callId)) {
        next.delete(callId);
      } else {
        next.add(callId);
      }
      return next;
    });
  };

  const handleDeleteCall = async (callId: string) => {
    if (!confirm('Are you sure you want to delete this call record?')) return;
    try {
      const res = await fetch(`/api/leads/${leadId}/calls/${callId}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to delete call');
      }
      showToast('Call deleted successfully', 'success');
      fetchData();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  if (loading) {
    return <div className="crm-loading">Loading lead...</div>;
  }

  if (!lead) {
    return <div className="crm-loading">Lead not found.</div>;
  }

  const latestCall = calls[0] ?? null;

  const cleanPhone = formatPhone(lead.phone);
  const waLink = cleanPhone
    ? generateWALink(cleanPhone, 'greeting', {
        name: lead.customer_name,
        destination: lead.city || '',
      })
    : null;

  const manualQuoteParams = new URLSearchParams();
  manualQuoteParams.set('lead_id', leadId);
  if (lead.customer_name) manualQuoteParams.set('client_name', lead.customer_name);
  if (cleanPhone) manualQuoteParams.set('client_phone', cleanPhone);
  if (latestCall?.destination_city) manualQuoteParams.set('destination', latestCall.destination_city);
  if (lead.email) manualQuoteParams.set('client_email', lead.email);

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <a href="/leads">Leads</a>
        <span className="sep">&gt;</span>
        <span className="current">{lead.customer_name}</span>
      </nav>

      <div className="crm-detail">
        {/* Lead header card */}
        <div className="crm-detail-header">
          <h2>{lead.customer_name}</h2>
          <select
            className="crm-bucket-select"
            value={lead.priority_bucket}
            onChange={(e) => handleBucketChange(e.target.value as PriorityBucket)}
          >
            {PRIORITY_BUCKETS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div className="crm-detail-body">
          {/* Info card */}
          <div className="crm-info-card">
            <div className="crm-info-grid">
              <div className="crm-info-item">
                <label>Phone</label>
                {lead.phone ? (
                  <span
                    className="crm-copyable"
                    title="Click to copy"
                    onClick={() => copyAndToast(formatPhone(lead.phone), 'Phone copied')}
                  >
                    {formatPhone(lead.phone)}
                  </span>
                ) : (
                  <span>-</span>
                )}
              </div>
              <div className="crm-info-item">
                <label>Email</label>
                {lead.email ? (
                  <span
                    className="crm-copyable"
                    title="Click to copy"
                    onClick={() => copyAndToast(lead.email!, 'Email copied')}
                  >
                    {lead.email}
                  </span>
                ) : (
                  <span>-</span>
                )}
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
                <label>Pax Summary</label>
                <span>{lead.pax_summary || '-'}</span>
              </div>
              <div className="crm-info-item">
                <label>Source</label>
                <span>{lead.source || '-'}</span>
              </div>
              {lead.special_arrangements && (
                <div className="crm-info-item full-width">
                  <label>Special Arrangements</label>
                  <span>{lead.special_arrangements}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action bar */}
          <div className="crm-detail-actions">
            <button className="btn btn-primary" onClick={() => setShowCallForm(true)}>
              + New Call
            </button>
            <button
              className="btn"
              onClick={() => {
                window.location.href = `/quotations/generate?lead_id=${leadId}`;
              }}
            >
              Generate Quote
            </button>
            <button
              className="btn"
              onClick={() => {
                window.location.href = `/new?${manualQuoteParams.toString()}`;
              }}
            >
              Manual Quote
            </button>
            {cleanPhone && (
              <button className="btn btn-wa" onClick={() => setShowWhatsApp(true)}>
                WhatsApp
              </button>
            )}
            {/* Email logic is retained but the UI button is removed as per user request */}
          </div>

          {/* Two-column content area */}
          <div className="lead-page-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Left column: Call History */}
            <div className="crm-call-history">
              <h3>Call History ({calls.length})</h3>
              {calls.length === 0 ? (
                <div className="crm-empty-calls">
                  No calls yet. Click "+ New Call" to log your first call.
                </div>
              ) : (
                <div className="crm-call-timeline">
                  {calls.map((call) => (
                    <div key={call.id} className="crm-call-card">
                      <button
                        type="button"
                        className="crm-call-card-header"
                        onClick={() => toggleCall(call.id)}
                      >
                        <div className="crm-call-card-left">
                          <span className={`crm-call-status-dot ${statusClass(call.call_status)}`} />
                          <span className="crm-call-status">{call.call_status || 'No status'}</span>
                        </div>
                        <div className="crm-call-card-right">
                          <span className="crm-call-date">
                            {new Date(call.call_date_time).toLocaleString()}
                          </span>
                          <span className="crm-call-expand">
                            {expandedCalls.has(call.id) ? '▲' : '▼'}
                          </span>
                        </div>
                      </button>

                      {editingCallId === call.id ? (
                        <div className="crm-call-card-body" style={{ padding: 0 }}>
                          <CallResponseForm
                            lead={lead}
                            latestCall={latestCall}
                            editCall={call}
                            onSave={() => {
                              setEditingCallId(null);
                              fetchData();
                            }}
                            onCancel={() => setEditingCallId(null)}
                          />
                        </div>
                      ) : expandedCalls.has(call.id) ? (
                        <div className="crm-call-card-body">
                          <div className="crm-call-grid">
                            {call.destination_city && (
                              <div className="crm-call-field">
                                <label>Destination</label>
                                <span>{call.destination_city}</span>
                              </div>
                            )}
                            {(call.total_adults > 0 || call.total_children > 0) && (
                              <div className="crm-call-field">
                                <label>Pax</label>
                                <span>{call.total_adults}A + {call.total_children}C</span>
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

                          <div className="crm-call-card-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              className="btn btn-sm"
                              onClick={() => {
                                window.location.href = `/quotations/generate?lead_id=${leadId}&call_id=${call.id}`;
                              }}
                            >
                              Generate Quote from this Call
                            </button>
                            <button
                              className="btn btn-sm"
                              onClick={() => setEditingCallId(call.id)}
                            >
                              Edit Call
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteCall(call.id)}
                              style={{ color: 'var(--color-danger)' }}
                            >
                              Delete Call
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right column: Linked Quotations */}
            <div>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--app-muted)', margin: '0 0 10px' }}>
                Quotations ({quotations.length})
              </h3>
              {quotations.length === 0 ? (
                <div className="crm-empty-calls">No quotations yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {quotations.map((q) => (
                    <a
                      key={q.id}
                      href={`/edit/${q.id}`}
                      className="crm-call-card"
                      style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
                    >
                      <div style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px' }}>{q.title}</span>
                          <span className={`pill ${q.status === 'draft' ? 'pill-draft' : ''}`}>
                            {q.status}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--app-muted)' }}>
                          <span>{q.reference}</span>
                          <span>{new Date(q.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Inline Call Response Form — appears when "+ New Call" is clicked */}
      {showCallForm && (
        <CallResponseForm
          lead={lead}
          latestCall={latestCall}
          onSave={() => {
            setShowCallForm(false);
            fetchData();
          }}
          onCancel={() => setShowCallForm(false)}
        />
      )}

      <EmailComposer
        open={showEmail}
        onClose={() => setShowEmail(false)}
        defaultTo={lead.email || ''}
        defaultSubject={`Following up — ${lead.city || 'Traverse Globe'}`}
        defaultBody={`Hi ${lead.customer_name || 'there'},\n\nThanks for your interest in travelling with Traverse Globe. I'd love to help plan the perfect trip for you.\n\n— Traverse Globe`}
      />
      {lead && (
        <WhatsAppComposer
          open={showWhatsApp}
          onClose={() => setShowWhatsApp(false)}
          defaultPhone={cleanPhone || ''}
          vars={{
            name: lead.customer_name || '',
            destination: latestCall?.destination_city || lead.city || '',
          }}
        />
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
