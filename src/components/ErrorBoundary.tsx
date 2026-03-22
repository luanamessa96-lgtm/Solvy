import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: unknown): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Uncaught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center gap-6 p-8 bg-slate-50">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-2xl">⚠️</div>
          <div className="text-center space-y-2">
            <h2 className="text-lg font-bold text-slate-900">Qualcosa è andato storto</h2>
            <p className="text-sm text-slate-500">L'app ha incontrato un errore imprevisto.</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/30 active:scale-95 transition-all"
          >
            Ricarica l'app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
