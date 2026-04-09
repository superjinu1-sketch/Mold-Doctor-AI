# 진단 API 스킬

## 파일 위치
- API 라우트: app/api/diagnose/route.ts
- 수지 데이터: lib/resinKnowledge.ts
- 타입 정의: lib/types.ts

## API 구조
- POST /api/diagnose
- 입력: { defectType, resinType, resinDetail, machineSettings, moldInfo?, defectPhotos?, defectDescription? }
- 출력: JSON (defect_type, defect_phase, severity, summary, process_window_check, causes[], recommendations[], checklist, resin_specific_notes)

## 시스템 프롬프트 규칙
- buildSystemPrompt(resinType) 함수로 수지별 프롬프트 분리
- 선택된 수지의 resinKnowledge만 포함 (전체 수지 데이터 보내지 않음)
- 고정 부분: Scientific Molding(RJG) 방법론 + 4M 프레임워크 + 출력 JSON 포맷
- 가변 부분: 수지별 가공 조건, 대표 불량, 핵심 체크포인트

## 이미지 처리
- 이미지 있을 때: anthropic messages API에 image content block 추가, max_tokens 2500
- 이미지 없을 때: 텍스트만, max_tokens 1500

## 수정 시 체크리스트
- resinKnowledge 수정 시: 해당 수지의 가공 온도 범위가 제조사 TDS와 일치하는지 확인
- 시스템 프롬프트 수정 시: npm run eval로 정확도 변화 확인
- 출력 JSON 키 변경 시: 프론트엔드 결과 표시 컴포넌트도 함께 수정
- API 응답 파싱: backtick 제거 처리 필수 (```json 감싸서 오는 경우 대비)

## 절대 하지 말 것
- .env 파일 읽기/수정
- API 키를 코드에 하드코딩
- 전체 수지 데이터를 매 호출에 포함
- max_tokens를 3000 이상으로 설정 (비용 폭발)
