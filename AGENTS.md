<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 금지어 룰 (lint-banned.sh와 동기화)

코드·UI·프롬프트 어디에서도 아래 표현을 사용하지 말 것.
위반 시 `bash .claude/scripts/lint-banned.sh` PreToolUse 훅이 차단.

| 금지어 | 허용 대체어 | 적용 범위 |
|--------|------------|----------|
| "진단" (사용자 노출) | "추정", "추정 결과" | .tsx 파일 전체 |
| "100% 정확" | "가능성 높음" | .ts/.tsx/.md |
| "정확히 찾아" | "분석", "추정" | .ts/.tsx/.md |
| "AI-진단", "AI-분석" 등 AI- 접두사 남용 | 기능명 직접 사용 | .ts/.tsx/.md |
| 특정 브랜드명 (Stryker 등) 추천 | 브랜드 중립 표현 | .ts/.tsx/.md |
| "SmartMoldIQ", "AI-MoldIQ" | "Mold Doctor" | .ts/.tsx/.md |
| "Anthropic" (UI 노출) | 내부 코드 주석만 허용 | .ts/.tsx/.md |

# Taxonomy 우선 원칙

불량 유형 정의·원인·해결은 `docs/defect_taxonomy.md`가 단일 진실 소스.
코드와 충돌 시 taxonomy 우선. taxonomy 변경 전 이 파일을 먼저 수정할 것.
