// Optional Sentry monitoring. Initializes only if REACT_APP_SENTRY_DSN is provided.
// Keep it lightweight and safe in all environments.

import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

const dsn = process.env.REACT_APP_SENTRY_DSN;

if (dsn) {
  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      integrations: [new BrowserTracing()],
      // Set this to a low value by default; adjust via env REACT_APP_SENTRY_TRACES_SAMPLE_RATE
      tracesSampleRate: Number(process.env.REACT_APP_SENTRY_TRACES_SAMPLE_RATE ?? 0),
      // Capture errors in production only by default; adjust via env if needed
      replaysSessionSampleRate: 0,
    });
  } catch (e) {
    // Do not break the app if Sentry fails to initialize
    console.warn('Sentry initialization failed:', e);
  }
}
