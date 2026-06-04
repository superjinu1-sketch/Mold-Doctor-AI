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
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-canvas">
      <div className="w-8 h-8 border-2 border-border border-t-brand rounded-full animate-spin" />
      <p className="text-muted text-sm">{t('auth.callback_loading')}</p>
    </div>
  );
}
