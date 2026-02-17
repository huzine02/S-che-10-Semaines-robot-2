import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <div className="text-4xl mb-4">💥</div>
          <h1 className="font-display font-bold text-2xl text-[#0F2C59] mb-2">Oups, petit problème technique</h1>
          <p className="text-slate-500 mb-6 text-sm">Une erreur est survenue. Essayez de rafraîchir la page.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-[#0F2C59] text-white px-6 py-3 rounded-xl font-bold shadow-lg"
          >
            Rafraîchir l'application
          </button>
          <pre className="mt-8 p-4 bg-slate-100 rounded-lg text-xs text-red-500 overflow-auto max-w-full">
            {this.state.error?.message}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}