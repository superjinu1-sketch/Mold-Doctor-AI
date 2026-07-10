'use client';

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
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
const PhotoInputTrigger = forwardRef<PhotoInputTriggerHandle, PhotoInputTriggerProps>(
  function PhotoInputTrigger({ accept, multiple, onFiles }, ref) {
    const { t } = useLocale();
    const cameraInputRef = useRef<HTMLInputElement>(null);
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

    return (
      <>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple={multiple}
          className="hidden"
          onChange={handleChange}
        />
        <input
          ref={albumInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={handleChange}
        />

        {choiceOpen && (
          <div
            className="fixed inset-0 bg-ink/40 z-[60] flex items-end sm:items-center justify-center p-4"
            onClick={() => setChoiceOpen(false)}
          >
            <div
              className="w-full sm:max-w-sm bg-surface border border-border rounded-2xl p-3 space-y-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="w-full min-h-[var(--touch-min)] flex items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface-sunken text-ink font-semibold text-body hover:bg-brand-tint transition-colors"
              >
                📷 {t('photoInput.camera')}
              </button>
              <button
                type="button"
                onClick={() => albumInputRef.current?.click()}
                className="w-full min-h-[var(--touch-min)] flex items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface-sunken text-ink font-semibold text-body hover:bg-brand-tint transition-colors"
              >
                🖼️ {t('photoInput.album')}
              </button>
              <button
                type="button"
                onClick={() => setChoiceOpen(false)}
                className="w-full min-h-[var(--touch-min)] flex items-center justify-center rounded-xl text-muted font-medium text-body hover:bg-surface-sunken transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }
);

export default PhotoInputTrigger;
