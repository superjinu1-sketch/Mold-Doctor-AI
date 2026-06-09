# 진단 방향 오류 수정 — 불량유형·온도 정합성 가드 (옵션1: 최소 가드 3종)

## 배경 / 목적
실케이스(POM color streak, 사출 카페): 사용자가 불량유형을 **"흑점/탄화물"로 수동 선택** → 엔진이 무비판 수용 → 노즐 180℃(POM 권장 190~210℃, 분해 220℃+ → **하한 미달, 탄화 불가능 온도**)인데도 "스크류 마모 → 데드존 탄화물"을 1순위로 오진, 퍼징을 추천. 실제 정답은 **멜트온도 +20℃ 상향(마스터배치 색소 분산 불량 = 색줄/마블링)**.

3중 복합 원인:
1. 유저가 고른 불량유형을 엔진이 확정 사실로 깔고 추론(잘못 골라도 그 위에서 정밀하게 틀림).
2. checkSettings가 "노즐 180℃ 낮음⚠"을 이미 프롬프트에 넣었지만, "탄화 진단인데 멜트가 분해온도보다 낮다"는 **물리 모순을 화해하는 가드가 없음.**
3. 팔로업(round≥2) 로직(buildSystemBlocks)이 "효과 없던 조치 재추천 금지 + machine/mold(체크링·스크류 마모) 우선"으로 **온도를 강제 배제**, 1차 분류가 틀렸을 가능성 재검토 분기가 없음.

## 원칙
- **가드는 정보만 제공, 모델이 재랭킹**(하드코딩으로 "색줄이다" 단정 금지). B-tier 추론 + A-tier 가이드레일 철학 유지.
- 과열탄화(배럴 과열)와 국부/체류성 탄화(핫러너 데드스팟·재생재 열화)를 구분 — 후자는 배럴온도 무관하게 가능하니 배제하지 말 것.
- 거버넌스: 추정·신뢰도 명시·중립 유지. 기존 면책문구 보존.
- 디자인/UI 변경 없음(프롬프트·KB 함수만). 끝나면 `npx tsc --noEmit` + `npm run build` 통과, **push 금지**, 변경파일 보고.

────────────────────────────────────
## 작업 1 — 불량유형·온도 모순 가드 (app/api/diagnose/route.ts)

`moldMachineGuard` IIFE가 끝나는 지점(현재 ~L594, `})();` 직후) 바로 아래에 **새 블록** 추가:

```ts
    // 불량유형↔온도 정합성 가드 — 과열탄화 계열 선택인데 멜트가 분해온도 미달이면 재검토 유도
    const defectTempGuard = (() => {
      if (!resinSpec) return '';
      const dt = defectType || '';
      const isBurnLike = /탄화|흑점|번\s*마크|burn|black\s*spot|디젤|변색|scorch/i.test(dt);
      const nozzle = parseFloat(s.nozzleTemp || '');
      const z1 = parseFloat(s.zone1Temp || '');
      const meltMax = [nozzle, z1].filter(v => isFinite(v)).reduce((m, v) => Math.max(m, v), 0);
      const degr = resinSpec.meltC?.degradeAbove;
      const meltMin = resinSpec.meltC?.min;
      const lines: string[] = [];
      if (isBurnLike && degr && meltMax > 0 && meltMax < degr) {
        lines.push(`- ⚠ 선택된 불량유형(${dt})은 과열탄화 계열인데, 현재 멜트온도(노즐/실린더 최고 ${meltMax}℃)는 ${resinSpec.id} 열분해 온도(${degr}℃)보다 낮다. 이 온도에서 수지 자체의 과열탄화(배럴 과열)는 발생하기 어렵다. 과열탄화를 1순위에서 신중히 배제하고 다음 비-과열 원인을 우선 검토하라: (a) 외부 이물·오염, (b) 마스터배치·색소 분산 불량(저온일수록 색줄·마블링 발생), (c) 핫러너 데드스팟·장시간 체류·재생재 열화 등 국부/체류성 탄화. 단 (c) 국부 탄화는 배럴온도와 무관하게 가능하니 별개로 검토하라.`);
      }
      if (meltMin && meltMax > 0 && meltMax < meltMin) {
        lines.push(`- ⚠ 멜트온도(최고 ${meltMax}℃)가 ${resinSpec.id} 권장 하한(${meltMin}℃) 미달. 외관 불량(색줄/마블/광택저하/미성형)은 저(低)멜트온도와 직결되므로, 멜트온도 상향을 우선 원인·조정안으로 강하게 검토하라.`);
      }
      return lines.length ? `[불량유형·온도 정합성 가이드]\n${lines.join('\n')}` : '';
    })();
```

그리고 diagnosisText 주입부(현재 L675)에서 moldMachineGuard 다음에 끼워넣기:

```ts
${defectGuide ? `${defectGuide}\n\n` : ''}${moldMachineGuard ? `${moldMachineGuard}\n\n` : ''}${defectTempGuard ? `${defectTempGuard}\n\n` : ''}${kbCompare ? `${kbCompare}\n\n` : ''}
```
(기존 라인에 `${defectTempGuard ...}` 한 조각만 추가. 나머지 순서 불변.)

## 작업 2 — 팔로업 1차 분류 재검토 분기 (app/api/diagnose/route.ts, buildSystemBlocks)

`round >= 2` 블록(현재 L315~321) 안의 분석 규칙 목록 맨 끝(현재 "4. 1차가 material/method..." 다음 줄)에 규칙 추가:

```
5. 단, 1차 권고 조치를 전부 시도했는데 변화가 없다면, 새 원인을 machine/mold로만 좁히지 마라. 1차 추정의 방향(불량유형 분류·원인 카테고리) 자체가 틀렸을 가능성을 먼저 재검토하라. 특히 'KB 가공윈도우 사전 대조'에 '낮음⚠'/'높음⚠' 플래그가 있으면 그 항목(멜트온도 등)을 최우선 후보로 다시 열어라. "더 깊고 희귀한 원인"으로 가기 전에 "처음 분류가 틀렸나"를 먼저 물어라.
```

기존 4번 규칙("1차가 material/method면 2차는 machine/mold 우선")은 **삭제하지 말고 유지** — 5번이 단서를 다는 구조. (4번이 단독으로 작동해 온도를 배제하던 걸 5번이 견제.)

## 작업 3 — KB 대조 플래그 가중 (lib/resin-kb.ts, formatKbCompare)

`formatKbCompare`에서 면책문구 직전에 플래그 가중 한 줄 추가:

```ts
export function formatKbCompare(spec: ResinSpec, checks: SettingCheck[]): string {
  if (checks.length === 0) return '';
  const lines = checks
    .map(c => `- ${c.label} ${c.value}${c.unit}: ${spec.id} 권장 ${c.rangeText} → ${STATUS_MARK[c.status]}`)
    .join('\n');
  const hasFlag = checks.some(c => c.status !== 'ok');
  const flagNote = hasFlag
    ? '\n※ 위 ⚠ 항목은 가공윈도우 이탈이다. 외관·치수 불량의 직접 원인일 수 있으니 원인 후보에서 우선 검토하라.'
    : '';
  return `## 가공윈도우 사전 대조 (KB 기준, 참고용)
${lines}${flagNote}
※ 일반 가공윈도우 기준이다. 등급·충전재·벽두께에 따라 적정값이 달라질 수 있어 절대 기준이 아니다. 최종 판단은 전체 맥락으로 하라.`;
}
```
(기존 면책문구 그대로 유지, flagNote만 그 위에 삽입.)

## 작업 4 — eval 케이스 박제 (tests/eval/)

기존 eval 케이스 스키마(basic/hard, run.mjs 매핑)와 **동일 형식**으로 신규 케이스 1개 추가:
- 이름/슬러그: `pom-colorstreak-lowmelt` (또는 기존 네이밍 규칙 따름)
- 입력: resinType=`POM(아세탈)`, defectType=`흑점/탄화물`(유저 오선택 함정), nozzle=180, zone1=180, zone2=175, zone3=165, zone4=155, 금형온도/압력 등은 카페 케이스값(없으면 비움), colorType=마스터배치(있으면).
- 기대(정답): 1순위 원인이 **과열탄화/스크류마모가 아니라** 저멜트온도·색소 분산 불량(색줄) 방향. 조정안에 **멜트온도 상향(+15~20℃, 200℃ 부근)** 포함.
- 함정 메모: 유저가 흑점/탄화물로 선택했으나 180℃는 POM 분해온도(220℃) 미달 → 과열탄화 불가. 작업2(팔로업)·작업1(모순가드) 동시 검증용.
- 기존 13케이스 회귀 0 확인(`npm run eval`), Basic 회귀 없어야 함.

## 변경 파일 요약
- 수정: `app/api/diagnose/route.ts`(작업1 가드 블록 + diagnosisText 주입 + 작업2 buildSystemBlocks round≥2), `lib/resin-kb.ts`(작업3 formatKbCompare), `tests/eval/*`(작업4 신규 케이스).
- 불변: defect-kb.ts, page.tsx, 디자인/토큰, UI.

## 검증
1. `npx tsc --noEmit` 에러 0 + `npm run build` 통과.
2. POM + 흑점/탄화물 + 노즐 180 → 진단 프롬프트에 `[불량유형·온도 정합성 가이드]` 블록이 두 ⚠ 라인 모두 포함돼 들어가는지(로그/콘솔로 diagnosisText 확인). 결과 1순위가 과열탄화에서 색분산/저온 방향으로 바뀌는지.
3. 팔로업 2차(같은 케이스, "3종 했는데 변화없음") → 스크류 마모로 안 빠지고 멜트온도 재검토가 후보에 올라오는지.
4. 비-탄화 불량유형(예: 미성형) + 정상온도 케이스 → defectTempGuard 빈 문자열(미발동), 기존 동작 회귀 0.
5. `npm run eval` → 신규 케이스 통과 + 기존 13케이스 정확도 회귀 없음.
