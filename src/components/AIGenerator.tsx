import React, { useState } from 'react';

export default function AIGenerator() {
  const [prompt, setPrompt] = useState('');
  const [provider, setProvider] = useState('openai');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, provider })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate quotation');
      
      // Redirect to the newly generated quotation edit page
      window.location.href = `/edit/${data.quotationId}`;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #eaeaea', marginBottom: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', marginTop: 0 }}>✨ Generate with AI</h2>
      <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px', marginTop: 0 }}>
        Describe the trip in plain English and the AI will automatically create the quotation, map the activities to the catalog, and fill in the pricing.
      </p>
      <form onSubmit={handleGenerate} style={{ display: 'flex', gap: '16px' }}>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="e.g., Create a 5-day Dubai trip for 2 adults and 1 child. They want to visit Burj Khalifa, go on a Desert Safari, and need airport transfers."
          style={{ flex: 1, padding: '12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px', minHeight: '80px', fontFamily: 'inherit' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignSelf: 'flex-start' }}>
          <select 
            value={provider} 
            onChange={e => setProvider(e.target.value)}
            style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px', width: '100%' }}
          >
            <option value="openai">OpenAI (ChatGPT)</option>
            <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
            <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite</option>
            <option value="groq">Groq (Llama)</option>
            <option value="claude">Claude</option>
          </select>
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="btn btn-primary"
            style={{ padding: '12px 24px', opacity: loading || !prompt.trim() ? 0.6 : 1, width: '100%', whiteSpace: 'nowrap' }}
          >
            {loading ? 'Generating...' : 'Generate Quotation'}
          </button>
        </div>
      </form>
      {error && <div style={{ marginTop: '12px', color: '#dc2626', fontSize: '14px', fontWeight: 500 }}>{error}</div>}
    </div>
  );
}
