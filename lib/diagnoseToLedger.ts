// 진단(diagnose) → 작업표준 저장소(ledger) 저장 훅. lib/tryout.ts saveTryoutAsLedgerStandard 패턴 재사용 —
// 해결 보고가 끝난 진단 기록의 실측 조치 조건(afterSettings)을 condition_standards 신규 개정으로 복사한다.
// AI 권장값(recommendations)은 절대 사용하지 않는다 — afterSettings만 표준이 될 자격이 있다.
import { createStandard, type LedgerResult, type ConditionStandard } from '@/lib/ledger';

// HistoryRecord(lib/history-sync.ts)·ReportRecord(components/ResolutionReport.tsx) 양쪽과 구조적으로 호환.
export interface LedgerSavableRecord {
  resolved?: boolean | string;
  afterSettings?: Record<string, string>;
  defect_type?: { ko: string; en: string };
  beforeResin?: string;
  resolvedAt?: string;
}

export function isResolvedSolved(resolved: LedgerSavableRecord['resolved']): boolean {
  return resolved === true || resolved === 'solved';
}

function hasApplicableAfterSettings(record: LedgerSavableRecord): boolean {
  const s = record.afterSettings;
  if (!s) return false;
  return Object.values(s).some(v => (typeof v === 'string' ? v.trim() !== '' : !!v));
}

/** §1 게이트 — solved(레거시 true 포함) + afterSettings 실값 존재. partial/unsolved/빈 afterSettings는 false. */
export function canSaveAsWorkStandard(record: LedgerSavableRecord): boolean {
  return isResolvedSolved(record.resolved) && hasApplicableAfterSettings(record);
}

interface SaveInput {
  record: LedgerSavableRecord;
  userId: string;
  machineId: string;
  moldName: string;
  itemName: string;
}

export async function saveDiagnosisAsLedgerStandard(input: SaveInput): Promise<LedgerResult<ConditionStandard>> {
  const { record, userId, machineId, moldName, itemName } = input;
  const defectKo = record.defect_type?.ko || '불량';
  const resolvedDate = new Date(record.resolvedAt || Date.now()).toLocaleDateString('ko-KR');
  return createStandard({
    userId,
    machineId,
    moldName,
    itemName,
    resin: record.beforeResin ?? '',
    settings: record.afterSettings ?? {}, // ★ afterSettings — 권장값(recommendations) 아님
    memo: `진단 해결 조건 (${defectKo}, ${resolvedDate})`,
  });
}

// ── 중복 저장 방지 ──────────────────────────────────────────────
// diagnosis_records 서버 컬럼은 화이트리스트(lib/history-sync.ts recordToRow/rowToRecord)라
// 임의 필드는 왕복 저장되지 않는다(DB 마이그레이션 없이는 서버 영속 불가 — 확인됨).
// 따라서 저장 여부는 브라우저 로컬(localStorage)에 별도 맵으로 추적한다. 기기 단위 dedup(§5 취지 충족),
// DB 스키마 변경 0.
const SAVED_MAP_KEY = 'molddoctor_ledger_saved_map';

function readSavedMap(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(SAVED_MAP_KEY) || '{}');
  } catch {
    return {};
  }
}

export function getLedgerSavedAt(recordId: string): string | undefined {
  return readSavedMap()[recordId];
}

export function markLedgerSaved(recordId: string, iso: string): void {
  if (typeof window === 'undefined') return;
  try {
    const map = readSavedMap();
    map[recordId] = iso;
    localStorage.setItem(SAVED_MAP_KEY, JSON.stringify(map));
  } catch {
    /* localStorage quota 등 실패해도 저장 자체는 이미 성공 — 무시 */
  }
}
