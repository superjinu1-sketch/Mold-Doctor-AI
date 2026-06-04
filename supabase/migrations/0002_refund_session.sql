-- 베타-B 보강: 진단 API 실패 시 차감된 크레딧 환불(멱등).
-- start_session으로 1 차감했으나 결과를 못 준 경우 호출.
create or replace function refund_session(p_session_id uuid, p_user_id uuid)
returns json
language plpgsql
as $$
declare
  v_balance int;
begin
  if not exists (
    select 1 from diagnosis_sessions where id = p_session_id and user_id = p_user_id
  ) then
    return json_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;

  -- 이미 환불된 세션이면 중복 금지(멱등)
  if exists (
    select 1 from credit_ledger where session_id = p_session_id and kind = 'refund'
  ) then
    return json_build_object('ok', false, 'code', 'ALREADY_REFUNDED');
  end if;

  update user_credits
    set credit_balance = credit_balance + 1, updated_at = now()
    where user_id = p_user_id
    returning credit_balance into v_balance;

  insert into credit_ledger(user_id, delta, kind, session_id, balance_after, note)
    values (p_user_id, 1, 'refund', p_session_id, v_balance, 'diagnosis api failure refund');

  return json_build_object('ok', true, 'credit_balance', v_balance);
end;
$$;
