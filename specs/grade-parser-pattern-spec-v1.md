# grade-parser 패턴 스펙 v1

> resin-grade-first-input mandate 작업 2(3단계 패턴 파서)의 **정본 스펙**. 작성 2026-06-14. Cowork→CC.
> 목적: 외부 API 호출 없이(₩0) 그레이드명에서 수지 정보를 최대한 추출. **확실한 것만 채우고, 불확실하면 null → LLM 폴백.**
> 핵심 원칙: **환각 채움 0.** 패턴이 확정 못 하면 빈칸으로 두고 LLM(haiku)으로 위임한다. 패턴 단계에서 추측 금지.

---

## 0. 파이프라인 내 위치

```
입력 그레이드명
  → [정규화]  §2
  → [캐시 조회]  (mandate 작업2 step2, 패턴 파서 밖)
  → [Tier-1 패턴 파서]  ← 이 스펙. ₩0.
       3a 직접 화학표기 → 3b 트레이드명 매핑 → 3c 벤더 필러코드 디코드
  → 수지계열 확정 시: 결과 반환 (source:'pattern')
  → 미확정 시: [Tier-2 LLM haiku 폴백]  (mandate 작업2 step4)
```

규칙: **3a → 3b → 3c 순서 고정.** 앞 단계에서 확정되면 다음 단계 생략. 비용 발생(LLM)은 패턴 전부 실패 시에만.

---

## 1. 출력 계약 — 앱 폼 enum 정합성 (절대 준수)

파서 출력값은 반드시 아래 폼 필드 enum과 **글자 단위로 일치**해야 자동 채움이 동작한다. (출처: `app/diagnose/page.tsx`, `lib/resin-kb.ts`)

| 출력 키 | 폼 필드 | 허용값 | 미확정 시 |
|------|------|------|------|
| `resinType` | 수지 종류(필수) | RESIN_KB 52키 중 하나 (§부록 A) | `null` |
| `filler` | 강화재 | `없음` `GF(유리섬유)` `CF(탄소섬유)` `GF+CF` `미네랄` `탈크` `GB(유리비드)` `기타` | `없음`(기본) — 단 자동채움 미표기 |
| `fillerContent` | 함량 | 숫자 문자열 `"30"` 등 | `""` |
| `flameRetardant` | 난연 등급 | `없음` `UL94 V-0` `UL94 V-1` `UL94 V-2` `UL94 HB` `UL94 5VA` `UL94 5VB` | `없음` |
| `flameRetardantType` | 난연 타입 | `해당없음` `할로겐` `할로겐프리` `적인계` `멜라민계` | `해당없음` |
| `confidence` | (배지 제어) | `high` `med` `low` | — |
| `source` | (로그) | `pattern` `llm` `cache` | — |
| `note` | (내부) | 짧은 영문 메모 | — |

> ⚠️ **함량은 추측 금지.** 필러 종류는 확정됐는데 %가 불명확하면 `filler`만 채우고 `fillerContent=""`. (예: "PA66-GF" → filler=GF, content="")
> `flameRetardantThickness`는 그레이드명에 사실상 없음 → 파서는 건드리지 않음(`미입력` 유지).

---

## 2. 정규화 (cache_key 생성)

순서대로:
1. `trim()` 양끝 공백 제거
2. 전각(全角)→반각 변환 (예: `ＰＡ６６` → `PA66`)
3. **로마자 부분만** 대문자화 (한글 브랜드명 `케피탈`은 보존)
4. 다중 공백·언더스코어·연속 하이픈 → 단일 공백
5. 결과를 `cache_key`로 사용 (캐시 조회/저장 키)

> 매칭은 정규화 후 문자열에 대해 수행. 단 매칭 정규식은 공백/하이픈 유무에 관대하게(`PA66-GF30` = `PA66 GF30` = `PA66GF30`).

예시:
| 원본 | 정규화 |
|------|------|
| ` pa66-gf30 ` | `PA66 GF30` |
| `Zytel  70G33L` | `ZYTEL 70G33L` |
| `케피탈 F20-03` | `케피탈 F20-03` |

---

## 3. Tier-1 패턴 파서

### 3a. 직접 화학표기 (ISO 1043, vendor-neutral) — confidence: high

가장 안전. 그레이드명이 화학표기를 포함하면 여기서 확정.

**(1) 수지계열 — 긴 키 우선 매칭 (CRITICAL)**

RESIN_KB 52키를 **글자 수 내림차순**으로 정렬해 매칭한다. `PA66`을 `PA6`으로 오인하면 안 됨.
- 블렌드 구분자: `/` 또는 `+` 모두 허용 (`PC/ABS` = `PC+ABS`). RESIN_KB는 `/` 표기 사용 → 매칭 후 `/`로 정규화해 키 매핑.
- `POM`, `아세탈`, `ACETAL` → `POM(아세탈)` 키로 매핑.
- `PPO`, `PPE`, `NORYL`(브랜드, §3b) → `PPE/PPO` 또는 `m-PPE` 구분: 변성(modified)·블렌드 명시 없으면 `PPE/PPO`.
- 매칭 정규식은 word-boundary 처리. `PA6` 뒤에 숫자가 붙으면(`PA610`,`PA612`,`PA66`) 그 긴 키 우선.

**(2) 필러 — ISO 1043-2 코드 = 리터럴 %**

ISO 형식: `<폴리머>-<2글자코드><질량%>`. 2글자 = [재료문자][형태문자]. (출처: ISO 1043-2)

| 그레이드명 토큰 | filler 출력 | 비고 |
|------|------|------|
| `GF`, `GR`, `유리섬유`, `glass fib` | `GF(유리섬유)` | G(유리)+F(섬유) |
| `CF`, `탄소섬유`, `carbon fib` | `CF(탄소섬유)` | |
| `GB`, `유리비드`, `glass bead` | `GB(유리비드)` | G(유리)+B(비드) |
| `GF`+`CF` 동시 출현 | `GF+CF` | |
| `TD`, `탈크`, `talc`, `talcum` | `탈크` | T(탈크)+D(분말) |
| `MD`, `미네랄`, `mineral` | `미네랄` | M(광물)+D(분말) |
| 그 외 인식된 강화 토큰 | `기타` | |
| (필러 토큰 없음) | `없음` | |

함량: 코드 뒤 1~2자리 숫자 = **리터럴 %**. `GF30`→`"30"`, `GF15`→`"15"`. 변형 허용: `30%GF`, `GF 30`, `(GF30)`.
- ISO 표준 표기 `G<숫자>`(예 `G30`)도 직접표기 맥락에선 리터럴 %로 본다 (단 §3c BASF 예외 주의 — 브랜드명과 함께 오면 3c 우선).
- 숫자 없는 `PA66-GF` → filler=`GF(유리섬유)`, content=`""`.

**(3) 난연 — UL94**

| 토큰 | flameRetardant |
|------|------|
| `V-0` `V0` `UL94 V-0` `94V-0` | `UL94 V-0` |
| `V-1` `V1` | `UL94 V-1` |
| `V-2` `V2` | `UL94 V-2` |
| `5VA` | `UL94 5VA` |
| `5VB` | `UL94 5VB` |
| `HB` (난연 맥락) | `UL94 HB` |
| `FR` `난연` (등급 불명) | **설정 안 함**(`없음` 유지) + note에 "FR-unclassified" |

난연 타입(`flameRetardantType`): 명시 토큰만.
- `HF`, `할로겐프리`, `halogen.?free`, `non.?halogen` → `할로겐프리`
- `적인`, `red phosph` → `적인계`
- `멜라민`, `melamine` → `멜라민계`
- 명시 없음 → `해당없음` (할로겐 여부 추측 금지)

---

### 3b. 트레이드명 → 수지계열 매핑 (curated, 검증된 것만)

현장 작업자는 화학표기 대신 **브랜드 그레이드명**만 아는 경우가 많다. 아래는 **교차검증된 매핑만** 포함. 표에 없는 브랜드는 패턴에서 추측하지 말고 **LLM 폴백으로 위임**(LLM도 모르면 null).

> 거버넌스: 사용자가 입력한 브랜드명을 **식별(echo)**하는 것은 허용. AI가 먼저 브랜드를 **추천**하는 것은 금지. 이 표는 식별용이다.

| 브랜드 prefix | resinType 매핑 | confidence | 출처/비고 |
|------|------|------|------|
| `ZYTEL` | `PA66` (기본; 일부 PA6/PA610 존재) | high(계열)/med(세부) | DuPont. PA66 다수 [Confirmed] |
| `MINLON` | `PA66` + 미네랄 | high | DuPont 미네랄강화 PA66 [Confirmed] |
| `RYNITE` | `PET` | high | DuPont PET-GF [Confirmed] |
| `CRASTIN` | `PBT` | high | DuPont/현 Celanese [Confirmed] |
| `DELRIN` | `POM(아세탈)` | high | DuPont POM 호모폴리머 [Confirmed] |
| `HYTREL` | `TPC` 또는 `TPEE` | med | DuPont 코폴리에스터 일래스토머 [Common Practice] |
| `ULTRAMID A` | `PA66` | high | BASF. A=PA66 [Confirmed] |
| `ULTRAMID B` | `PA6` | high | BASF. B=PA6 [Confirmed] |
| `ULTRAMID C` | `PA6/66` | med | BASF. C=PA6/66 코폴리머 [Common Practice] |
| `ULTRAMID T` | `PA6T`(PPA) | med | BASF. T계열=PPA [Common Practice] |
| `ULTRADUR` | `PBT` | high | BASF [Confirmed] |
| `ULTRAFORM` | `POM(아세탈)` | high | BASF [Confirmed] |
| `ULTRASON E` | `PES` | med | BASF. E=PES, S=PSU [Common Practice] |
| `ULTRASON S` | `PSU` | med | BASF [Common Practice] |
| `ULTRASON P` | `PPSU` | med | BASF [Common Practice] |
| `DURETHAN A` / `AKV` | `PA66` | high | Lanxess/Envalior. A=PA66 [Confirmed] |
| `DURETHAN B` / `BKV` | `PA6` | high | Lanxess/Envalior. B=PA6 [Confirmed] |
| `POCAN` | `PBT` | high | Lanxess/Envalior [Confirmed] |
| `LEXAN` | `PC` | high | SABIC [Confirmed] |
| `VALOX` | `PBT` | high | SABIC [Confirmed] |
| `NORYL` | `m-PPE` | high | SABIC 변성 PPE [Confirmed] |
| `XENOY` | `PC/PBT` | high | SABIC [Confirmed] |
| `CYCOLOY` | `PC/ABS` | high | SABIC [Confirmed] |
| `CYCOLAC` | `ABS` | high | SABIC [Confirmed] |
| `GELOY` | `ASA` | high | SABIC [Confirmed] |
| `ULTEM` | `PEI` | high | SABIC [Confirmed] |
| `HOSTAFORM` / `CELCON` | `POM(아세탈)` | high | Celanese POM 코폴리머 [Confirmed] |
| `CELANEX` | `PBT` | high | Celanese [Confirmed] |
| `FORTRON` | `PPS` | high | Celanese/Polyplastics [Confirmed] |
| `VECTRA` / `ZENITE` / `LAPEROS` | `LCP` | high | LCP [Confirmed] |
| `DURACON` | `POM(아세탈)` | high | Polyplastics [Confirmed] |
| `DURANEX` | `PBT` | high | Polyplastics [Confirmed] |
| `AKULON` | `PA6` 또는 `PA66` | med | DSM/Envalior (계열 high, 세부 med) [Common Practice] |
| `STANYL` | `PA46` | high | DSM/Envalior [Confirmed] |
| `ARNITE` | `PBT` 또는 `PET` | med | DSM/Envalior [Common Practice] |
| `ARNITEL` | `TPC`/`TPEE` | med | DSM/Envalior [Common Practice] |
| `FORTII` | `PA4T`(PPA) | med | DSM/Envalior [Common Practice] |
| `LEONA` | `PA66` 또는 `PA6` | med | Asahi Kasei [Common Practice] |
| `AMILAN` | `PA6` 또는 `PA66` | med | Toray [Common Practice] |
| `TORAYCON` | `PBT` | high | Toray [Confirmed] |
| `TORELINA` | `PPS` | high | Toray [Confirmed] |
| `TENAC` | `POM(아세탈)` | high | Asahi Kasei [Confirmed] |
| `IUPILON` / `NOVAREX` | `PC` | high | Mitsubishi EP [Confirmed] |
| `RENY` | `MXD6` | high | Mitsubishi EP. PA-MXD6 [Confirmed] |
| `AMODEL` | `PA6T`(PPA) | med | Solvay PPA [Common Practice] |
| `RYTON` | `PPS` | high | Solvay [Confirmed] |
| `UDEL` | `PSU` | high | Solvay [Confirmed] |
| `RADEL` | `PPSU` | high | Solvay [Confirmed] |
| `KETASPIRE` / `VICTREX` | `PEEK` | high | Solvay/Victrex [Confirmed] |
| `TORLON` | `PAI` | high | Solvay [Confirmed] |
| `케피탈` / `KEPITAL` | `POM(아세탈)` | high | KEP(한국엔지니어링플라스틱) POM 코폴리머 [Confirmed] |
| `LUPOY` | `PC` | high | LG화학 [Confirmed] |
| `LUPOX` | `PBT` | high | LG화학 [Confirmed] |

> 표에 없는 브랜드 → **패턴 추측 금지, LLM 위임.** LLM도 불확실하면 null + low + "확인 못함" 메시지.
> 계열만 high이고 세부(PA6 vs PA66 등)가 med인 경우: resinType은 기본값으로 채우되 confidence=`med`로 배지를 "확인 필요" 톤.

---

### 3c. 벤더 필러코드 디코드 (벤더 확정 시에만) — ⚠️ 벤더별 분기

브랜드가 §3b로 확정된 경우에만, 그 벤더 규칙으로 필러% 디코드. **벤더 미확정 상태에서 벤더코드 디코드 금지.**

| 벤더 | 코드 패턴 | 디코드 | 예시 | 확신도 |
|------|------|------|------|------|
| DuPont (ZYTEL/CRASTIN/RYNITE) | `G<nn>` | **리터럴 %** | `70G33L` → GF **33%** | [Confirmed] |
| Lanxess/Envalior (DURETHAN) | `AKV<nn>` / `BKV<nn>` | **리터럴 %** | `BKV30` → PA6-GF **30%** | [Confirmed] |
| **BASF (ULTRAMID)** | `...G<n>` | **n × 5 %** ⚠️ | `A3EG6` → PA66-GF **30%**, `B3EG7` → GF35% | [Confirmed] |
| DuPont (MINLON) | (미네랄, 코드 다양) | % 추측 금지 → content="" | `Minlon 73M30` 류는 케이스별 | [Common Practice] |

> **BASF만 예외(×5)인 것이 핵심 함정.** `ULTRAMID` 확정 시에만 `G6=30` 적용.
> 같은 토큰 "G6"이라도: 브랜드가 BASF면 30%, 브랜드가 DuPont면 6%, 브랜드 미상이면 **디코드 금지(content="")**.
> 디코드 규칙이 표에 없는 벤더 코드 → content="" + LLM이 채우게 위임(LLM도 모르면 비움).

---

## 4. confidence 산정 규칙

| 상황 | confidence | 배지(UI) |
|------|------|------|
| 3a 직접 화학표기로 수지계열+필러 확정 | `high` | brand-tint "자동 입력됨 — 확인 후 수정" |
| 3b 브랜드 high + 3c 필러 디코드 성공 | `high` | brand-tint |
| 브랜드 계열 high이나 세부(PA6/66 등) 불확정 | `med` | brand-tint, 문구 "확인 필요" |
| LLM 폴백이 값 반환(med) | `med` | warn 톤 "확인 필요" |
| LLM 폴백 low / 일부만 채움 | `low` | warn "신뢰도 낮음, 확인 요" |
| 미상 그레이드 (패턴+LLM 모두 실패) | — (null) | 수기 필드 펼침 + "확인 못함" |

---

## 5. 실패/null 정책 (환각 금지 — mandate 실패 5종과 연결)

1. **수지계열 미확정** → `resinType=null`, 전체 결과 null 취급 → mandate "미상 그레이드" 메시지 + 수기 펼침.
2. **계열은 확정, 필러% 불명** → filler 종류만 채우고 content="". 조용히 0 채우지 말 것.
3. **부분 확정** → 채운 필드만 반환, 나머지 빈칸. 빈칸을 그럴듯한 값으로 메우지 말 것.
4. **모든 단계에서: 이미 사용자가 입력한 다른 필드 값을 덮어쓰지 않는다.** (자동채움은 빈 필드에만, 또는 명시적 "자동입력" 버튼 클릭 시에만)
5. LLM 출력은 방어적 파싱(ocr-parse-hardening 패턴): JSON 외 텍스트·backtick 제거, enum 외 값은 버리고 null 처리.

---

## 6. 거버넌스 체크

- 브랜드명 **식별·표시(echo) 허용**, **추천 금지.** §3b 표는 식별용.
- `lint-banned.sh` 브랜드 룰과 충돌 점검 필요: 룰이 "추천" 맥락이면 식별 필드는 예외 처리. 충돌 시 CC가 진우에게 보고.
- 자동채움 문구는 "자동 입력(추정) — 확인 후 수정" 톤. "100% 정확" 류 금지.

---

## 부록 A — RESIN_KB 52키 (resinType 허용값, 출처 lib/resin-kb.ts)

```
PA6 PA66 PA46 PA410 PA4T PA6T PA9T PA10T PA12T PA12 PA610 PA612 PA1010 PA6/66 MXD6
PBT PET PCT PEN PC PPE/PPO m-PPE POM(아세탈) PPS LCP PEEK PEI PAI PSU PPSU PES
PP PE(HDPE) PE(LDPE) PE(LLDPE) PS ABS SAN ASA PMMA(아크릴) PVC
PC/ABS PC/PBT PA/ABS PA/PP PPE/PA PBT/ABS TPU TPE TPC TPEE TPO
```

> 패턴 파서가 위 키 외 문자열을 resinType으로 내면 안 된다. 매핑 불가 = null.
