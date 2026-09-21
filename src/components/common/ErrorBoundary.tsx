import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6 bg-slate-50/70">
          <div className="max-w-lg w-full bg-white p-8 rounded-3xl border border-red-100 shadow-xl text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shadow-inner">
              <AlertTriangle size={32} />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-800 tracking-tight">
                {this.props.fallbackTitle || 'Ha ocurrido un error inesperado'}
              </h2>
              <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                Se detectó una excepción al cargar este componente. Puedes reintentar o recargar la página.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 text-left overflow-x-auto max-h-40 custom-scrollbar">
                <p className="text-[11px] font-mono text-red-800 font-bold whitespace-pre-wrap break-all">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Reintentar
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                <RefreshCw size={14} />
                Recargar Página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
