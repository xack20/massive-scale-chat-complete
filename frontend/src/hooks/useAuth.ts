import { useCallback, useEffect, useState } from 'react';
import { auth, User } from '../lib/auth';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to update user state from localStorage
  const updateUserFromStorage = useCallback(() => {
    const currentUser = auth.getUser();
    setUser(currentUser);
  }, []);

  useEffect(() => {
    // Initial load
    updateUserFromStorage();
    setLoading(false);

    // Listen for storage changes (for cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' || e.key === 'token') {
        updateUserFromStorage();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [updateUserFromStorage]);

  // Wrapped login function that updates local state
  const login = useCallback(async (email: string, password: string) => {
    const result = await auth.login(email, password);
    setUser(result.user);
    return result;
  }, []);

  // Wrapped register function that updates local state
  const register = useCallback(async (data: { email: string; password: string; username: string; fullName: string }) => {
    const result = await auth.register(data);
    setUser(result.user);
    return result;
  }, []);

  // Wrapped logout function that updates local state
  const logout = useCallback(() => {
    auth.logout();
    setUser(null);
  }, []);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    register
  };
};
