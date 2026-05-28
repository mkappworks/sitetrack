'use client';

import { useEffect } from 'react';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
}

export function ErrorState({ error, reset, title = 'Something went wrong' }: Props) {
  // Log the boundary catch so the dev console (or future Sentry sink) has
  // the stack. `digest` correlates with the server-side log when SSR threw.
  useEffect(() => {
    console.error('[ErrorBoundary]', error);
  }, [error]);

  return (
    <div className="card max-w-md mx-auto text-center my-12">
      <div className="mx-auto h-10 w-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-lg mb-3">
        !
      </div>
      <h1 className="text-base font-semibold text-gray-900">{title}</h1>
      <p className="text-sm text-gray-500 mt-1">
        {error.message || 'Please try again.'}
      </p>
      {error.digest && (
        <p className="text-xs text-gray-400 mt-2 font-mono">
          ref: {error.digest}
        </p>
      )}
      <button onClick={reset} className="btn-primary mt-4 text-sm">
        Try again
      </button>
    </div>
  );
}
