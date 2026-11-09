import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught UI error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-950 p-6 text-center space-y-4">
          <AlertTriangle className="w-16 h-16 text-rose-500" />
          <h1 className="text-xl font-bold text-slate-100">Wystąpił błąd renderowania</h1>
          <p className="text-slate-400 text-sm max-w-md">
            System napotkał błąd krytyczny podczas renderowania komponentu. 
            Przekazuję informację do Triady.
          </p>
          <pre className="text-rose-400 bg-rose-950/30 p-4 rounded text-xs overflow-auto max-w-full">
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Zrestartuj instancję
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
