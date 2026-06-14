# Mandate: defect-kb v1.4 — ejection phase 신설 + MB 분산 magnitude 가이드 + eval 판정 안정화

> 단방향 Cowork→CC. 정본. 작성 2026-06-12.
> 근거: eval 24케이스 체제 첫 측정 (21/24, 88%) + 경계 진동 정량화 (006/009/010이 73±5에서 threshold 교차).
> **원칙: eval 정답 하드코딩 금지. 일반 원리만. basic 회귀 0.**

## 배경 (Cowork 분석)

1. **abs-sticking-overpack FAIL(65)** — 이형(ejection) 단계 불량인데 출력 enum(filling/packing/cooling/material)에 이형이 없음. taxonomy 공정 Phase는 "재료준비→충전→보압→냉각→**이형**" 5단계인데 엔진 출력은 4단계 — 스키마 격차. 모델이 근본원인(과보압)을 따라 packing으로 분류 → 채점 기준(cooling)과 충돌. 어느 쪽도 "이형"이 아니라서 진 게임.
2. **case-009 (PC/ABS MB 분산, 진동 68~78)** — `color_streaks` 노드엔 "배압 대폭 상향(현재 대비 2배 수준 목표)" magnitude 가이드가 있는데, case-009가 라우팅되는 색상/변색 경로엔 이 가이드가 없어 모델이 소폭 상향(6-8)만 권고. 지식 위치 문제.
3. **경계 진동(006/009/010)** — 동일 엔진·동일 응답에서 judge 점수가 ±5 진동, threshold(70) 교차. 단일 judge 런으로 경계 케이스 pass/fail 판정은 신뢰 불가.

## 수정 항목

### 1. ejection phase 신설 (4곳 일관 수정)

- `app/api/diagnose/route.ts` L283: `"defect_phase": "filling/packing/cooling/material/none"` → `"filling/packing/cooling/ejection/material/none"`. phase 분류 규칙(L182~)에 1줄 추가: "이형 시 발생하는 불량(부착·이젝터 백화·이형 크랙·드래그 마크)은 EJECTION — 단, 근본 원인이 과보압이어도 불량 발생 단계가 이형이면 EJECTION으로 하고 근본 원인 단계는 본문에 명시."
- `lib/types.ts` (또는 DiagnosisResultPanel.tsx L11의 타입): `'ejection'` 추가.
- `components/DiagnosisResultPanel.tsx` L583~585 phase 라벨 분기에 ejection 추가.
- `messages/ko.ts`·`en.ts`: `summary.phase_ejection` 키 추가 (ko: "이형 단계", en: "Ejection").
- `lib/defect-kb.ts`: sticking·ejector_marks 등 이형 노드의 phase 표기를 ejection 기준으로 정합 확인 (이미 '이형'이면 유지).
- `tests/eval/cases.json`: `abs-sticking-overpack`의 `expected_phase`를 `"ejection"`으로 갱신 + trap 문구에서 "enum에 ejection 없음" 주석 제거. **다른 케이스 무수정.**

### 2. MB(마스터배치) 분산 magnitude 가이드 위치 교정

- case-009가 실제 라우팅되는 노드를 확인하라 (discoloration 또는 색상 계열). 그 노드의 분산 부족 원인 항목에 color_streaks rank1과 동일한 magnitude 원칙을 추가: "배압 상향은 소폭이 아니라 **단계적 대폭(현재 대비 2배 수준 목표)** + 스크루 RPM 하향 병행(체류·혼련 확보). GF 수지는 섬유 파손 주의."
- 절대 수치(10~15MPa 등) 하드코딩 금지 — "현재 대비 2배" 상대 원칙만. (resin-kb 참조 컨벤션 유지)
- discoloration·color_streaks 양 노드 discriminators에 상호 변별 1줄 (전체 변색 vs 분산 줄무늬) — 이미 있으면 유지.

### 3. weld_line 강도 시나리오 출력 일관성 (case-010 진동 완화)

- KB 가이드레일 출력부에서, 강도·파단 요구 + GF 시나리오 매칭 시 "금형(게이트 위치) 대책을 권고 1순위로 명시할 것"을 가이드레일 텍스트에 명시적 1줄로 추가. (현재는 priorityLogic 산문에 묻혀 샘플링에 따라 강조가 빠짐)

### 4. eval judge 안정화 (run.mjs)

- judge 점수가 **65~75 구간**이면 judge만 2회 추가 실행(같은 진단 응답 재사용, 추가 비용 = haiku 2회), **3회 중앙값**으로 확정. results JSON에 `judge_scores: [s1,s2,s3]` 기록.
- diagnose 응답 캐시·채점 기준·threshold(70) 변경 금지.

### 5. 버전 + 회귀

- `KB_VERSION` → `defect-kb-v1.4`, `PROMPT_VERSION` → `v10` (출력 스키마 변경).
- `npm run eval` (24케이스 전량 재측정). 목표: abs-sticking PASS 전환, 006/009/010 중앙값 채점으로 안정 판정. **basic 회귀 0.**

## 완료 기준 (DoD)

- [ ] ejection이 route·types·UI·i18n 4곳 일관 반영, 기존 4 phase 케이스 회귀 0
- [ ] MB 분산 magnitude 가이드가 case-009 라우팅 노드에 반영 (절대 수치 하드코딩 없음)
- [ ] judge 3회 중앙값이 65~75 구간에서만 작동, results에 기록
- [ ] eval 24케이스: 전체 ≥ 21 PASS, basic 회귀 0, abs-sticking PASS
- [ ] `npx tsc --noEmit` + `npm run build` 통과, push 금지, 변경파일·eval 전후 보고

## 범위 외

- 디자인/레이아웃 변경 없음 (phase 라벨 텍스트 추가만)
- taxonomy.md 변경 없음 (이형은 이미 taxonomy 5단계에 존재 — 엔진이 따라가는 것)
- case-006 silver streak 시간패턴 가드 강화는 judge 안정화 후 재평가 (중앙값으로도 FAIL이면 v1.5)
