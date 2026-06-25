-- 범용 윈도우 rate-limit (user_id × bucket × endpoint). classify-defect 등 무료(크레딧 0) 엔드포인트의 봇/abuse 차단용.
-- bucket = 윈도우 키 문자열: 일 단위 'YYYY-MM-DD', 시 단위 'YYYY-MM-DDTHH'. 같은 테이블에 두 윈도우 공존.
-- ★ 기존 increment_extract_count / extract_rate_limits / add_follow_up 은 건드리지 않음. 신규만 추가.
-- 적용: Supabase 대시보드 → SQL Editor에 붙여넣고 Run.

create table if not exists api_usage_window (
  user_id  uuid  not null references auth.users(id) on delete cascade,
  bucket   text  not null,
  endpoint text  not null,
  count    int   not null default 0,
  primary key (user_id, bucket, endpoint)
);

-- service_role(서버)만 접근. RLS 활성 + 정책 없음 → anon/authenticated 차단, service_role은 RLS 우회.
alter table api_usage_window enable row level security;

-- RPC: increment_api_count — 원자적 카운터 증가 후 한도 검사. count+1 후 ok = (count <= p_limit).
-- 한도=10이면 10회째 ok=true, 11회째 ok=false. (increment_extract_count와 동일 security definer 기법.)
create or replace function increment_api_count(p_user_id uuid, p_bucket text, p_endpoint text, p_limit int)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp   -- security definer 하드닝(injection 표면 차단). prod에 이미 Run됨(재Run 불필요).
as $$
declare
  v_count int;
begin
  insert into api_usage_window(user_id, bucket, endpoint, count)
  values (p_user_id, p_bucket, p_endpoint, 0)
  on conflict (user_id, bucket, endpoint) do nothing;

  update api_usage_window
  set count = count + 1
  where user_id = p_user_id and bucket = p_bucket and endpoint = p_endpoint
  returning count into v_count;

  return jsonb_build_object('ok', v_count <= p_limit, 'count', v_count);
end;
$$;
