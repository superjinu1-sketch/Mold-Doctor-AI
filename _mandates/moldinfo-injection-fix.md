# Mandate: Mold + Machine 정보 진단 주입 + 결정 규칙 (4M 반쪽 보강)

> 단방향 Cowork→CC. 정본. 작성 2026-06-05. **데모 전 필수 — 진단 정확도 직결.**
> 핵심: 입력 UI는 있는데 route가 진단 프롬프트에 안 넣는 누락. 금형(Mold)+사출기(Machine) 둘 다. + 값만 넣지 말고 결정 규칙(가이드레일)까지.

## 문제 (확인됨)
4M 중 Method(셋팅)·Material(resin-kb)은 진단에 들어가는데, **Mold·Machine은 입력받고 진단 프롬프트에 주입 안 됨.**
- 금형: `page.tsx:504` `moldInfo:{moldType(2판/3판/핫러너),gateType,cavities,runnerType}` + `:505` `productInfo:{weight,wallThicknessMin,wallThicknessMax,notes}` 전송 → route 수신(389)만, diagnosisText 주입 0.
- 사출기: `page.tsx:1114~1130` 사출기 스펙 UI 살아있음 `advSettings:{machineModel,screwDiameter,maxClampForce,maxInjPressure}` → route는 advSettings 수신하나 이 4개를 diagnosisText에 주입 0 (형체력 현재셋팅값 clampForce만 들어감).

## 수정 — route.ts diagnosisText에 2개 섹션 주입 + 결정 규칙

### A. 값 주입 (입력 있는 항목만, 전부 빈값이면 섹션 생략 = 순수 add, 회귀 0)
```
## 금형 정보
- 금형 타입: ${moldInfo.moldType} (2판/3판/핫러너)
- 게이트 타입: ${moldInfo.gateType}
- 캐비티 수: ${moldInfo.cavities}
- 러너 타입: ${moldInfo.runnerType} (콜드/핫)

## 제품 정보
- 제품 중량: ${productInfo.weight} g
- 벽 두께: ${productInfo.wallThicknessMin} ~ ${productInfo.wallThicknessMax} mm
- 특이사항: ${productInfo.notes}

## 사출기 스펙
- 기종: ${advSettings.machineModel}
- 스크류경: ${advSettings.screwDiameter} mm
- 최대 형체력: ${advSettings.maxClampForce} ton
- 최대 사출압: ${advSettings.maxInjPressure} MPa
```

### B. 결정 규칙 가이드레일 (값만 넣지 말 것 — 해석 규칙도 함께 주입)
diagnosisText에 아래 가이드를 함께 박는다(checkSettings/formatDefectGuide 가이드레일과 같은 방식). 입력된 항목 관련 규칙만:
```
[금형·기계 해석 가이드 — 입력값 있을 때 적용]
- 최대 형체력 < 요구형체력(캐비티 투영면적 × 캐비티압 × 캐비티수)이면: 플래시는 성형조건으로 해결 불가 → "형체력 한계(더 큰 기계 또는 캐비티 수 축소)"를 1순위로. ★
- 최대 사출압이 낮은데 미성형이면: 압력 한계 → 고점도 수지·긴 유로 시 기계 부족 검토.
- 벽두께 L/T비 과다 + 미성형: 게이트 확대·사출압·속도를 온도보다 우선.
- 벽두께 편차(max−min) 큼: 휨(불균일 수축) 의심 가중. 두꺼운 쪽은 싱크/보이드.
- 두꺼운 벽(>4mm): 보압·보압시간·냉각시간 요구↑, 게이트씰 시간 김.
- 캐비티 多(≥4) + "특정 캐비티만" 증상: 러너 밸런스·핫러너 개별 노즐을 성형조건보다 우선(국부 미성형/싱크/플래시).
- 금형타입=핫러너: 데드스팟 체류·노즐 온도편차 → 은선/변색/흑점/특정캐비티 원인 가중.
- 게이트 작음/핀포인트: 제팅(게이트통과 속도↓)·미성형(압력손실)·은선(전단발열).
- 콜드러너: 콜드슬러그웰 검토(흑점/미성형).
- 스크류경 과소(체류↑)→은선/변색, 과대(전단↓)→계량 불안정.
```
- FIXED_FRAMEWORK 기존 지시(196 moldInfo 반영, 298 mold_analysis)와 충돌 없이 보강.

## 검증
- `npm run build` + `npm run verify`.
- 스팟체크: (a) 캐비티8 + 최대형체력 작게 + 플래시 → "형체력 한계, 조건으로 해결 불가" 나오는지 (b) 벽두께 편차 큼 + 휨 → 불균일수축 반영 (c) 핫러너 + 특정캐비티 미성형 → 러너/노즐 1순위 (d) 미입력 진단 회귀 0.
- 거버넌스: "추정/조정안" 유지, 제조사 상표 금지(수지 일반명만).

## v1.5/v2 (다음, 코드 연계)
프롬프트 가이드레일(v1) 다음 단계 = defect-kb 노드 분기 trigger에 금형·기계 조건 코드화(플래시 노드에 "형체력<요구" 분기, 미성형에 "L/T 과다", 휨에 "벽두께 편차"). 모델 판단→코드 확정 트리거. v1 데모엔 가이드레일로 충분.

## 산출물
route.ts 수정. 통과 후 commit + push.
