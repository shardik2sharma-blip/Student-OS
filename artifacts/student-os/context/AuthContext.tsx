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
  /** Returns the stored password hash (for cloud sync). */
  getPasswordHash: () => Promise<string>;
  login: (email: string, password: string) => Promise<{ restored: boolean }>;
  signup: (name: string, email: string, password: string, college: string, semester: number) => Promise<{ restored: boolean }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  markOnboardingSeen: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

/** Simple deterministic hash — consistent across app reinstalls. */
function makeHash(input: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const n = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return n.toString(36).padStart(13, '0');
}

export function hashPassword(email: string, password: string): string {
  return makeHash(`studentos:${email.toLowerCase().trim()}:${password}`);
}

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

  const getPasswordHash = useCallback(async (): Promise<string> => {
    return getItem<string>('auth_password_hash', '');
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ restored: boolean }> => {
    const passwordHash = hashPassword(email, password);
    await setItem('auth_password_hash', passwordHash);

    const existing = await getItem<User | null>('auth_user', null);
    if (existing && existing.email.toLowerCase() === email.toLowerCase().trim()) {
      setUser(existing);
    } else {
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

    // Signal caller to attempt cloud restore
    return { restored: false };
  }, []);

  const signup = useCallback(async (
    name: string,
    email: string,
    password: string,
    college: string,
    semester: number,
  ): Promise<{ restored: boolean }> => {
    const passwordHash = hashPassword(email, password);
    await setItem('auth_password_hash', passwordHash);

    const newUser: User = {
      id: `user_${Date.now()}`,
      name,
      email: email.trim(),
      college,
      semester,
      profilePic: '',
    };
    await setItem('auth_user', newUser);
    setUser(newUser);

    return { restored: false };
  }, []);

  const logout = useCallback(async () => {
    await Promise.all([removeItem('auth_user'), removeItem('auth_password_hash')]);
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
      getPasswordHash,
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
