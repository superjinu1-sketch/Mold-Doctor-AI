-- 인앱결제(RevenueCat) 크레딧 적립. 웹훅(app/api/webhooks/revenuecat)에서 service_role로만 호출.
-- 멱등키: credit_ledger.external_txn_id(RevenueCat transaction_id) 부분 유니크 인덱스.
-- 적용: Supabase 대시보드 → SQL Editor에 붙여넣고 Run.

alter table credit_ledger add column if not exists external_txn_id text;

create unique index if not exists credit_ledger_external_txn_idx
  on credit_ledger(external_txn_id)
  where external_txn_id is not null;

-- RPC: grant_purchase_credits — RevenueCat 웹훅(NON_RENEWING_PURCHASE)에서만 호출.
-- 크레딧 수·product_id는 웹훅 라우트가 서버 상수 매핑으로 결정 — 클라/웹훅 payload 금액은 신뢰하지 않음.
create or replace function grant_purchase_credits(p_user_id uuid, p_credits int, p_txn_id text, p_product_id text)
returns json
language plpgsql
as $$
declare
  v_balance int;
begin
  -- 이미 적립된 거래면 멱등 반환 (RevenueCat 재시도·중복 웹훅 방어)
  if exists (select 1 from credit_ledger where external_txn_id = p_txn_id) then
    return json_build_object('ok', true, 'code', 'ALREADY_GRANTED');
  end if;

  insert into user_credits(user_id, credit_balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  -- 잠금 후 잔액 갱신
  select credit_balance into v_balance
  from user_credits where user_id = p_user_id for update;

  v_balance := v_balance + p_credits;
  update user_credits set credit_balance = v_balance, updated_at = now()
  where user_id = p_user_id;

  insert into credit_ledger(user_id, delta, kind, external_txn_id, balance_after, note)
  values (p_user_id, p_credits, 'purchase', p_txn_id, v_balance, p_product_id);

  return json_build_object('ok', true, 'credit_balance', v_balance);
exception
  when unique_violation then
    -- 동시 웹훅 재시도 race: 유니크 충돌 시 이미 적립된 것으로 간주(멱등)
    return json_build_object('ok', true, 'code', 'ALREADY_GRANTED');
end;
$$;
