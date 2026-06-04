-- 베타-B: 크레딧 게이트 마이그레이션
-- 적용: Supabase 대시보드 → SQL Editor에 붙여넣고 Run.
-- 차감/충전은 서버(service_role)가 RPC로만 수행. 클라이언트는 읽기만.

-- ─────────────────────────────────────────────
-- 1. 테이블
-- ─────────────────────────────────────────────
create table if not exists user_credits (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  credit_balance int  not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists credit_ledger (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  delta        int  not null,
  kind         text not null check (kind in ('signup_bonus','purchase','diagnosis','material_analysis','refund','adjust')),
  session_id   uuid,
  balance_after int not null,
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists credit_ledger_user_idx on credit_ledger(user_id, created_at desc);

create table if not exists diagnosis_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  follow_up_count int  not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists diagnosis_sessions_user_idx on diagnosis_sessions(user_id, created_at desc);

-- ─────────────────────────────────────────────
-- 2. RLS — 본인 행 읽기만 허용. 쓰기 정책 없음 = 클라이언트 차단.
--    서버 service_role 키는 RLS를 우회하므로 RPC로만 변경 가능.
-- ─────────────────────────────────────────────
alter table user_credits       enable row level security;
alter table credit_ledger      enable row level security;
alter table diagnosis_sessions enable row level security;

drop policy if exists own_read on user_credits;
drop policy if exists own_read on credit_ledger;
drop policy if exists own_read on diagnosis_sessions;

create policy own_read on user_credits       for select using (user_id = auth.uid());
create policy own_read on credit_ledger      for select using (user_id = auth.uid());
create policy own_read on diagnosis_sessions for select using (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- 3. RPC: start_session — 진단 시작 시 호출(원자적 차감)
--    신규 유저는 lazy로 5크레딧 grant 후 1 차감.
-- ─────────────────────────────────────────────
create or replace function start_session(p_user_id uuid)
returns json
language plpgsql
as $$
declare
  v_balance int;
  v_session uuid;
  v_new boolean := false;
begin
  -- 신규면 5크레딧 grant
  insert into user_credits(user_id, credit_balance)
  values (p_user_id, 5)
  on conflict (user_id) do nothing;
  if found then
    v_new := true;
    insert into credit_ledger(user_id, delta, kind, balance_after, note)
    values (p_user_id, 5, 'signup_bonus', 5, 'welcome 5 credits');
  end if;

  -- 잠금 후 차감
  select credit_balance into v_balance
  from user_credits where user_id = p_user_id for update;

  if v_balance < 1 then
    return json_build_object('ok', false, 'code', 'INSUFFICIENT', 'credit_balance', v_balance);
  end if;

  v_balance := v_balance - 1;
  update user_credits set credit_balance = v_balance, updated_at = now()
  where user_id = p_user_id;

  insert into diagnosis_sessions(user_id) values (p_user_id) returning id into v_session;

  insert into credit_ledger(user_id, delta, kind, session_id, balance_after, note)
  values (p_user_id, -1, 'diagnosis', v_session, v_balance, 'diagnosis session');

  return json_build_object('ok', true, 'session_id', v_session, 'credit_balance', v_balance, 'is_new_user', v_new);
end;
$$;

-- ─────────────────────────────────────────────
-- 4. RPC: add_follow_up — 팔로업 시 호출(세션당 5회 한도)
-- ─────────────────────────────────────────────
create or replace function add_follow_up(p_session_id uuid, p_user_id uuid)
returns json
language plpgsql
as $$
declare
  v_count int;
begin
  select follow_up_count into v_count
  from diagnosis_sessions
  where id = p_session_id and user_id = p_user_id
  for update;

  if not found then
    return json_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;

  if v_count >= 5 then
    return json_build_object('ok', false, 'code', 'FOLLOWUP_LIMIT', 'follow_up_count', v_count);
  end if;

  update diagnosis_sessions set follow_up_count = v_count + 1 where id = p_session_id;
  return json_build_object('ok', true, 'follow_up_count', v_count + 1);
end;
$$;
