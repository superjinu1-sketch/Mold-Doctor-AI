# Mandate: defect-kb v1.3 — phase 동적 판정 + GF 웰드 강도 가중치 + eval 결과 영속화

> 단방향 Cowork→CC. 정본. 작성 2026-06-12.
> 근거: eval v7 실측 (KB v1.2, 12/15 PASS 80%, 평균 81). FAIL 3건(case-005·case-010·text-003)+감점 1건(case-007)의 일반 원리만 고친다.
> **원칙: eval 케이스 정답값을 그대로 박지 마라(overfitting 금지). 수치 하드코딩 금지. B-tier 추론 + A-tier 가이드레일 철학 유지. basic 회귀 0.**

## 실패 패턴 진단 (Cowork 분석)

**패턴 1 — phase 오분류 (case-005, text-003 FAIL 직접 원인 / case-007 감점).**
세 케이스 모두 정답 phase=packing인데 filling/cooling으로 분류. 근본 원인은 `app/api/diagnose/route.ts` L182의 정적 매핑:

```
Classify phase: FILLING (short shot, jetting, burn, weld line) / PACKING (sink, void, flash) / COOLING (warpage, crack) / MATERIAL (silver streak, discoloration, delamination)
```

불량유형→phase 1:1 고정이라, "과보압 잔류응력 크랙"(=packing 단계 문제)도 crack이므로 COOLING으로 분류된다. 모델이 규칙을 충실히 따라서 틀리는 구조. defect-kb 노드의 `phase` 필드도 단일 문자열(예: weld_line '충전', crack '냉각/이형')이라 같은 한계.

**패턴 2 — GF 웰드 강도에서 Mold 대책 가중치 부족 (case-010 FAIL, trap 미회피).**
weld_line 노드에 지식 자체는 있다: rank3 '게이트 위치(근본)', patternHints '강도 저하→GF=게이트 위치 검토', priorityLogic '구조적 웰드=조건만으론 한계'. 그런데 rank1 멜트온도(baseProbability 45) 대비 rank3(20)이라, 강도 요구 시나리오에서도 조건 조정이 앞순위를 차지. "외관이 좋아져도 강도는 회복 안 된다"는 변별이 약하다.

## 수정 항목

### 1. route.ts — phase 판정 규칙 교체 (패턴 1 핵심)

L182의 정적 매핑을 **원인 기준 동적 판정**으로 교체. 취지:

```
Classify phase by the ROOT CAUSE you adopt as rank 1, not by defect type alone:
- phase = the molding stage where the adopted root-cause mechanism originates.
- Default mapping by defect type (참고용): FILLING(short shot, jetting, burn, weld line) / PACKING(sink, void, flash) / COOLING(warpage) / MATERIAL(silver streak, discoloration, delamination)
- Override the default when the mechanism says otherwise. 예: crack — 과보압·잔류응력 기인이면 PACKING, 이형·냉각응력 기인이면 COOLING. flash — 형체력 부족·극저점도 침투가 보압 피크에서 발생하면 PACKING.
- State the phase reasoning in one clause (어느 원인이 어느 단계에서 발생하는지).
```

문구는 CC가 기존 프롬프트 톤에 맞게 다듬되, **"phase는 채택한 1순위 원인의 발생 단계" 원칙과 crack/flash 예시는 유지**할 것 (예시는 일반 도메인 원리이지 eval 정답 복사가 아님).

### 2. lib/defect-kb.ts — phase 필드 다의화 (최소 변경)

- 원인에 따라 phase가 갈리는 노드만 phase 문자열을 병기로 수정: 예) `crack: '보압(과보압 잔류응력)/냉각·이형(이형응력·ESC)'`, `flash: '충전/보압(형체력·점도 침투)'`. 전 노드 재작성 금지 — 다의 노드만.
- KB 가이드레일 출력부(buildSystemBlocks 쪽 lines.push)에 1줄 추가: "phase는 채택한 1순위 원인의 발생 단계 기준으로 판정(노드 phase는 기본값)."

### 3. lib/defect-kb.ts — weld_line 강도 시나리오 가중치 (패턴 2)

- priorityLogic 보강: "**강도·파단 요구 시나리오(기능부품·GF 수지)에서는 Mold(게이트 위치) 원인을 우선 검토** — 멜트온도↑·보압↑은 V홈 외관을 개선해도 섬유 배향 단절로 인한 웰드부 강도는 모재 대비 크게 회복 못 함. 외관 양품 ≠ 강도 OK."
- patternHints 추가: `'파단|부러짐|강도 부족|기능 불량': 'GF 수지면 섬유 배향 단절 = 조건 조정으로 해결 불가 영역. 게이트 위치 이동·웰드 위치 이동(금형)이 근본 대책. 조건 권고 시 한계를 명시할 것'`
- rank3 trigger에 "GF 함유 + 강도 요구" 조건 추가. **baseProbability 숫자 자체는 case-010 맞추기용으로 조정하지 말 것** — 시나리오 조건부 우선순위(priorityLogic·patternHints)로만 올린다.

### 4. tests/eval/run.mjs — 결과 영속화 (v6 데이터 부재 재발 방지)

- eval 완료 시 `tests/eval/results/eval-{KB_VERSION}-{YYYYMMDD-HHmm}.json` 저장: 전체 집계(PASS n/N, 평균) + 케이스별 {id, difficulty, score, pass, trap_avoided, judge_reasoning}.
- `tests/eval/results/`는 **git 추적** (gitignore 넣지 마라). 이번 v7 측정 결과도 CC가 보고한 수치 그대로 백필 1개 생성(`eval-defect-kb-v1.2-20260612.json`).
- 판정 로직·점수 산식 변경 금지. 저장만 추가.

### 5. 버전 bump + 회귀 측정

- `KB_VERSION` → `defect-kb-v1.3`, run.mjs `PROMPT_VERSION` → `'v8'` (캐시 무효화).
- `npm run eval` 재실행 후 결과 보고 (신규 results JSON 첨부).

## 완료 기준 (Definition of Done)

- [ ] phase 동적 판정 규칙 반영 (route.ts + KB 가이드레일 1줄)
- [ ] weld_line 강도 시나리오 우선순위 반영 (baseProbability 무변경)
- [ ] eval 결과 영속화 + v1.2 백필 파일 존재
- [ ] eval 재실행: case-005·text-003·case-007 phase 정상화 여부 보고, **basic 회귀 0** (case-001~004, 006~009, text-001·002 PASS 유지)
- [ ] `npx tsc --noEmit` + `npm run build` 통과, push 금지, 변경파일 보고

## 범위 외

- 디자인/UI 변경 없음 (프롬프트·KB·eval 러너만)
- taxonomy.md 변경 없음 (이번 수정은 분류 규범 변경이 아니라 엔진 판정 규칙·가중치 — GF 웰드 변별은 taxonomy에 이미 존재)
- case-009(캐리어레진 상용성), case-005의 PL면 정밀도 강조 부족 등 78~85점대 소폭 감점 항목은 v1.4 후보로 보류
