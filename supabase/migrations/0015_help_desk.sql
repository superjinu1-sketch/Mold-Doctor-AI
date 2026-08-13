-- 도움말 위젯(help-desk-widget-v1). 신규 기능 — 크레딧/Claude 진단 파이프라인과 무관.
-- 적용: Supabase 대시보드 → SQL Editor에 붙여넣고 Run. (0008~0012 관례 동일 — 코워크 검증 후 별도 수행)

-- ─────────────────────────────────────────────
-- 1. 익명 질문 로그 — user_id·IP 등 식별자 컬럼 없음(설계 §5, 개인정보처리방침 변경 불필요).
--    서버(service_role)만 insert/select. RLS 활성 + 정책 없음 → anon/authenticated 완전 차단
--    (0007_api_usage_window.sql과 동일 원칙 — service_role은 RLS를 우회한다).
-- ─────────────────────────────────────────────
create table if not exists help_questions (
  id         uuid primary key default gen_random_uuid(),
  question   text not null,
  locale     text not null,
  source     text not null,  -- 'faq' | 'ai' | 'fallback'
  created_at timestamptz not null default now()
);
alter table help_questions enable row level security;

-- ─────────────────────────────────────────────
-- 2. 비로그인 rate-limit(IP 기반, 3회/일). 로그인 유저는 기존 api_usage_window +
--    increment_api_count(0007) 그대로 재사용(endpoint='help', p_limit=10) — 이 섹션은 신규 불필요.
--    api_usage_window는 user_id uuid not null(auth.users FK)이라 비로그인 IP에 쓸 수 없어 별도 테이블.
--    ip는 x-forwarded-for에서 파싱한 문자열(주소 자체 — PII 성격이나 30일 후 자연 소멸 목적으로
--    별도 익명 로그(help_questions)와는 분리해 최소 보관). bucket 형식은 0007과 동일('YYYY-MM-DD').
-- ─────────────────────────────────────────────
create table if not exists help_ip_usage_window (
  ip       text not null,
  bucket   text not null,
  count    int  not null default 0,
  primary key (ip, bucket)
);
alter table help_ip_usage_window enable row level security;

create or replace function increment_help_ip_count(p_ip text, p_bucket text, p_limit int)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int;
begin
  insert into help_ip_usage_window(ip, bucket, count)
  values (p_ip, p_bucket, 0)
  on conflict (ip, bucket) do nothing;

  update help_ip_usage_window
  set count = count + 1
  where ip = p_ip and bucket = p_bucket
  returning count into v_count;

  return jsonb_build_object('ok', v_count <= p_limit, 'count', v_count);
end;
$$;
