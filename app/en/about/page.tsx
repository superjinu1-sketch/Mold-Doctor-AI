import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/siteUrl';

// Capacitor 정적 export(output:'export') 호환 — app/sitemap.ts 선례와 동일 원칙 적용.
export const dynamic = 'force-static';

const TITLE = 'About — Mold Doctor';
const DESCRIPTION = "Jinwoo Park worked in injection molding before building Mold Doctor. Notes on what the AI got wrong, and why.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: `${SITE_URL}/en/about`,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    locale: 'en_US',
  },
  // 루트 레이아웃의 twitter 메타는 한국어 고정값 — 영문 페이지에서는 페이지별 영문 title/description으로 덮어쓴다.
  twitter: { card: 'summary', title: TITLE, description: DESCRIPTION },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Jinwoo Park',
  email: 'jinsimlabs@jinsimlabs.com',
  url: `${SITE_URL}/en/about`,
  knowsAbout: ['Injection molding', 'Plastic processing', 'Molding defect analysis'],
  worksFor: {
    '@type': 'Organization',
    name: 'JINSIM.LABS',
    url: SITE_URL,
  },
};

export default function AboutPageEn() {
  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-[65ch] mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-[length:var(--text-h1)] font-bold text-ink mb-6">About</h1>
        <div className="space-y-4">
          <p className="text-body text-muted leading-relaxed">
            I'm Jinwoo Park. I worked in injection molding before I built this app.
          </p>
          <p className="text-body text-muted leading-relaxed">
            Building Mold Doctor meant watching an AI get injection molding wrong, over and over. It would tell you amorphous resins absorb more moisture because they're amorphous. It would blame every bit of surface whitening on glass-filled parts on moisture. It would take a nozzle temperature entered below the barrel zones at face value and tell you to raise the heat.
          </p>
          <p className="text-body text-muted leading-relaxed">
            Most of what's on this site came out of fixing those. It isn't a textbook rewritten. It's closer to a record of arguing with a wrong answer until the reason it was wrong became clear.
          </p>
          <p className="text-body text-muted leading-relaxed">
            If something here is wrong, tell me. <a href="mailto:jinsimlabs@jinsimlabs.com" className="text-brand hover:text-brand-ink underline underline-offset-2">jinsimlabs@jinsimlabs.com</a>
          </p>
        </div>
      </div>
    </>
  );
}
