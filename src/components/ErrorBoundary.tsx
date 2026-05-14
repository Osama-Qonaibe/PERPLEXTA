import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary] [${this.props.name || 'General'}] Caught error:`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 min-h-[200px] bg-[var(--bg-secondary)] border border-red-500/20 rounded-[var(--radius)] m-4">
          <div className="w-12 h-12 rounded-[var(--radius)] bg-red-500/10 flex items-center justify-center text-red-500 mb-4 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2 uppercase tracking-tight">
            {this.props.name ? `${this.props.name} Component Error` : 'Unexpected System Error'}
          </h2>
          <p className="text-sm text-[var(--text-muted)] mb-6 text-center max-w-md">
            The system encountered a processing conflict. Your data remains secure. Please try refreshing or clearing the current task.
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-500 text-white font-bold rounded-[var(--radius)] hover:bg-emerald-600 transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-105"
          >
            <RefreshCw size={16} />
            <span>ACTIVATE RECOVERY</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
