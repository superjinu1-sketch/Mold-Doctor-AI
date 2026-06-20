# grade-parser 테스트 매트릭스 v1

> [grade-parser-pattern-spec-v1.md](./grade-parser-pattern-spec-v1.md) 검증용. CC가 `lib/grade-parser.test.ts` 단위테스트로 변환.
> 컬럼: 입력 그레이드명 → 기대 출력. 빈칸은 `""`/`null`/기본값. **환각 채움이 있으면 FAIL.**
> 각 케이스 = "패턴 단계에서 기대하는 결과". `source:llm`은 패턴 미확정 → LLM 위임을 의미(패턴 파서는 null 반환).

## 범례
- `resinType` = RESIN_KB 키 또는 `null`
- `filler` = 8 enum / `content` = 숫자문자열 또는 `""`
- `flame` = UL94 enum 또는 `없음`
- `conf` = high/med/low / `src` = pattern/llm
- **trap** = 이 케이스가 잡아내려는 오류

---

## A. 직접 화학표기 (3a) — 기본 적중, conf high, src pattern

| # | 입력 | resinType | filler | content | flame | conf | trap |
|---|------|------|------|------|------|------|------|
| 1 | `PA66-GF30` | `PA66` | `GF(유리섬유)` | `30` | `없음` | high | 기본 |
| 2 | `PA6-GF15` | `PA6` | `GF(유리섬유)` | `15` | `없음` | high | PA66 오인 금지 |
| 3 | `PBT-GF30 FR(V0)` | `PBT` | `GF(유리섬유)` | `30` | `UL94 V-0` | high | V0 파싱 |
| 4 | `PC/ABS` | `PC/ABS` | `없음` | `""` | `없음` | high | 블렌드 키 |
| 5 | `PC+ABS-GF20` | `PC/ABS` | `GF(유리섬유)` | `20` | `없음` | high | `+`→`/` 정규화 |
| 6 | `PA66 GF 33` | `PA66` | `GF(유리섬유)` | `33` | `없음` | high | 공백 변형 |
| 7 | `30%GF PA6` | `PA6` | `GF(유리섬유)` | `30` | `없음` | high | %선행 변형 |
| 8 | `POM` | `POM(아세탈)` | `없음` | `""` | `없음` | high | 한글병기 키 매핑 |
| 9 | `PA66-GF` | `PA66` | `GF(유리섬유)` | `""` | `없음` | med | **%없음 → content 비움(0 채우기 금지)** |
| 10 | `PPS-GF40` | `PPS` | `GF(유리섬유)` | `40` | `없음` | high | 기본 |
| 11 | `PA6-MD40` | `PA6` | `미네랄` | `40` | `없음` | high | MD=미네랄 |
| 12 | `PP-TD20` | `PP` | `탈크` | `20` | `없음` | high | TD=탈크 |
| 13 | `PC-GF10 V0` | `PC` | `GF(유리섬유)` | `10` | `UL94 V-0` | high | PC+난연 |
| 14 | `PA610-GF50` | `PA610` | `GF(유리섬유)` | `50` | `없음` | high | 긴키(610) 우선 |

---

## B. 트레이드명 매핑 (3b+3c) — 벤더 디코드

| # | 입력 | resinType | filler | content | flame | conf | trap |
|---|------|------|------|------|------|------|------|
| 15 | `Zytel 70G33L` | `PA66` | `GF(유리섬유)` | `33` | `없음` | high | DuPont G##=리터럴 33 |
| 16 | `Zytel 80G33HS1L NC010` | `PA66` | `GF(유리섬유)` | `33` | `없음` | high | 접미사 노이즈 무시 |
| 17 | `Ultramid A3EG6` | `PA66` | `GF(유리섬유)` | `30` | `없음` | high | **BASF G6 = 6×5 = 30 (×5 예외)** |
| 18 | `Ultramid B3EG7` | `PA6` | `GF(유리섬유)` | `35` | `없음` | high | **BASF G7=35, B=PA6** |
| 19 | `Ultramid B3S` (무강화) | `PA6` | `없음` | `""` | `없음` | high | 무강화 BASF |
| 20 | `Durethan BKV30` | `PA6` | `GF(유리섬유)` | `30` | `없음` | high | Lanxess BKV=PA6, 30 리터럴 |
| 21 | `Durethan AKV30 H2.0` | `PA66` | `GF(유리섬유)` | `30` | `없음` | high | AKV=PA66, H2.0 노이즈 무시 |
| 22 | `Lexan 141` | `PC` | `없음` | `""` | `없음` | high | SABIC PC |
| 23 | `Noryl GFN3` | `m-PPE` | `GF(유리섬유)` | `""` | `없음` | med | 브랜드 high, 필러% 벤더코드 불명→비움 |
| 24 | `케피탈 F20-03` | `POM(아세탈)` | `없음` | `""` | `없음` | high | 한글 브랜드 KEP POM, F20-03은 MFR(필러 아님) |
| 25 | `Hostaform C9021` | `POM(아세탈)` | `없음` | `""` | `없음` | high | Celanese POM |
| 26 | `Crastin SK605` | `PBT` | `없음` | `""` | `없음` | med | DuPont PBT. `SK605`에 필러 토큰 없음 → 추측 금지 = `없음` (정정 2026-06-15: 기존 GF 셀은 오기. 입력 문자열에 GF 토큰 부재) |
| 27 | `Stanyl TW341` | `PA46` | `없음` | `""` | `없음` | high | DSM PA46 |
| 28 | `Akulon K222-D` | `PA6` | `없음` | `""` | `없음` | med | DSM, 계열 high/세부 med |

---

## C. 환각 방지 / null 케이스 — **여기서 0 채우면 즉시 FAIL**

| # | 입력 | 기대 | trap |
|---|------|------|------|
| 29 | `G6` (브랜드 없음) | `resinType=null`, content 디코드 안 함 → **null 반환(LLM 위임)** | 벤더 미상에서 ×5 또는 리터럴 추측 금지 |
| 30 | `슈퍼플라스틱 A1` (가공 그레이드) | `null`, src=llm | 미상 → "확인 못함" 메시지 |
| 31 | `XYZ-2000` | `null` | 표에 없는 브랜드, 추측 금지 |
| 32 | `PA66-GFxx` (오타) | `PA66`, filler=`GF(유리섬유)`, content=`""` | 계열만 채우고 % 비움 |
| 33 | `나일론 유리 30%` | `null` 또는 LLM 위임(계열 모호) | "나일론"만으론 PA6/PA66 미확정 → 추측 금지 |
| 34 | `` (빈 입력) | `null`, 에러 아님 | 빈값 방어 |
| 35 | `PA` (계열만, 번호 없음) | `null` | PA6/66/12 등 미확정 → 추측 금지 |

---

## D. 난연·타입 케이스

| # | 입력 | flame | flameType | trap |
|---|------|------|------|------|
| 36 | `PA66-GF25 UL94 V-0` | `UL94 V-0` | `해당없음` | 표준 V0 |
| 37 | `PBT-GF30 V0 HF` | `UL94 V-0` | `할로겐프리` | HF=할로겐프리 |
| 38 | `PA6-GF30 FR` | `없음`(+note FR-unclassified) | `해당없음` | **FR만으론 UL94 등급 추측 금지** |
| 39 | `PC-GF10 5VA` | `UL94 5VA` | `해당없음` | 5VA 등급 |
| 40 | `PA66 적인계 V0` | `UL94 V-0` | `적인계` | 적인계 타입 |

---

## 합격 기준 (DoD 연결)

- A·B·D 케이스: 기대값 정확히 일치 (filler enum 글자 단위).
- **C 케이스: 추측 채움 0건.** 하나라도 null이어야 할 곳에 값이 차면 전체 FAIL.
- 케이스 17/18(BASF ×5)과 15/20(리터럴) 동시 통과 = 벤더 분기 정상.
- 케이스 29(`G6` 단독 null) = 벤더 미상 환각 차단 검증.
- 폼 자동채움 후: 사용자가 모든 필드 수정 가능, 미상 시 수기 필드 자동 펼침.
