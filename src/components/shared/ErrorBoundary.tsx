import React from 'react';

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-gray-400">
          <div className="text-center">
            <p className="text-sm mb-2">حدث خطأ غير متوقع</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors duration-[600ms]"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
