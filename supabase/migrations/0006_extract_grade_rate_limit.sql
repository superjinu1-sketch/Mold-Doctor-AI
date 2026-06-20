-- 라벨 사진 OCR(extract-grade) 일일 rate limit (user_id별 20회/일). 0003 패턴 복제.
-- 사출기 OCR(extract_rate_limits)·resolve(resolve_rate_limits)와 예산 분리.
-- 적용: Supabase 대시보드 → SQL Editor에 붙여넣고 Run. (0004/0005와 동일)

create table if not exists extract_grade_rate_limits (
  user_id  uuid  not null references auth.users(id) on delete cascade,
  date     date  not null,
  count    int   not null default 0,
  primary key (user_id, date)
);

alter table extract_grade_rate_limits enable row level security;
drop policy if exists own_read on extract_grade_rate_limits;
create policy own_read on extract_grade_rate_limits for select using (user_id = auth.uid());

create or replace function increment_extract_grade_count(p_user_id uuid, p_date date, p_limit int)
returns json
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  insert into extract_grade_rate_limits(user_id, date, count)
  values (p_user_id, p_date, 0)
  on conflict (user_id, date) do nothing;

  select count into v_count
  from extract_grade_rate_limits
  where user_id = p_user_id and date = p_date
  for update;

  if v_count >= p_limit then
    return json_build_object('ok', false, 'count', v_count);
  end if;

  update extract_grade_rate_limits
  set count = v_count + 1
  where user_id = p_user_id and date = p_date;

  return json_build_object('ok', true, 'count', v_count + 1);
end;
$$;
