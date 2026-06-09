# 진단 — 불량 설명 텍스트에서 금형 단서 자동 추출 (구조화 입력 미입력 보강)

## 배경 / 목적
사용자가 금형정보(캐비티 수·러너 타입)를 **구조화 입력칸에 안 채우고 "불량 설명" 텍스트에만** 적는 경우가 흔하다.
현재 `app/api/diagnose/route.ts`의 강한 가드들은 구조화 입력에만 묶여 있어, 텍스트 단서만으론 발동하지 않는다:

- `moldMachineGuard`의 **국부원인 가드**(특정 캐비티 → 러너 밸런스·핫러너 노즐 우선)는 `cavities >= 4` 조건이 `moldInfo.cavities`(구조화 입력)에만 의존 → 텍스트에 "4캐비티"만 쓰면 블록 전체 스킵.
- **핫러너 가드**(데드스팟 체류·노즐 온도 편차)는 `moldType/runnerType` 구조화 입력에만 의존 → 텍스트 "밸브게이트/핫러너"는 무시.
- `classifyComplexity`는 "특정 캐비티"만 매칭(L132) → "한 캐비티만/일부 캐비티"는 복잡도 점수 누락.

결과: 단서가 모델 프롬프트엔 들어가도(`route.ts:657`) **코드 가드가 강제로 밀어주지는 못해**, 모델이 흘리면 헛다리 가능.
이번 케이스(한 캐비티만 백색 반달)는 사용자가 구조화 입력도 같이 해서 운 좋게 발동했지만, 텍스트만 적었으면 가드 미발동이었다.

## 목표
`defectDescription` 텍스트에서 (a) 캐비티 수, (b) 특정/일부 캐비티만 패턴, (c) 핫러너/밸브게이트 단서를 정규식으로 추출해, 구조화 입력이 비어 있어도 기존 가드가 발동하게 **보강**한다.

## 원칙
- **구조화 입력이 있으면 항상 그 값이 우선.** 추론은 빈 칸만 채운다(충돌 시 명시 입력 승).
- 과추출 금지: 정규식은 보수적으로(오매칭으로 엉뚱한 케이스에 "특정캐비티" 플래그 켜지면 오진).
- 기존 동작 회귀 0. 스키마·인증·크레딧·출력 형식 불변. 로직 가드만 손댄다.
- `npx tsc --noEmit` + `npm run build` 통과, **push 금지**, 변경파일 보고.

────────────────────────────────────
## 수정 1 — helper 추가 (route.ts, `classifyComplexity` 함수 바로 위)

```ts
// defectDescription 텍스트에서 금형 단서 자동 추출.
// 사용자가 금형정보(캐비티수·러너타입)를 구조화 입력 안 하고 설명에만 적은 경우 보강용.
// 원칙: 구조화 입력이 있으면 항상 그 값 우선. 추론은 빈 칸만 채운다.
function inferMoldCluesFromText(desc?: string): {
  cavities: number; specificCavity: boolean; hotRunner: boolean;
} {
  const t = desc || '';
  const cavM =
    t.match(/(\d+)\s*캐비티/) ||
    t.match(/캐비티\s*(\d+)\s*개?/) ||
    t.match(/(\d+)\s*cav(?:ity|ities)?/i);
  const cavities = cavM ? parseInt(cavM[1], 10) : 0;
  const specificCavity =
    /(?:한|특정|일부|하나|어느|\d+\s*번)\s*캐비티\s*만/.test(t) ||
    /캐비티\s*(?:하나|한\s*개|1\s*개)?\s*만/.test(t) ||
    /특정\s*캐비티|일부\s*캐비티|한\s*캐비티만/.test(t) ||
    /나머지\s*(?:는|캐비티는|\d+\s*캐비티는)?\s*(?:정상|멀쩡)/.test(t) ||
    /specific\s*cavit|only\s*one\s*cavit/i.test(t);
  const hotRunner = /핫\s*러너|hot\s*runner|밸브\s*게이트|valve\s*gate/i.test(t);
  return { cavities, specificCavity, hotRunner };
}
```

## 수정 2 — moldMachineGuard 보강 (route.ts, 현 L543~602)

`const mi = moldInfo || {};` 블록 안에서 cavities·핫러너·특정캐비티 판정을 추론값으로 보강한다.

(a) 추론값 확보 — guard 함수 시작부에 추가:
```ts
const inferred = inferMoldCluesFromText(defectDescription);
```

(b) 현재 `const cavities = parseInt(mi.cavities || '0', 10);` 를 아래로 교체(구조화 입력 우선, 없으면 텍스트 추론):
```ts
const cavities = parseInt(mi.cavities || '0', 10) || inferred.cavities;
```

(c) 현재 특정캐비티 판정:
```ts
const hasSpecific = !!(defectDescription && /특정.*캐비티|캐비티.*만|specific.*cavit/i.test(defectDescription));
```
를 아래로 교체(추론 플래그 OR):
```ts
const hasSpecific = inferred.specificCavity ||
  !!(defectDescription && /특정.*캐비티|캐비티.*만|specific.*cavit/i.test(defectDescription));
```

(d) 현재 핫러너 가드:
```ts
if (moldType.includes('핫') || runnerType === '핫')
  rules.push(`- 핫러너: 데드스팟 체류·노즐 온도 편차 → 은선/변색/흑점/특정 캐비티 불량 원인 가중.`);
```
를 아래로 교체(텍스트 추론 OR):
```ts
if (moldType.includes('핫') || runnerType === '핫' || inferred.hotRunner)
  rules.push(`- 핫러너: 데드스팟 체류·노즐 온도 편차 → 은선/변색/흑점/특정 캐비티 불량 원인 가중.`);
```

## 수정 3 — classifyComplexity 보강 (route.ts, 현 L126~149)

현재:
```ts
if (input.defectDescription?.includes('간헐적') ||
    input.defectDescription?.includes('특정 캐비티') ||
    input.defectDescription?.includes('시간대') ||
    input.defectDescription?.includes('때만')) score += 3;
```
를 아래로 교체(추론 특정캐비티 플래그 반영):
```ts
const clue = inferMoldCluesFromText(input.defectDescription);
if (clue.specificCavity ||
    input.defectDescription?.includes('간헐적') ||
    input.defectDescription?.includes('특정 캐비티') ||
    input.defectDescription?.includes('시간대') ||
    input.defectDescription?.includes('때만')) score += 3;
```

## 수정 4 — 프롬프트 한 줄 보강 (route.ts FIXED_FRAMEWORK, "패턴 기반 추론 규칙" 블록 끝)

현 L199~205의 "패턴 기반 추론 규칙" 마지막에 한 줄 추가(모델도 텍스트 단서를 구조화 입력처럼 다루게):
```
- 구조화 입력(금형정보 캐비티수·러너타입)이 비어 있어도, 불량 설명 텍스트에 캐비티 수·특정 캐비티·핫러너/밸브게이트 단서가 있으면 반드시 그 단서를 원인 분석에 반영하라(텍스트 단서를 구조화 입력과 동등하게 취급).
```

────────────────────────────────────
## 검증
1. `npx tsc --noEmit` 에러 0 + `npm run build` 통과.
2. **이번 케이스 재현(텍스트만 입력 가정)**: defectType="웰드라인", defectDescription에 "핫러너 밸브게이트 4캐비티 ... 계속 한 캐비티만 유독 ... 나머지는 멀쩡", **금형정보 칸은 전부 비움**으로 진단 → 원인에 "해당 캐비티/노즐 국부 원인(러너 밸런스·핫러너 노즐 온도)"이 상위로 나와야 함(구조화 입력 없이도).
3. **회귀(eval)**: `npm run eval` → Basic 5 / Hard 5 점수 종전 대비 하락 0. 특히 특정캐비티 단서 없는 케이스에 "특정 캐비티" 가드가 잘못 켜지지 않는지(과추출) 확인.
4. **과추출 스팟체크**: defectDescription="게이트 4번 부근 은줄"(캐비티 아님) → specificCavity=false 여야 함. "4캐비티 전체 동일"(특정 아님) → specificCavity=false 여야 함.

## 변경 파일
- 수정: `app/api/diagnose/route.ts` (helper 1개 + 가드 3곳 보강 + 프롬프트 1줄).
- 불변: 스키마·인증·크레딧·diagnose 출력 형식·extract-settings·디자인.
