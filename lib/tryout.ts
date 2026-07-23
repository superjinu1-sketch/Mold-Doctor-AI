// 시사출(트라이아웃) 데이터 레이어. 브라우저 anon client + RLS(lib/ledger.ts·lib/history-sync.ts와 동일 원칙) —
// 서버 프록시 없이 클라이언트가 tryout_records를 직접 CRUD한다. 캡(200)은 DB 트리거가 강제.
import { supabase } from '@/lib/supabase/client';
import { reportClientError } from '@/lib/observability/client';
import { createStandard } from '@/lib/ledger';
import type { ChecklistData, Measures } from '@/lib/tryoutChecklist';

export interface TryoutRecord {
  id: string;
  user_id: string;
  machine_id: string | null;
  machine_name: string | null;
  mold_name: string;
  item_name: string | null;
  resin: string | null;
  status: 'in_progress' | 'done';
  checklist: ChecklistData;
  measures: Measures | null;
  final_settings: Record<string, string> | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export type TryoutErrorCode = 'TRYOUT_CAP_EXCEEDED' | 'NOT_FOUND' | 'UNKNOWN';

export interface TryoutResult<T> {
  ok: boolean;
  data?: T;
  code?: TryoutErrorCode;
}

function mapPgError(message: string | undefined): TryoutErrorCode {
  if (message?.includes('TRYOUT_CAP_EXCEEDED')) return 'TRYOUT_CAP_EXCEEDED';
  return 'UNKNOWN';
}

export async function listTryoutRecords(userId: string): Promise<TryoutRecord[]> {
  try {
    const { data, error } = await supabase
      .from('tryout_records')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error || !data) { reportClientError('tryout.list', error); return []; }
    return data as TryoutRecord[];
  } catch (e) {
    reportClientError('tryout.list', e);
    return [];
  }
}

export async function getTryoutRecord(id: string): Promise<TryoutRecord | null> {
  try {
    const { data, error } = await supabase.from('tryout_records').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return data as TryoutRecord;
  } catch (e) {
    reportClientError('tryout.get', e);
    return null;
  }
}

interface CreateTryoutInput {
  userId: string;
  machineId?: string | null;
  machineName?: string | null;
  moldName: string;
  itemName?: string;
  resin?: string;
}

export async function createTryoutRecord(input: CreateTryoutInput): Promise<TryoutResult<TryoutRecord>> {
  try {
    const { data, error } = await supabase
      .from('tryout_records')
      .insert({
        user_id: input.userId,
        machine_id: input.machineId || null,
        machine_name: input.machineName?.trim() || null,
        mold_name: input.moldName.trim(),
        item_name: input.itemName?.trim() || null,
        resin: input.resin?.trim() || null,
      })
      .select('*')
      .single();
    if (error) return { ok: false, code: mapPgError(error.message) };
    return { ok: true, data: data as TryoutRecord };
  } catch (e) {
    reportClientError('tryout.create', e);
    return { ok: false, code: 'UNKNOWN' };
  }
}

export interface TryoutPatch {
  checklist?: ChecklistData;
  measures?: Measures;
  final_settings?: Record<string, string>;
  summary?: string;
  status?: 'in_progress' | 'done';
  resin?: string;
  item_name?: string;
  mold_name?: string;
}

export async function updateTryoutRecord(id: string, patch: TryoutPatch): Promise<boolean> {
  try {
    const row: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('tryout_records').update(row).eq('id', id);
    if (error) { reportClientError('tryout.update', error); return false; }
    return true;
  } catch (e) {
    reportClientError('tryout.update', e);
    return false;
  }
}

/**
 * [조건 대장 표준으로 저장] 훅 — machine_id가 연동된 경우에만 유효. 시사출의
 * 확정 조건(final_settings)·수지·금형/아이템명을 condition_standards 신규
 * 개정으로 복사한다(lib/ledger.ts createStandard 재사용 — 캡·롤백 로직 공유).
 */
export async function saveTryoutAsLedgerStandard(record: TryoutRecord, userId: string) {
  if (!record.machine_id) return { ok: false as const, code: 'NOT_FOUND' as const };
  return createStandard({
    userId,
    machineId: record.machine_id,
    moldName: record.mold_name,
    itemName: record.item_name || '',
    resin: record.resin || '',
    settings: record.final_settings || {},
    memo: `시사출 확정 조건 (${new Date(record.updated_at).toLocaleDateString('ko-KR')})`,
  });
}
