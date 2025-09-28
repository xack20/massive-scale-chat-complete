'use client';

// Explicit React import to satisfy TS when jsxImportSource/automatic not resolving types
import * as React from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthInput from '../../components/auth/AuthInput';
import PasswordStrength from '../../components/auth/PasswordStrength';
import { useAuth } from '../../hooks/useAuth';

const PERKS = [
  'Launch dedicated workspaces for teams, clients, and partners',
  'Granular roles, audit trails, and session controls baked in',
  'Unified messaging, voice, video, and files under one beautifully secure roof'
];

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; username?: string; password?: string; confirm?: string }>({});
  const [touched, setTouched] = useState<{ email?: boolean; username?: boolean; password?: boolean; confirm?: boolean }>({});
  const [loading, setLoading] = useState(false);

  // Redirect authenticated users to chat page
  React.useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/chat');
    }
  }, [isAuthenticated, authLoading, router]);

  const validate = useCallback(() => {
    const fe: typeof fieldErrors = {};
    // Only validate if field is not empty
    if (email) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fe.email = 'Enter a valid email address';
    }
    if (username) {
      if (username.length < 3) fe.username = 'Pick a username with at least 3 characters';
    }
    if (password) {
      if (password.length < 8) fe.password = 'Minimum 8 characters for security';
    }
    if (password && confirm) {
      if (password !== confirm) fe.confirm = 'Passwords must match perfectly';
    }
    return fe;
  }, [email, username, password, confirm]);

  const isFormValid = useCallback(() => {
    const errors = validate();
    return email && username && password && confirm && Object.keys(errors).length === 0;
  }, [email, username, password, confirm, validate]);

  useEffect(() => {
    // Only update field errors if fields have been touched
    if (Object.keys(touched).length === 0) {
      // No fields touched yet, don't show any errors
      setFieldErrors({});
      return;
    }
    
    const errors = validate();
    const visibleErrors: typeof fieldErrors = {};
    
    // Only show errors for fields that have been touched
    if (touched.email && errors.email) visibleErrors.email = errors.email;
    if (touched.username && errors.username) visibleErrors.username = errors.username;
    if (touched.password && errors.password) visibleErrors.password = errors.password;
    if (touched.confirm && errors.confirm) visibleErrors.confirm = errors.confirm;
    
    setFieldErrors(visibleErrors);
  }, [email, username, password, confirm, touched, validate]);

  const heroSubtitle = useMemo(() => {
    if (!username) return 'Craft a shared intelligence space for your team, clients, and communities.';
    return `Reserve @${username} and welcome collaborators into a bespoke command center.`;
  }, [username]);

  // Redirect authenticated users to chat page
  React.useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/chat');
    }
  }, [isAuthenticated, authLoading, router]);

  // Show loading spinner while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Don't render register form if user is authenticated (will redirect)
  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Mark all fields as touched to show validation errors
    setTouched({ email: true, username: true, password: true, confirm: true });
    
    if (!isFormValid()) return;
    
    setLoading(true);
    try {
      await register({ email, password, username, fullName: fullName || username });
      setSuccess('Your workspace is live. Redirecting to the experience...');
      setTimeout(() => router.push('/chat'), 600);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error?.response?.data?.message || 'We could not complete your registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-aurora" />
      <div className="absolute inset-0 -z-10 opacity-40">
        <div className="mx-auto h-full max-w-6xl bg-[radial-gradient(circle_at_bottom_left,rgba(129,140,248,0.18),transparent_55%)]" />
      </div>

      <div className="relative z-10 grid min-h-screen gap-10 px-6 py-12 lg:grid-cols-[1fr_1.05fr] lg:px-16">
        <section className="hidden rounded-[32px] border border-white/12 bg-white/5 p-12 text-white shadow-2xl shadow-indigo-900/30 backdrop-blur-3xl lg:flex lg:flex-col lg:justify-between">
          <header className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
              Elite onboarding
            </div>
            <div className="space-y-5">
              <h1 className="text-4xl font-semibold text-white">
                Build a premium collaboration hub in under a minute
              </h1>
              <p className="text-lg text-white/70">{heroSubtitle}</p>
            </div>
          </header>

          <div className="space-y-5">
            {PERKS.map((note) => (
              <div key={note} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                <span className="mt-1 h-2 w-2 rounded-full bg-sky-300" />
                <p className="text-sm leading-relaxed text-white/80">{note}</p>
              </div>
            ))}
          </div>

          <footer className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/50">Security</p>
              <p className="text-lg font-semibold text-white">SOC2 Type II, ISO 27001</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-white/50">Scale</p>
              <p className="text-lg font-semibold text-white">10M+ messages daily</p>
            </div>
          </footer>
        </section>

        <section className="flex items-center justify-center">
          <div className="glass-panel w-full max-w-xl space-y-10 border border-white/15 p-10 text-white shadow-2xl">
            <div className="space-y-3 text-center">
              <h2 className="text-3xl font-semibold tracking-tight">Create your account</h2>
              <p className="text-sm text-white/70">Invite your team, orchestrate launches, and align decisions from one luminous hub.</p>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-5" data-testid="register-form">
              {error && (
                <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100" role="alert" data-testid="error-message">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100" role="status" data-testid="success-message">
                  {success}
                </div>
              )}
              <AuthInput
                type="email"
                label="Work email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                error={fieldErrors.email}
                required
                autoComplete="email"
                data-testid="email-input"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <AuthInput
                  type="text"
                  label="Username"
                  placeholder="your-handle"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onBlur={() => setTouched(prev => ({ ...prev, username: true }))}
                  error={fieldErrors.username}
                  required
                  autoComplete="username"
                  data-testid="username-input"
                />
                <AuthInput
                  type="text"
                  label="Full name"
                  placeholder="Optional"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  data-testid="fullName-input"
                  hint="We’ll use this on your profile and meeting invites."
                />
              </div>
              <AuthInput
                type="password"
                label="Password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                error={fieldErrors.password}
                required
                autoComplete="new-password"
                data-testid="password-input"
                minLength={8}
              />
              {password && <PasswordStrength password={password} />}
              <AuthInput
                type="password"
                label="Confirm password"
                placeholder="Re-type password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onBlur={() => setTouched(prev => ({ ...prev, confirm: true }))}
                error={fieldErrors.confirm}
                required
                autoComplete="new-password"
                data-testid="confirm-password-input"
                minLength={8}
              />
              <button
                type="submit"
                disabled={loading || !isFormValid()}
                className="primary-button w-full justify-center disabled:opacity-60 disabled:grayscale"
                data-testid="register-button"
              >
                {loading ? 'Creating your workspace…' : 'Activate my workspace'}
              </button>
            </form>

            <div className="space-y-4 text-center text-sm text-white/60">
              <p>
                By creating an account, you agree to our{' '}
                <Link href="#" className="text-indigo-200 hover:text-white">Terms of Service</Link>{' '}
                and{' '}
                <Link href="#" className="text-indigo-200 hover:text-white">Privacy Policy</Link>.
              </p>
              <p>
                Already onboard?{' '}
                <Link href="/login" className="text-indigo-200 hover:text-white">Sign in to your suite</Link>.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
