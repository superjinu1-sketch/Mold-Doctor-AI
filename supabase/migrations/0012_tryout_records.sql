-- 시사출(트라이아웃) 체크리스트 기록. 신규 기능 — 크레딧/Claude 호출 무관.
-- 0011_condition_ledger.sql의 machines 테이블에 선택적으로 연동(soft link, on delete set null).
-- 적용: Supabase 대시보드 → SQL Editor에 붙여넣고 Run. (0008~0011 관례 동일 — 코워크 검증 후 별도 수행)

-- ─────────────────────────────────────────────
-- 1. 테이블
-- ─────────────────────────────────────────────
create table if not exists tryout_records (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  machine_id     uuid references machines(id) on delete set null,  -- 선택 연동(설비 삭제돼도 기록은 유지)
  machine_name   text,   -- machine_id 미연동(자유 입력) 시 표시용, 또는 연동 시점 스냅샷
  mold_name      text not null,
  item_name      text,
  resin          text,
  status         text not null default 'in_progress' check (status in ('in_progress', 'done')),
  checklist      jsonb not null default '{}'::jsonb,  -- {itemId: {state:'ok'|'ng'|'na', memo, defects?:[...]}} (A~C, 1~14)
  measures       jsonb,                                 -- {shotWeight, dims, cycleTime} (D, 15~17)
  final_settings jsonb,                                 -- 기존 셋팅값 필드 재사용 (D, 18)
  summary        text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists tryout_records_user_idx on tryout_records(user_id, created_at desc);

-- ─────────────────────────────────────────────
-- 2. RLS — 0011과 동일 원칙(클라이언트 직접 CRUD + RLS, 서버 프록시 없음).
--    insert/update는 machine_id 지정 시 본인 소유 설비인지 함께 검증(교차 오염 차단, 0011과 동일 패턴).
-- ─────────────────────────────────────────────
alter table tryout_records enable row level security;

drop policy if exists own_read on tryout_records;
drop policy if exists own_insert on tryout_records;
drop policy if exists own_update on tryout_records;
drop policy if exists own_delete on tryout_records;
create policy own_read   on tryout_records for select using (user_id = auth.uid());
create policy own_insert on tryout_records for insert with check (
  user_id = auth.uid() and (machine_id is null or exists (select 1 from machines m where m.id = machine_id and m.user_id = auth.uid()))
);
create policy own_update on tryout_records for update using (user_id = auth.uid()) with check (
  user_id = auth.uid() and (machine_id is null or exists (select 1 from machines m where m.id = machine_id and m.user_id = auth.uid()))
);
create policy own_delete on tryout_records for delete using (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- 3. 용량 캡 — 유저당 200건(트리거, 0011 패턴 재사용). 우회 불가.
-- ─────────────────────────────────────────────
create or replace function enforce_tryout_cap() returns trigger
language plpgsql as $$
begin
  if (select count(*) from tryout_records where user_id = new.user_id) >= 200 then
    raise exception 'TRYOUT_CAP_EXCEEDED';
  end if;
  return new;
end;
$$;
drop trigger if exists tryout_records_cap_trigger on tryout_records;
create trigger tryout_records_cap_trigger before insert on tryout_records
for each row execute function enforce_tryout_cap();
