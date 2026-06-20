-- resin-grade Stage 2 — 그레이드 해석 캐시 + resolve-grade 일일 rate limit
-- 적용: Supabase 대시보드 → SQL Editor에 붙여넣고 Run. (베타-B 패턴, 0003과 동일)
-- 참조: _mandates/resin-grade-first-input.md 작업 2

-- ── 1) 그레이드 캐시 (전역 — 그레이드 스펙은 사실상 불변) ───────────────────
-- 외부 호출(haiku)은 캐시 미스에만 발생. cache_key = 정규화된 그레이드명(lib/grade-parser normalizeGrade).
create table if not exists grade_cache (
  cache_key   text         primary key,
  found       boolean      not null,            -- 수지계열 확정 여부 (false=미상)
  result      jsonb,                            -- 확정 시 파싱결과(JSON), 미상 시 null
  source      text         not null,            -- 'pattern' | 'llm'
  hit_count   int          not null default 0,
  created_at  timestamptz  not null default now(),
  expires_at  timestamptz  not null            -- 성공 90일 / 미상(null) 7일 — 앱에서 계산해 저장
);

-- service_role(서버) 전용 접근. RLS 켜고 공개 정책 없음 → anon/authenticated 직접 접근 차단.
-- (서버 라우트는 service_role 키로 접근하며 RLS를 우회한다.)
alter table grade_cache enable row level security;

-- 만료 조회 보조 인덱스
create index if not exists grade_cache_expires_idx on grade_cache (expires_at);

-- ── 2) resolve-grade 일일 rate limit (user_id별, LLM 실호출만 카운트) ────────
-- 0003_extract_rate_limit.sql 패턴 복제. 카운트는 라우트에서 'LLM 폴백 직전'에만 호출한다.
create table if not exists resolve_rate_limits (
  user_id  uuid  not null references auth.users(id) on delete cascade,
  date     date  not null,
  count    int   not null default 0,
  primary key (user_id, date)
);

alter table resolve_rate_limits enable row level security;
drop policy if exists own_read on resolve_rate_limits;
create policy own_read on resolve_rate_limits for select using (user_id = auth.uid());

-- RPC: increment_resolve_count — 원자적 카운터 증가, 한도 초과 시 ok=false
create or replace function increment_resolve_count(p_user_id uuid, p_date date, p_limit int)
returns json
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  insert into resolve_rate_limits(user_id, date, count)
  values (p_user_id, p_date, 0)
  on conflict (user_id, date) do nothing;

  select count into v_count
  from resolve_rate_limits
  where user_id = p_user_id and date = p_date
  for update;

  if v_count >= p_limit then
    return json_build_object('ok', false, 'count', v_count);
  end if;

  update resolve_rate_limits
  set count = v_count + 1
  where user_id = p_user_id and date = p_date;

  return json_build_object('ok', true, 'count', v_count + 1);
end;
$$;
