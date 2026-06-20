// 진단 히스토리 서버 동기화 (v1). 브라우저 anon client + RLS (AuthContext.user_credits 조회와 동일 패턴).
// 로그인 사용자만 서버 사용. 비로그인/오프라인/실패 시 호출부가 localStorage 폴백 유지.
import { supabase } from '@/lib/supabase/client';

export interface DiagnosisCause { rank: number; category: string; description: string; probability?: number; }
export interface DiagnosisRec { parameter: string; current: string; recommended: string; }

export interface HistoryRecord {
  id: string;                 // = diagnosis_records.client_id (localStorage record.id)
  timestamp: string;
  round?: number;
  defect_type?: { ko: string; en: string };
  severity?: string;
  summary?: string;
  session_id?: string;
  resolved?: boolean | string;
  resolvedAt?: string;
  resolvedMemo?: string;
  beforeResin?: string;
  beforeSettings?: Record<string, string>;
  afterSettings?: Record<string, string>;
  beforePhoto?: string;
  afterPhoto?: string;
  causes?: DiagnosisCause[];
  recommendations?: DiagnosisRec[];
  beforeInput?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface LedgerEntry {
  id: string;
  delta: number;
  kind: string;
  balance_after: number | null;
  note: string | null;
  created_at: string;
}

const MIGRATION_FLAG = 'historyMigratedV1';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function coerceResolved(v: unknown): 'solved' | 'partial' | 'unsolved' | null {
  if (v === true || v === 'solved') return 'solved';
  if (v === 'partial') return 'partial';
  if (v === 'unsolved') return 'unsolved';
  return null;
}

type Row = Record<string, unknown>;

function recordToRow(rec: HistoryRecord, userId: string): Row {
  return {
    user_id: userId,
    client_id: String(rec.id),
    session_id: typeof rec.session_id === 'string' && UUID_RE.test(rec.session_id) ? rec.session_id : null,
    round: rec.round ?? null,
    defect_type: rec.defect_type ?? null,
    severity: rec.severity ?? null,
    summary: rec.summary ?? null,
    causes: rec.causes ?? null,
    recommendations: rec.recommendations ?? null,
    before_resin: rec.beforeResin ?? null,
    before_settings: rec.beforeSettings ?? null,
    after_settings: rec.afterSettings ?? null,
    before_photo: rec.beforePhoto ?? null,
    after_photo: rec.afterPhoto ?? null,
    before_input: rec.beforeInput ?? null,
    resolved: coerceResolved(rec.resolved),
    resolved_at: rec.resolvedAt ?? null,
    resolved_memo: rec.resolvedMemo ?? null,
    created_at: rec.timestamp ?? new Date().toISOString(),
  };
}

function rowToRecord(row: Row): HistoryRecord {
  return {
    id: String(row.client_id),
    timestamp: (row.created_at as string) ?? new Date().toISOString(),
    round: (row.round as number) ?? undefined,
    defect_type: (row.defect_type as { ko: string; en: string }) ?? undefined,
    severity: (row.severity as string) ?? undefined,
    summary: (row.summary as string) ?? undefined,
    session_id: (row.session_id as string) ?? undefined,
    causes: (row.causes as DiagnosisCause[]) ?? undefined,
    recommendations: (row.recommendations as DiagnosisRec[]) ?? undefined,
    beforeResin: (row.before_resin as string) ?? undefined,
    beforeSettings: (row.before_settings as Record<string, string>) ?? undefined,
    afterSettings: (row.after_settings as Record<string, string>) ?? undefined,
    beforePhoto: (row.before_photo as string) ?? undefined,
    afterPhoto: (row.after_photo as string) ?? undefined,
    beforeInput: (row.before_input as Record<string, unknown>) ?? undefined,
    resolved: (row.resolved as string) ?? undefined,
    resolvedAt: (row.resolved_at as string) ?? undefined,
    resolvedMemo: (row.resolved_memo as string) ?? undefined,
  };
}

/** 진단 1건을 서버에 upsert (client_id 기준 idempotent). 실패는 조용히 무시(폴백=localStorage). */
export async function saveDiagnosisRecord(rec: HistoryRecord, userId: string): Promise<void> {
  try {
    await supabase.from('diagnosis_records').upsert(recordToRow(rec, userId), { onConflict: 'user_id,client_id' });
  } catch { /* 폴백: localStorage 유지 */ }
}

/** 해결상태/메모/after 갱신. */
export async function updateResolution(
  clientId: string,
  userId: string,
  patch: { resolved?: string; resolvedAt?: string; resolvedMemo?: string; afterSettings?: Record<string, string>; afterPhoto?: string },
): Promise<void> {
  try {
    const row: Row = {};
    if (patch.resolved !== undefined) row.resolved = coerceResolved(patch.resolved);
    if (patch.resolvedAt !== undefined) row.resolved_at = patch.resolvedAt;
    if (patch.resolvedMemo !== undefined) row.resolved_memo = patch.resolvedMemo;
    if (patch.afterSettings !== undefined) row.after_settings = patch.afterSettings;
    if (patch.afterPhoto !== undefined) row.after_photo = patch.afterPhoto;
    await supabase.from('diagnosis_records').update(row).eq('user_id', userId).eq('client_id', clientId);
  } catch { /* 폴백 무시 */ }
}

/** 사진 등 비동기로 채워진 필드 보강용 (upsert 재호출). */
export async function patchRecordFields(clientId: string, userId: string, fields: Partial<Pick<HistoryRecord, 'beforePhoto' | 'afterPhoto'>>): Promise<void> {
  try {
    const row: Row = {};
    if (fields.beforePhoto !== undefined) row.before_photo = fields.beforePhoto;
    if (fields.afterPhoto !== undefined) row.after_photo = fields.afterPhoto;
    if (Object.keys(row).length === 0) return;
    await supabase.from('diagnosis_records').update(row).eq('user_id', userId).eq('client_id', clientId);
  } catch { /* 무시 */ }
}

/** 서버 히스토리 로드 (최신순). 실패 시 null → 호출부가 localStorage 폴백. */
export async function fetchServerHistory(userId: string): Promise<HistoryRecord[] | null> {
  try {
    const { data, error } = await supabase
      .from('diagnosis_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error || !data) return null;
    return data.map(rowToRecord);
  } catch {
    return null;
  }
}

/** 크레딧 거래내역 (최신순 N건). */
export async function fetchLedger(userId: string, limit = 30): Promise<LedgerEntry[]> {
  try {
    const { data, error } = await supabase
      .from('credit_ledger')
      .select('id, delta, kind, balance_after, note, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data as LedgerEntry[];
  } catch {
    return [];
  }
}

/** 첫 로그인 1회: localStorage 'diagnoseHistory' → 서버 idempotent 이관. 플래그로 재이관 방지. */
export async function migrateLocalHistory(userId: string): Promise<void> {
  try {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(MIGRATION_FLAG) === '1') return;
    const raw = localStorage.getItem('diagnoseHistory');
    const arr: HistoryRecord[] = JSON.parse(raw || '[]');
    if (Array.isArray(arr) && arr.length > 0) {
      const rows = arr.filter(r => r && r.id).map(r => recordToRow(r, userId));
      const { error } = await supabase.from('diagnosis_records').upsert(rows, { onConflict: 'user_id,client_id' });
      if (error) return; // 실패 시 플래그 미설정 → 다음 로그인 때 재시도
    }
    localStorage.setItem(MIGRATION_FLAG, '1');
  } catch { /* 무시: 다음 기회에 재시도 */ }
}
