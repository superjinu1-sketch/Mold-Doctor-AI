-- IAP 하드닝 v1: 환불(CANCELLATION) 차감 RPC 신설 + 0008 RPC 2종 EXECUTE 권한 축소.
-- 적용: Supabase 대시보드 → SQL Editor에 붙여넣고 Run. (0008 전례대로 코워크/진우가 직접 실행)

-- RPC: revoke_purchase_credits — RevenueCat 웹훅(CANCELLATION)에서만 호출.
-- 정책(진우 확정 대기, 기본값): 전액 차감, 음수 잔액 허용 — 장부 정직성 + "다 쓰고 환불" 어뷰징 차단.
-- 정책이 뒤집혀 잔액 하한 클램프가 필요해지면 아래 "클램프 지점" 한 줄만 수정.
create or replace function revoke_purchase_credits(p_txn_id text)
returns json
language plpgsql
as $$
declare
  v_orig_user_id uuid;
  v_orig_delta   int;
  v_refund_txn   text;
  v_balance      int;
begin
  v_refund_txn := p_txn_id || ':refund';

  -- 이미 환불 처리된 거래면 멱등 반환 (RevenueCat 재시도·중복 웹훅 방어)
  if exists (select 1 from credit_ledger where external_txn_id = v_refund_txn) then
    return json_build_object('ok', true, 'code', 'ALREADY_REVOKED');
  end if;

  -- 원 구매 거래 조회 — 금액·유저는 원행을 신뢰 원천으로 사용(웹훅 payload 불신, 0008과 동일 원칙)
  select user_id, delta into v_orig_user_id, v_orig_delta
  from credit_ledger
  where external_txn_id = p_txn_id and kind = 'purchase';

  if not found then
    return json_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;

  -- 잠금 후 잔액 갱신
  select credit_balance into v_balance
  from user_credits where user_id = v_orig_user_id for update;

  v_balance := v_balance - v_orig_delta; -- 클램프 지점: 음수 허용 정책 뒤집히면 greatest(v_balance - v_orig_delta, 0)로 교체

  update user_credits set credit_balance = v_balance, updated_at = now()
  where user_id = v_orig_user_id;

  insert into credit_ledger(user_id, delta, kind, external_txn_id, balance_after, note)
  values (v_orig_user_id, -v_orig_delta, 'refund', v_refund_txn, v_balance, 'revenuecat cancellation: ' || p_txn_id);

  return json_build_object('ok', true, 'credit_balance', v_balance);
exception
  when unique_violation then
    -- 동시 웹훅 재시도 race: 유니크 충돌 시 이미 환불된 것으로 간주(멱등)
    return json_build_object('ok', true, 'code', 'ALREADY_REVOKED');
end;
$$;

-- EXECUTE 권한 축소: Postgres 기본값(PUBLIC 실행 가능)을 서비스 롤 전용으로 제한.
-- SECURITY INVOKER(기본)이라 RLS가 authenticated/anon의 쓰기를 이미 막지만, 방어심층으로 명시 축소.
revoke execute on function grant_purchase_credits(uuid, int, text, text) from public, anon, authenticated;
revoke execute on function revoke_purchase_credits(text) from public, anon, authenticated;
grant execute on function grant_purchase_credits(uuid, int, text, text) to service_role;
grant execute on function revoke_purchase_credits(text) to service_role;
