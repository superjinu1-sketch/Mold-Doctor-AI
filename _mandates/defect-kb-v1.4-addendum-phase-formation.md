# Mandate: v1.4 addendum — phase 판정 기준 정밀화 (형성 단계 원칙)

> 단방향 Cowork→CC. 정본. 작성 2026-06-12. `defect-kb-v1.4-ejection-dispersion-evalstab.md`의 보강 — 같은 배포에 묶을 것.
> 근거: 프로덕션 실측 (docs/browser-validation-superep-20260612.md 이슈 B) — PA6T 미성형 케이스에서 1순위 원인이 금형온도라는 이유로 phase가 "냉각"으로 표기됨. v1.3 규칙("채택 원인의 발생 단계")의 과교정.

## 수정

`app/api/diagnose/route.ts` phase 분류 규칙 문구를 다음 취지로 정밀화:

```
- phase = the stage where the DEFECT-FORMING MECHANISM operates, not where the contributing condition lives.
  · short shot: 충전 중 응고로 미충전 = FILLING — 원인이 금형온도(냉각 시스템)여도 FILLING.
  · crack from overpacking: 보압 중 잔류응력 형성 = PACKING.
  · post-crystallization dimensional change: 냉각 단계 결정화 메커니즘 = COOLING (타당).
  · ejection-stage defects = EJECTION (v1.4 본문 규칙 유지).
- 기여 조건(금형온도·건조 등)의 단계는 phase가 아니라 원인 분석 본문에서 설명.
```

KB 가이드레일 출력 1줄(v1.3에서 추가한 문구)도 동일 기준으로 동기화: "phase는 결함 메커니즘이 작동하는 단계 기준(채택 원인의 소속 시스템 아님)".

## 회귀

- eval 24케이스 재실행 시 phase 관련 케이스(case-005·007·text-003=packing, pc-esc=packing, abs-sticking=ejection) 전부 유지 확인. basic 회귀 0.
- 문구 변경이므로 PROMPT_VERSION은 v1.4 본문의 v10 bump에 포함 (추가 bump 불필요, 단 v1.4를 이미 측정했다면 v10 캐시 무효화 후 재측정).

push 금지. v1.4 본문과 함께 보고.
