'use client';

// Explicit React import to satisfy TS when jsxImportSource/automatic not resolving types
import * as React from 'react';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AuthInput from '../../components/auth/AuthInput';
import PasswordStrength from '../../components/auth/PasswordStrength';
import { useAuth } from '../../hooks/useAuth';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{email?: string; username?: string; password?: string; confirm?: string}>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const fe: typeof fieldErrors = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fe.email = 'Invalid email';
    if (!username || username.length < 3) fe.username = 'Min 3 chars';
    if (password.length < 8) fe.password = 'Min 8 chars';
    if (password !== confirm) fe.confirm = 'Passwords do not match';
    setFieldErrors(fe);
    return Object.keys(fe).length === 0;
  };

  useEffect(() => { validate(); /* revalidate on changes */ }, [email, username, password, confirm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!validate()) return;
    setLoading(true);
    try {
      await register({ email, password, username, fullName: fullName || username });
      setSuccess('Registration successful');
      setTimeout(() => router.push('/chat'), 400);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <h2 className="text-center text-3xl font-bold">Create account</h2>
        <form onSubmit={handleSubmit} className="space-y-4" data-testid="register-form">
          {error && <div className="text-red-500" role="alert" data-testid="error-message">{error}</div>}
          {success && <div className="text-green-600" role="status" data-testid="success-message">{success}</div>}
          <AuthInput
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            error={fieldErrors.email}
            required
            data-testid="email-input"
          />
          <AuthInput
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            error={fieldErrors.username}
            required
            data-testid="username-input"
          />
          <AuthInput
            type="text"
            placeholder="Full name (optional)"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            data-testid="fullName-input"
          />
          <AuthInput
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            error={fieldErrors.password}
            required
            data-testid="password-input"
            minLength={8}
          />
          <PasswordStrength password={password} />
          <AuthInput
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            error={fieldErrors.confirm}
            required
            data-testid="confirm-password-input"
            minLength={8}
          />
          <button
            type="submit"
            disabled={loading || Object.keys(fieldErrors).length > 0}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white p-2 rounded"
            data-testid="register-button"
          >
            {loading ? 'Creating...' : 'Register'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}
