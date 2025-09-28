'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    bio: '',
    email: '',
    avatar: ''
  });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  // Change password state
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    // Wait for authentication to complete
    if (authLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }

    // Fetch full profile
    fetchProfile();
  }, [user, router, authLoading]);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/users/profile');
      setFormData(response.data);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await api.put('/users/profile', formData);
      
      if (avatar) {
        const formData = new FormData();
        formData.append('avatar', avatar);
        await api.post('/users/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setMessage('Profile updated successfully!');
      setEditing(false);
      fetchProfile();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatar(e.target.files[0]);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    const password = prompt('Please enter your password to confirm:');
    if (!password) return;

    try {
      await api.delete('/users/account', { data: { password } });
      logout();
      router.push('/');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete account';
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || errorMessage);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setError('New passwords do not match');
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(passwordForm.newPassword)) {
      setError('Password must be at least 8 chars, include upper, lower and number');
      return;
    }
    setPwLoading(true);
    try {
      await api.post('/users/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setMessage('Password changed successfully');
      setChangingPassword(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to change password';
      setError(errorMessage);
    } finally {
      setPwLoading(false);
    }
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <a 
                href="/chat" 
                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
              >
                ← Back to Chat
              </a>
              <h1 className="text-2xl font-bold">Profile Settings</h1>
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Edit Profile
              </button>
            )}
          </div>

          {message && (
            <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center space-x-6">
              <div className="shrink-0">
                <Image
                  className="h-20 w-20 rounded-full object-cover"
                  src={formData.avatar || '/default-avatar.png'}
                  alt="Profile"
                  width={80}
                  height={80}
                />
              </div>
              {editing && (
                <label className="block">
                  <span className="sr-only">Choose profile photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                </label>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  disabled={!editing}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  disabled={!editing}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Bio
              </label>
              <textarea
                rows={4}
                value={formData.bio || ''}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                disabled={!editing}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                placeholder="Tell us about yourself..."
              />
            </div>

            {editing && (
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </form>

          {/* Change Password Section */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Change Password</h2>
              {!changingPassword && (
                <button
                  onClick={() => setChangingPassword(true)}
                  className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Edit
                </button>
              )}
            </div>
            {changingPassword && (
              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Password</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">New Password</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirmNewPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmNewPassword: e.target.value })}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => { setChangingPassword(false); setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' }); }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pwLoading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {pwLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Account Actions */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Account Actions</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Sign Out</h3>
                  <p className="text-sm text-gray-500">Sign out of your account on this device</p>
                </div>
                <button
                  onClick={logout}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Sign Out
                </button>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-red-900">Delete Account</h3>
                    <p className="text-sm text-red-600">Permanently delete your account and all data</p>
                  </div>
                  <button
                    onClick={handleDeleteAccount}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
