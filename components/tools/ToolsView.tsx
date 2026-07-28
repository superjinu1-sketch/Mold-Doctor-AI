'use client';

// /tools 본문 — app/tools/page.tsx(서버 컴포넌트, metadata 보유)에서 렌더.
// LocaleContext로 자체 번역(같은 URL, /en/tools 라우트 없음 — /ledger·/tryout·/pricing과 동일 패턴).
import type { ComponentType } from 'react';
import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';
import { IconClipboard, IconCheckSquare, IconFlask, IconBook, type IconProps } from '@/components/icons';

export default function ToolsView() {
  const { t, locale } = useLocale();
  const isEn = locale === 'en';

  const TOOLS: { icon: ComponentType<IconProps>; title: string; desc: string; href: string }[] = [
    {
      icon: IconClipboard,
      title: t('tools.ledger_title'),
      desc: t('tools.ledger_desc'),
      href: '/ledger',
    },
    {
      icon: IconCheckSquare,
      title: t('tools.tryout_title'),
      desc: t('tools.tryout_desc'),
      href: '/tryout',
    },
    {
      icon: IconFlask,
      title: t('tools.resins_title'),
      desc: t('tools.resins_desc'),
      href: isEn ? '/en/resins' : '/resins',
    },
    {
      icon: IconBook,
      title: t('tools.guide_title'),
      desc: t('tools.guide_desc'),
      href: isEn ? '/en/guide' : '/guide',
    },
  ];

  return (
    <div className="bg-canvas min-h-screen px-4 sm:px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-[length:var(--text-h1)] font-bold text-ink mb-2">{t('tools.h1')}</h1>
          <p className="text-muted text-body">{t('tools.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          {TOOLS.map(tool => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="ui-card ui-card-lg p-5 h-full flex flex-col items-start gap-1.5 hover:border-[var(--brand-border)] transition-colors"
              >
                <Icon size={24} className="text-brand" />
                <span className="font-bold text-ink text-body break-keep">{tool.title}</span>
                <span className="text-muted text-label leading-snug">{tool.desc}</span>
              </Link>
            );
          })}
        </div>

        <div className="ui-card ui-card-lg p-6 text-center">
          <p className="text-ink text-body font-bold mb-4">{t('tools.cta_title')}</p>
          <Link href="/diagnose" className="ui-cta w-full sm:w-auto sm:px-10">
            {t('tools.cta_button')}
          </Link>
        </div>
      </div>
    </div>
  );
}
