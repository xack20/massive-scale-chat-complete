import { useState, useEffect } from 'react';
import { auth, User } from '../lib/auth';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = auth.getUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  return {
    user,
    loading,
    isAuthenticated: auth.isAuthenticated(),
    login: auth.login,
    logout: auth.logout,
    register: auth.register
  };
};
