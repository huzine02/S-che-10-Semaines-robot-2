import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <div className="text-4xl mb-4">💥</div>
          <h1 className="font-display font-bold text-2xl text-[#0F2C59] mb-2">Oups, petit problème technique</h1>
          <p className="text-slate-500 mb-6 text-sm">Une erreur est survenue. Essayez de rafraîchir la page.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-[#0F2C59] text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-[#163A70] transition-colors"
          >
            Rafraîchir l'application
          </button>
          <pre className="mt-8 p-4 bg-slate-100 rounded-lg text-xs text-red-500 overflow-auto max-w-full text-left">
            {this.state.error?.message}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}