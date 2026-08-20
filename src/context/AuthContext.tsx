import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../services/supabaseClient';

interface AuthResult {
  error: string | null;
  needsEmailConfirmation?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthLoading: boolean;
  isSupabaseConfigured: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, name: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;

    (async () => {
      const client = await getSupabase();
      if (cancelled) return;

      if (!client) {
        setIsAuthLoading(false);
        return;
      }

      const { data } = await client.auth.getSession();
      if (cancelled) return;
      setSession(data.session);
      setIsAuthLoading(false);

      const { data: sub } = client.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
        setIsAuthLoading(false);
      });
      subscription = sub.subscription;
    })();

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const client = await getSupabase();
      if (!client) return { error: 'Supabase no está configurado.' };
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        return {
          error:
            error.message === 'Invalid login credentials'
              ? 'Correo o contraseña incorrectos.'
              : error.message,
        };
      }
      return { error: null };
    },
    []
  );

  const signUp = useCallback(
    async (email: string, password: string, name: string): Promise<AuthResult> => {
      const client = await getSupabase();
      if (!client) return { error: 'Supabase no está configurado.' };
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: name.trim() || null },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        return { error: error.message };
      }
      // Si la confirmación por correo está activada, no habrá sesión inmediata
      if (data.session) {
        return { error: null };
      }
      return {
        error: null,
        needsEmailConfirmation: true,
      };
    },
    []
  );

  const signOut = useCallback(async () => {
    const client = await getSupabase();
    await client?.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      session,
      isAuthLoading,
      isSupabaseConfigured,
      signIn,
      signUp,
      signOut,
    }),
    [session, isAuthLoading, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
