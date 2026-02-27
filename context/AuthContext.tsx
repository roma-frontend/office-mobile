import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AuthUser {
  userId: string;
  name: string;
  email: string;
  role: 'admin' | 'supervisor' | 'employee';
  department?: string;
  position?: string;
  employeeType?: string;
  avatarUrl?: string;
  travelAllowance?: number;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (token: string, user: AuthUser, expiry: number) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: (user: Partial<AuthUser>) => void;
}

// ── Storage keys ──────────────────────────────────────────────────────────────
export const AUTH_KEYS = {
  TOKEN:    'auth_token',
  EXPIRY:   'auth_expiry',
  USER_ID:  'user_id',
  NAME:     'user_name',
  ROLE:     'user_role',
  EMAIL:    'user_email',
} as const;

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // ── Bootstrap: read session from AsyncStorage on mount ───────────────────
  useEffect(() => {
    (async () => {
      try {
        const [[, token], [, expiry], [, userId], [, name], [, role], [, email]] =
          await AsyncStorage.multiGet([
            AUTH_KEYS.TOKEN,
            AUTH_KEYS.EXPIRY,
            AUTH_KEYS.USER_ID,
            AUTH_KEYS.NAME,
            AUTH_KEYS.ROLE,
            AUTH_KEYS.EMAIL,
          ]);

        // Session expired?
        const expiryMs = expiry ? parseInt(expiry, 10) : 0;
        const isExpired = !expiryMs || Date.now() > expiryMs;

        if (!token || !userId || isExpired) {
          // Wipe stale data silently
          await _clearStorage();
          setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
          return;
        }

        setState({
          token,
          isAuthenticated: true,
          isLoading: false,
          user: {
            userId: userId!,
            name: name ?? '',
            email: email ?? '',
            role: (role ?? 'employee') as AuthUser['role'],
          },
        });
      } catch {
        setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
      }
    })();
  }, []);

  // ── signIn ────────────────────────────────────────────────────────────────
  const signIn = useCallback(async (token: string, user: AuthUser, expiry: number) => {
    await AsyncStorage.multiSet([
      [AUTH_KEYS.TOKEN,   token],
      [AUTH_KEYS.EXPIRY,  String(expiry)],
      [AUTH_KEYS.USER_ID, user.userId],
      [AUTH_KEYS.NAME,    user.name],
      [AUTH_KEYS.ROLE,    user.role],
      [AUTH_KEYS.EMAIL,   user.email],
    ]);
    setState({ user, token, isLoading: false, isAuthenticated: true });
  }, []);

  // ── signOut ───────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    try {
      console.log('[AuthContext] signOut: resetting state...');
      setState({ user: null, token: null, isLoading: false, isAuthenticated: false });

      console.log('[AuthContext] signOut: clearing storage...');
      await _clearStorage();

      // Verify cleared
      const remaining = await AsyncStorage.getItem(AUTH_KEYS.TOKEN);
      console.log('[AuthContext] signOut: token after clear =', remaining);
    } finally {
      console.log('[AuthContext] signOut: navigating to login...');
      router.replace('/(auth)/login');
    }
  }, []);

  // ── refreshUser — update local user data without re-login ─────────────────
  const refreshUser = useCallback((partial: Partial<AuthUser>) => {
    setState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...partial } : prev.user,
    }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
// Explicitly remove all known auth keys — never rely on getAllKeys() which can
// return stale/empty results on some React Native versions.
const AUTH_STORAGE_KEYS: string[] = [
  AUTH_KEYS.TOKEN,
  AUTH_KEYS.EXPIRY,
  AUTH_KEYS.USER_ID,
  AUTH_KEYS.NAME,
  AUTH_KEYS.ROLE,
  AUTH_KEYS.EMAIL,
];

async function _clearStorage() {
  try {
    await AsyncStorage.multiRemove(AUTH_STORAGE_KEYS);
  } catch {
    // Fallback: remove one by one
    for (const key of AUTH_STORAGE_KEYS) {
      try { await AsyncStorage.removeItem(key); } catch { /* ignore */ }
    }
  }
}
