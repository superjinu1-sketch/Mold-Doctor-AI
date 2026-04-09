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

## 스타일 규칙
- Tailwind CSS 사용
- 메인: #1E293B (다크블루), 악센트: #059669 (그린)
- 경고: #D97706 (앰버), 에러: #DC2626 (레드)
- 모바일 퍼스트 (현장 작업자가 장갑 끼고 사용)
- 큰 터치 타겟 (최소 44px)

## 코딩 규칙
- 모든 button에 type="button" (자동 새로고침 방지)
- 중첩 객체 접근 시 optional chaining (?.) 사용
- API 응답 JSON 파싱 시 backtick 제거 처리
- 한국어 UI, 기술 용어는 영문 병기
- 컴포넌트는 components/ 폴더에, 타입은 lib/types.ts에
