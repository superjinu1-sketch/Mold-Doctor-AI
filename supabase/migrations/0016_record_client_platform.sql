-- MANUAL: 이 마이그레이션은 CC가 파일만 작성했다. 적용은 진우가 수동으로 한다(자동 적용 금지).
-- 적용: Supabase 대시보드 → SQL Editor에 붙여넣고 Run. (0014와 동일 방식)
-- 추정 요청이 들어온 플랫폼(ios 1.5.3 / android 1.5.3 / web-mobile / web-desktop). 웹·앱 사용 비율을 가르려고 둔다.
-- 서버(app/api/diagnose/route.ts)만 쓴다. 클라 upsert(lib/history-sync.ts)는 이 컬럼을 보내지 않으므로 덮어쓰지 않는다.
-- 기존 레코드는 null(추정 백필 금지).
alter table public.diagnosis_records
  add column if not exists client_platform text;

comment on column public.diagnosis_records.client_platform is '추정 요청 플랫폼. 서버가 X-MD-Platform 헤더·User-Agent로 판별.';
