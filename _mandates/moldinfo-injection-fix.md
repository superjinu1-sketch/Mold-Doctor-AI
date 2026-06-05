# Mandate: 금형/제품 정보 진단 주입 (누락 버그 수정)

> 단방향 Cowork→CC. 정본. 작성 2026-06-05. **데모 전 필수 — 진단 정확도 직결.**

## 문제 (확인됨)
- `app/diagnose/page.tsx`는 금형/제품 정보를 다 수집·전송한다:
  - `moldInfo: { moldType(2판/3판/핫러너), gateType, cavities, runnerType }` (라인 504)
  - `productInfo: { weight, wallThicknessMin, wallThicknessMax, notes }` (라인 505)
- `app/api/diagnose/route.ts`는 이 값을 **수신(389)만 하고 diagnosisText(진단 프롬프트)에 주입하지 않는다.** moldType/gateType/cavities/weight/wallThickness 텍스트화 = 0건.
- 결과: FIXED_FRAMEWORK에 "금형정보 반영하라"(196) 지시가 있어도 **값이 안 들어가서 AI가 못 본다.** (예외: 핫러너+매니폴드온도 조합만 일부 들어감)

## 수정
`route.ts` diagnosisText 빌드부(셋팅·건조·핫러너 섹션 근처, resin-kb 주입 자리 인근)에 **"## 금형/제품 정보" 섹션을 추가 주입**한다. 입력값이 있는 항목만(빈값은 스킵 또는 '-').

```
## 금형 정보
- 금형 타입: ${moldInfo.moldType}   (2판/3판/핫러너)
- 게이트 타입: ${moldInfo.gateType}
- 캐비티 수: ${moldInfo.cavities}
- 러너 타입: ${moldInfo.runnerType}   (콜드/핫)

## 제품 정보
- 제품 중량: ${productInfo.weight} g
- 벽 두께: ${productInfo.wallThicknessMin} ~ ${productInfo.wallThicknessMax} mm
- 제품 특이사항: ${productInfo.notes}
```

- 전부 빈값이면 섹션 자체 생략(기존 동작 보존, 순수 add).
- FIXED_FRAMEWORK 지시(196 "moldInfo 반영", 298 mold_analysis 조건부)는 이미 있으므로 값만 들어가면 작동. 프롬프트 추가 수정 불필요(원하면 "벽두께로 L/T비·싱크 위험, 캐비티 수로 밸런스·투영면적 평가" 한 줄 보강 가능).
- defect-kb 분기와의 연계(벽두께→싱크/미성형 trigger, 게이트→웰드)는 v2에서. v1은 프롬프트 주입까지.

## 검증
- `npm run build` + `npm run verify`.
- 스팟체크: 금형타입=핫러너 + 캐비티=8 + 벽두께 입력한 진단 → 결과에 게이트/캐비티/벽두께가 원인·조정에 반영되는지(특히 웰드라인·싱크·미성형 케이스). 입력 안 한 진단은 기존과 동일(회귀 0).
- 거버넌스: "추정/조정안" 유지.

## 산출물
route.ts 수정. 통과 후 commit + push.
