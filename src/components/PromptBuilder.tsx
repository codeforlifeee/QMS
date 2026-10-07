import React, { useState, useEffect } from 'react';
import type { Lead, CallResponse } from '../data/leadSchema.js';
import { buildPromptFromCall } from '../lib/promptBuilder.js';
import { showToast } from './Toast.js';

interface PromptBuilderProps {
  leadId?: string;
  callId?: string;
}

interface GenerateResult {
  quotationId: string;
  days: number;
  lines: number;
  grounded: number;
  unpriced: number;
  warnings?: string[];
}

type Step = 1 | 2 | 3;

export default function PromptBuilder({ leadId, callId }: PromptBuilderProps) {
  const hasLead = Boolean(leadId);

  // Step 1 state
  const [lead, setLead] = useState<Lead | null>(null);
  const [call, setCall] = useState<CallResponse | null>(null);
  const [loadingLead, setLoadingLead] = useState(false);

  // Step 2 state
  const [prompt, setPrompt] = useState('');
  const [provider, setProvider] = useState('openai');

  // Step 3 state
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  // Current step
  const [step, setStep] = useState<Step>(hasLead ? 1 : 2);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (generating) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((prev) => {
          const next = prev + (95 - prev) * 0.05;
          return next > 95 ? 95 : next;
        });
      }, 500);
      return () => clearInterval(interval);
    } else if (result || genError) {
      setProgress(100);
    }
  }, [generating, result, genError]);

  // Fetch lead data when leadId is present
  useEffect(() => {
    if (!leadId) return;
    setLoadingLead(true);
    fetch(`/api/leads/${leadId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load lead data');
        return res.json();
      })
      .then((data: { lead: Lead; calls: CallResponse[] }) => {
        setLead(data.lead);
        const matched = callId
          ? data.calls.find((c) => c.id === callId)
          : data.calls[0];
        setCall(matched || data.calls[0] || null);
        setLoadingLead(false);
      })
      .catch((err) => {
        showToast(err.message || 'Could not load lead data', 'error');
        setLoadingLead(false);
        setStep(2);
      });
  }, [leadId, callId]);

  // Convert call data to prompt and advance to step 2
  const handleConvertToPrompt = () => {
    if (lead && call) {
      setPrompt(buildPromptFromCall(lead, call));
    }
    setStep(2);
  };

  // Generate quotation
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      showToast('Please enter a prompt first', 'error');
      return;
    }

    setGenerating(true);
    setGenError(null);
    setResult(null);

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          provider,
          lead_id: leadId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate quotation');

      setResult({
        quotationId: data.quotationId,
        days: data.days ?? 0,
        lines: data.lines ?? 0,
        grounded: data.grounded ?? 0,
        unpriced: data.unpriced ?? 0,
        warnings: data.warnings,
      });
      setStep(3);
    } catch (err: any) {
      setGenError(err.message);
      setStep(3);
    } finally {
      setGenerating(false);
    }
  };

  // Go back to step 2 with same prompt for another version
  const handleGenerateAnother = () => {
    setResult(null);
    setGenError(null);
    setStep(2);
  };

  // Retry after error
  const handleRetry = () => {
    setGenError(null);
    setStep(2);
  };

  return (
    <div className="pb-container">
      {/* Step indicators */}
      <div className="pb-steps">
        {hasLead && (
          <div className={`pb-step-indicator ${step === 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>
            <span className="pb-step-num">1</span>
            <span className="pb-step-label">Review Call Data</span>
          </div>
        )}
        <div className={`pb-step-indicator ${step === 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}`}>
          <span className="pb-step-num">{hasLead ? '2' : '1'}</span>
          <span className="pb-step-label">Edit Prompt</span>
        </div>
        <div className={`pb-step-indicator ${step === 3 ? 'active' : ''}`}>
          <span className="pb-step-num">{hasLead ? '3' : '2'}</span>
          <span className="pb-step-label">Result</span>
        </div>
      </div>

      {/* Step 1: Review Call Data */}
      {step === 1 && hasLead && (
        <div className="pb-card">
          <h2 className="pb-card-title">Step 1: Review Call Data</h2>

          {loadingLead ? (
            <div className="pb-loading">
              <div className="pb-spinner" />
              <span>Loading lead data...</span>
            </div>
          ) : call ? (
            <>
              <div className="pb-summary">
                <div className="pb-summary-grid">
                  <SummaryField label="Destination" value={call.destination_city} />
                  <SummaryField label="Nights" value={call.total_nights?.toString()} />
                  <SummaryField label="Adults" value={call.total_adults?.toString()} />
                  <SummaryField label="Children" value={call.total_children?.toString()} />
                  <SummaryField label="Hotel Category" value={call.hotel_category} />
                  <SummaryField label="Budget" value={call.budget} />
                  <SummaryField label="Transfers" value={call.transfers_type} />
                  <SummaryField label="Visa" value={call.visa} />
                  <SummaryField label="Flights" value={call.flights} />
                </div>
                {call.requirements && (
                  <div className="pb-summary-full">
                    <span className="pb-summary-label">Requirements</span>
                    <p className="pb-summary-text">{call.requirements}</p>
                  </div>
                )}
                {call.remarks && (
                  <div className="pb-summary-full">
                    <span className="pb-summary-label">Remarks</span>
                    <p className="pb-summary-text">{call.remarks}</p>
                  </div>
                )}
              </div>
              <button className="btn btn-primary pb-btn-convert" onClick={handleConvertToPrompt}>
                Convert to Prompt
              </button>
            </>
          ) : (
            <p className="pb-no-data">No call data found for this lead.</p>
          )}
        </div>
      )}

      {/* Step 2: Edit Prompt */}
      {step === 2 && (
        <div className="pb-card">
          <h2 className="pb-card-title">Step {hasLead ? '2' : '1'}: Edit Prompt</h2>
          <p className="pb-card-desc">
            {hasLead && prompt
              ? 'Review and refine the auto-generated prompt below, then generate.'
              : 'Describe the trip in plain English. The AI will create the quotation, map activities to the catalog, and fill in pricing.'}
          </p>

          <div className="field">
            <label htmlFor="pb-prompt">Prompt</label>
            <textarea
              id="pb-prompt"
              className="pb-textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Create a 5-day Dubai trip for 2 adults and 1 child. They want to visit Burj Khalifa, go on a Desert Safari, and need airport transfers."
              rows={8}
            />
          </div>

          <div className="pb-generate-row">
            <div className="field pb-provider-field">
              <label htmlFor="pb-provider">AI Provider</label>
              <select
                id="pb-provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              >
                <option value="openai">OpenAI (GPT-4o)</option>
                <option value="openai-mini">OpenAI (GPT-4o Mini)</option>
                <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite</option>
                <option value="groq">Groq (Qwen 3.8 27B)</option>
                <option value="claude">Claude</option>
              </select>
            </div>

            <button
              className="btn btn-primary pb-btn-generate"
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
            >
              {generating ? (
                <>
                  <span className="pb-spinner pb-spinner-sm" />
                  Generating...
                </>
              ) : (
                'Generate Quotation'
              )}
            </button>
          </div>

          {(generating || progress > 0) && progress < 100 && (
            <div className="pb-progress-container" style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--app-muted)', marginBottom: '4px' }}>
                <span>Generating your quotation...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--color-hairline)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--color-brand-teal)', transition: 'width 0.5s ease-out' }} />
              </div>
            </div>
          )}

          {hasLead && (
            <button className="btn pb-btn-back" onClick={() => setStep(1)}>
              Back to Call Data
            </button>
          )}
        </div>
      )}

      {/* Step 3: Result */}
      {step === 3 && (
        <div className="pb-card">
          <h2 className="pb-card-title">Step {hasLead ? '3' : '2'}: Result</h2>

          {generating && (
            <div className="pb-loading">
              <div className="pb-spinner" />
              <span>Generating quotation...</span>
            </div>
          )}

          {genError && (
            <div className="pb-error">
              <p className="pb-error-text">{genError}</p>
              <button className="btn btn-primary" onClick={handleRetry}>
                Retry
              </button>
            </div>
          )}

          {result && (
            <>
              <div className="pb-result-summary">
                <div className="pb-result-grid">
                  <div className="pb-result-stat">
                    <span className="pb-result-stat-value">{result.days}</span>
                    <span className="pb-result-stat-label">Days</span>
                  </div>
                  <div className="pb-result-stat">
                    <span className="pb-result-stat-value">{result.lines}</span>
                    <span className="pb-result-stat-label">Lines</span>
                  </div>
                  <div className="pb-result-stat">
                    <span className="pb-result-stat-value">{result.grounded}</span>
                    <span className="pb-result-stat-label">Grounded</span>
                  </div>
                  <div className="pb-result-stat">
                    <span className="pb-result-stat-value">{result.unpriced}</span>
                    <span className="pb-result-stat-label">Unpriced</span>
                  </div>
                </div>
              </div>

              {result.warnings && result.warnings.length > 0 && (
                <div className="warnings">
                  <strong>AI Warnings</strong>
                  <ul>
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pb-result-actions">
                <a
                  href={`/edit/${result.quotationId}`}
                  className="btn btn-primary"
                >
                  Open in Editor
                </a>
                <button className="btn" onClick={handleGenerateAnother}>
                  Generate Another Version
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* Small helper for the read-only summary fields in step 1 */
function SummaryField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="pb-summary-item">
      <span className="pb-summary-label">{label}</span>
      <span className="pb-summary-value">{value || '-'}</span>
    </div>
  );
}
