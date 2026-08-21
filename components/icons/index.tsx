// 단색 인라인 SVG 아이콘. currentColor 상속 — 색은 부모 텍스트 색 유틸로 지정한다.
// 아이콘 라이브러리(lucide-react 등) 미사용 — 번들 크기(Capacitor 로컬 번들) 보호.
export type IconProps = { className?: string; size?: number };

const base = (size: number) => ({
  width: size, height: size, viewBox: '0 0 24 24',
  fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  'aria-hidden': true, focusable: 'false' as const,
});

// 작업표준 저장소 — 클립보드 + 가로줄 2개
export function IconClipboard({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M8 4H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <line x1="8" y1="11" x2="16" y2="11" />
      <line x1="8" y1="15" x2="16" y2="15" />
    </svg>
  );
}

// 시사출 체크리스트 — 사각형 + 체크
export function IconCheckSquare({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <polyline points="7 12 10.5 15.5 17 8.5" />
    </svg>
  );
}

// 수지 라이브러리 — 삼각 플라스크
export function IconFlask({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M9 2v6.5L4.5 18a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L15 8.5V2" />
      <line x1="8" y1="2" x2="16" y2="2" />
      <line x1="7" y1="15" x2="17" y2="15" />
    </svg>
  );
}

// 불량 가이드 — 펼친 책
export function IconBook({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3 5.5s2-1.2 4.5-1.2S12 6 12 6s2-1.7 4.5-1.7S21 5.5 21 5.5v13s-2-1.2-4.5-1.2S12 19 12 19s-2-1.7-4.5-1.7S3 18.5 3 18.5v-13z" />
      <path d="M12 6v13" />
    </svg>
  );
}

// 사진 입력·촬영 — 카메라 바디 + 렌즈 원
export function IconCamera({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3 9a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 10.07 4h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 18.07 7H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

// 앨범 선택 — 사각형 + 산 + 원
export function IconImage({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M3 16.5l5-5a1.5 1.5 0 0 1 2.1 0L15 16.5" />
      <path d="M13.5 15l2-2a1.5 1.5 0 0 1 2.1 0L21 16.5" />
    </svg>
  );
}

// 팔로업 질문 — 말풍선
export function IconMessage({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4 4v-4H6a2 2 0 0 1-2-2V5z" />
    </svg>
  );
}

// 진행 중 팁 — 전구
export function IconBulb({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.5.4.85 1 .95 1.7h5.3c.1-.7.45-1.3.95-1.7A6 6 0 0 0 12 3z" />
      <path d="M9 18h6" />
      <path d="M10 21h4" />
    </svg>
  );
}

// 설비(대장 목록) — 사각 본체 + 노즐
export function IconMachine({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="3" y="7" width="13" height="12" rx="1.5" />
      <path d="M16 11h3.5a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5H16" />
      <line x1="7" y1="7" x2="7" y2="4" />
      <line x1="12" y1="7" x2="12" y2="4" />
    </svg>
  );
}

// 기록 없음 빈 상태 — 문서 + 접힌 모서리
export function IconNote({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M14 3v5h5" />
      <line x1="8.5" y1="12" x2="15.5" y2="12" />
      <line x1="8.5" y1="16" x2="13" y2="16" />
    </svg>
  );
}

// 스토어 배지(store-badges-v1) — 다운로드 화살표. 공식 스토어 로고(사과·삼각) 대신
// 범용 아이콘 사용 — 상표 마크 재현 리스크 회피, 스토어명 텍스트가 구분자 역할.
export function IconDownload({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 3v12" />
      <polyline points="7 10 12 15 17 10" />
      <path d="M4 18v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" />
    </svg>
  );
}

// 가이드 계열 아이콘(guide-redesign-web-v1) — 5계열 라인글리프, 단일 브랜드 액센트.
// 충전·보압계 — 물방울(충전되는 수지)
export function IconDrop({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 3c3.5 4 6 7.4 6 10.5a6 6 0 0 1-12 0C6 10.4 8.5 7 12 3z" />
    </svg>
  );
}

// 표면·흐름 외관계 — 유동 물결선
export function IconWave({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3 9c1.5-2 3.5-2 5 0s3.5 2 5 0 3.5-2 5 0 3.5 2 5 0" />
      <path d="M3 15c1.5-2 3.5-2 5 0s3.5 2 5 0 3.5-2 5 0 3.5 2 5 0" />
    </svg>
  );
}

// 열·가스·오염계 — 온도계
export function IconThermo({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 14.5V5a2 2 0 0 0-4 0v9.5a4 4 0 1 0 4 0z" />
      <line x1="10" y1="8" x2="12" y2="8" />
    </svg>
  );
}

// 강도·구조계 — 트러스 삼각형(구조 결합)
export function IconTriangle({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 4l8 15H4l8-15z" />
      <line x1="12" y1="4" x2="12" y2="19" />
    </svg>
  );
}

// 금형·이형·치수계 — 코어·캐비티(금형 반쪽씩)
export function IconMold({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3 6h7v12H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z" />
      <path d="M21 6h-7v12h7a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1z" />
      <line x1="12" y1="9" x2="12" y2="15" />
    </svg>
  );
}
