// 시사출(트라이아웃) 표준 체크리스트 템플릿 v1(베타) — mandate §2 초안 그대로.
// A~C(1~14) = 3태(양호/불량/해당없음)+메모, D(15~17)는 checklist가 아닌 measures 필드,
// D(18) 최종 확정 조건은 final_settings(기존 셋팅값 폼) — supabase/migrations/0012 스키마와 1:1 대응.
export interface ChecklistItemDef {
  id: number;
  labelKo: string;
  labelEn: string;
  hasDefectTags?: boolean; // #12 전용 — 외관 불량 12종 태그 다중 선택
}

export interface ChecklistGroupDef {
  group: 'A' | 'B' | 'C';
  titleKo: string;
  titleEn: string;
  items: ChecklistItemDef[];
}

export const CHECKLIST_GROUPS: ChecklistGroupDef[] = [
  {
    group: 'A', titleKo: '사전 준비', titleEn: 'Pre-Setup',
    items: [
      { id: 1, labelKo: '수지 건조 조건 확인 (온도·시간)', labelEn: 'Verify resin drying conditions (temp/time)' },
      { id: 2, labelKo: '금형 냉각 라인 연결·누수 확인', labelEn: 'Check mold cooling line connection & leaks' },
      { id: 3, labelKo: '이젝터 연결·작동 확인', labelEn: 'Check ejector connection & operation' },
      { id: 4, labelKo: '금형 보호압(저압 보호) 설정', labelEn: 'Set mold protection (low-pressure) mode' },
      { id: 5, labelKo: '노즐 터치·센터링 확인', labelEn: 'Check nozzle touch & centering' },
    ],
  },
  {
    group: 'B', titleKo: '조건 수립', titleEn: 'Condition Setup',
    items: [
      { id: 6, labelKo: '계량·배압·스크류 회전수 설정', labelEn: 'Set metering, back pressure, screw RPM' },
      { id: 7, labelKo: '사출 속도/압력 단계 설정', labelEn: 'Set injection speed/pressure stages' },
      { id: 8, labelKo: 'V/P 전환점 설정 (숏 단계적 충전으로 확인)', labelEn: 'Set V/P transfer point (verify via short-shot fill study)' },
      { id: 9, labelKo: '보압·보압 시간 설정', labelEn: 'Set hold pressure & hold time' },
      { id: 10, labelKo: '쿠션량 확인', labelEn: 'Check cushion amount' },
    ],
  },
  {
    group: 'C', titleKo: '안정화·외관', titleEn: 'Stabilization & Appearance',
    items: [
      { id: 11, labelKo: '연속 안정 숏 확인 (권장 10~20숏 후 판정)', labelEn: 'Confirm stable consecutive shots (judge after ~10-20 shots)' },
      { id: 12, labelKo: '외관 불량 점검', labelEn: 'Visual defect inspection', hasDefectTags: true },
      { id: 13, labelKo: '게이트 절단 상태·게이트 자국', labelEn: 'Gate cut condition & gate mark' },
      { id: 14, labelKo: '이형 상태 (백화·긁힘·이젝터 자국)', labelEn: 'Ejection condition (whitening, scratches, ejector marks)' },
    ],
  },
];

export const ALL_CHECKLIST_ITEMS: ChecklistItemDef[] = CHECKLIST_GROUPS.flatMap(g => g.items);

export type ChecklistState = 'ok' | 'ng' | 'na';

export interface ChecklistEntry {
  state?: ChecklistState;
  memo?: string;
  defects?: string[]; // #12 전용 — lib/defectGuide.ts GuideDefect.id 값들
}

export type ChecklistData = Record<string, ChecklistEntry>;

// D(15~17) 샷별 기록. 조건을 바꿔가며 여러 샷을 내는 실무 흐름을 담기 위해
// 단일 측정값이 아니라 샷 로그(배열)로 저장한다 — DB 컬럼(measures jsonb)은 그대로,
// 내부 형태만 { shots: Shot[] }로 변경(마이그레이션 불필요, 구형 평면 데이터는 normalizeMeasures가 변환).
export interface Shot {
  no: number;
  shotWeight?: string;
  cycleTime?: string;
  dims?: string;
  adjustMemo?: string; // 신규 — 이 샷 전에 무엇을 조정했는지
  at: string;           // ISO 시각
}

export interface Measures {
  shots: Shot[];
}

export const MAX_SHOTS = 50;

// 구형 평면 측정값(레코드 확장 전 저장분): {shotWeight, cycleTime, dims} — shots 배열이 없고
// 위 키 중 하나라도 있으면 구형으로 간주해 shot #1로 변환. 완전히 비어있으면 빈 배열.
export function normalizeMeasures(raw: unknown, fallbackAt: string): Measures {
  if (!raw || typeof raw !== 'object') return { shots: [] };
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.shots)) {
    return { shots: obj.shots as Shot[] };
  }
  const hasLegacyFields = obj.shotWeight != null || obj.cycleTime != null || obj.dims != null;
  if (!hasLegacyFields) return { shots: [] };
  return {
    shots: [{
      no: 1,
      shotWeight: typeof obj.shotWeight === 'string' ? obj.shotWeight : undefined,
      cycleTime: typeof obj.cycleTime === 'string' ? obj.cycleTime : undefined,
      dims: typeof obj.dims === 'string' ? obj.dims : undefined,
      at: fallbackAt,
    }],
  };
}

export function emptyChecklist(): ChecklistData {
  const out: ChecklistData = {};
  for (const item of ALL_CHECKLIST_ITEMS) out[String(item.id)] = {};
  return out;
}

// 완료 처리 전 최소 확인 — A~C 전 항목에 상태가 있는지(엄격한 필수는 아니지만 "완료" 배지 판단용)
export function isChecklistComplete(checklist: ChecklistData): boolean {
  return ALL_CHECKLIST_ITEMS.every(item => !!checklist[String(item.id)]?.state);
}
