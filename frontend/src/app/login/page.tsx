'use client';

// Explicit React import to satisfy TS when jsxImportSource/automatic not resolving types
import * as React from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import AuthInput from '../../components/auth/AuthInput';
import PasswordStrength from '../../components/auth/PasswordStrength';
import { useAuth } from '../../hooks/useAuth';

const HIGHLIGHTS = [
  'AI-powered suggestion engine to draft replies instantly',
  'Enterprise-grade encryption and compliance controls',
  'Live presence, read receipts, and smart notifications'
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const fe: { email?: string; password?: string } = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fe.email = 'Please enter a valid work email';
    if (password.length < 6) fe.password = 'Minimum 6 characters required';
    setFieldErrors(fe);
    return Object.keys(fe).length === 0;
  };

  const suggestions = useMemo(() => {
    if (!email) return 'Secure access to your conversations in a single click.';
    if (email.endsWith('@gmail.com') || email.endsWith('@yahoo.com')) {
      return 'Tip: use your company email to unlock team workspaces and shared history.';
    }
    return 'Looking sharp—your workspace is moments away.';
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    try {
      if (typeof window !== 'undefined') {
        const key = 'msc:session-preference';
        if (remember) sessionStorage.removeItem(key);
        else sessionStorage.setItem(key, 'session-only');
      }
      await login(email, password);
      router.push('/chat');
    } catch (err: any) {
      setError(err.response?.data?.message || 'We could not verify those credentials');
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-aurora" />
      <div className="absolute inset-0 -z-10 opacity-40">
        <div className="mx-auto h-full max-w-6xl bg-[radial-gradient(circle_at_top,rgba(129,140,248,0.22),transparent_55%)]" />
      </div>

      <div className="relative z-10 grid min-h-screen gap-8 px-6 py-12 lg:grid-cols-[1.15fr_1fr] lg:px-16">
        <section className="hidden rounded-[32px] border border-white/10 bg-white/5/50 p-10 text-white shadow-2xl shadow-indigo-900/30 backdrop-blur-3xl lg:flex lg:flex-col lg:justify-between">
          <header className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
              Massive Scale Chat
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight text-white">
                An executive suite for conversations that matter
              </h1>
              <p className="text-lg text-white/70">
                Welcome back to your collaborative command center. Access intelligence-grade messaging, immersive collaboration tools, and a unified inbox tuned for high-performing teams.
              </p>
            </div>
          </header>

          <div className="space-y-5">
            {HIGHLIGHTS.map(item => (
              <div key={item} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                <p className="text-sm leading-relaxed text-white/80">{item}</p>
              </div>
            ))}
          </div>

          <footer className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
            <div>
              <p className="font-semibold text-white">99.99% uptime SLA</p>
              <p>Trusted by product, revenue, and operations teams in 40+ countries.</p>
            </div>
            <div className="hidden text-right md:block">
              <p className="text-xs uppercase tracking-widest text-white/50">Concierge</p>
              <p className="text-lg font-semibold text-white">24/7/365</p>
            </div>
          </footer>
        </section>

        <section className="flex items-center justify-center">
          <div className="glass-panel w-full max-w-md space-y-10 border border-white/15 p-10 text-white shadow-xl">
            <div className="space-y-3 text-center">
              <h2 className="text-3xl font-semibold tracking-tight">Welcome back</h2>
              <p className="text-sm text-white/70">{suggestions}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" data-testid="login-form">
              {error && (
                <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100" role="alert" data-testid="error-message">
                  {error}
                </div>
              )}
              <AuthInput
                type="email"
                label="Email"
                placeholder="team@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={fieldErrors.email}
                hint={!fieldErrors.email ? 'We only use your email to identify your workspace.' : undefined}
                required
                autoComplete="email"
                data-testid="email-input"
              />
              <AuthInput
                type="password"
                label="Password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.password}
                required
                autoComplete="current-password"
                data-testid="password-input"
                minLength={6}
              />

              {password && <PasswordStrength password={password} />}

              <div className="flex items-center justify-between text-sm text-white/60">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-white/10 text-indigo-400 focus:ring-indigo-400/40"
                  />
                  Keep me signed in
                </label>
                <Link href="#" className="text-sm text-indigo-200 hover:text-white/90">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                className="primary-button w-full"
                data-testid="login-button"
              >
                Sign in securely
              </button>
            </form>

            <div className="space-y-4 text-center text-sm text-white/60">
              <button type="button" className="secondary-button w-full justify-center">
                Continue with single sign-on
              </button>
              <p>
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-indigo-200 hover:text-white" data-testid="register-link">
                  Create one in seconds
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
