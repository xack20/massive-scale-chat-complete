'use client';

import { useEffect, useState } from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Global error caught:', error);
      setError(new Error(error.message));
      setHasError(true);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      setError(new Error(event.reason?.message || 'Unhandled promise rejection'));
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (hasError) {
    return (
      fallback || (
        <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
          <div className="text-center max-w-md px-6">
            <div className="mb-4 text-red-400 text-6xl">⚠️</div>
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-white/70 mb-6">
              {error?.message || 'An unexpected error occurred while loading the chat application.'}
            </p>
            <button
              onClick={() => {
                setHasError(false);
                setError(null);
                window.location.reload();
              }}
              className="glass-panel px-6 py-3 bg-indigo-500/20 border-indigo-400/30 text-indigo-200 hover:bg-indigo-500/30 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}