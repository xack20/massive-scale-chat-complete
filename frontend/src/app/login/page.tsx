'use client';

// Explicit React import to satisfy TS when jsxImportSource/automatic not resolving types
import * as React from 'react';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import AuthInput from '../../components/auth/AuthInput';
import PasswordStrength from '../../components/auth/PasswordStrength';
import { useAuth } from '../../hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const fe: { email?: string; password?: string } = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fe.email = 'Invalid email format';
    if (password.length < 6) fe.password = 'Minimum 6 characters';
    setFieldErrors(fe);
    return Object.keys(fe).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    try {
      await login(email, password);
      router.push('/chat');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <h2 className="text-center text-3xl font-bold">Sign in</h2>
        <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
          {error && <div className="text-red-500" role="alert" data-testid="error-message">{error}</div>}
          <AuthInput
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            required
            data-testid="email-input"
          />
          <AuthInput
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            required
            data-testid="password-input"
          />
          {password && <PasswordStrength password={password} />}
          <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded" data-testid="login-button">
            Sign In
          </button>
        </form>
        <p className="text-center text-sm text-gray-600">
          Don&apos;t have an account? <a href="/register" className="text-blue-600 hover:underline" data-testid="register-link">Register</a>
        </p>
      </div>
    </div>
  );
}
