-- extract-settings 일일 호출 rate limit (user_id별 20회/일)
-- 적용: Supabase 대시보드 → SQL Editor에 붙여넣고 Run.

create table if not exists extract_rate_limits (
  user_id  uuid  not null references auth.users(id) on delete cascade,
  date     date  not null,
  count    int   not null default 0,
  primary key (user_id, date)
);

alter table extract_rate_limits enable row level security;
drop policy if exists own_read on extract_rate_limits;
create policy own_read on extract_rate_limits for select using (user_id = auth.uid());

-- RPC: increment_extract_count — 원자적 카운터 증가, 한도 초과 시 ok=false
create or replace function increment_extract_count(p_user_id uuid, p_date date, p_limit int)
returns json
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  insert into extract_rate_limits(user_id, date, count)
  values (p_user_id, p_date, 0)
  on conflict (user_id, date) do nothing;

  select count into v_count
  from extract_rate_limits
  where user_id = p_user_id and date = p_date
  for update;

  if v_count >= p_limit then
    return json_build_object('ok', false, 'count', v_count);
  end if;

  update extract_rate_limits
  set count = v_count + 1
  where user_id = p_user_id and date = p_date;

  return json_build_object('ok', true, 'count', v_count + 1);
end;
$$;
