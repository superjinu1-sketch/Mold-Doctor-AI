-- MANUAL: 이 마이그레이션은 CC가 파일만 작성했다. 적용은 진우가 수동으로 한다(자동 적용 금지).
-- 원격 강제 업데이트 게이트용 최소버전 테이블. 판정은 min_build(정수) 단독 — semver 문자열
-- 비교는 1.10.0 < 1.9.0 오판이 나므로 표시용으로만 쓴다(lib/appVersionGate.ts).
-- 시드값은 적용 시점의 현재 배포본과 동일(android build 6, ios build 7) — 적용 직후에는
-- 아무도 차단되지 않는다. 게이트는 진우가 min_build 값을 올릴 때만 발동한다.
create table if not exists public.app_min_version (
  platform      text primary key check (platform in ('android','ios')),
  min_version   text not null,           -- semver, 예: '1.2.0'
  min_build     integer not null,        -- android=versionCode, ios=CFBundleVersion
  store_url     text not null,
  message       text,                    -- null이면 앱 기본 문구 사용
  updated_at    timestamptz not null default now()
);

alter table public.app_min_version enable row level security;

-- 익명 포함 전원 읽기 허용 (로그인 전에도 게이트가 동작해야 함)
create policy app_min_version_read on public.app_min_version
  for select using (true);
-- 쓰기 정책 없음 = service_role만 변경 가능

insert into public.app_min_version (platform, min_version, min_build, store_url) values
  ('android','1.2.0',6,'https://play.google.com/store/apps/details?id=com.jinsimlabs.molddoctor'),
  ('ios','1.0',7,'https://apps.apple.com/app/id6793057343')
on conflict (platform) do nothing;
