import { useState, useEffect, useCallback } from 'react';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

let toastId = 0;
let listeners: Array<(t: ToastItem) => void> = [];

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const item: ToastItem = { id: ++toastId, message, type };
  listeners.forEach((fn) => fn(item));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((t: ToastItem) => {
    setToasts((prev) => [...prev, t]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== t.id));
    }, 4000);
  }, []);

  useEffect(() => {
    listeners.push(addToast);
    return () => {
      listeners = listeners.filter((fn) => fn !== addToast);
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{t.message}</span>
          <button
            className="toast-close"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
