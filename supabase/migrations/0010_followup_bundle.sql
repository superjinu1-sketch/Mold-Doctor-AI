-- 팔로업 종량화: 2회 무료 → 이후 5회 묶음 = 1크레딧. add_follow_up(0001) 전면 재작성.
-- 근거: pricing-v2-followup-bundle-v1 (VoC "건당 비쌈" 대응). 0001~0009는 건드리지 않음.
-- 적용: Supabase 대시보드 → SQL Editor에 붙여넣고 Run. (0008/0009 관례 동일 — 코워크 검증 후 별도 수행. CC는 적용하지 않음)

-- ─────────────────────────────────────────────
-- 1. credit_ledger.kind 제약에 'follow_up' 추가
-- ─────────────────────────────────────────────
alter table credit_ledger drop constraint if exists credit_ledger_kind_check;
alter table credit_ledger add constraint credit_ledger_kind_check
  check (kind in ('signup_bonus','purchase','diagnosis','material_analysis','refund','adjust','follow_up'));

-- ─────────────────────────────────────────────
-- 2. RPC: add_follow_up — 재작성
--    무료 2회 → 이후 5회 묶음(3,8,13...번째 질문)마다 1크레딧 차감.
--    안전 하드캡 32(무료 2 + 6묶음)는 토큰 어뷰즈 방어용 — 수치는 진우 조정 가능 항목.
-- ─────────────────────────────────────────────
create or replace function add_follow_up(p_session_id uuid, p_user_id uuid)
returns json
language plpgsql
as $$
declare
  v_count           int;
  v_new_count       int;
  v_balance         int;
  v_free_remaining  int;
  v_block_remaining int;
begin
  select follow_up_count into v_count
  from diagnosis_sessions
  where id = p_session_id and user_id = p_user_id
  for update;

  if not found then
    return json_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;

  -- 안전 하드캡(토큰 어뷰즈 방어, 수치는 진우 조정 가능): 무료 2 + 6묶음 = 32.
  if v_count >= 32 then
    return json_build_object('ok', false, 'code', 'FOLLOWUP_HARDCAP');
  end if;

  v_new_count := v_count + 1;

  if v_count >= 2 and (v_count - 2) % 5 = 0 then
    -- 새 묶음의 첫 질문(3, 8, 13, ...번째) — 1크레딧 차감 트리거
    select credit_balance into v_balance
    from user_credits where user_id = p_user_id for update;

    if v_balance is null or v_balance < 1 then
      -- 잔액 부족: count 증가 없이 반환(재시도 시 중복 차감 없음)
      return json_build_object('ok', false, 'code', 'INSUFFICIENT_FOLLOWUP', 'credit_balance', coalesce(v_balance, 0));
    end if;

    v_balance := v_balance - 1;
    update user_credits set credit_balance = v_balance, updated_at = now()
    where user_id = p_user_id;

    insert into credit_ledger(user_id, delta, kind, session_id, balance_after, note)
    values (p_user_id, -1, 'follow_up', p_session_id, v_balance, 'follow-up bundle (5)');
  else
    -- 무료 구간 또는 묶음 내 잔여 구간 — 무차감, 표시용 잔액만 조회
    select credit_balance into v_balance from user_credits where user_id = p_user_id;
  end if;

  update diagnosis_sessions set follow_up_count = v_new_count where id = p_session_id;

  v_free_remaining  := greatest(0, 2 - v_new_count);
  -- 현재 묶음에서 남은 무차감 질문 수. 경계: new_count=3→4, 7→0, 8→4(새 묶음 재차감 후 4).
  v_block_remaining := case when v_new_count <= 2 then 0 else 4 - ((v_new_count - 3) % 5) end;

  return json_build_object(
    'ok', true,
    'follow_up_count', v_new_count,
    'free_remaining', v_free_remaining,
    'block_remaining', v_block_remaining,
    'credit_balance', coalesce(v_balance, 0)
  );
end;
$$;
