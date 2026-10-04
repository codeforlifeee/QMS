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
    <div className="flex flex-col h-full bg-white border-l border-gray-200 w-96 flex-shrink-0">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
        <div className="flex items-center gap-2">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="text-sm border-gray-300 rounded"
          >
            <option value="groq">Groq (Llama)</option>
            <option value="openai">OpenAI (ChatGPT)</option>
            <option value="claude">Claude</option>
            <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
            <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite</option>
          </select>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
            aria-label="Close assistant"
          >
            ×
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {session.turns.length === 0 && (
          <div className="text-sm text-gray-500 text-center mt-8">
            Ask the assistant to search the catalog, add activities, or refine the itinerary.
          </div>
        )}
        {session.turns.map((turn: ChatTurn) => (
          <div
            key={turn.id}
            className={`flex flex-col ${turn.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`p-3 rounded-lg max-w-[85%] ${
                turn.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm">{turn.content}</div>

              {turn.proposedChanges && turn.proposedChanges.length > 0 && (
                <div className="mt-3 space-y-2">
                  {turn.proposedChanges.map((change: ProposedChange, i: number) => (
                    <div
                      key={i}
                      className="bg-white rounded p-2 text-gray-800 border border-gray-200 shadow-sm"
                    >
                      <div className="font-medium text-xs text-blue-600 mb-1">
                        {change.description}
                      </div>
                      {!turn.applied && (
                        <button
                          onClick={() => onApplyChange(change, turn.id)}
                          className="mt-2 w-full bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold py-1.5 px-2 rounded border border-blue-200 transition-colors"
                        >
                          Apply Change
                        </button>
                      )}
                      {turn.applied && (
                        <div className="mt-1 text-xs text-green-600 font-semibold">✓ Applied</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {new Date(turn.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-start">
            <div className="p-3 rounded-lg bg-gray-100 text-gray-600 text-sm animate-pulse">
              AI is thinking…
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask AI to modify quotation… (Enter to send, Shift+Enter for newline)"
            rows={2}
            className="flex-1 rounded border border-gray-300 text-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded px-4 py-2 text-sm font-semibold transition-colors shadow-sm"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
