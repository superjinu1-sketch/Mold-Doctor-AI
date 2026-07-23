-- 설비별 조건 표준 대장(condition-ledger). 신규 기능 — 크레딧/Claude 호출 무관
-- (OCR 자동입력은 기존 /api/extract-settings·기존 일 20회 한도를 그대로 재사용, 신규 한도 없음).
-- 적용: Supabase 대시보드 → SQL Editor에 붙여넣고 Run. Storage 버킷 생성은 -- MANUAL: 단계 참조.

-- ─────────────────────────────────────────────
-- 1. 테이블
-- ─────────────────────────────────────────────
create table if not exists machines (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  memo       text,
  sort       int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- 중복 이름 방지(대소문자 무시)
create unique index if not exists machines_user_name_idx on machines(user_id, lower(name));

create table if not exists condition_standards (
  id          uuid primary key default gen_random_uuid(),  -- 클라이언트가 사진 업로드 경로 산정을 위해 미리 생성해 명시 전달(업로드→insert 순서)
  user_id     uuid not null references auth.users(id) on delete cascade,
  machine_id  uuid not null references machines(id) on delete cascade,
  mold_name   text,
  item_name   text,
  resin       text,
  settings    jsonb not null default '{}'::jsonb,   -- 기존 셋팅값 필드(diagnose-chat MS_ALLOWED와 동일 키) 재사용
  memo        text,
  photo_path  text,     -- Storage 경로: {user_id}/{standard_id}.jpg (선택)
  photo_thumb text,     -- base64 320px 썸네일(목록·카드 egress 절약)
  created_at  timestamptz not null default now()
);
-- machine별 개정 이력 역순 조회(현행 표준 = 최신 1건) 최적화
create index if not exists condition_standards_machine_idx on condition_standards(machine_id, created_at desc);
create index if not exists condition_standards_user_idx on condition_standards(user_id, created_at desc);

-- ─────────────────────────────────────────────
-- 2. RLS — 클라이언트가 본인 소유 행을 직접 CRUD(lib/history-sync.ts와 동일 원칙: 서버 프록시 없이
--    anon 클라이언트 + RLS). 용량 캡은 트리거로 서버 측(우회 불가) 강제 — §3 참조.
-- ─────────────────────────────────────────────
alter table machines enable row level security;
alter table condition_standards enable row level security;

drop policy if exists own_read on machines;
drop policy if exists own_insert on machines;
drop policy if exists own_update on machines;
drop policy if exists own_delete on machines;
create policy own_read   on machines for select using (user_id = auth.uid());
create policy own_insert on machines for insert with check (user_id = auth.uid());
create policy own_update on machines for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_delete on machines for delete using (user_id = auth.uid());

drop policy if exists own_read on condition_standards;
drop policy if exists own_insert on condition_standards;
drop policy if exists own_update on condition_standards;
drop policy if exists own_delete on condition_standards;
-- insert/update는 machine_id도 본인 소유인지 함께 검증(타 유저 설비에 표준을 붙이는 교차 오염 차단).
create policy own_read   on condition_standards for select using (user_id = auth.uid());
create policy own_insert on condition_standards for insert with check (
  user_id = auth.uid() and exists (select 1 from machines m where m.id = machine_id and m.user_id = auth.uid())
);
create policy own_update on condition_standards for update using (user_id = auth.uid()) with check (
  user_id = auth.uid() and exists (select 1 from machines m where m.id = machine_id and m.user_id = auth.uid())
);
create policy own_delete on condition_standards for delete using (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- 3. 용량 캡 — 트리거(클라이언트 직접 insert 경로 포함 전부 우회 불가). 유저당 설비 50 ·
--    표준 이력 총 500 · 사진(표준 중 photo_path not null) 200. 수치는 mandate 확정값.
-- ─────────────────────────────────────────────
create or replace function enforce_machine_cap() returns trigger
language plpgsql as $$
begin
  if (select count(*) from machines where user_id = new.user_id) >= 50 then
    raise exception 'MACHINE_CAP_EXCEEDED';
  end if;
  return new;
end;
$$;
drop trigger if exists machines_cap_trigger on machines;
create trigger machines_cap_trigger before insert on machines
for each row execute function enforce_machine_cap();

create or replace function enforce_standard_cap() returns trigger
language plpgsql as $$
begin
  if (select count(*) from condition_standards where user_id = new.user_id) >= 500 then
    raise exception 'STANDARD_CAP_EXCEEDED';
  end if;
  if new.photo_path is not null and (
    select count(*) from condition_standards
    where user_id = new.user_id and photo_path is not null
  ) >= 200 then
    raise exception 'PHOTO_CAP_EXCEEDED';
  end if;
  return new;
end;
$$;
drop trigger if exists condition_standards_cap_trigger on condition_standards;
create trigger condition_standards_cap_trigger before insert on condition_standards
for each row execute function enforce_standard_cap();

-- ─────────────────────────────────────────────
-- 4. 현행 표준 뷰 — machine별 최신 1건(별도 포인터 컬럼 불필요, 단순성 우선).
--    security_invoker: 뷰 소유자가 아닌 조회자(authenticated 유저)의 RLS를 적용.
-- ─────────────────────────────────────────────
create or replace view current_condition_standards
with (security_invoker = true) as
select distinct on (machine_id) *
from condition_standards
order by machine_id, created_at desc;

-- ─────────────────────────────────────────────
-- 5. Storage 버킷 condition-photos (private) — 이 리포에서 첫 Storage 기능. 버킷 생성은 대시보드
--    수동(SQL insert into storage.buckets는 비권장 경로). 정책은 버킷 생성 후 SQL Editor에서 Run.
-- ─────────────────────────────────────────────
-- MANUAL: Supabase 대시보드 → Storage → New bucket
--   이름: condition-photos
--   Public bucket: OFF (private — signed URL로만 접근)
-- MANUAL 단계 완료 후 아래를 SQL Editor에서 Run:

drop policy if exists condition_photos_own_select on storage.objects;
drop policy if exists condition_photos_own_insert on storage.objects;
drop policy if exists condition_photos_own_update on storage.objects;
drop policy if exists condition_photos_own_delete on storage.objects;

-- 경로 규칙 {user_id}/{standard_id}.jpg — storage.foldername(name)[1] = 첫 세그먼트(user_id)
create policy condition_photos_own_select on storage.objects
  for select using (bucket_id = 'condition-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy condition_photos_own_insert on storage.objects
  for insert with check (bucket_id = 'condition-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy condition_photos_own_update on storage.objects
  for update using (bucket_id = 'condition-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy condition_photos_own_delete on storage.objects
  for delete using (bucket_id = 'condition-photos' and (storage.foldername(name))[1] = auth.uid()::text);
