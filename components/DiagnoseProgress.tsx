'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from '@/contexts/LocaleContext';

// T_avg 실측: 2026-07-08 프로덕션 코드경로(EVAL 키 격리 dev 서버, /api/diagnose 직접 호출) 3건 평균 58,562ms
// (case-001 56,416ms · case-006 54,648ms · case-007 64,622ms). τ = T_avg/2.
const TAU_MS = 29300;
const TIP_ROTATE_MS = 5000;
const TIP_COUNT = 12;

const STAGE_KEYS = ['progress.stage1', 'progress.stage2', 'progress.stage3', 'progress.stage4', 'progress.stage5'] as const;

function stageIndexFromProgress(p: number): number {
  if (p < 15) return 0;
  if (p < 40) return 1;
  if (p < 70) return 2;
  if (p < 90) return 3;
  return 4;
}

interface DiagnoseProgressProps {
  isLoading: boolean;
  hasResult: boolean;
  hasPhoto: boolean;
  onExitComplete: () => void;
}

export default function DiagnoseProgress({ isLoading, hasResult, hasPhoto, onExitComplete }: DiagnoseProgressProps) {
  const { t } = useLocale();
  const [progress, setProgress] = useState(0);
  const [tipIndex, setTipIndex] = useState(1);
  const [tipVisible, setTipVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const startRef = useRef(Date.now());

  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  // 진행 바 틱 — 시간 기반 점근 p(t) = 95 × (1 − e^(−t/τ))
  useEffect(() => {
    if (!isLoading) return;
    startRef.current = Date.now();
    const id = setInterval(() => {
      const tSec = (Date.now() - startRef.current) / 1000;
      const p = 95 * (1 - Math.exp(-tSec / (TAU_MS / 1000)));
      setProgress(Math.min(p, 95));
    }, 200);
    return () => clearInterval(id);
  }, [isLoading]);

  // 완료 전환 — 성공 시 100% 채움 후 짧은 대기 뒤 제거, 실패(에러)는 즉시 제거
  useEffect(() => {
    if (isLoading) return;
    if (hasResult) {
      setProgress(100);
      const id = setTimeout(onExitComplete, 250);
      return () => clearTimeout(id);
    }
    onExitComplete();
  }, [isLoading, hasResult, onExitComplete]);

  // 팁 로테이션(5초 간격, 페이드)
  useEffect(() => {
    const id = setInterval(() => {
      setTipVisible(false);
      setTimeout(() => {
        setTipIndex((i) => (i % TIP_COUNT) + 1);
        setTipVisible(true);
      }, reducedMotion ? 0 : 200);
    }, TIP_ROTATE_MS);
    return () => clearInterval(id);
  }, [reducedMotion]);

  const currentStage = stageIndexFromProgress(progress);

  return (
    <div className="bg-surface border border-border rounded-2xl p-4 sm:p-6 space-y-5">
      {!reducedMotion && (
        <div className="h-2 rounded-full bg-[var(--surface-sunken)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--brand)] transition-[width] duration-200 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <ul className="space-y-3">
        {STAGE_KEYS.map((key, i) => {
          const label = i === 0 && !hasPhoto ? t('progress.stage1_nophoto') : t(key);
          const state = i < currentStage ? 'done' : i === currentStage ? 'active' : 'pending';
          return (
            <li key={key} className="flex items-center gap-3">
              <span className="shrink-0 w-5 h-5 flex items-center justify-center">
                {state === 'done' && (
                  <svg className="w-5 h-5 text-ok" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
                {state === 'active' && (
                  <svg className="animate-spin w-4 h-4 text-brand" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {state === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-[var(--border-strong)]" />}
              </span>
              <span className={`text-base ${state === 'pending' ? 'text-faint' : 'text-ink'}`}>{label}</span>
            </li>
          );
        })}
      </ul>

      <p
        className={`text-muted text-base leading-relaxed border-t border-border pt-4 ${reducedMotion ? '' : 'transition-opacity duration-200'} ${tipVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        💡 {t(`progress.tip${tipIndex}`)}
      </p>
    </div>
  );
}
