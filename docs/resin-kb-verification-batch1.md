# resin-kb 교차검증 리포트 — Batch 1 (고빈도 11종)

> 작성 2026-06-12 (Cowork). 방법: 공급사 1차 출처(Processing Data Sheet/TDS/Molding Guide) 2개 이상 교차 대조.
> 목적: resin-kb.ts `source: 'experience' / confidence: 'estimated'` → `'verified'` 승격 근거.
> 반영 mandate: `_mandates/resin-kb-v2-batch1-verified.md`

## 판정 요약

| 수지 | 출처 | 핵심 판정 | 승격 |
|------|------|----------|------|
| PP | ExxonMobil·INEOS·LyondellBasell | 전 항목 일치. 분해 ~290℃ 추가 | ✅ verified |
| HDPE | INEOS O&P·LyondellBasell·SpecialChem | **mold 상한 60→50℃** 수정 | ✅ (수정 후) |
| PS | INEOS Styrolution·SpecialChem | 일치. 분해 ~280℃ 추가 | ✅ verified |
| ABS | Styrolution Terluran·Chi Mei | 건조·수축 정확 일치. melt 220-260 시프트 | ✅ verified |
| PC | Covestro Makrolon·SABIC Lexan | **mold 80-120→70-110**, shrink 0.5-0.7·분해 320 추가 | ✅ verified |
| PMMA | Röhm Plexiglas (단일 공급사) | **mold 50-80→60-90** | ⚠️ estimated 유지 (제2공급사 미확보) |
| PC/ABS | Covestro Bayblend·SABIC Cycoloy | **mold 60-90→70-100**, shrink·분해 280 추가 | ✅ verified |
| PA6 | BASF Ultramid B3S·Lanxess Durethan | **melt 하한 230→240** (융점 222 직상), **shrink 1.5-2.2→0.8-1.5** | ✅ verified |
| PA66 | BASF Ultramid A3K·DuPont Zytel | **melt 하한 260→275** (융점 260 겹침), **GF mold 상한 120→100**, 분해 300→310 | ✅ verified |
| POM | DuPont Delrin·Celanese Hostaform/Celcon | **분해 220→230℃** (호모 230/코포 238 하드리밋, 220은 Delrin 정상셋팅 215-225를 오경보) | ✅ verified |
| PBT | BASF Ultradur·Lanxess Pocan | **melt 하한 230→250** (융점 225 직상), 분해 280 추가 | ✅ verified |

## 진단 정확도 직결 발견 3건

1. **POM 분해온도 220℃ 과보수** — 양사 하드리밋 230(Delrin 호모)/238(Celcon 코포). 현행 220은 Delrin 사용자의 정상 멜트(205-225)를 "분해 위험"으로 오판. 한국 시장은 코폴리머(KEP 케피탈·Hostaform) 위주라 기본 멜트범위 190-210은 유지하되, 가드 230 + 호모 205-225 주석 + "193℃ 초과 체류 15분 금지"(Celcon) 병기.
2. **PA계·PBT 멜트 하한이 융점 직상** — PA6 230(Tm 222)/PA66 260(Tm 260)/PBT 230(Tm 225). 실제 저멜트 상태를 "범위 내 정상"으로 봐서 저멜트 가드가 미발동하는 구조적 위험. 원칙: 하한 = 융점 +15~20℃.
3. **PA6 수축률 약 2배 과대** (1.5-2.2 vs 실측 0.9-1.2) — 치수 관련 진단(휨·싱크) 추론 근거 오염.

## 수지별 상세 (확정값)

### PP — verified
건조 불필요(일치) / melt 200-250 유지(ExxonMobil 199-239·INEOS 204-274 교집합) / mold 20-60 유지 / shrink 1.0-2.5 (하한 0.8-1.0 INEOS) / **degradeAbove 290 신규**(ExxonMobil 288·INEOS 299 초과 금지)

### HDPE — verified (수정 후)
건조 불필요 / melt 200-250 유지(INEOS 최적 204-221 주석) / **mold 20-50** (INEOS 10-21·LB ≤50) / shrink 1.5-3.0 유지

### PS — verified
건조 불필요 / melt 180-240 유지(보수적, 출처 180-260) / mold 20-50 유지 / shrink 0.3-0.6 정확 일치 / **degradeAbove 280 신규**

### ABS — verified
건조 80℃ 2-4h 정확 일치(Terluran) / **melt 220-260** (현 210-250, Terluran 220-260) / mold 40-80 유지(출처 30-80 겹침) / shrink 0.4-0.7 일치 / 분해 260 유지(보수적 OK)

### PC — verified
건조 120℃ 3-4h·0.02% 일치(Covestro·SABIC) / melt 280-320 일치 / **mold 70-110** (Makrolon 70-110·Lexan 90-110) / **shrink 0.5-0.7 신규** / **degradeAbove 320 신규** + 체류시간 경고

### PMMA — estimated 유지
건조 80℃ 3-4h 유지(Röhm 제습 ≤98℃ 2-3h 주석) / melt 220-260 정확 일치 / **mold 60-90** (Röhm, 하한 50은 광학면 응력 위험) / shrink 0.3-0.6 신규(잠정) / 분해 "260 초과 금지" 주석

### PC/ABS — verified
**건조 100-110℃ 3-4h·0.02%** (Covestro·SABIC) / melt 240-280 일치(Bayblend) / **mold 70-100** (Bayblend 70-100·Cycoloy 75-100) / **shrink 0.5-0.7 신규** / **degradeAbove 280 신규**

### PA6 — verified
건조 80℃ 4h 일치, **목표수분 0.1→0.08%** (BASF 0.03-0.06) / **melt 240-270** (BASF 250-270·Lanxess 260-280, 하한 240=Tm+18) / mold 60-90 유지 / **shrink 0.8-1.5** (BASF 0.9·Lanxess 1.0-1.2) / degradeAbove 300 신규(체류 10분 룰)
GF30 참고치: melt 270-290 / mold 80-90 / shrink 0.25-0.7 (BASF B3EG6)

### PA66 — verified
건조 80℃ 4-8h·0.08% 일치 / **melt 275-300** (BASF 280-300·Zytel 280-305) / mold 70-100 유지, **GF 80-100** (현 80-120, BASF GF30 80-90) / shrink 1.2-2.0 일치 / **degradeAbove 300→310** (Zytel 정상범위 305와 충돌 방지) + "300 초과 시 체류 최소화"
GF30 참고치: melt 280-300 / mold 80-90 / shrink 0.5-1.1

### POM(아세탈) — verified
**코폴리머 기준 명시** (한국 시장 주류: KEP·Hostaform). 건조 "평시 불필요, 흡습·재생재 시 80-100℃ 2-4h"로 조건부 / melt 190-210 유지(코포), 호모(Delrin) 205-225 주석 / mold 80-100 유지 / **shrink 1.8-2.2** (현 상한 2.5 과대) / **degradeAbove 230** (호모 230·코포 238 중 보수값) + "193℃ 초과 체류 15분 금지(코포)" 룰

### PBT — verified
건조 120℃ 4h·0.03% 일치 / **melt 250-270** (BASF 250-275·Pocan 250-260) / mold 60-100 유지(BASF 40-70·Lanxess 80-100 합집합, 외관 60-80·치수 80-100 주석) / shrink 1.5-2.2 일치 / **degradeAbove 280 신규** (BASF: 290부터 CO·THF 방출)

## 출처 전체 목록

- ExxonMobil PP Quick Processing Reference / INEOS PP Processing Guide / INEOS O&P HDPE Tips / LyondellBasell Guide to Polyolefin Injection Molding
- INEOS Styrolution Terluran GP-22 TDS / Styrolution PS 158K·158N/L TDS / Chi Mei Polylac PA-757 TDS / SpecialChem Shrinkage Chart
- Covestro Makrolon 2407 TDS / Covestro Drying Whitepaper / SABIC Lexan Processing Guide / Covestro Bayblend T65 TDS / SABIC Cycoloy Processing Guide·MC1300 TDS / Röhm PLEXIGLAS 8N TDS·FAQ
- BASF Ultramid B3S·B3EG6·A3K·A3EG6 PDS / BASF Ultradur B4500 PDS / Lanxess Durethan B30S·Pocan B1501 TDS·Pocan Processing Guide / DuPont Zytel Processing Guidelines / DuPont Delrin Processing Guidelines / Celanese Celcon Processing Guide / Celanese Hostaform C 9021 TDS

(URL은 mandate 및 에이전트 리서치 로그 참조. 전부 공급사 공식 문서 또는 공식 문서 미러.)
