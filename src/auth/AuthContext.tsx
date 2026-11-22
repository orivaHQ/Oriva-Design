import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface AuthValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let live = true;
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (live) {
          if (error) console.error('Session could not be restored:', error.message);
          setSession(data.session);
          setLoading(false);
        }
      })
      .catch(cause => {
        if (!live) return;
        console.error('Session could not be restored:', cause instanceof Error ? cause.message : cause);
        setSession(null);
        setLoading(false);
      });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => {
      live = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthValue>(() => ({
    user: session?.user ?? null,
    session,
    loading,
    configured: isSupabaseConfigured,
    signIn: async (email, password) => {
      if (!supabase) throw new Error('Supabase is not configured yet.');
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    },
    signUp: async (email, password) => {
      if (!supabase) throw new Error('Supabase is not configured yet.');
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) throw error;
      return Boolean(data.session);
    },
    signOut: async () => {
      if (!supabase) return;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  }), [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
