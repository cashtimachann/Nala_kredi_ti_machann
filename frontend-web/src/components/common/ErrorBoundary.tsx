import React from 'react';

interface ErrorBoundaryState { hasError: boolean; error?: any }

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded">
          <h2 className="text-red-700 font-semibold mb-2">Une erreur est survenue</h2>
          <p className="text-sm text-red-600 mb-4">Veuillez recharger la page ou contacter le support.</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 text-white rounded text-sm">Recharger</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;