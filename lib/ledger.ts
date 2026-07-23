// 조건 대장(condition-ledger) 데이터 레이어. 브라우저 anon client + RLS(lib/history-sync.ts와 동일 원칙) —
// 서버 프록시 없이 클라이언트가 machines/condition_standards를 직접 CRUD한다. 용량 캡은 DB 트리거가
// 강제(0011_condition_ledger.sql)하므로 여기서는 그 에러 코드를 사용자 메시지로 매핑만 한다.
import { supabase } from '@/lib/supabase/client';
import { reportClientError } from '@/lib/observability/client';

export interface Machine {
  id: string;
  name: string;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConditionStandard {
  id: string;
  machine_id: string;
  mold_name: string | null;
  item_name: string | null;
  resin: string | null;
  settings: Record<string, string>;
  memo: string | null;
  photo_path: string | null;
  photo_thumb: string | null;
  created_at: string;
}

export interface MachineWithCurrent extends Machine {
  current: ConditionStandard | null;
}

export type LedgerErrorCode =
  | 'DUPLICATE_NAME'
  | 'MACHINE_CAP_EXCEEDED'
  | 'STANDARD_CAP_EXCEEDED'
  | 'PHOTO_CAP_EXCEEDED'
  | 'NOT_FOUND'
  | 'UNKNOWN';

export interface LedgerResult<T> {
  ok: boolean;
  data?: T;
  code?: LedgerErrorCode;
}

const BUCKET = 'condition-photos';

function mapPgError(message: string | undefined): LedgerErrorCode {
  const m = message || '';
  if (m.includes('MACHINE_CAP_EXCEEDED')) return 'MACHINE_CAP_EXCEEDED';
  if (m.includes('STANDARD_CAP_EXCEEDED')) return 'STANDARD_CAP_EXCEEDED';
  if (m.includes('PHOTO_CAP_EXCEEDED')) return 'PHOTO_CAP_EXCEEDED';
  if (m.includes('duplicate key') || m.includes('machines_user_name_idx')) return 'DUPLICATE_NAME';
  return 'UNKNOWN';
}

/** 설비 목록 + machine별 현행 표준(썸네일 포함, 원본 photo_path는 상세에서만). 최종 수정일 desc. */
export async function listMachinesWithCurrent(userId: string): Promise<MachineWithCurrent[]> {
  try {
    const [{ data: machines, error: mErr }, { data: currents, error: cErr }] = await Promise.all([
      supabase.from('machines').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
      supabase.from('current_condition_standards').select('*').eq('user_id', userId),
    ]);
    if (mErr || !machines) { reportClientError('ledger.listMachines', mErr); return []; }
    const currentByMachine = new Map<string, ConditionStandard>();
    if (!cErr && currents) {
      for (const row of currents as ConditionStandard[]) currentByMachine.set(row.machine_id, row);
    }
    return (machines as Machine[]).map(m => ({ ...m, current: currentByMachine.get(m.id) ?? null }));
  } catch (e) {
    reportClientError('ledger.listMachines', e);
    return [];
  }
}

export async function getMachine(machineId: string): Promise<Machine | null> {
  try {
    const { data, error } = await supabase.from('machines').select('*').eq('id', machineId).maybeSingle();
    if (error || !data) return null;
    return data as Machine;
  } catch (e) {
    reportClientError('ledger.getMachine', e);
    return null;
  }
}

export async function createMachine(userId: string, name: string, memo: string): Promise<LedgerResult<Machine>> {
  try {
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, code: 'UNKNOWN' };
    const { data, error } = await supabase
      .from('machines')
      .insert({ user_id: userId, name: trimmed, memo: memo.trim() || null })
      .select('*')
      .single();
    if (error) return { ok: false, code: mapPgError(error.message) };
    return { ok: true, data: data as Machine };
  } catch (e) {
    reportClientError('ledger.createMachine', e);
    return { ok: false, code: 'UNKNOWN' };
  }
}

/** 설비 삭제 — 표준 이력의 Storage 사진을 먼저 정리(고아 방지) 후 행 삭제(condition_standards는 FK cascade). */
export async function deleteMachine(machineId: string): Promise<boolean> {
  try {
    const { data: standards } = await supabase
      .from('condition_standards')
      .select('photo_path')
      .eq('machine_id', machineId)
      .not('photo_path', 'is', null);
    const paths = (standards ?? []).map(s => s.photo_path).filter((p): p is string => !!p);
    if (paths.length > 0) {
      await supabase.storage.from(BUCKET).remove(paths); // 실패해도 삭제 자체는 계속 진행(고아 사진보다 방치된 설비가 더 나쁨)
    }
    const { error } = await supabase.from('machines').delete().eq('id', machineId);
    if (error) { reportClientError('ledger.deleteMachine', error); return false; }
    return true;
  } catch (e) {
    reportClientError('ledger.deleteMachine', e);
    return false;
  }
}

/** machine의 전체 개정 이력(최신순). */
export async function listStandards(machineId: string): Promise<ConditionStandard[]> {
  try {
    const { data, error } = await supabase
      .from('condition_standards')
      .select('*')
      .eq('machine_id', machineId)
      .order('created_at', { ascending: false });
    if (error || !data) { reportClientError('ledger.listStandards', error); return []; }
    return data as ConditionStandard[];
  } catch (e) {
    reportClientError('ledger.listStandards', e);
    return [];
  }
}

interface CreateStandardInput {
  userId: string;
  machineId: string;
  moldName: string;
  itemName: string;
  resin: string;
  settings: Record<string, string>;
  memo: string;
  photoBase64?: string | null;   // 클라 리사이즈 완료된(2048px·q0.8) JPEG base64(데이터 URL 아님)
  photoThumbBase64?: string | null; // 320px 썸네일 base64
}

/**
 * 표준(개정) 저장 — 사진이 있으면 "업로드 먼저 → insert" 순서로 진행하고, insert 실패 시
 * 업로드된 사진을 롤백 삭제(고아 방지, mandate §4). standard_id는 업로드 경로 산정을 위해
 * 클라이언트가 미리 생성해 photo_path/insert 양쪽에 동일하게 사용한다.
 */
export async function createStandard(input: CreateStandardInput): Promise<LedgerResult<ConditionStandard>> {
  const standardId = crypto.randomUUID();
  let photoPath: string | null = null;

  try {
    if (input.photoBase64) {
      photoPath = `${input.userId}/${standardId}.jpg`;
      const bytes = base64ToUint8Array(input.photoBase64);
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(photoPath, bytes, { contentType: 'image/jpeg', upsert: false });
      if (upErr) {
        reportClientError('ledger.createStandard.upload', upErr);
        return { ok: false, code: 'UNKNOWN' };
      }
    }

    const { data, error } = await supabase
      .from('condition_standards')
      .insert({
        id: standardId,
        user_id: input.userId,
        machine_id: input.machineId,
        mold_name: input.moldName.trim() || null,
        item_name: input.itemName.trim() || null,
        resin: input.resin.trim() || null,
        settings: input.settings,
        memo: input.memo.trim() || null,
        photo_path: photoPath,
        photo_thumb: input.photoThumbBase64 || null,
      })
      .select('*')
      .single();

    if (error) {
      // 고아 방지 롤백 — insert 실패 시 이미 업로드된 사진 제거
      if (photoPath) await supabase.storage.from(BUCKET).remove([photoPath]);
      return { ok: false, code: mapPgError(error.message) };
    }

    // machines.updated_at 갱신(카드 목록 "최종 수정일"용) — 실패해도 표준 저장 자체는 이미 성공
    await supabase.from('machines').update({ updated_at: new Date().toISOString() }).eq('id', input.machineId);

    return { ok: true, data: data as ConditionStandard };
  } catch (e) {
    if (photoPath) await supabase.storage.from(BUCKET).remove([photoPath]).catch(() => {});
    reportClientError('ledger.createStandard', e);
    return { ok: false, code: 'UNKNOWN' };
  }
}

function base64ToUint8Array(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** 원본 사진 signed URL(1시간) — 상세 화면 핀치줌 전용, 목록은 photo_thumb만 사용. */
export async function getSignedPhotoUrl(photoPath: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(photoPath, 60 * 60);
    if (error || !data) return null;
    return data.signedUrl;
  } catch (e) {
    reportClientError('ledger.getSignedPhotoUrl', e);
    return null;
  }
}
