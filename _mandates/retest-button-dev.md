# 재진단 버튼 (dev 전용·크레딧 무료·before/after 비교)

## 배경 / 목적
엔진 개선(가드·KB·프롬프트) 후, **같은 케이스를 손으로 다시 입력하지 않고 기록에서 한 번에 재진단**해서 개선 전후 진단 품질을 비교하는 회귀 테스트 도구. 진우 본인만 사용(dev 전용), 크레딧 차감 없음, 결과는 기존 진단과 before/after 나란히 비교.

**전제(진우 확인됨):** 저장 확장은 지금부터 찍히는 기록에만 적용(소급 안 됨). 기존 기록은 `beforeInput`이 없어 재진단 버튼 미노출. 케이스를 한 번만 새로 입력하면 그때부터 재진단 무한 반복 가능.

**선행:** `_mandates/temp-zone-order-and-airtrap-routing.md`가 route.ts를 수정한다. 그게 머지된 **최신 route.ts 기준**으로 이 작업의 isRetest 분기를 추가할 것(충돌 방지).

## 원칙
- dev 게이팅은 **env 화이트리스트 이메일**로. 코드에 이메일 하드코딩 금지(보안·거버넌스). env 없으면 기능 완전 off(안전 기본값).
- 크레딧 무료는 **서버에서 인증 토큰의 이메일을 검증**해 허용(클라가 isRetest 보내도 서버가 화이트리스트 아니면 무시 → 일반 진단으로 크레딧 차감, 위조 방지).
- 거버넌스·디자인 토큰·모바일 우선 유지(raw hex 금지, 비교 UI도 토큰만). 끝나면 `npx tsc --noEmit` + `npm run build` 통과, **push 금지**, 변경파일 보고.

────────────────────────────────────
## 작업 1 — 입력 스냅샷 전체 저장 (app/diagnose/page.tsx)

record 생성부(현재 ~L569~576)에 `beforeInput` 한 덩어리 추가. 현재 payload(L503~513)와 **동일한 형태**로 입력 전체를 박는다:
```ts
        const record = {
          ...data,
          timestamp: new Date().toISOString(),
          id: newId,
          round: diagnosisRound,
          beforeResin: resinType === '기타 (직접 입력)' ? customResin : resinType,
          beforeSettings: { ...settings },
          beforeInput: {
            defectType: defectType === '기타 (직접 입력)' ? customDefect : defectType,
            defectDescription,
            resinInfo: { resinType: resinType === '기타 (직접 입력)' ? customResin : resinType, filler, fillerContent, /* 기존 payload.resinInfo와 동일 필드 전부 */ },
            settings: { ...settings },
            advSettings: { ...advSettings },
            pressureUnit: settings.pressureUnit,
            moldInfo: { moldType, gateType, cavities, runnerType },
            locale,
          },
        };
```
- `resinInfo`는 **L506~509의 payload.resinInfo와 정확히 같은 필드 구성**으로(빠뜨리지 말 것). payload를 미리 변수로 빼서 `beforeInput`에 재사용하면 중복·드리프트 방지(권장: `const payload = {...}` 를 record 위로 올려 공유).
- 이미지: 기존 `beforePhoto`(400px 썸네일) 그대로 사용. QuotaExceeded로 지워지면 재진단은 텍스트 모드로(이미지 없이) 진행.
- 용량: beforeInput은 텍스트라 작음. 기존 `trimmed.slice(0,20)` 유지.

## 작업 2 — dev 화이트리스트 게이팅

### 2-1. env (커밋 금지, 진우가 직접 설정)
- 서버용: `DEV_EMAILS="superjinu1@gmail.com"` (콤마 구분 다중 가능)
- 클라용: `NEXT_PUBLIC_DEV_EMAILS="superjinu1@gmail.com"`
- mandate엔 값 적되 **.env에 진우가 넣음**. 코드엔 `process.env.DEV_EMAILS` / `process.env.NEXT_PUBLIC_DEV_EMAILS`로 참조. 미설정 시 빈 문자열 → 기능 off.

### 2-2. 클라 isDev 판정 (app/history/page.tsx)
로그인 유저 이메일을 supabase 클라 세션에서 읽어, `NEXT_PUBLIC_DEV_EMAILS`(콤마 split, trim, 소문자 비교) 포함 여부로 `isDev` 산출. `isDev && record.beforeInput`인 기록 카드에만 재진단 버튼 렌더.

## 작업 3 — 재진단 호출 (app/history/page.tsx)

카드의 "🔄 재진단(dev)" 버튼(`type="button"`, 터치 44px+, 토큰 색) 클릭 시:
1. supabase 세션 토큰 취득 → `Authorization: Bearer` 헤더.
2. `POST /api/diagnose`, body = `{ ...record.beforeInput, images: [beforePhoto 있으면 1장 / 없으면 빈배열], isRetest: true, isDemo: false }`. (beforeInput 구조가 payload와 1:1이라 그대로 전송. round 미지정=1.)
3. 로딩 상태 표시(스피너), 응답 JSON을 `retestResult[record.id]` 상태에 저장.
4. 실패 시 카드에 에러 메시지(크레딧 부족 코드여도 dev는 안 떠야 정상 — 작업4 확인).

## 작업 4 — 서버 크레딧 스킵 (app/api/diagnose/route.ts, 최신 기준)

크레딧 차감/세션 생성부(start_session RPC 또는 크레딧 차감 로직, `X-Credit-Balance` 헤더 세팅하는 곳) **앞**에서:
```ts
const devEmails = (process.env.DEV_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
const userEmail = (authUser?.email || '').toLowerCase();   // 인증 단계에서 얻은 유저
const isRetestFree = body?.isRetest === true && userEmail && devEmails.includes(userEmail);
```
- `isRetestFree`면: 크레딧 차감/세션 생성을 **스킵**하고 정상 진단 수행(원인·조정안 정상 생성). `X-Credit-Balance` 헤더는 현재 잔액 그대로 또는 생략. session_id는 없어도 됨(재진단=독립 round1, 팔로업 안 함).
- `isRetest`인데 화이트리스트 아니면: 플래그 무시하고 **일반 진단(크레딧 차감)**으로 처리(위조 방지). 즉 `isRetest`는 화이트리스트일 때만 효력.
- 인증 안 된 호출은 기존대로(재진단은 로그인 전제).

## 작업 5 — before/after 비교 UI (app/history/page.tsx)

`retestResult[record.id]`가 있으면 카드 하단에 확장 영역. **기존 기록 vs 재진단** 핵심 필드 대조:
- 비교 항목 3개: ① summary, ② 1순위 원인(`causes[0].category` + `causes[0].cause`/description + 확률), ③ 조정안 top3(`recommendations[0..2]`의 parameter·recommended).
- 데스크탑: 2열(좌=기존/우=재진단), 모바일(375px): 세로 스택, 각 블록에 "기존"/"재진단" 라벨 칩(토큰 색, brand-tint).
- 변화 강조: 1순위 원인 카테고리/내용이 바뀌면 재진단 쪽에 brand 강조. (의미색 빨/주/초는 severity에만 — 분류 변화엔 brand만.)
- "전체 재진단 결과 펼치기" 토글로 신규 결과 전체(기존 결과 카드 컴포넌트 재사용)도 볼 수 있게.
- 재진단 버튼·비교 영역은 `isDev`일 때만. 일반 사용자에겐 흔적 없음.

## 변경 파일 요약
- 수정: `app/diagnose/page.tsx`(작업1 beforeInput 저장), `app/history/page.tsx`(작업2-2 isDev + 작업3 호출 + 작업5 비교 UI + HistoryRecord에 `beforeInput?` 타입 추가), `app/api/diagnose/route.ts`(작업4 isRetest 크레딧 스킵).
- env(진우 수동): `DEV_EMAILS`, `NEXT_PUBLIC_DEV_EMAILS`.
- 불변: 진단 엔진 로직(가드·KB), 디자인 토큰, 일반 사용자 플로우.

## 검증
1. `npx tsc --noEmit` 에러 0 + `npm run build` 통과.
2. 진우 계정 로그인 → 새 진단 1건 → /history 카드에 "재진단(dev)" 버튼 노출. beforeInput 없는 옛 기록엔 미노출.
3. 재진단 클릭 → 크레딧 **차감 0**(잔액 불변) + 새 결과 생성 + before/after 2열 비교 렌더.
4. 비화이트리스트 계정(또는 env 미설정) → 버튼 자체가 안 보이고, 강제로 isRetest 호출해도 서버가 일반 진단(크레딧 차감)으로 처리.
5. 모바일 375px → 비교 영역 세로 스택, 터치타겟 44px+, 토큰 색만(raw hex 0).
6. 일반 사용자 플로우(비-dev) 회귀 0: 기존 진단·일지·해결기록 그대로.
