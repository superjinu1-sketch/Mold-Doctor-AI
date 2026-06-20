-- 진단 히스토리 서버 이관 (v1). 사진 = base64 썸네일(A안). 풀해상도/Storage는 후속.
-- 적용: Supabase 대시보드 → SQL Editor에 붙여넣고 Run. (0004와 동일 방식)
-- HistoryRecord(app/history) 1:1 대응. 0001 RLS 패턴 그대로.
create table if not exists diagnosis_records (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  session_id      uuid,                       -- diagnosis_sessions.id (nullable)
  client_id       text not null,              -- 기존 localStorage record.id (이관 dedupe)
  round           int,
  defect_type     jsonb,                      -- {ko, en}
  severity        text,                       -- low | medium | high
  summary         text,
  causes          jsonb,                      -- DiagnosisCause[]
  recommendations jsonb,                      -- DiagnosisRec[]
  before_resin    text,
  before_settings jsonb,
  after_settings  jsonb,
  before_photo    text,                       -- base64 썸네일(A안)
  after_photo     text,                       -- base64 썸네일(A안)
  before_input    jsonb,
  resolved        text check (resolved in ('solved','partial','unsolved')),
  resolved_at     timestamptz,
  resolved_memo   text,
  created_at      timestamptz not null default now()
);

create unique index if not exists diagnosis_records_user_client
  on diagnosis_records (user_id, client_id);             -- idempotent 이관/저장
create index if not exists diagnosis_records_user_created
  on diagnosis_records (user_id, created_at desc);        -- 최신순 조회

alter table diagnosis_records enable row level security;
create policy own_read   on diagnosis_records for select using (user_id = auth.uid());
create policy own_insert on diagnosis_records for insert with check (user_id = auth.uid());
create policy own_update on diagnosis_records for update using (user_id = auth.uid()) with check (user_id = auth.uid());
