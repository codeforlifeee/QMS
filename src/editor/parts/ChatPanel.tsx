import React, { useEffect, useRef, useState } from 'react';
import type { ChatSession, ProposedChange, ChatTurn } from '../../ai/chat/types.js';

interface ChatPanelProps {
  session: ChatSession;
  onSend: (message: string, provider: string) => Promise<void>;
  onApplyChange: (change: ProposedChange, turnId: string) => void;
  onClose: () => void;
}

export function ChatPanel({ session, onSend, onApplyChange, onClose }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState(session.provider || 'groq');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [session.turns.length, loading]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setInput('');
    try {
      await onSend(trimmed, provider);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="inline-panel chat-panel">
      <div className="inline-panel-header chat-header">
        <div className="inline-panel-title">
          <span className="inline-panel-icon">AI</span>
          <span>Assistant</span>
        </div>
        <div className="inline-panel-controls">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="chat-provider-select"
          >
            <option value="groq">Groq (Llama)</option>
            <option value="openai">OpenAI (ChatGPT)</option>
            <option value="claude">Claude</option>
            <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
            <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite</option>
          </select>
          <button onClick={onClose} className="inline-panel-close" aria-label="Close assistant">
            &times;
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="chat-messages">
        {session.turns.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-icon">?</div>
            <p>Ask the assistant to search the catalog, add activities, or refine your itinerary.</p>
          </div>
        )}
        {session.turns.map((turn: ChatTurn) => (
          <div key={turn.id} className={`chat-bubble-wrap ${turn.role}`}>
            <div className={`chat-bubble ${turn.role}`}>
              <div className="chat-bubble-text">{turn.content}</div>
              {turn.proposedChanges && turn.proposedChanges.length > 0 && (
                <div className="chat-changes">
                  {turn.proposedChanges.map((change: ProposedChange, i: number) => (
                    <div key={i} className="chat-change-card">
                      <div className="chat-change-desc">{change.description}</div>
                      {!turn.applied && (
                        <button
                          onClick={() => onApplyChange(change, turn.id)}
                          className="chat-apply-btn"
                        >
                          Apply Change
                        </button>
                      )}
                      {turn.applied && (
                        <div className="chat-applied">Applied</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="chat-time">
              {new Date(turn.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-bubble-wrap assistant">
            <div className="chat-bubble assistant chat-thinking">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
      </div>

      <div className="chat-input-area">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask AI to modify quotation..."
          rows={2}
          className="chat-input"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="chat-send-btn"
        >
          Send
        </button>
      </div>
    </div>
  );
}
