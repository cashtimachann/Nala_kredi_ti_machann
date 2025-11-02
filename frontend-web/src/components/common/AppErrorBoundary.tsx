import React from 'react';
import * as Sentry from '@sentry/react';

type Props = {
  children: React.ReactNode;
};

const Fallback: React.FC<{ error?: Error }> = ({ error }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
    <div className="max-w-lg w-full bg-white border border-gray-200 rounded-xl p-6 text-center">
      <h1 className="text-xl font-semibold text-red-600 mb-2">Yon erè rive nan aplikasyon an</h1>
      <p className="text-gray-700 mb-4">
        Tanpri rafrechi paj la. Si pwoblèm nan pèsiste, kontakte sipò.
      </p>
      {error && (
        <pre className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md overflow-auto max-h-40">{error.message}</pre>
      )}
      <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
        Rafrechi paj la
      </button>
    </div>
  </div>
);

export const AppErrorBoundary: React.FC<Props> = ({ children }) => {
  // Always safe to wrap; Sentry.init is gated in src/sentry.ts
  return (
    <Sentry.ErrorBoundary fallback={({ error }) => <Fallback error={error as any} />}>
      {children}
    </Sentry.ErrorBoundary>
  );
};

export default AppErrorBoundary;
