# Mandate: resin-kb 교차검증 Batch 1 반영 — 고빈도 11종 verified 승격

> 단방향 Cowork→CC. 정본. 작성 2026-06-12.
> 근거 문서: `docs/resin-kb-verification-batch1.md` (공급사 1차 출처 2개+ 교차검증, 먼저 읽을 것)
> **선행: `_mandates/defect-kb-v1.3-phase-and-gf-weld.md` 머지 후 실행** (eval 캐시·PROMPT_VERSION 충돌 방지)

## 원칙

- `lib/resin-kb.ts`의 **지정 11종 항목만** 수정. 다른 수지·스키마·route 로직 변경 금지.
- 수정값은 아래 표가 정본. 임의 보정 금지 — 검증 안 된 값을 "내친김에" 고치지 마라.
- notes 추가 문구는 영어(기존 컨벤션), 간결하게.
- 거버넌스: 공급사 브랜드명은 **notes/주석에도 쓰지 마라** (Delrin·Hostaform 등 금지 — "homopolymer/copolymer"로만 구분).

## 수정표 (이 값으로 교체)

| 수지 키 | 필드 | 현행 | 신규 |
|---------|------|------|------|
| 'PP' | meltC | {min:200,max:250} | {min:200,max:250, **degradeAbove:290**} |
| 'PP' | shrinkagePct | [1.5,2.5] | **[1.0,2.5]** |
| 'PE(HDPE)' | moldC | {min:20,max:60} | {min:20,**max:50**} |
| 'PS' | meltC | {min:180,max:240} | {min:180,max:240, **degradeAbove:280**} |
| 'ABS' | meltC | {min:210,max:250,degradeAbove:260} | {**min:220,max:260**,degradeAbove:260} |
| 'PC' | moldC | {min:80,max:120} | {**min:70,max:110**} |
| 'PC' | meltC | {min:280,max:320} | {min:280,max:320, **degradeAbove:320**} |
| 'PC' | shrinkagePct | (없음) | **[0.5,0.7]** |
| 'PMMA(아크릴)' | moldC | {min:50,max:80} | {**min:60,max:90**} |
| 'PMMA(아크릴)' | shrinkagePct | (없음) | **[0.3,0.6]** |
| 'PC/ABS' | drying | {tempC:100,hours:[3,4],target:null} | {tempC:**105**,hours:[3,4],targetMoisturePct:**0.02**} |
| 'PC/ABS' | moldC | {min:60,max:90} | {**min:70,max:100**} |
| 'PC/ABS' | meltC | {min:240,max:280} | {min:240,max:280, **degradeAbove:280**} |
| 'PC/ABS' | shrinkagePct | (없음) | **[0.5,0.7]** |
| 'PA6' | drying.targetMoisturePct | 0.1 | **0.08** |
| 'PA6' | meltC | {min:230,max:260} | {**min:240,max:270**, **degradeAbove:300**} |
| 'PA6' | shrinkagePct | [1.5,2.2] | **[0.8,1.5]** |
| 'PA66' | meltC | {min:260,max:290,degradeAbove:300} | {**min:275,max:300**,degradeAbove:**310**} |
| 'PA66' | moldC.gf | [80,120] | **[80,100]** |
| 'POM(아세탈)' | meltC.degradeAbove | 220 | **230** |
| 'POM(아세탈)' | shrinkagePct | [1.8,2.5] | **[1.8,2.2]** |
| 'PBT' | meltC | {min:230,max:270} | {**min:250,max:270**, **degradeAbove:280**} |

## notes 보강 (해당 수지 notes 끝에 추가)

- PC: `Above 320°C or long residence time: thermal degradation + yellowing.`
- PC/ABS: `Dry-air 100-110°C; residual moisture max 0.02%.`
- PA6: `Lower melt bound 240°C = Tm 222 + margin; below this expect unmelt/low-melt defects. Max residence ~10min at melt temp.`
- PA66: `Normal molding up to 305°C is possible; above 300°C minimize residence time.`
- POM: `Copolymer baseline (Korean market default). Homopolymer melt 205-225°C, hard limit 230°C; copolymer hard limit 238°C. Copolymer: avoid residence >15min above 193°C (formaldehyde).` — 기존 "above 220°C" 문구는 230 기준으로 수정.
- PBT: `Above 280°C degradation begins; ~290°C releases CO/THF fumes.`
- PMMA: `Dehumidifying dryer up to 98°C, 2-3h. Mold below 60°C risks surface stress on optical faces.`

## source/confidence 승격

- **verified 승격 (10종)**: PP, PE(HDPE), PS, ABS, PC, PC/ABS, PA6, PA66, POM(아세탈), PBT → `source: 'verified', confidence: 'verified'`
- **PMMA(아크릴)는 estimated 유지** (단일 공급사 출처) — 수치만 수정.

## 회귀 검증 (필수)

1. `npx tsc --noEmit` + `npm run build` 통과.
2. run.mjs `PROMPT_VERSION` bump (v8 → v9, 수지 수치 변경 = 진단 응답 변경).
3. `npm run eval` 재실행 — **basic 회귀 0**. 특히 `pom-colorstreak-lowmelt`(POM 저멜트 케이스)가 degradeAbove 220→230 변경 후에도 PASS 유지되는지 확인 (이 케이스의 핵심 로직은 "노즐 180 < 권장 하한 190"이라 영향 없어야 정상 — 영향 있으면 중단 보고).
4. results JSON 저장(eval 영속화, v1.3에서 구현됨) 후 전후 비교 보고.

push 금지. 보고: 변경 diff 요약, eval 전후 비교, 이상 케이스.

## 범위 외 (다음 batch)

- 나머지 40종 검증 (super-EP: PPS·LCP·PEEK·PEI 등은 batch 2)
- PMMA 제2공급사 확보 후 승격
- GF 그레이드 별도 항목화 여부 (PA6-GF30 등 참고치는 verification 문서에 확보됨 — 구조 결정은 필러 모디파이어 레이어 mandate에서)
