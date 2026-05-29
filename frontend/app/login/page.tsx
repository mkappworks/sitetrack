'use client';

import { Suspense, useEffect, useState, FormEvent } from 'react';
import { signIn, signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Set by requireAuthedSession when it bounces a dead/errored session here.
  const expired = searchParams.get('expired') === '1';
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // An RSC render couldn't clear the stale cookie, so do it here before the
    // user re-auths. redirect:false keeps us on the login page (no bounce).
    if (expired) {
      void signOut({ redirect: false });
    }
  }, [expired]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const form = new FormData(e.currentTarget);
    const result = await signIn('credentials', {
      email: form.get('email'),
      password: form.get('password'),
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError('Invalid email or password');
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">SiteTrack</h1>
          <p className="text-sm text-gray-500 mt-1">Construction project management</p>
        </div>

        <div className="card">
          {expired && !error && (
            <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg mb-4">
              Your session expired. Please sign in again.
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="input"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="label">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="input"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Demo: admin@sitetrack.com / password123
        </p>
      </div>
    </div>
  );
}

// useSearchParams requires a Suspense boundary to keep the rest of the tree
// static-renderable.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
