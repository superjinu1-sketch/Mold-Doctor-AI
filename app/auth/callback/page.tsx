'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useLocale } from '@/contexts/LocaleContext';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { t } = useLocale();

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) {
      supabase.auth
        .exchangeCodeForSession(code)
        .finally(() => router.replace('/'));
    } else {
      router.replace('/');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#07090F]">
      <div className="w-8 h-8 border-2 border-white/20 border-t-[#00E887] rounded-full animate-spin" />
      <p className="text-white/40 text-sm">{t('auth.callback_loading')}</p>
    </div>
  );
}
