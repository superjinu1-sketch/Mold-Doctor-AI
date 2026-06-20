'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null; needsConfirm: boolean }>;
  signOut: () => Promise<void>;
  credits: number | null;
  setCredits: (n: number | null) => void;
  refreshCredits: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => ({ error: null }),
  signUpWithEmail: async () => ({ error: null, needsConfirm: false }),
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
    // TOKEN_REFRESHED / tab-focus 이벤트는 동일 유저인데 새 객체를 준다 →
    // id가 같으면 참조를 유지해 불필요한 리렌더·다운스트림 effect 재실행을 막는다 (폼 상태 churn 방지).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const nextUser = session?.user ?? null;
        setUser(prev => (prev?.id === nextUser?.id ? prev : nextUser));
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

  // 이메일/비번 — 기존 구글 OAuth와 병행 추가. onAuthStateChange가 user/credits 자동 갱신.
  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };
  const signUpWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    // Confirm email ON이면 session=null(인증 메일 대기), OFF면 즉시 session 존재.
    return { error: error?.message ?? null, needsConfirm: !error && !data.session };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, credits, setCredits, refreshCredits }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
