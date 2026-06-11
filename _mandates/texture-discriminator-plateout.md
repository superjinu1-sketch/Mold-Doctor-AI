# 진단 — "닦임" 텍스처 분기 + Mold Deposit/Plate-out 노드 추가 (#31)

## 배경 / 문제
실케이스(한 캐비티 백색 반달, "닦으면 흐려짐")에서 엔진이 **웰드라인/플로우마크로 오분류**했다.
결정적 단서: 표면 잔류물이 **닦이면** 구조적 불량(웰드선·플로우마크·은선 지속형)이 아니라 **표면 부착물**(금형 석출 plate-out·가스 응축·이형제 전사)이다. 닦아도 안 지워지는 게 구조적 불량.

근본 원인: taxonomy 30종에 **금형 석출(plate-out) 전용 노드가 없고**, 분류 변별에 "닦임 텍스처" 단서가 없다. 그래서 닦이는 백색 가루의 행선지가 없어 웰드/플로우로 흘렀다.

## 해결 (taxonomy 개정 가이드 정석 경로: 문서→코드→KB bump→eval)
1. taxonomy.md에 #31 Mold Deposit/Plate-out 추가 + 변별 규범.
2. defect-kb.ts에 `mold_deposit` 노드 1개 추가 + weld_line·flow_mark 식별포인트에 닦임 변별 한 줄.
3. route.ts에 닦임 텍스처 가드 + STEP1 분류 규칙 한 줄.
4. KB_VERSION v1.1 → v1.2.

## 원칙
- 닦임 가드는 "우선 검토" 유도지 강제 아님(모델 최종 판단). 과추출 금지(정규식 보수적).
- 기존 노드 로직 회귀 0(weld/flow는 식별포인트 텍스트만 보강).
- `npx tsc --noEmit` + `npm run build` 통과, **push 금지**, 변경파일 보고.

────────────────────────────────────
## 수정 1 — taxonomy.md (docs/defect_taxonomy.md)

(a) 불량 목록 표(현 L55 `| 30 | ... 메타` 행 **위**)에 추가:
```
| 31 | Mold Deposit/Plate-out(금형 석출·플레이트아웃) | 표면 | | 조건부 |
```

(b) §3 규범 요약(현 L75 Fiber Read-out 줄 아래 적당한 위치)에 추가:
```
- **Mold Deposit/Plate-out**: 닦으면 옅어지는 표면 부착물(백색·뿌연 가루·얼룩). 1순위 수지 휘발분·첨가제 석출(고멜트·장체류) / 벤트 가스응축 / 이형제 전사. 조정 멜트온도↓·체류단축·금형 표면 세정·벤트 청소. **변별 핵심: 닦임=부착물 → 웰드/플로우/은선 배제.**
```

(c) §1 분류 체계 끝(현 L19 "원칙: 대부분 복합 원인..." 줄 아래)에 텍스처 변별 규범 추가:
```
- **텍스처 변별(필수)**: 표면 백색·뿌연 얼룩/가루가 "닦으면 옅어지거나 지워지면" = 표면 부착물(금형 석출 plate-out·가스 응축·이형제 전사). 닦아도 안 지워지면 = 구조적(웰드라인·플로우마크·지속형 은선·표면 요철). 이 한 줄이 외관 백색 불량의 1차 분기를 가른다.
```

## 수정 2 — defect-kb.ts: mold_deposit 노드 추가

현 L751 `gate_blush` 노드 닫는 `},` 와 L753 `};`(DEFECT_KB 닫기) **사이**에 추가:

```ts
  // ─── 31. Mold Deposit / Plate-out (금형 석출/플레이트아웃) ───
  mold_deposit: {
    id: 'mold_deposit', nameKo: '금형 석출', nameEn: 'Mold Deposit', phase: '표면',
    typicalSeverity: 'medium (외관). 누적·전수화 시 수율 직결',
    discriminators: '닦으면 옅어지는 백색·뿌연 잔류물(표면 부착물). 닦아도 안 지워지는 구조적 불량(웰드선·플로우마크·은선 지속형·표면 요철)과 결정적으로 구분. 게이트·벤트 주변·특정 캐비티 집중. 반복생산 시 점진 누적, 금형 세정 직후 일시 소멸·재누적.',
    causes: [
      { rank: 1, cause: '수지 휘발분·첨가제 금형표면 석출(plate-out)', category: 'Material',
        baseProbability: 45,
        trigger: '고멜트온도·장시간 체류. 저분자 첨가제·난연제·활제 휘발. 금형 세정 직후 소멸 후 재누적.',
        evidence: '멜트온도·체류(사이클)시간. 세정주기 대비 재발.',
        verification: '금형 게이트·벤트 주변 표면 닦아내고 N샷 후 재출현 확인. 소멸→재누적이면 plate-out 확진.',
        adjustment: '멜트온도↓·사이클(체류)단축·금형 표면 주기 세정·벤트 추가/청소.' },
      { rank: 2, cause: '벤트 부족·막힘 → 가스 응축', category: 'Mold',
        baseProbability: 30,
        trigger: '벤트 막힘·last-fill·게이트 주변. 가스 미배출 응축.',
        evidence: '벤트 상태. 얼룩 위치(게이트·충전말단).',
        verification: '벤트 청소·추가 후 재시험.',
        adjustment: '벤트 청소·추가, 사출속도↓, 멜트온도↓.' },
      { rank: 3, cause: '이형제 과다 전사', category: 'Mold',
        baseProbability: 20,
        trigger: '외부 이형제 분무 과다.',
        evidence: '이형제 사용 로그.',
        verification: '이형제 없이 테스트.',
        adjustment: '이형제 최소화·금형 세정.' },
    ],
    patternHints: {
      '닦으면 흐려짐·지워짐': '표면 부착물 확정 — 웰드/플로우/은선(구조적·지속형) 배제, plate-out·가스 응축·이형제 우선.',
      '특정 캐비티만': '그 캐비티 표면·벤트·핫러너 노즐 데드스팟 집중. 러너밸런스·노즐온도 편차 검토.',
      '게이트 주변 반달·헤일로': 'gate_blush 병발 검토. 닦이면 석출, 안 닦이면 블러시(표면 거칠기).',
      '핫러너 청소·밸브교환에도 지속': '핫러너 내부 아닌 캐비티 표면·벤트 원인 가중. 그 캐비티 표면 세정·벤트 점검.',
    },
    sharedGates: [],
    priorityLogic: '"닦임=표면 부착물"이 분류 결정 단서. 금형 세정 후 일시 소멸·재누적이면 plate-out 확진. 닦이는 잔류물을 웰드/플로우로 분류하지 마라.',
    source: 'synthesis,taxonomy-31', confidence: 'med',
  },
```

## 수정 3 — defect-kb.ts: weld_line·flow_mark 식별포인트 보강 (텍스트만)

(a) weld_line discriminators(현 L172) 끝에 문장 추가:
```
 닦아도 안 지워지는 구조적 선. 닦으면 옅어지는 백색 잔류물이면 웰드 아님 → mold_deposit(석출) 검토.
```

(b) flow_mark discriminators(현 L242) 끝에 문장 추가:
```
 닦아도 안 지워지는 표면 요철. 닦으면 옅어지는 백색 가루·얼룩이면 flow 아님 → mold_deposit(석출)·가스 응축 검토.
```

## 수정 4 — defect-kb.ts: KB_VERSION bump
현 L7 `export const KB_VERSION = 'defect-kb-v1.1';` → `'defect-kb-v1.2';`

## 수정 5 — route.ts: 닦임 텍스처 가드 추가

`tempOrderGuard` 정의 블록(현 L626~637) **아래**에 추가:

```ts
// 표면 잔류물 텍스처 가드 — "닦으면 옅어진다" 단서면 표면 석출(plate-out)·가스 응축·이형제를 구조적 불량보다 우선
const surfaceDepositGuard = (() => {
  const t = defectDescription || '';
  const wipes = /닦으?면|닦이|문지르|문질러|wipe|rub/i.test(t);
  const fades = /흐려|옅|연해|사라|지워|줄어|없어|연하게/i.test(t);
  const whitish = /백색|흰|뿌옇|뿌연|가루|분말|얼룩|백분/i.test(t);
  if (wipes && (fades || whitish)) {
    return `[표면 잔류물 텍스처 가이드]
- ⚠ "닦으면 옅어진다/지워진다" 단서가 있다. 이는 표면 부착물(금형 석출 plate-out·가스 응축물·이형제 전사)이다. 닦아도 안 지워지는 구조적 불량(웰드라인·플로우마크·은선 지속형·표면 요철)을 1순위에서 배제하라.
- 우선 검토: (1) 금형 석출/plate-out(수지 휘발분·첨가제가 금형 표면에 응축 누적 → 제품 전사. 고멜트온도·장체류·세정주기 부족), (2) 벤트 부족·막힘에 의한 가스 응축(게이트·충전말단 집중), (3) 이형제 과다 전사.
- 검증: 금형 해당 부위 표면을 닦아낸 뒤 N샷 후 재출현 여부 확인. 세정 직후 소멸→재누적이면 plate-out 확진.
- 특정 캐비티만 + 핫러너 청소·밸브교환에도 지속이면, 원인은 핫러너 내부가 아니라 그 캐비티 표면·벤트일 가능성이 높다(그 캐비티 표면 세정·벤트 점검 우선).`;
  }
  return '';
})();
```

그리고 가드 합류부(현 L718)에 `${surfaceDepositGuard ? ...}` 추가. 현재:
```ts
${defectGuide ? `${defectGuide}\n\n` : ''}${moldMachineGuard ? `${moldMachineGuard}\n\n` : ''}${defectTempGuard ? `${defectTempGuard}\n\n` : ''}${tempOrderGuard ? `${tempOrderGuard}\n\n` : ''}${kbCompare ? `${kbCompare}\n\n` : ''}
```
의 `${tempOrderGuard ...}` 바로 뒤에 삽입:
```ts
${surfaceDepositGuard ? `${surfaceDepositGuard}\n\n` : ''}
```

## 수정 6 — route.ts: FIXED_FRAMEWORK STEP1 분류 규칙 한 줄

STEP 1 DEFECT CLASSIFICATION 블록(현 L156~158, "Identify defect type..." 아래)에 추가:
```
- TEXTURE DISCRIMINATOR (표면 잔류물): 백색·뿌연 얼룩/가루가 "닦으면 옅어지거나 지워진다"면 표면 부착물(금형 석출 plate-out·가스 응축·이형제 전사)이다. 닦아도 안 지워지는 구조적 불량(weld line·flow mark·지속형 silver streak·표면 요철)으로 분류하지 마라. 이 경우 defect_type을 Mold Deposit/Plate-out(금형 석출) 계열로 추정하라.
```

────────────────────────────────────
## (권장 B) route.ts: 닦임 감지 시 mold_deposit 가이드 병행 주입
가드 텍스트만으로 부족하면, 닦임 감지 시 plate-out 분기 상세(원인·조정·검증)를 모델에 직접 넣는다.
`defectGuide` 정의(현 L534~540) 아래에 추가:
```ts
const depositGuide = surfaceDepositGuard
  ? formatDefectGuide('금형 석출', resinSpec, s, a, resinInfo?.filler)
  : '';
```
그리고 수정 5의 합류부에서 `${surfaceDepositGuard ...}` 뒤에 `${depositGuide ? `${depositGuide}\n\n` : ''}` 추가.
(getDefect('금형 석출')이 nameKo 부분일치로 mold_deposit 매칭됨.)

────────────────────────────────────
## 검증
1. `npx tsc --noEmit` 0 + `npm run build` 통과.
2. **케이스#4 재현**: defectType="웰드라인", defectDescription="...아주 희미하게 반달 백색가루... 닦으면 조금 흐려집니다... 핫러너 밸브게이트 4캐비티... 계속 한 캐비티만 유독... 나머지는 멀쩡" 으로 진단 →
   - defect_type이 **금형 석출/Mold Deposit(또는 plate-out·가스 응축)** 계열로 나와야 함(웰드라인/플로우마크 1순위 탈피).
   - 원인에 "수지 휘발분 석출 / 그 캐비티 표면·벤트 / 금형 세정 후 재누적 검증"이 포함.
   - 조정안에 "금형 표면 세정·벤트 점검·멜트온도↓·체류단축"이 포함(전역 사출속도 일반론 아님).
3. **eval 회귀**: `npm run eval` → Basic/Hard 점수 종전(13/15, 83점) 대비 하락 0. 특히 닦임 단서 없는 기존 웰드/플로우/은선 케이스가 mold_deposit으로 오분류되지 않는지(과추출) 확인.
4. **과추출 스팟체크**: defectDescription에 닦임 단서 없는 케이스("게이트 부근 은줄 지속") → surfaceDepositGuard 미발동(빈 문자열), 기존 분류 유지.

## 변경 파일
- 수정: `docs/defect_taxonomy.md`(표+규범 3곳), `lib/defect-kb.ts`(노드 1개 추가 + weld/flow 식별포인트 + KB_VERSION), `app/api/diagnose/route.ts`(가드 1개 + 합류부 + STEP1 1줄 [+권장B depositGuide]).
- 불변: 스키마·인증·크레딧·출력 형식·extract-settings·디자인·resin-kb·기존 30개 노드 로직.
