@AGENTS.md

# Mold Doctor AI

## 프로젝트 개요
사출 성형 불량 트러블슈팅 AI 웹앱. 불량 사진 + 사출기 셋팅값을 입력하면 AI가 원인 분석 + 권장 셋팅 비교표 + 체크리스트를 제공.

## 기술 스택
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Claude API (@anthropic-ai/sdk) — vision + text
- html2canvas + jsPDF (PDF 생성)
- localStorage (진단 기록 저장)
- Vercel 배포

## 폴더 구조
- app/ — 페이지 (/, /diagnose, /guide, /pricing, /history, /auth)
- app/api/ — API 라우트 (diagnose, diagnose-chat, extract-settings)
- components/ — 공통 컴포넌트 (Navbar, Footer, 노드 등)
- lib/ — 유틸리티, 수지 데이터, 타입 정의
- public/ — 정적 파일

## 핵심 기능
1. 불량 사진 업로드 (드래그앤드롭, Ctrl+V, 카메라)
2. 불량 유형 선택 (12종) — AI가 사진으로도 판별
3. 수지 선택 (50종+, 카테고리별 그룹)
4. 사출기 셋팅값 입력 (온도, 압력, 속도, 시간, V/P 전환 등)
5. 금형/제품 정보 입력 (선택)
6. AI 진단 → 원인 분석 + 현재 vs 권장 셋팅 비교표
7. 결과 PDF 저장
8. 진단 기록 localStorage 저장

## 주요 페이지
- / — 랜딩 페이지
- /diagnose — 트러블슈팅 메인 (핵심)
- /guide — 불량 유형별 가이드 12종
- /pricing — 크레딧 모델 (가입 5크레딧, 추가 구매 placeholder)
- /history — 트러블슈팅 일지 (기록 보기·결과 복원·해결 상태)

## API
- /api/diagnose — POST, Claude API 호출, 수지별 프롬프트 분리
- /api/diagnose-chat — POST, 진단 결과 팔로업 질문 (세션 기반, 크레딧 차감 없음)
- /api/extract-settings — POST, Claude vision OCR — 사출기 화면/종이 조건표에서 셋팅값 추출 (인증+rate limit)

## 디자인 시스템 — 5대 규율

### 색 토큰 (절대 변경 금지, globals.css :root 기준)

| 역할 | 토큰 | 용도 |
|------|------|------|
| 페이지 배경 | `var(--canvas)` `#F4F5F7` | body background |
| 카드·패널 | `var(--surface)` `#FFFFFF` | 컨텐츠 카드 배경 |
| 내부 함몰 | `var(--surface-sunken)` `#EEF1F5` | 입력 필드·비활성 영역 |
| 경계선 | `var(--border)` `#E3E6EA` | 기본 구분선 |
| 강한 경계선 | `var(--border-strong)` `#D0D5DD` | 강조 구분선 |
| 본문 | `var(--ink)` `#14171C` | 주요 텍스트 |
| 보조 | `var(--muted)` `#45505B` | 설명·보조 텍스트 |
| 희미 | `var(--faint)` `#6B7280` | 라벨·캡션 전용 |
| 브랜드(산업블루) | `var(--brand)` `#1E5FA5` | CTA·링크·강조 |
| 브랜드 진한 | `var(--brand-ink)` `#0C447C` | 호버·눌림 상태 |
| 브랜드 배경 | `var(--brand-tint)` `#E6F1FB` | 배지·태그 배경 |
| 브랜드 위 텍스트 | `var(--on-brand)` `#FFFFFF` | brand 버튼 내 텍스트 |
| 정상 | `var(--ok)` `#047857` | 성공·해결 상태 |
| 주의 | `var(--warn)` `#854F0B` | 경고 상태 |
| 위험 | `var(--danger)` `#B42318` | 오류·위험 상태 |

심각도 배경: `var(--ok-bg)` / `var(--warn-bg)` / `var(--danger-bg)`
심각도 경계: `var(--ok-border)` / `var(--warn-border)` / `var(--danger-border)`

### 규율 1 — 모바일 우선 절대
- 단일 컬럼 기본, 외곽 패딩 16–24px (`var(--space-md)` ~ `var(--space-lg)`)
- 모든 레이아웃은 375px 기준으로 설계 후 sm:/md: 확장

### 규율 2 — 본문 17px+
- 본문 최소 `var(--text-body)` (17px). 결과 수치·강조는 `var(--text-h2)` (24px+)
- `var(--text-label)` (13px)는 라벨·태그·캡션 전용 — 본문·설명에 절대 사용 금지

### 규율 3 — 터치 타겟 44px+
- 모든 버튼·링크·아이콘 버튼: `min-h-[var(--touch-min)]` (44px) 이상
- CTA 버튼: `min-h-[var(--touch-cta)]` (48px) 이상
- `type="button"` 필수 (form submit 오작동 방지)

### 규율 4 — 한 페이지 한 테마 (라이트 단일)
- `var(--canvas)` 기반 라이트 단일 원칙. 다크 카드·순백 혼용 금지
- `bg-white`, `bg-gray-*`, `bg-slate-*`, `bg-black` 직접 사용 금지 — 토큰 유틸만 사용
- **raw hex 직접 작성 절대 금지** (globals.css `:root` 정의 내부만 허용)

### 규율 5 — 대비 WCAG AA (4.5:1)
- 본문은 `text-muted` 이상. `text-faint`는 라벨·캡션 전용, 그 아래 색 금지
- `var(--brand)` (#1E5FA5)은 CTA·강조·링크 전용 — **본문 텍스트 색으로 사용 금지**
- 심각도 색 매핑: 정상→`ok` / 주의→`warn` / 위험→`danger` (의미 역전 금지)
- 심각도 배경·경계선은 반드시 `--ok-bg` / `--warn-bg` / `--danger-bg` 토큰 사용

### 토큰 사용 원칙
- CSS 변수(`var(--)`)·Tailwind 유틸리티만 사용. **raw hex 직접 작성 금지**
- 예외: globals.css `:root` 토큰 정의 내부만 허용
- 심각도 색 매핑: 정상→ok / 주의→warn / 위험→danger (의미 역전 금지)

## 코딩 규칙
- 모든 button에 type="button" (자동 새로고침 방지)
- 중첩 객체 접근 시 optional chaining (?.) 사용
- API 응답 JSON 파싱 시 backtick 제거 처리
- 한국어 UI, 기술 용어는 영문 병기
- 컴포넌트는 components/ 폴더에, 타입은 lib/types.ts에
