import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
// Initialize Sentry (no-op if REACT_APP_SENTRY_DSN is not provided)
import './sentry';
import App from './App';

// Suppress noisy Chrome ResizeObserver loop errors that can occur with responsive layouts/charts.
// This does NOT hide other errors; it only filters known benign ResizeObserver loop messages.
if (typeof window !== 'undefined') {
  const RO_MESSAGES = [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications.'
  ];

  window.addEventListener('error', (e: ErrorEvent) => {
    const msg = e.message || '';
    if (RO_MESSAGES.some((m) => msg.includes(m))) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  });

  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
    const reason: unknown = e.reason;
    const msg =
      (reason && typeof reason === 'object' && (reason as any).message) ||
      (typeof reason === 'string' ? reason : '') || '';
    if (RO_MESSAGES.some((m) => typeof msg === 'string' && msg.includes(m))) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  });

  // Additionally, in development some libraries log the ResizeObserver loop message via console.error
  // even when it's benign. Add a very narrow console.error filter to avoid noise in the dev console.
  if (process.env.NODE_ENV === 'development' && typeof console !== 'undefined') {
    const _origConsoleError = console.error.bind(console);
    console.error = (...args: any[]) => {
      try {
        const first = args[0];
        const text = typeof first === 'string' ? first : (first && first.message) ? first.message : '';
        if (typeof text === 'string' && RO_MESSAGES.some(m => text.includes(m))) {
          return; // swallow this known benign message
        }
      } catch (err) {
        // ignore errors while filtering and fall through to original
      }
      _origConsoleError(...args);
    };
  }
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <App />
);