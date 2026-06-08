'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  credits: number | null;
  setCredits: (n: number | null) => void;
  refreshCredits: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  credits: null,
  setCredits: () => {},
  refreshCredits: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    // Read existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Subscribe to auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const refreshCredits = async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) { setCredits(null); return; }
    const { data } = await supabase
      .from('user_credits')
      .select('credit_balance')
      .eq('user_id', u.id)
      .maybeSingle();
    setCredits(data?.credit_balance ?? null);
  };

  useEffect(() => {
    if (user) { refreshCredits(); } else { setCredits(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut, credits, setCredits, refreshCredits }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
