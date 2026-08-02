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

/**
 * Reports the caught error to the server so it appears in pm2 logs
 * even when the browser console is silenced in production.
 * Fire-and-forget — never throws, never blocks rendering.
 */
function reportToServer(name: string, error: Error, errorInfo: ErrorInfo): void {
  try {
    fetch('/api/system/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boundary: name,
        message:  error.message,
        stack:    error.stack?.slice(0, 2000),
        componentStack: errorInfo.componentStack?.slice(0, 2000),
        url:      window.location.href,
        ts:       new Date().toISOString(),
      }),
    }).catch(() => { /* server unreachable — ignore */ });
  } catch {
    // never let the reporter itself crash
  }
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
    const boundaryName = this.props.name || 'General';
    // console.error is kept alive in production (see main.tsx) so this line
    // always reaches the browser devtools AND the server-side reporter below.
    console.error(`[ErrorBoundary] [${boundaryName}] Caught error:`, error, errorInfo);
    reportToServer(boundaryName, error, errorInfo);
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
            className="flex items-center gap-2 px-6 py-2 bg-emerald-500 text-white font-bold rounded-[var(--radius)] hover:bg-emerald-600 transition-theme shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-105"
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
