'use client';

import { forwardRef, useId, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from '@/contexts/LocaleContext';

export interface PhotoInputTriggerHandle {
  open: () => void;
}

interface PhotoInputTriggerProps {
  accept: string;
  multiple?: boolean;
  onFiles: (files: FileList) => void;
}

// 모바일(포인터 coarse)에서만 카메라/앨범 2택 팝오버를 띄운다. 데스크톱은 앨범 input 즉시 클릭(현행 UX 유지).
// 팝업은 포털로 document.body 직속에 렌더 — 트리거 DOM 하위에 두지 않아 버블링으로 트리거의 open()이
// 재호출되는 경로를 구조적으로 차단.
// 카메라/앨범은 <label htmlFor>로 hidden input에 네이티브 연결(JS input.click() 미사용) — 실측 결과
// button 요소의 :active transform/filter(전역 터치 피드백 CSS)가 터치 중 스타일 변화를 일으키면
// 브라우저가 해당 탭의 click 합성 자체를 건너뛰는 사례를 확인했다. label 네이티브 활성화는 이 경로를
// 타지 않아 무관하다.
const PhotoInputTrigger = forwardRef<PhotoInputTriggerHandle, PhotoInputTriggerProps>(
  function PhotoInputTrigger({ accept, multiple, onFiles }, ref) {
    const { t } = useLocale();
    const uid = useId();
    const cameraInputId = `${uid}-camera`;
    const albumInputId = `${uid}-album`;
    const albumInputRef = useRef<HTMLInputElement>(null);
    const [choiceOpen, setChoiceOpen] = useState(false);

    useImperativeHandle(ref, () => ({
      open: () => {
        const isCoarsePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
        if (isCoarsePointer) {
          setChoiceOpen(true);
        } else {
          albumInputRef.current?.click();
        }
      },
    }));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) onFiles(e.target.files);
      e.target.value = '';
      setChoiceOpen(false);
    };

    const closePopup = () => setChoiceOpen(false);

    return (
      <>
        <input
          id={cameraInputId}
          type="file"
          accept="image/*"
          capture="environment"
          multiple={multiple}
          className="hidden"
          onChange={handleChange}
        />
        <input
          ref={albumInputRef}
          id={albumInputId}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={handleChange}
        />

        {choiceOpen && createPortal(
          <div
            className="fixed inset-0 bg-ink/40 z-[60] flex items-end sm:items-center justify-center p-4"
            onClick={closePopup}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div
              className="w-full sm:max-w-sm bg-surface border border-border rounded-2xl p-3 space-y-2"
              onClick={(e) => e.stopPropagation()}
            >
              <label
                htmlFor={cameraInputId}
                onClick={(e) => e.stopPropagation()}
                className="w-full min-h-[var(--touch-min)] flex items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface-sunken text-ink font-semibold text-body hover:bg-brand-tint transition-colors"
              >
                📷 {t('photoInput.camera')}
              </label>
              <label
                htmlFor={albumInputId}
                onClick={(e) => e.stopPropagation()}
                className="w-full min-h-[var(--touch-min)] flex items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface-sunken text-ink font-semibold text-body hover:bg-brand-tint transition-colors"
              >
                🖼️ {t('photoInput.album')}
              </label>
              <button
                type="button"
                onClick={closePopup}
                onPointerUp={(e) => { e.stopPropagation(); closePopup(); }}
                className="w-full min-h-[var(--touch-min)] flex items-center justify-center rounded-xl text-muted font-medium text-body hover:bg-surface-sunken transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }
);

export default PhotoInputTrigger;
