# Mandate: defect-kb v1.1 — hard 케이스 보정

> 단방향 Cowork→CC. 정본. 작성 2026-06-05.
> **원칙: eval 케이스 정답값을 그대로 박지 마라(overfitting 금지). 케이스가 드러낸 일반 원리만 고친다. 특정 RPM·온도 수치 하드코딩 금지 — resin-kb 범위 참조 + 방향(↑/↓)으로.**

## 배경
eval v6 결과 13케이스 69% PASS(78점). Basic 82(7/8) 양호, **Hard 71(2/5), trap 회피 2/5 약점.** 실패 4개(005 LCP플래시 / 006 PA6 간헐은줄 / 007 PC크랙 / 009 PC/ABS 색상)가 가리키는 일반 원리를 보정. 목표: hard 개선 + **basic 회귀 0**.

## 보정 항목 (lib/defect-kb.ts)

### 1. silver_streak — 우선순위 로직 (가장 중요)
현재 `priorityLogic` = "흡습성=건조 먼저". 문제: 건조가 정상범위여도 moisture(baseProbability 55)가 1순위로 눌러앉아, 스크루 RPM·사출속도 과다인데도 shear splay(15)가 못 올라옴.
- **priorityLogic 보강**: "건조 조건(dryTemp/dryTime)이 resin-kb drying 범위를 **충족하면 moisture splay 확률을 대폭 하향(사실상 배제)** → shear/thermal로 우선순위 이양. 스크루 RPM 또는 사출속도가 수지 권장 상한 초과 시 shear splay 우선. 배럴온도가 resin-kb degradeAbove 초과 시 thermal 우선."
- **patternHints 추가**: `'오후|시간경과|간헐|N샷마다': '열축적·전단 누적 → 2순위(thermal)·3순위(shear) 우선. 1순위(수분) 아님'`
- shear splay adjustment에 "배압↓" 외 RPM 과다시 "스크루 RPM↓" 명시(이미 있으면 유지).

### 2. DefectNode 스키마 — typicalSeverity 신설 (전반 severity 보정)
eval 전반에서 severity 과대(005 high)·과소(007/008/002) 반복. route FIXED_FRAMEWORK에 기준 있어도 안 먹음.
- `DefectNode`에 `typicalSeverity?: string` 추가. 각 노드에 채움:
  - medium 이하: flash(소량), silver_streak, sink_mark, weld_line(외관), flow_mark, surface_gloss, color_streaks, jetting, record_groove, tiger_stripe
  - high 가능: air_trap_burn(탄화), crack(파단강도 직결), short_shot(전수), weld_line(GF 강도직결시 high), warpage(조립불가시)
  - 노드별로 "조건부" 주석(예: crack `'medium~high (파단·강도 직결 시 high, 외관 미세균열 medium)'`)
- `formatDefectGuide`가 typicalSeverity를 가이드에 주입: "이 불량의 통상 심각도: {typicalSeverity}. 과대평가 금지(외관 불량은 원칙 medium 이하), high는 안전·전수·파단·탄화만."

### 3. flash — 저점도 super EP 분기
현재 1순위 클램프력. 저점도 극유동 수지(LCP·PPS·PA4T·PA6T 등)는 클램프력보다 압력·정밀도가 핵심.
- causes에 분기 추가 또는 rank3(저점도) 보강: "극저점도 super EP(resin-kb 저점도/super eng 플래그)는 **holding/packing 압력 최소화 + V/P 전환 앞당김 + PL면 정밀도**가 우선. 단순 사출압↓ 아님."
- adjustment: "holding 압력↓(최소화), V/P 전환 위치 앞당김, PL면 정밀 점검." typicalSeverity medium.

### 4. color_streaks — 분산 불량 분기 강화 (골격→풀)
현재 1분기(배압↑). 분산 불량 = 전단에너지(배압) 부족이 핵심.
- adjustment 구체화: "배압 **대폭 상향**(현재의 2배 수준까지 단계적), 스크루 RPM↓(체류·혼련 시간 확보), 마스터배치 비율·캐리어 수지 적합성 확인." trigger에 "배압 낮음" 정량 힌트(resin-kb 일반 권장 대비).
- 분기 추가: rank2 "스크루 전단·혼련 부족"(category Machine).

### 5. crack — 과보압 잔류응력 분기 보강
- 과보압 분기 adjustment에 "**금형온도↑(잔류응력 완화)**" 추가. PC는 금형온도 10~20℃↑로 ESC 저항 개선(resin-kb 참조, 절대수치 박지 말 것).
- priorityLogic: "건조 조건 정상이면 수분(가수분해) 분기 하향. 과보압(holdP 과고)이 명확하면 잔류응력 1순위."

## 버전·검증
- `KB_VERSION` → `'defect-kb-v1.1'`. eval run.mjs `PROMPT_VERSION` → `'v7'`(캐시 무효화).
- 큰 ts 편집은 bash heredoc/작은 Edit(truncate 방지).
- `npm run build` + `npm run verify` 통과.
- 재eval: `node tests/eval/run.mjs --port <dev포트>`. **합격 기준: Hard 평균↑(71→목표 78+), Basic 회귀 없음(82 유지±), 전체 PASS↑(9→11+ 목표).** 특히 006·009가 trap 회피하는지 확인.
- 거버넌스: 출력 "추정/조정안", severity 과대 금지, 브랜드명 0.

## 주의 (overfitting 가드)
- 4개 실패 케이스의 정답 수치(RPM 180, 배압 10~15 등)를 코드에 박지 마라. "권장 상한 초과 시", "대폭 상향" 같은 **일반 규칙 + resin-kb 참조**로.
- basic 7/8이 깨지면 보정 과했다는 뜻 → 되돌려 분기 강도 조절.
