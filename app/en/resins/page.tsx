import type { Metadata } from 'next';
import ResinListView from '@/components/resins/ResinListView';
import { getAllResinListItems } from '@/lib/resinPageData';

export const metadata: Metadata = {
  title: 'Injection Molding Resin Library — Drying, Melt Temp, Shrinkage | Mold Doctor',
  description: 'Field-reference summaries for 43+ injection molding resins — PA66, PC, POM, PPS and more — covering drying conditions, melt temperature, mold temperature, shrinkage, and common defects.',
  alternates: {
    canonical: 'https://mold-doctor-ai.vercel.app/en/resins',
    languages: {
      ko: 'https://mold-doctor-ai.vercel.app/resins',
      en: 'https://mold-doctor-ai.vercel.app/en/resins',
      'x-default': 'https://mold-doctor-ai.vercel.app/en/resins',
    },
  },
  openGraph: {
    title: 'Injection Molding Resin Library | Mold Doctor',
    description: 'Drying conditions, melt & mold temperature, shrinkage, and common defects by resin.',
    type: 'website',
    locale: 'en_US',
  },
};

export default function ResinsListPageEn() {
  const items = getAllResinListItems('en');
  return (
    <div className="bg-canvas min-h-screen px-4 sm:px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 border border-[var(--brand-border)] bg-brand-tint text-brand-ink text-[length:var(--text-label)] font-medium px-3.5 py-1.5 rounded-full mb-5">
            <span className="w-1.5 h-1.5 bg-brand rounded-full" />
            {items.length} resins, field-tested reference
          </div>
          <h1 className="text-[length:var(--text-h1)] font-bold text-ink mb-2">Resin Library</h1>
          <p className="text-muted text-body">Drying conditions, melt temperature, mold temperature, shrinkage, and common defects — organized by resin.</p>
        </div>
        <ResinListView items={items} locale="en" basePath="/en/resins" />
      </div>
    </div>
  );
}
