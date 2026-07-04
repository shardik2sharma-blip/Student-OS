import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getItem, setItem, removeItem } from '@/storage/storage';

export type User = {
  id: string;
  name: string;
  email: string;
  college: string;
  semester: number;
  profilePic: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasSeenOnboarding: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, college: string, semester: number) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  markOnboardingSeen: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    (async () => {
      const [storedUser, seen] = await Promise.all([
        getItem<User | null>('auth_user', null),
        getItem<boolean>('has_seen_onboarding', false),
      ]);
      setUser(storedUser);
      setHasSeenOnboarding(seen);
      setIsLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, _password: string) => {
    const existing = await getItem<User | null>('auth_user', null);
    // Only reuse stored user if the email matches exactly
    if (existing && existing.email.toLowerCase() === email.toLowerCase().trim()) {
      setUser(existing);
    } else {
      // Create a fresh user for this email identity
      const newUser: User = {
        id: `user_${Date.now()}`,
        name: email.split('@')[0],
        email: email.trim(),
        college: '',
        semester: 1,
        profilePic: '',
      };
      await setItem('auth_user', newUser);
      setUser(newUser);
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, college: string, semester: number) => {
    const newUser: User = {
      id: `user_${Date.now()}`,
      name,
      email,
      college,
      semester,
      profilePic: '',
    };
    await setItem('auth_user', newUser);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    await removeItem('auth_user');
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    await setItem('auth_user', updated);
    setUser(updated);
  }, [user]);

  const markOnboardingSeen = useCallback(async () => {
    await setItem('has_seen_onboarding', true);
    setHasSeenOnboarding(true);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      hasSeenOnboarding,
      login,
      signup,
      logout,
      updateProfile,
      markOnboardingSeen,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
