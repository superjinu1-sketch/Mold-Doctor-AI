-- MANUAL: 이 마이그레이션은 CC가 파일만 작성했다. 적용은 진우가 수동으로 한다(자동 적용 금지).
-- 적용: Supabase 대시보드 → SQL Editor에 붙여넣고 Run. (0013과 동일 방식)
-- 진단 시점의 KB·프롬프트 버전 기록. 기존 레코드는 null(추정 백필 금지).
alter table public.diagnosis_records
  add column if not exists kb_version     text,
  add column if not exists prompt_version text;

comment on column public.diagnosis_records.kb_version     is '진단 시점 defect-kb 버전. 서버 응답으로 전달받아 클라이언트가 기록.';
comment on column public.diagnosis_records.prompt_version is '진단 시점 프롬프트 버전.';
