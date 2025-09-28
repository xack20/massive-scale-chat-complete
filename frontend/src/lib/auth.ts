import { api } from './api';

function hasWindow() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  avatar?: string;
}

export const auth = {
  async login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password }).catch(err => {
      // Surface additional info for tests when running headless
      // eslint-disable-next-line no-console
      console.error('[auth.login] failed', err?.response?.status, err?.response?.data);
      throw err;
    });
    const { token, user } = response.data;
    if (hasWindow()) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
    return { token, user };
  },

  async register(data: { email: string; password: string; username: string; fullName: string }) {
    const response = await api.post('/auth/register', data).catch(err => {
      // eslint-disable-next-line no-console
      console.error('[auth.register] failed', err?.response?.status, err?.response?.data);
      throw err;
    });
    const { token, user } = response.data;
    if (hasWindow()) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
    return { token, user };
  },

  logout() {
    if (hasWindow()) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
  },

  getUser(): User | null {
  if (!hasWindow()) return null;
  const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken(): string | null {
  if (!hasWindow()) return null;
  return localStorage.getItem('token');
  },

  isAuthenticated(): boolean {
    if (!hasWindow()) return false;
    return !!this.getToken();
  }
};
