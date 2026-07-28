# defect-kb 출처 검증 리포트 — Batch 1 (완료 2026-07-28)

> 방법: `docs/resin-kb-verification-batch1.md` 형식 준용. 정량 주장 추출 → 문헌 대조 → 판정.
> 판정 등급: ✅일치 / ⚠️조건부 일치(개선 후보) / ⛔불일치(수정 mandate) / ❔확인불가(기록만)
> 검증자: 코워크(문헌 대조, 2026-07-28). 반영 mandate: `kb-defect-batch1-close-v1`. 대상: `lib/defect-kb.ts` v1.8.

## 진행 현황

| 항목 | 상태 | 오류 발견 |
|---|---|---|
| weld_line | ✅ 완료 (v1.7→v1.8 정정 반영) | 2건 (보압 오분류·71% 오귀속) |
| short_shot | ✅ 완료 (2026-07-28) | 0건 (개선 후보 1) |
| sink_mark | ✅ 완료 (2026-07-28) | 0건 (뉘앙스 1) |
| flash | ✅ 완료 (2026-07-28) | **1건 (클램프력 계산식 단위 오류)** |
| silver_streak | ✅ 완료 (2026-07-28) | 0건 (개선 후보 5) |
| void_bubble | ✅ 완료 (2026-07-28) | **2건 (baseProbability 구조 / 노즐후퇴 방향)** |

---

## 1. weld_line (완료 — 별도 mandate 2건으로 처리됨)

`kb-weldline-packing-correction-v1` + `kb-weldline-gf-branch-v1` 참조. 요약:

| 주장 | 판정 | 처리 |
|---|---|---|
| 보압↑은 외관만 개선 | ⛔ 불일치 | GF에서 보압은 강도 실개선 (Polymers 15:4102 외) — 정정 완료 |
| 멜트온도 강도 기여 71% (Taguchi) | ⛔ 인용 오귀속 | 지목 논문에 수치 부재 — 삭제, GF/비강화 분기로 재작성 |
| GF수지 강도 모재 50~80%↓ | ⚠️ **부분 불일치 (2026-07-28 해소)** | 접근 가능한 1차 실측 1건: **Materials 17(14):3428 — PA6-GF30, 모재 UTS 110MPa vs 웰드 65.51~73.19MPa = 유지율 59.6~66.5%(= 33.5~40.4%↓)**. KB가 주장하는 **50~80%↓ 밴드의 하한에 못 미친다**. 추가 검증 2건은 robots.txt 차단(ScienceDirect). **밴드를 단정형으로 두지 말고 확인된 데이터포인트로 교체 권고** |

sourceRefs 4건 기입 완료 (`verifiedAt: 2026-07-28`).

---

## 2. short_shot (2026-07-28)

### 정량 주장 및 판정

| # | KB 주장 | 판정 | 근거 |
|---|---|---|---|
| 1 | `게이트 단면 < 벽두께 50%` = 과소 trigger | ⚠️ **조건부 일치** | 업계 표준(Plastics Technology "How to Properly Size Gates")은 **점도별 40~70%**: 고점도 60~70 / 중간 50~60 / 저점도(PE·PA) 40~50. "50% 미만 의심"은 보수적 스크리닝으로 유효하나 **저점도 수지에선 45%가 정상** → 과탐 가능 |
| 2 | `충전 말단 20~30% 고저항 구간` | ❔ 방향 일치, **수치 확인불가** | 충전 진행에 따른 압력 상승·말단 최대 저항은 다수 자료가 지지 (Moldflow 문서·업계 자료). "20~30%"라는 밴드의 정량 출처는 미확인. V/P 전환 95~98% 관행과 정합하는 실무 휴리스틱으로 판단. 방향만 진단에 쓰이므로 위해 낮음 |
| 3 | `baseProbability 50/25/15` | ❔ 산출 근거 없음 | 프로그램 방침대로 무수정, 기록만 |
| 4 | 사출속도 10%씩↑·금형온도 10°C↑ 단계 테스트 | — | 실무 관행 표현. 검증 대상 아님 [Common Practice] |

### 정성 구조 검토

- 3원인 구조(Machine 충전에너지 / Mold 게이트·밸런스 / Mold 온도·벤트)는 표준 트러블슈팅 문헌과 정합 ✅
- `discriminators`의 감별(광택 단면=단순 미충전 / 끝단 탄화=Air Trap 겸발 / 복수 캐비티 균등=사출량)은 물리적으로 타당 ✅
- patternHints '배치 산발'→Material은 **로트 변동 게이트 후보와 연결** (resin-depth 로드맵 참조)

### 결론

**수정 mandate 불요.** 웰드라인급 오류 없음.

**Batch 1 마감 mandate에 반영할 것**:
1. sourceRefs 기입: `Plastics Technology — gate sizing 40~70% by viscosity (verified 2026-07-28)`
2. 개선 후보 (별도 판단): trigger를 `게이트 단면 < 벽두께 40~50%(저점도) / 50~60%(중점도)` 점도 조건부로 정교화 — resin-kb `tier`와 연동 가능
3. "20~30%" — `실무 휴리스틱, 정량 출처 미확인` 주석 후보

---

## 3. sink_mark (2026-07-28)

### 정량 주장 및 판정

| # | KB 주장 | 판정 | 근거 |
|---|---|---|---|
| 1 | `홀드압 < 사출1차압의 50%` trigger + `보압↑(1차압의 50~80%)` | ⚠️ **조건부 일치** | 업계 자료 다수가 50~70% 또는 70~80% 룰을 인용 — KB 범위(50~80)는 인용 관행과 정합 [Common Practice]. **단 Scientific Molding 계열(Plastics Technology)은 %룰 자체를 "데이터 근거 없는 통설"로 비판** — 올바른 방법은 공정 스터디. KB가 verification에 Gate Seal Study를 병기하고 있어 구조적으로 방어됨 |
| 2 | Gate Seal Study (보압시간 1초씩↑ → 중량 안정 = 씰) | ✅ **일치** | Scientific Molding 표준 기법 그대로. 이게 %룰의 한계를 보완하는 정석 방법 |
| 3 | 중량 안정 기준 `±0.1g` | ⚠️ 소형 개선 후보 | 절대값 기준은 제품 크기에 따라 부적합(500g 부품에선 과민, 5g 부품에선 느슨). 상대 기준(예: ±0.1%)이 더 일반적 |
| 4 | 가열 감별: 더 꺼짐=진공보이드 / 부풂=가스포켓 | ✅ 타당 | 현장 감별법으로 알려진 방식과 방향 일치 [Common Practice] |
| 5 | rank 3 결정성 수지 목록 (PP·PA·POM·PBT) | ✅ | resin-kb `crystalline` 플래그와 정합 |
| 6 | `baseProbability 50/25/15` | ❔ 산출 근거 없음 | 기록만 |

### 결론

**수정 mandate 불요.** Gate Seal Study가 verification에 있는 구조가 오히려 모범적 — %룰(스크리닝)과 공정 스터디(확정)의 역할 분리가 이미 돼 있다.

**Batch 1 마감 mandate 반영 후보**:
1. sourceRefs: `Plastics Technology — pack/hold pressure & gate seal (verified 2026-07-28)`, `RJG — injection pressure fundamentals`
2. 소형 개선: 중량 안정 기준 ±0.1g → 상대 기준 병기 검토
3. 뉘앙스 주석 후보: "%룰은 스크리닝용, 확정은 Gate Seal Study" 명시화

---

## 4. flash (2026-07-28)

### 정량 주장 및 판정

| # | KB 주장 | 판정 | 근거 |
|---|---|---|---|
| 1 | rank1 `verification`: **클램프력 계산(투영면적×캐비티압÷9.8≈ton)** | ⛔ **불일치 (단위 오류)** | 표준식은 **F(tf) = 투영면적(cm²) × 캐비티내압(kgf/cm²) ÷ 1000** (KEYENCE 사출성형 공식집). 동일 식을 grefee도 `350bar×410cm²/1000 = 160T` 예제로 제시. **÷9.8은 어떤 표준 단위 조합에서도 성립하지 않음** — cm²·kgf/cm² 조합에서 **약 100배 과대**, cm²·MPa 조합에서 **10배 과대**. (÷9.8은 곱이 이미 kN일 때만 유효: 1 tonf = 9.807 kN) |
| 2 | rank1 `trigger`: 캐비티압×투영면적 > 클램프력 | ✅ 일치 | 물리적으로 정확. RJG·PT 모두 `필요톤수 = 투영면적 × 톤수계수` 구조 |
| 3 | 캐비티내압 기본값 **부재** (KB가 값을 안 줌) | ⚠️ **개선 후보** | 두 계열이 교차 일치: KEYENCE **300~500 kgf/cm²**, PT·RJG **2~4 US ton/in²(시작 3~3.5)** = **281~562 kgf/cm²**. 계산식을 주면서 대입값을 안 주면 현장에서 못 씀 |
| 4 | `priorityLogic`: 클램프력 과도 → 벤트 압착 → Diesel 겸발, 필요최소 클램프력 | ✅ **강하게 일치** | RJG: *"If more tonnage is applied than needed, then the air will be trapped causing a defect known as burn."* + 파팅면 조기 마모. PT: 과톤수 시 **"Crushed vents", "Burns", "Cracked core or cavity block"** (100톤 필요 금형을 400톤으로 체결 → 캐비티 블록 파단 사례). **KB에서 문헌 지지가 가장 강한 항목** |
| 5 | rank3 super-EP(LCP·PPS·PA4T·PA6T) = flash 원인 | ⚠️ **조건부 — 수지별로 갈림** | **PPS ✅**: flash 저감 전용 문헌 존재(6-input 가이드) + **저플래시 전용 그레이드가 상품군으로 존재**(Ryton R-4-230BL, XK2340/XK3340) = 업계 인정 문제. **LCP ⚠️ 반대 증거 2건**: Celanese Vectra 정밀성형 가이드 *"keeps flash formation low" / "Flash-free injection molding"*(저전단에서 점도 급상승), PlasticsToday Troubleshooter Part 65 *"LCP doesn't flash—at least it is pretty hard to flash."* **PA4T·PA6T ❔ 미확인** |
| 6 | rank3 `adjustment`: holding/packing 최소화 + V/P 전환 앞당김 (클램프력↑만으론 한계) | ✅ **일치** | Troubleshooter 65의 실제 해결책이 동일: 배럴온도 하한(635F)으로 하향 + **"run a little bit underpacked"**. PPS 가이드도 *"Low packing phase from 0.0 to 0.5s"* 후 정규 보압 = 파팅면 선동결 전략 |
| 7 | rank4 저점도 수지(PP·PA·POM) + 멜트온도 과고 | ✅ 방향 일치 [Common Practice] | 표준 트러블슈팅 목록과 정합. 단 rank3/rank4 모두 "저점도"를 근거로 하면서 분리돼 있어 **판정 축이 점도가 아니라 tier**임 (구조 주석 후보) |
| 8 | `baseProbability 55/30/10/5` | ❔ 산출 근거 없음 | WS4 방침대로 무수정, 기록만 |
| 9 | 블루마킹 파팅면 밀착 확인, 이젝터핀 clearance | — | 현장 관행 [Common Practice]. 진우 도메인 판정 영역 |

### 정성 구조 검토

- `discriminators` 3분기(전체둘레=클램프/과압 · 특정위치 반복=금형마모 · 이젝터 주변=clearance)는 RJG("톤수 부족 → 파팅면 flash")·PT(국소 마모)와 정합 ✅
- rank1(Machine) → rank2(Mold) → rank3/4(Material) 순서는 **필요최소 클램프력 원칙과 충돌하지 않음**: KB가 `adjustment`에 "클램프력↑(과도시 벤트 압착→Diesel 주의)"를 병기해 과보정을 이미 차단 ✅
- `sharedGates: []` — 빈 값. Diesel(burn)과의 겸발 관계를 `priorityLogic` 산문으로만 표현 중 → **sharedGates 연결 후보** (short_shot의 Air Trap 겸발과 동일 구조)

### 결론

**⛔ 수정 mandate 필요 1건** (Batch 1에서 weld_line 이후 2번째 실오류).

**단위 오류가 실사용 차단급**: 투영면적 100cm² × 캐비티압 400kgf/cm² 를 KB 식에 넣으면 **4,082톤**이 나온다(정답 40톤). 최상위 원인(55%)의 검증 절차가 작동 불능.

**mandate 내용**:
1. `flash.causes[0].verification` 정정:
   `클램프력 계산(투영면적×캐비티압÷9.8≈ton)`
   → `형체력(ton) ≈ 투영면적(cm²) × 캐비티내압(kgf/cm²) ÷ 1000. 캐비티내압 미측정 시 300~500 kgf/cm² 대입(≈2~4 US ton/in²). 블루마킹(밀착패턴).`
2. rank3 `trigger` 정교화 후보: `super-engineering 전체` → `PPS 계열 우선. LCP는 문헌상 저플래시 특성(저전단 점도 급상승) — LCP에서 flash 발생 시 수지 탓이 아니라 과열·과보압·PL 정밀도를 먼저 의심` (WS2 충돌 프로토콜 2호 사례)
3. sourceRefs 기입 (아래 출처 4건)

**개선 후보 (진우 판단)**:
- `sharedGates`에 diesel/burn 연결 (과클램프 역설을 구조로 표현)
- PA4T·PA6T flash 근거 미확보 → rank3 예시에서 뺄지 유지할지

---

## 5. silver_streak (2026-07-28)

### 정량 주장 및 판정

| # | KB 주장 | 판정 | 근거 |
|---|---|---|---|
| 1 | 허용수분 **PC ≤0.02%** | ✅ 일치 | PT *Why (and What) You Need to Dry*: "PC, PBT, ABS, Acrylic ... should not exceed **0.02%**". PT 수지드라잉 KC: Polycarbonate **0.02% (200 PPM)** |
| 2 | 허용수분 **PBT ≤0.02%** | ✅ 일치 | 동일 PT 문서 |
| 3 | 허용수분 **PA66 ≤0.20%** | ⚠️ **조건부 — GF 미분화** | Teknor Apex: **무충전 PA 0.02~0.20%** (상한 일치 ✅). PT KC: nylon 최대허용 **0.18%**. **핵심: "reinforcements reduce the moisture window in proportion to the percentage of fill"** → PA66-GF30에 0.20%를 그대로 적용하면 느슨. **이 KB 항목은 이미 GF 분기(fiber_readout 전환)를 갖고 있으므로 수분 임계도 GF 분기가 있어야 정합** |
| 4 | 허용수분 **ABS ≤0.10%** | ⚠️ **조건부 — 경계구간 존재** | 공급사 1차 문서(Toray TOYOLAC 가공 지침): *"recommendable moisture content ... is **less than 0.1%, more desirable is 0.05%**"* + *"Non-dried ABS resin can cause **silver streaking**"* → **KB 수치는 공급사 기준과 일치** ✅. 단 PT는 더 보수적(KC **0.05~0.08%**, 별도 기사 **0.02%**). **0.05~0.10% = 판정 경계** |
| 5 | 이슬점 **−29~−40°C** | ✅ **정확 일치** | PT: *"Commonly recommended dew points fall between **−20 and −40 F**"* = **−29~−40°C**. KB 수치가 화씨 원문의 정확한 섭씨 환산 |
| 6 | 체류 판정: `shot < 배럴 20%` 트리거 / `20~80% 범위 유지` | ⚠️ **구식 룰 — 개정판 존재** | PT *Revisiting Shot Size vs. Barrel Capacity*: 권장 **25~65%**. **<25%** = *"unlikely yield a uniform melt"*(스크루 회전수 부족), **>65%** = 공급부 플라이트 부족 + *"PP or PE will literally grind metal off the flights of the screw"*. KB의 20~80은 관행 구식 룰, 양단 모두 느슨 |
| 7 | 3종 변별: moisture=전면분산 / shear=게이트주변·지속 / thermal=황변·냄새 | ✅ **문구 수준까지 일치** | PT *Identifying and Correcting Splay*: moisture *"does not occur in the same place every time, or ... all over the part"* / shear *"repeatable, occurring in the same location on a part"* / heat *"signs of stickiness or burning ... the smell of overheated material"* |
| 8 | rank4 서크백(감압) 과다 → air inclusion | ✅ 방향 일치, **수치 부재** | PT가 실제 기준값 제시: 감압 **"0.1 to 0.4 in."**(≈2.5~10mm). KB에는 정량 기준 없음 → 추가 후보 |
| 9 | 비흡습(PP·PE·PS) → 즉시 전단/공기 분기 | ✅ 일치 | PT·AEC: PE·PP는 비극성 → 흡습 없음, 건조 불요 |
| 10 | rank1 verification "건조 강화 후 소멸=수분 확진" | ✅ | PT: 용융물 퍼지 후 *"If the puddle is foamy and/or riddled with bubbles, moisture could be causing the splay"* — KB의 재시험법과 상호보완. **퍼지 육안 확인법이 KB에 없음** → 추가 후보 |
| 11 | GF 전환 룰(건조정상 + 안닦임 방사상 백화 → fiber_readout, 금형온도↑ 1순위) | ✅ 기전 지지 / ❔ 정량 미확보 | 기전: fountain flow로 섬유가 캐비티면에 접촉 → *"Since the mold surface is at a lower temperature, the lightweight, fast-condensing glass fiber freezes instantly"*. 금형온도 예시 PA66+33%GF **110°C**, 멜트 **+10~30°C**. 정량 임계는 RHCM 논문군(Materials & Design 2012, Adv. Polym. Technol. 2020)이 다루나 **풀텍스트 페이월 → 수치 미확보, 대체 금지** |
| 12 | 재생재 비율 >20% 트리거 | ❔ 출처 미확인 | [Common Practice] 범위. 무수정 |
| 13 | `baseProbability 55/20/15/7/3` | ❔ 산출 근거 없음 | WS4 방침대로 기록만 |
| 14 | 배럴 5~10°C↓ / 퍼지 3~5shot / 사출속도 30~50%↓ | — | [Common Practice] 조정 관행. 검증 대상 아님 |

### 정성 구조 검토

- 5원인 분류(Material 수분 → Machine 열분해 → Machine 전단 → Method 공기 → Material 오염)는 PT 3분류를 세분한 형태로 **상위 3개가 PT와 정확히 대응** ✅
- `priorityLogic`의 ★배제 규칙("건조 조건 충족 시 moisture를 원인 목록에서 제외")은 구조적으로 강력하나 **임계값 정확도에 전적으로 의존** → #3·#4의 경계구간이 곧 오배제 위험. **임계를 느슨하게 두면 55% 원인을 잘못 배제**
- ★전단 승격 규칙(RPM·속도가 resin-kb 상한 초과 시 shear를 1순위로) + "황변 단서 없으면 thermal 과대평가 금지"는 PT의 변별 논리와 정합 ✅
- `sharedGates: []` + 주석(금형온도 게이트 미적용, taxonomy §4.1) — **의도적 공란이 주석으로 명시된 유일한 항목. 좋은 관행** ✅

### 결론

**⛔ 실오류 0건.** flash·weld_line급 오류 없음. 이 항목은 **Batch 1에서 문헌 정합도가 가장 높다** (3종 변별·이슬점·비흡습 분기가 PT와 문구 수준 일치).

**Batch 1 마감 mandate 반영 후보**:
1. **체류 범위 `20~80%` → `25~65%`** 정정 (PT 개정판 근거). rank2 `adjustment`의 "shot 비율 20~80% 범위 유지" + rank2 `trigger`의 "shot<배럴 20%" → 25% 두 곳
2. **PA66 수분 임계 GF 분기**: `PA66≤0.20%`에 `(무충전 기준. GF/미네랄 충전 시 충전율에 비례해 임계 축소 — 예: GF30이면 더 보수적으로)` 주석. **이 항목의 기존 GF 분기와 구조적으로 짝이 맞음**
3. **ABS 경계 주석**: `ABS≤0.10%` → `≤0.10%(공급사 은줄 발생 임계). 0.05% 이하 권장 — 0.05~0.10%는 경계, 건조 강화 재시험으로 확진`
4. **서크백 정량 기준 추가**: rank4 `verification`에 `감압 스트로크 2.5~10mm(0.1~0.4in) 초과 시 과다 의심`
5. **퍼지 육안 확인법 추가**: rank1 `verification`에 `노즐 퍼지 용융물이 발포·기포 다수면 수분 유력`
6. sourceRefs 기입 (아래 출처 6건)

**무수정 유지**: baseProbability, 재생재 20%, GF 전환 룰(정량 근거 미확보 — 방향만 유지)

---

## 6. void_bubble (2026-07-28)

### 정량 주장 및 판정

| # | KB 주장 | 판정 | 근거 |
|---|---|---|---|
| 1 | `baseProbability 40/30/20/**25**/20` | ⛔ **구조 오류 (문헌 무관·내부 일관성)** | **합 135** — KB 17개 항목 중 유일. 나머지는 전부 55~100 (다음으로 큰 값이 flash·silver_streak·color_streaks의 100). 게다가 **rank4(25) > rank3(20)** 로 rank 순서와 확률 순서가 역전된 **유일한 항목**. WS4 "무수정" 방침은 *산출 근거 부재*에 대한 것이지 *스키마 위반*까지 면제하지 않음 → **별도 판단 필요** |
| 2 | rank5 `adjustment`: **노즐후퇴(decompression)로 기포 배출** | ⛔ **문헌 충돌 + KB 내부 모순** | PT *How to Get Rid of Bubbles*: 가스 기포의 원인 목록에 **"excessive decompression"**, 대책 목록에 **"Reduce decompression, especially in hot-runner molds"**. 즉 문헌은 감압을 **원인**으로, KB는 **대책**으로 쓴다. 더 결정적으로 **같은 KB의 `silver_streak` rank4는 "서크백(감압) 과다 → 공기 혼입"으로 PT와 같은 방향** → 두 항목이 서로 반대 방향 |
| 3 | rank3 `trigger`: 배압 낮음 **(<5MPa)** / rank2·rank3 `adjustment`: **배압 5~10bar↑** | ⚠️ **단위 혼용 (같은 항목 내 MPa/bar)** | RJG: 배압 권장 **"approximately 500-1,000 specific psi"** = **3.4~6.9MPa**, 그리고 *"achieved by different hydraulic setpoints depending on the intensification ratio"* — **수지압 기준**임을 명시. 앱 자체 규약도 MPa: `tests/eval/cases.json` case-001이 `back_pressure: 3`에 대해 **"배압 증가 3→5~8MPa"**를 기대값으로 둠. **따라서 트리거 `<5MPa`는 RJG 밴드·앱 규약과 정합 ✅**. 문제는 조정 문구만 **bar**로 바뀌는 점(5~10bar = 0.5~1MPa) — 같은 필드군에서 10배 스케일이 섞이면 유압 게이지 값(현장 통상 5~15kgf/cm²)과 혼동될 여지 |
| 4 | `discriminators` 가열 감별: 꺼짐=진공 / 부풂=가스 | ✅ **일치, 단 조건 누락** | PT: *"If it is a gas bubble, the gas will warm up and expand, raising the surface... If there is no air in the bubble and it's a vacuum void instead, the bubble will collapse due to the atmospheric pressure."* **PT는 시험 성립 조건을 명시: 기포 지름 ≥3mm, 성형 후 4시간 이내.** KB에는 조건 없음 → 4시간 지난 부품·미세 기포에 적용 시 오판 |
| 5 | rank1 결정성 + 두꺼운벽 + 보압부족 | ✅ 일치 | PT 진공보이드 1차 원인: *"Insufficient plastic material in thick sections"* |
| 6 | rank1 `adjustment` 게이트를 두꺼운 부위 배치 | ✅ 일치 | PT: *"Relocate gate to fill thicker areas first"* |
| 7 | rank3 배압↑로 탈기 | ✅ 방향 일치, **단 반대 견해 병존** | PT 진공보이드 대책: *"Use slower fill rates and increased backpressure"* ✅. 반면 RJG(Scientific Molding 계열): 배압은 *"its purpose is for consistency, and we should use it for only that"*, 결함 해결에 쓰면 *"only clouds the root cause"* → **sink_mark의 %룰 비판과 동일 패턴**(관행 vs 과학적성형) |
| 8 | rank2 수분 가스포켓 | ✅ | PT 가스 기포 원인에 resin degradation·trapped air 포함, 흡습 수지 건조는 silver_streak과 동일 근거군 |
| 9 | rank4 환경 온도 드리프트(낮밤 기온차) **25%** | ✅ 정성 지지 / ❔ 정량 미확인 | PT *Troubleshooting Mold Temperature Control*: *"Ambient conditions can also affect the way an injection mold and associated heat-transfer equipment perform"*, 응축수 *"Every gallon of condensation reduces cooling capacity by half a ton."* **방향은 문헌 지지. 다만 낮밤 드리프트를 보이드 원인 25%로 두는 정량 근거는 미확인** (진우 현장 관측 기반 — 도메인 판정 영역) |
| 10 | rank5 스크류·체크링 마모, 코어측 벤트/오버플로우 | ❔ 문헌 미확인 | PT 가스 기포 원인에 *"poor mold venting, non-vented core pins"* 있어 **벤트 부분은 지지** ✅. 스크류·체크링 마모는 미확인 (v1.7 하드웨어 축, 현장 기반) |
| 11 | patternHints: 대형기·고점도(PMMA) 배럴온도 하한 근처 → 보이드 가중 | ❔ 미확인 | eval-case-pmma-void 기반. 문헌 대조 불가 |

### KB에 없는 문헌 항목 (누락 후보)

| 문헌 권고 | 출처 | KB 상태 |
|---|---|---|
| **스크루 쿠션 일정 유지, 스크루 바닥침 금지** — 진공보이드 대책 1번 | PT | **없음** (`checksettings-cushion-low-threshold-v1`로 앱 다른 곳엔 존재) |
| **숏샷 스터디: 샷 사이즈 99%→5%를 10%씩 감소** — 가스 기포 유동 원인 규명법 | PT | 없음 |
| 벤투리 효과 발생원(리브·이젝터핀·노즐 미정렬·핫러너 분리부) | PT | 부분(코어측 벤트만) |
| 공칭 두께 축소 + 리브 대체, 두꺼운부 코어 빼기 | PT | 없음 (설계 변경이라 진단 범위 밖일 수 있음) |

### 결론

**⛔ 수정 mandate 필요 2건.** Batch 1 전체에서 오류 밀도가 가장 높은 항목.

**mandate 내용**:
1. **`baseProbability` 구조 정정** — 합 135 + rank 역전. 두 안 중 진우 선택:
   - (A) rank4를 25→15로 낮춰 순서 복원 (합 125)
   - (B) 5개를 40/25/15/12/8 로 재배분 (합 100, 타 항목과 정합)
   - **권고: (B)** — 다른 16개 항목이 100 이하이므로 135는 프롬프트에서 상대 가중을 왜곡할 소지
2. **rank5 `adjustment`의 노즐후퇴 방향 정정** — 최소 다음으로:
   `노즐후퇴로 기포 배출` → `노즐후퇴(감압) 설정을 점검. **과다 감압은 공기를 빨아들여 기포를 유발하므로(특히 핫러너) 먼저 감압을 줄여 재시험**. 드룰 방지 목적의 최소 감압만 유지.`
   → `silver_streak` rank4(서크백 과다=원인)와 방향 일치시킬 것
3. **가열 감별 성립 조건 추가** — `discriminators`에 `(기포 지름 ≥3mm, 성형 후 4시간 이내에 시험)`
4. **배압 단위 기준 명기** — `배압 낮음(<5MPa)` → `배압 낮음(수지압 기준 <5MPa ≈ 725psi. 유압 게이지 값과 혼동 금지 — 증압비만큼 차이)`. bar/MPa 혼용 정리
5. sourceRefs 기입 (아래 출처 4건)

**개선 후보 (진우 판단)**:
- 스크루 쿠션 일정성을 rank1 `evidence`에 추가 (PT 진공보이드 대책 1번인데 KB에 없음)
- rank4(환경 드리프트)·rank5(스크류 마모)는 현장 기반 — 문헌 부재를 이유로 삭제하지 말 것. `❔ 현장 관측 기반` 메타로 보존 권고

---

## Batch 1 종합 (2026-07-28 완료)

| 항목 | 실오류 ⛔ | 개선 후보 ⚠️ | 확인불가 ❔ |
|---|---|---|---|
| weld_line | 2 (처리완료) + 1 (밴드 부분불일치) | — | 71% 원출처 |
| short_shot | 0 | 1 (게이트 점도조건부) | 20~30% 밴드, baseProb |
| sink_mark | 0 | 2 (±0.1g 상대화, %룰 뉘앙스) | baseProb |
| flash | **1 (클램프력 계산식)** | 2 (캐비티압 기본값, LCP 프레이밍) | PA4T·PA6T 근거, baseProb |
| silver_streak | 0 | 5 (체류 25~65%, PA66 GF분기, ABS 경계, 서크백 수치, 퍼지 육안법) | GF 전환 정량, 재생재 20%, baseProb |
| void_bubble | **2 (baseProb 구조, 노즐후퇴 방향)** | 2 (가열감별 조건, 배압 단위) | 환경드리프트 25%, 스크류마모, baseProb |
| **계** | **5** | **12** | — |

### 검증 방법이 실제로 잡아낸 것 (방법론 회고)

1. **원 논문 풀텍스트 확인** → weld_line 71% 오귀속. synthesis 문서 인용을 믿었으면 못 잡음
2. **공급사 1차 문서 확인** → ABS 0.10%가 *맞다*는 것을 확인(Toray TOYOLAC). PT만 봤으면 0.05%로 잘못 "정정"할 뻔. **검증은 오류 검출만이 아니라 오정정 방지에도 작동한다**
3. **단위 차원 검산** → flash 클램프력 ÷9.8. 문헌 대조 이전에 단위만으로 판별됨
4. **KB 내부 교차 검사** → void_bubble baseProbability 합 135 + rank 역전, 노즐후퇴가 silver_streak과 정반대 방향. **외부 문헌 없이 잡히는 오류가 5건 중 2건**

→ **Batch 2 절차에 "① 단위 차원 검산 ② KB 내부 교차 검사"를 문헌 대조 *앞* 단계로 추가할 것.** 비용이 0에 가깝고 검출률이 높다.

### eval 커버리지 확인 (실측)

- `tests/eval/cases.json` 44건 중 **웰드라인 1건(case-010, PPS GF40)** — **비강화 웰드 0건 확정**. KB v1.8이 신설한 "비강화 = 멜트온도 지배" 분기가 **미검사**
- flash 2건 / void_bubble 2건(`기포/보이드`+`내부 기포`) / silver_streak 7건 — Batch 1 정정분 회귀 검증은 가능
- 앱 입력 단위 규약 확인: `back_pressure`는 **MPa** (case-001 기대값 "3→5~8MPa")

---

## 출처 (Batch 1 누적)

- [Plastics Technology — How to Properly Size Gates, Runners and Sprues](https://www.ptonline.com/blog/post/part-1-how-to-properly-size-gates-runners-and-sprues)
- [Plastics Technology — How to Set Second-Stage (Pack & Hold) Pressure](https://www.ptonline.com/articles/how-to-set-second-stage-pack-hold-pressure(7))
- [RJG — Injection Pressure: What Is It](https://rjginc.com/injection-pressure-what-is-it-how-to-calculate-it-and-why-it-matters/)
- [Autodesk Moldflow — Injection pressure result](https://help.autodesk.com/cloudhelp/2014/ENU/MoldflowAdvisor/files/GUID-2FE30034-2A02-47CE-823B-694E3BD81191.htm)
- Polymers (MDPI) 15(20):4102 (2023) — weld_line 건
- Jadhav & Gaval 외 (2023), Mokarizadehhaghighishirazi 외 (2024) — weld_line 건
- [KEYENCE — 사출성형 공식집 (형체력 F=p×A÷1000, 캐비티압 300~500 kgf/cm²)](https://www.keyence.com/ss/products/measure-sys/machining/formula/injection-molding.jsp)
- [Plastics Technology — Clamp Tonnage: More Is Better...Right? (과톤수 → crushed vents·burns·cracked cavity block)](https://www.ptonline.com/articles/clamp-tonnage-more-is-betterright)
- [RJG — Why Machine Tonnage Matters and How to Set It Correctly](https://rjginc.com/why-machine-tonnage-matters-and-how-to-set-it-correctly/)
- [Celanese — Vectra LCP Precision Molding Tech Tips (LCP 저플래시 특성)](https://www.celanese.com/-/media/Engineered%20Materials/Files/Product%20Technical%20Guides/LCP-001_VectraLCPprecMoldTG_AM_0613.pdf)
- [PlasticsToday — The Troubleshooter Part 65: Liquid Crystal Polymers ("LCP doesn't flash")](https://www.plasticstoday.com/plastics-processing/the-troubleshooter-part-65-liquid-crystal-polymers)
- [Find Out About Plastics — 6 Inputs for Reducing Flash Behaviour of PPS](https://www.findoutaboutplastics.com/2023/10/injection-moulding-tips-6-inputs-for.html)
- [grefee — 사출 계산식 (350bar x 410cm2 / 1000 = 160T 예제)](https://www.grefeemold.com/the-calculation-formulas-for-injection-molding.html)
- [Plastics Technology — Identifying and Correcting Splay (moisture/heat/shear 3분류, 감압 0.1~0.4in)](https://www.ptonline.com/articles/identifying-and-correcting-splay)
- [Plastics Technology — Revisiting Shot Size vs. Barrel Capacity (권장 25~65%)](https://www.ptonline.com/articles/revisiting-shot-size-vs-barrel-capacity)
- [Plastics Technology — Why (and What) You Need to Dry (이슬점 -20~-40F, PC·PBT·ABS 0.02%)](https://www.ptonline.com/articles/why-and-what-you-need-to-dry)
- [Plastics Technology — Resin Drying Knowledge Center: Resin Types (nylon 0.18%, ABS 0.05~0.08%, PC 0.02%)](https://www.ptonline.com/kc/resin-drying/resin-types)
- [Teknor Apex — 6 FAQs: Drying Nylon Resin (무충전 PA 0.02~0.20%, 충전재가 수분 윈도우 축소)](https://etp.teknorapex.com/blog/drying-nylon-resin-for-injection-molding)
- [Toray TOYOLAC ABS Processing Information (수분 <0.1%, 권장 0.05%, 미건조 시 silver streaking)](https://www.distrupol.com/Processing_Information_.pdf)
- [Topworks — Why and How to Prevent Glass Fiber Rich Surface (fountain flow + 저온 금형면 기전, PA66+33GF 금형 110C)](https://www.plasticmoulds.net/why-and-how-to-prevent-glass-fiber-rich-surface.html)
- [Plastics Technology — How to Get Rid of Bubbles (가열 감별 3mm/4h 조건, 과다 감압=기포 원인)](https://www.ptonline.com/articles/injection-molding-how-to-get-rid-of-bubbles)
- [RJG — What Is Back Pressure in Injection Molding (500~1,000 specific psi, 증압비 주의)](https://rjginc.com/what-is-back-pressure-in-injection-molding-why-is-it-important/)
- [Plastics Technology — Troubleshooting Mold Temperature Control (주변 환경이 열전달계에 영향)](https://www.ptonline.com/articles/troubleshooting-mold-temperature-control)
- [MDPI Materials 17(14):3428 — Optimizing the Tensile Strength of Weld Lines in Glass Fiber Composite Injection Molding (PA6-GF30 유지율 59.6~66.5%)](https://www.mdpi.com/1996-1944/17/14/3428)
