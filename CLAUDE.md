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
- app/ — 페이지 (/, /diagnose, /guide, /pricing)
- app/api/ — API 라우트 (diagnose, analyze-image)
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
- /pricing — Free/Pro/Enterprise

## API
- /api/diagnose — POST, Claude API 호출, 수지별 프롬프트 분리
- /api/analyze-image — POST, Claude vision으로 불량 사진 분석

## 디자인 시스템 — 5대 규율

### 색 토큰 (절대 변경 금지)
- 배경: `#07090F` (`var(--background)`)
- 강조/CTA: `#00E887` (`var(--accent)`)
- 심각도: ok=`var(--color-ok)` / warn=`var(--color-warn)` / danger=`var(--color-danger)`

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

### 규율 4 — 한 페이지 한 테마
- 다크 단일 원칙 (`#07090F` 기반). 페이지 내 라이트 카드 혼용 금지
- `bg-white`, `bg-slate-*`, `bg-gray-*` 직접 사용 금지 — `var(--surface)`로 대체

### 규율 5 — 대비 WCAG AA (4.5:1)
- 다크 배경 위: 흰색(`#fff`) 또는 밝은 회색(`text-white/70` 이상) 사용
- `var(--accent)` (#00E887)은 강조·CTA·아이콘 전용 — **본문 텍스트 색으로 사용 금지**
- 위험/경고 상태는 `var(--color-danger)` / `var(--color-warn)` 시맨틱 토큰 사용

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
