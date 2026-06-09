# 온도존 역순 오독 + 멜트온도 산정 + flow_mark→air_trap 라우팅 수정

## 배경 / 목적
실케이스(PP TD20%, 사출 카페, 자동차 외장재 회색 얼룩). 두 가지 결함이 한 번에 드러남.

**결함 A — 온도존 역순 오독 → 가짜 저멜트온도 → 가짜 배럴승온 권고.**
사출기 화면 실린더 설정 `220/225/225/220/190/180℃`(노즐쪽 고온, 호퍼/피드존 저온 = 정상)인데, 앱이 OCR로 **노즐=180, Z1=190, Z2=220...** 으로 역순 매핑함. 물리적으로 노즐 180℃에 배럴 225℃는 불가능(노즐 프리즈오프). 실제 멜트온도는 ~220~225℃로 PP에 정상인데, 앱은 "노즐 180=저멜트온도"를 깔고 → 원인 2순위(탈크 배향) 근거로 쓰고 → 조정안에 "배럴온도 상향(노즐 200)"까지 냄. **없는 문제를 고치라고 한 것.** 근본은 (1) OCR이 노즐을 식별하는 물리 규칙이 없고, (2) route의 `meltMax`가 노즐+Z1만 봐서 역순 입력 시 실제 멜트(존 최고값)를 놓침.

**결함 B — flow_mark 노드에 갇혀 air_trap/벤팅을 못 봄.**
증상 시그니처: **90% 미만 충전까진 전 부위 깨끗 → 90% 이상(≥1100g)에서 여러 군데 동시 발생, 온도·속도·압력 방향 무관, 신규 금형(금형업체 샘플은 OK), 같은 재료가 다른 금형에선 정상.** 이건 교과서적 **벤팅 불량 → last-fill 가스 포집(air trap)** 시그니처다. `air_trap_burn` 노드에 정답 지식이 이미 다 있음(벤트 부족 1순위 / Progressive Short-Shot으로 에어트랩 위치 확인 / "신금형=벤트 설계 누락" / "말단 고정=항상 불충분 벤팅의 신호"). 그런데 유저/AI가 불량유형을 "표면 얼룩(플로우 마크)"로 분류 → `flow_mark` 노드로 라우팅 → flow_mark 원인은 ①금형온도 과저 ②사출속도·멜트온도 과저뿐(둘 다 "조건 바꾸면 변하는" 원인). 이번 케이스(조건 무관·충전율 의존)와 안 맞아 모델이 웰드라인 충돌로 헤맴. **지식 부재가 아니라 라우팅 부재.**

## 원칙
- 가드는 정보만 제공, 모델이 재랭킹(하드코딩으로 단정 금지). B-tier 추론 + A-tier 가이드레일 철학 유지.
- 거버넌스: 추정·신뢰도 명시·중립(상표·기계·수지 브랜드 추천 금지). 면책문구 보존.
- 디자인/UI 변경 없음(OCR 프롬프트·route 가드·KB·eval만). 끝나면 `npx tsc --noEmit` + `npm run build` 통과, **push 금지**, 변경파일 보고.

────────────────────────────────────
## 작업 1 — meltMax 전체존 확장 + 온도 역순 가드 (app/api/diagnose/route.ts)

### 1-1. `defectTempGuard` 안의 meltMax 계산을 전체 존 최고값으로 확장
현재(L602~604):
```ts
      const nozzle = parseFloat(s.nozzleTemp || '');
      const z1 = parseFloat(s.zone1Temp || '');
      const meltMax = [nozzle, z1].filter(v => isFinite(v)).reduce((m, v) => Math.max(m, v), 0);
```
→ 아래로 교체(노즐·Z1~Z4 전부 후보로):
```ts
      const tempVals = [s.nozzleTemp, s.zone1Temp, s.zone2Temp, s.zone3Temp, s.zone4Temp]
        .map(v => parseFloat(v || '')).filter(v => isFinite(v));
      const nozzle = parseFloat(s.nozzleTemp || '');
      const meltMax = tempVals.length ? tempVals.reduce((m, v) => Math.max(m, v), 0) : 0;
```
**효과:** 온도존이 역순으로 입력돼도 `meltMax`가 실제 멜트(존 최고값 225)를 잡음 → 기존 "저멜트온도 하한 미달" 라인(L611~613)의 오발동이 자동 해소됨. (이 케이스에서 가짜 배럴승온 권고를 만든 주범이 이 라인이었다.)

### 1-2. `defectTempGuard` IIFE 끝(L615 `})();` 직후) 바로 아래에 새 가드 추가
```ts
    // 온도존 역순 입력 가드 — 노즐이 실린더 존보다 현저히 낮으면 입력 순서 역전 의심
    const tempOrderGuard = (() => {
      const nozzleV = parseFloat(s.nozzleTemp || '');
      const zoneVals = [s.zone1Temp, s.zone2Temp, s.zone3Temp, s.zone4Temp]
        .map(v => parseFloat(v || '')).filter(v => isFinite(v));
      if (!isFinite(nozzleV) || zoneVals.length === 0) return '';
      const zoneMax = zoneVals.reduce((m, v) => Math.max(m, v), 0);
      // 노즐이 실린더 최고존보다 15℃ 이상 낮으면 물리적으로 비정상(노즐 프리즈오프).
      if (nozzleV < zoneMax - 15) {
        return `[온도존 입력 정합성 가이드]
- ⚠ 입력된 노즐온도(${nozzleV}℃)가 실린더 존 최고온도(${zoneMax}℃)보다 ${Math.round(zoneMax - nozzleV)}℃ 낮다. 통상 사출기는 노즐(전방)이 가장 뜨겁고 호퍼/피드존(후방)이 가장 낮다. 노즐이 존보다 현저히 낮은 건 물리적으로 비정상(노즐 프리즈오프·콜드슬러그)이라, 화면 온도존 순서가 역으로 입력됐을 가능성이 높다. 실제 멜트온도는 입력 노즐값이 아니라 실린더 최고값(${zoneMax}℃ 부근)으로 보고, "저(低)멜트온도"라는 결론을 성급히 내리지 마라. 멜트온도 상향(배럴 승온)을 권고하기 전에 입력 순서부터 의심하라.`;
      }
      return '';
    })();
```

### 1-3. 가드 주입부(현재 L696)에 한 조각 추가
현재:
```ts
${defectGuide ? `${defectGuide}\n\n` : ''}${moldMachineGuard ? `${moldMachineGuard}\n\n` : ''}${defectTempGuard ? `${defectTempGuard}\n\n` : ''}${kbCompare ? `${kbCompare}\n\n` : ''}
```
→ `defectTempGuard` 다음에 `tempOrderGuard` 삽입(나머지 순서 불변):
```ts
${defectGuide ? `${defectGuide}\n\n` : ''}${moldMachineGuard ? `${moldMachineGuard}\n\n` : ''}${defectTempGuard ? `${defectTempGuard}\n\n` : ''}${tempOrderGuard ? `${tempOrderGuard}\n\n` : ''}${kbCompare ? `${kbCompare}\n\n` : ''}
```

────────────────────────────────────
## 작업 2 — OCR 노즐 식별 물리 규칙 명시 (app/api/extract-settings/route.ts)

L114~116 "각 항목 설명"의 nozzleTemp/zone 설명 블록을 아래로 보강(기존 두 줄을 교체):
```
- nozzleTemp: 노즐 온도 (℃). 노즐은 수지가 금형으로 토출되는 맨 앞단이다.
- zone1~4Temp: 실린더 1~4존 온도 (℃). 통상 화면에 여러 온도값이 일렬로 표시된다.
- 온도존 순서 식별 규칙(중요): 사출기 배럴 온도는 거의 항상 노즐(전방)이 가장 높고 호퍼/피드존(후방)으로 갈수록 낮아진다(예: 225/225/220/190/180). 화면에 NZ/노즐/H1/피드 같은 라벨이 있으면 그대로 따르되, 라벨이 없으면 이 물리 규칙으로 노즐을 식별하라: 값이 가장 낮은 끝이 호퍼/피드존이고, 그 반대 끝(고온)이 노즐 쪽이다. 단순히 화면 좌→우 순서대로 nozzleTemp부터 채우지 마라. 노즐에 가장 낮은 값을 넣었다면 거의 확실히 순서를 뒤집은 것이다.
- 존이 5개 이상이면 노즐 + 노즐에 가까운 전방 4개 존을 nozzleTemp~zone4Temp로 매핑하라.
```

────────────────────────────────────
## 작업 3 — flow_mark → air_trap 교차 라우팅 (lib/defect-kb.ts)

`flow_mark` 노드(L239~263)의 `patternHints`(L257~260)에 항목 2개 추가:
```ts
    patternHints: {
      '초기 샷에만': '워밍업 부족. 금형온도 안정화 후 재확인.',
      '레코드홈(동심원)': 'record_groove 분기 참조. 게이트 확대 검토.',
      '충전 끝(90%↑)에서만·전체 동시 발생': 'air_trap_burn 분기 우선 검토. 온도·속도·압력 방향과 무관하게 충전율(중량)에만 의존하면 유동현상이 아니라 last-fill 가스 포집(벤팅 불량)이다. Progressive Short-Shot으로 얼룩 첫 발생 위치 매핑 → 그 자리가 last-fill = 벤트 가공 대상.',
      '신규 금형·이관 직후': 'air_trap_burn 분기 참조. 신금형은 벤트 설계 누락이 흔하다. 같은 재료가 다른 금형에서 정상이면 재료 원인은 강등하고 금형(벤팅) 우선.',
    },
```
그리고 `sharedGates`(L261)에 `air_trap` 연계가 없으면, 라우팅이 air_trap_burn 노드를 함께 열 수 있도록 patternHints의 텍스트 지시로 충분(코드 게이트 신설 불필요). **air_trap_burn 노드 자체는 수정 금지** — 이미 정답 지식 보유.

────────────────────────────────────
## 작업 4 — eval 케이스 박제 (tests/eval/)

기존 eval 스키마(basic/hard, run.mjs 매핑)와 **동일 형식**으로 신규 케이스 1개 추가:
- 슬러그: `pp-td20-surfacestain-airtrap` (기존 네이밍 규칙 따름)
- 입력: resinType=`PP`, filler=`탈크/Talc 20%`, defectType=`표면 얼룩(플로우 마크)`(유저 분류 함정), 온도는 **역순 입력 함정** 재현 → nozzle=180, zone1=190, zone2=220, zone3=225, zone4=225. 사출속도 다단·압력 130bar·핫러너 230·밸브게이트 10·사출시간 8s. 불량설명에 "90% 미만 충전 시 전 부위 깨끗, 90%↑(≥1100g)에서 여러 군데 동시 발생, 온도·속도·압력 방향 무관, 신규 금형(타 금형은 동일재료 정상)".
- 기대(정답):
  1. 1순위 원인이 **웰드라인 충돌도 저멜트온도도 아니라** 벤팅 불량/air trap(last-fill 가스 포집) 방향.
  2. 조정안/검증에 **Progressive Short-Shot(에어트랩 위치 매핑) + 벤트 추가·청소** 포함.
  3. **배럴온도 상향(멜트 승온) 권고가 1순위에 오지 않을 것**(역순 입력 함정 회피 = trap_avoided). 멜트 실제값은 ~225℃ 정상.
- 함정 메모: ①온도 역순 입력 → 가짜 저멜트 오판 회피(작업1 검증), ②flow_mark 분류 → air_trap 교차 라우팅(작업3 검증).
- 기존 케이스 회귀 0 확인(`npm run eval`), Basic 회귀 없어야 함.

## 변경 파일 요약
- 수정: `app/api/diagnose/route.ts`(작업1: meltMax 확장 + tempOrderGuard + 주입부), `app/api/extract-settings/route.ts`(작업2: OCR 노즐 식별 규칙), `lib/defect-kb.ts`(작업3: flow_mark patternHints), `tests/eval/*`(작업4: 신규 케이스).
- 불변: air_trap_burn 노드, page.tsx, 디자인/토큰, UI.

## 검증
1. `npx tsc --noEmit` 에러 0 + `npm run build` 통과.
2. PP + 표면얼룩 + 노즐180/Z1190/Z2220/Z3225/Z4225 → 진단 프롬프트에 `[온도존 입력 정합성 가이드]` 블록 주입 확인(노즐 180 vs 존최고 225, 45℃차 → 역순 의심 라인). 결과에 "배럴 승온" 가짜 권고가 1순위에서 빠지는지.
3. 같은 케이스 + "90%↑ 충전서만·전체동시·신금형" 설명 → 1순위가 벤팅/air trap + Progressive Short-Shot 권고로 나오는지.
4. 정상 온도 케이스(노즐 ≥ 존최고) → tempOrderGuard 빈 문자열(미발동), 기존 동작 회귀 0.
5. `npm run eval` → 신규 케이스 통과 + 기존 케이스 정확도 회귀 없음.
