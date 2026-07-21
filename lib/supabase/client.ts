import { createClient } from '@supabase/supabase-js';
import type { SupportedStorage } from '@supabase/supabase-js';

// capacitor:// 커스텀 오리진(iOS)에서는 쿠키 기반 세션 저장이 조용히 실패할 수 있어
// localStorage 스토리지를 결정론적으로 명시(기본 자동감지 의존 금지). 웹은 기존과 동일하게
// window.localStorage를 쓰므로 웹 동작 회귀는 없음. SSR(서버 렌더)엔 window가 없어 no-op으로 폴백.
const noopStorage: SupportedStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  isServer: true,
};

const authStorage: SupportedStorage = typeof window !== 'undefined' ? window.localStorage : noopStorage;

// Browser-side singleton (anon key, localStorage session)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      storage: authStorage,
    },
  }
);
