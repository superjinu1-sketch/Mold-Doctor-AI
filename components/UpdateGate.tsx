'use client';

// 강제 업데이트 전체화면 차단 오버레이. app/layout.tsx에서 전역 마운트.
// 웹 빌드 무영향: isNativeApp()이 false면 이 컴포넌트의 useEffect 본문이 즉시 return하고
// (아래 "웹 빌드 단락 지점" 주석 참조) 렌더도 항상 null — 네트워크 호출·Capacitor 플러그인
// 호출이 단 한 줄도 실행되지 않는다.
import { useEffect, useState, useCallback } from 'react';
import { isNativeApp } from '@/lib/platform';
import { getAppVersionInfo } from '@/lib/appVersion';
import { supabase } from '@/lib/supabase/client';
import { onUpgradeRequired } from '@/lib/updateGateBus';
import { performAndroidImmediateUpdate } from '@/lib/appUpdate';

interface GateState {
  storeUrl: string;
  message: string | null;
  currentBuild: number;
  currentVersion: string;
  platform: 'android' | 'ios';
}

const DEFAULT_MESSAGE = '앱이 개선되어 이전 버전은 더 이상 사용할 수 없습니다. 업데이트 후 계속 이용해 주세요. 저장된 기록은 그대로 유지됩니다.';

export default function UpdateGate() {
  const [gate, setGate] = useState<GateState | null>(null);

  const checkFromServer = useCallback(async () => {
    if (!isNativeApp()) return; // ← 웹 빌드 단락 지점. 아래 어떤 코드도 실행되지 않는다.
    const info = await getAppVersionInfo();
    if (!info) return;
    const { data } = await supabase
      .from('app_min_version')
      .select('min_build, store_url, message')
      .eq('platform', info.platform)
      .maybeSingle();
    if (!data) return;
    if (info.build < data.min_build) {
      setGate({
        storeUrl: data.store_url,
        message: data.message,
        currentBuild: info.build,
        currentVersion: info.version,
        platform: info.platform,
      });
    }
  }, []);

  useEffect(() => {
    if (!isNativeApp()) return; // 웹 — 리스너 등록도 하지 않는다.

    void checkFromServer();

    let removeResumeListener: (() => void) | undefined;
    import('@capacitor/app').then(({ App }) => {
      App.addListener('resume', checkFromServer).then(handle => {
        removeResumeListener = () => { void handle.remove(); };
      });
    });

    // API 426(UPGRADE_REQUIRED) 이중 안전망 — 서버가 이미 판정했으므로 build 재비교 없이 그대로 표시.
    const unsubBus = onUpgradeRequired(body => {
      void getAppVersionInfo().then(info => {
        setGate({
          storeUrl: body.storeUrl,
          message: body.message,
          currentBuild: info?.build ?? 0,
          currentVersion: info?.version ?? '',
          platform: info?.platform ?? 'android',
        });
      });
    });

    return () => {
      removeResumeListener?.();
      unsubBus();
    };
  }, [checkFromServer]);

  if (!isNativeApp() || !gate) return null;

  const handleUpdate = async () => {
    if (gate.platform === 'android') {
      const started = await performAndroidImmediateUpdate();
      if (started) return;
    }
    window.open(gate.storeUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[200] bg-canvas flex items-center justify-center p-4">
      <div className="ui-card ui-card-lg p-6 max-w-sm w-full text-center">
        <h2 className="text-[length:var(--text-h2)] font-bold text-ink mb-3">업데이트가 필요합니다</h2>
        <p className="text-body text-muted mb-6">{gate.message || DEFAULT_MESSAGE}</p>
        <button
          type="button"
          onClick={() => void handleUpdate()}
          className="w-full min-h-[var(--touch-cta)] rounded-[var(--radius-cta)] bg-brand hover:bg-brand-ink text-on-brand font-bold text-body transition-colors"
        >
          업데이트하기
        </button>
        <p className="text-[length:var(--text-label)] text-faint mt-4">현재 버전: {gate.currentVersion} ({gate.currentBuild})</p>
      </div>
    </div>
  );
}
