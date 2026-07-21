'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from '@/lib/supabase/client';
import { migrateLocalHistory } from '@/lib/history-sync';
import { isNativeApp, AUTH_DEEPLINK } from '@/lib/platform';
import { configurePurchases, logOutPurchases } from '@/lib/purchases';
import { logBreadcrumb } from '@/lib/observability/client';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
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
  signInWithApple: async () => {},
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

  // capacitor:// 커스텀 오리진(iOS)에서 쿠키/스토리지가 조용히 실패하는 사례 대비 —
  // 설정값이 아니라 런타임 실측 오리진을 근거로 남긴다(플랫폼 무관, 비교 기준선 확보).
  useEffect(() => {
    logBreadcrumb('runtime-origin', { origin: window.location.origin, isNative: isNativeApp() });
  }, []);

  useEffect(() => {
    if (!isNativeApp()) return; // 웹 경로에서는 이 코드가 실행되지 않음

    const handleDeepLink = (url: string) => {
      if (!url.startsWith(AUTH_DEEPLINK)) return;
      const code = new URL(url).searchParams.get('code');
      if (!code) return;
      supabase.auth
        .exchangeCodeForSession(code)
        .finally(() => {
          Browser.close().catch(() => {}); // 이미 닫혀있을 수 있음 — 무해 실패 허용
          window.location.replace('/');
        });
    };

    const listenerPromise = App.addListener('appUrlOpen', ({ url }) => handleDeepLink(url));
    App.getLaunchUrl().then((result) => {
      if (result?.url) handleDeepLink(result.url);
    });

    return () => {
      listenerPromise.then((listener) => listener.remove());
    };
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

  // AuthResumeSync — iOS는 장기 백그라운드 후 앱을 몰래 재시작하고 "복귀"로 위장할 수 있어
  // 인증/크레딧 상태가 저장소와 어긋날 수 있다. 네이티브는 App 'resume', 웹은 visibilitychange로
  // 세션·크레딧을 재확인한다. onAuthStateChange와 별개 경로 — 세션 재확인 자체는 저비용이라
  // 짧은 쿨다운으로만 중복 폭주를 막고(가드), user 갱신은 기존과 동일한 id 동일성 체크로 불필요한
  // 다운스트림 effect 재실행을 막는다.
  useEffect(() => {
    let lastResync = 0;
    const resync = async () => {
      const now = Date.now();
      if (now - lastResync < 2000) return;
      lastResync = now;

      const { data: { session } } = await supabase.auth.getSession();
      const nextUser = session?.user ?? null;
      setUser(prev => (prev?.id === nextUser?.id ? prev : nextUser));
      if (nextUser) void refreshCredits();
    };

    if (isNativeApp()) {
      const listenerPromise = App.addListener('resume', resync);
      return () => {
        listenerPromise.then((listener) => listener.remove());
      };
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void resync();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) {
      refreshCredits();
      // 첫 로그인 1회: localStorage 진단 히스토리 → 서버 이관 (flag/idempotent, 실패 무시)
      void migrateLocalHistory(user.id);
      void configurePurchases(user.id); // 네이티브+키 없으면 no-op
    } else {
      setCredits(null);
      void logOutPurchases();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const signInWithGoogle = async () => {
    if (isNativeApp()) {
      const { data } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: AUTH_DEEPLINK, skipBrowserRedirect: true },
      });
      if (data?.url) await Browser.open({ url: data.url }); // 시스템 브라우저 — PKCE verifier는 앱 localStorage에 유지됨
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  // App Store 4.8 — 제3자 로그인(구글) 제공 시 Apple 로그인 동등 제공 의무. signInWithGoogle과 동일 구조.
  const signInWithApple = async () => {
    if (isNativeApp()) {
      const { data } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo: AUTH_DEEPLINK, skipBrowserRedirect: true },
      });
      if (data?.url) await Browser.open({ url: data.url });
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: 'apple',
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
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail, signOut, credits, setCredits, refreshCredits }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
