# /pricing 개편 — 구독 → 크레딧 모델 (CC mandate)

> 베타-B 마지막 조각. 현재 /pricing은 옛 구독제(Free 월3회 / Pro ₩29,000 월 무제한 / Enterprise)에 기능차등이 심하고, FAQ에 거버넌스 위반 문구가 있음. 크레딧 모델로 전면 교체.
> 결제는 **placeholder**(실제 PG/IAP는 다음 단계). 가입 5크레딧만 실제 작동.

대상: `app/pricing/page.tsx` 전면 개편 (+ 필요 시 `messages/ko.ts`·`en.ts`).

---

## 0. 핵심 정책 (이대로 반영)

- **가입 즉시 5크레딧 무료** (one-time). 전 기능 동일, **품질 차등 없음**.
- **1크레딧 = 1 진단상담** = 첫 진단 결과 + 그 결과에 대한 추가질문(팔로업) 5회 포함.
- **셋팅 바꿔 다시 진단 = 새 크레딧 1개.** 저장된 결과 다시 보기 = 무료.
- 추가 크레딧 구매 = **준비 중(placeholder)**. 버튼 비활성 + "곧 제공" 안내.
- 가격은 **잠정**(토큰 실측 후 확정). 표시만, 실제 과금 없음.

## 1. 삭제·금지 (거버넌스)

- **기존 Free/Pro 기능차등 문구 전부 삭제** — "상세 원인 분석은 Pro 전용", `notIncluded` 목록 등 전부. 품질은 플랜 무관 동일.
- **FAQ "API 키는 어디서 발급받나요?" 항목 통째 삭제** (Anthropic 브랜드 언급 + 사용자에게 부적절한 개발용 설명).
- 금지어 유지: "진단"→"추정", "100% 정확" 류 금지, 의료기기성 표현 금지, 특정 브랜드(수지·기계·제조사·Anthropic 등) 중립.

## 2. 디자인 (CLAUDE.md 5대 규율 준수)

- 라이트 단일 테마. **raw hex 금지** — `var(--)` 토큰·Tailwind 유틸만.
- 모바일 우선(375px 기준), 본문 17px+, 터치 타겟 44px+, `type="button"`(Link 제외).
- brand색(`--brand`)은 CTA·강조·추천 배지 전용. 심각도색 역전 금지.
- 기존 페이지의 토큰·구조(카드/배지/그리드) 최대한 재사용.

---

## 3. 페이지 구성 (위→아래)

### (1) Header — 기존 유지, 부제만 크레딧 모델로
`pricing.sub` 문구를 "필요한 만큼만. 가입하면 5크레딧 무료." 류로(ko/en). 기존 t키 유지하되 messages 값만 갱신.

### (2) 가입 무료 강조 카드 (신규, 풀폭)
`bg-brand-tint` + `border-[var(--brand-border)]` 카드 1개:
- 제목: "가입 즉시 5크레딧 무료" / "5 free credits on sign-up"
- 본문: "전 기능 그대로. 품질 차등 없이 바로 써보세요." / "All features, no quality tiers. Start right away."
- 버튼(Link `/diagnose`): "무료로 시작" / "Get started free"

### (3) "크레딧이 뭐예요?" 설명 (신규, 짧게)
3개 포인트(아이콘 or 번호):
- 1크레딧 = 진단 1건 + 그 건 추가질문 5회 / 1 credit = 1 diagnosis + 5 follow-up questions
- 셋팅 바꿔 다시 진단하면 새 크레딧 1개 / Re-diagnosing with new settings uses 1 new credit
- 저장된 결과 다시 보기는 무료 / Re-viewing saved results is free

### (4) 크레딧 팩 그리드 (구매는 placeholder)
`grid sm:grid-cols-2 lg:grid-cols-4 gap-4`. 데이터:

```ts
const creditPacks = [
  { nameKo: '스타터', nameEn: 'Starter', credits: 5,   priceKo: '₩5,500',  priceEn: '₩5,500',  perKo: '크레딧당 ₩1,100', perEn: '₩1,100 / credit', recommended: false },
  { nameKo: '베이직', nameEn: 'Basic',   credits: 10,  priceKo: '₩9,900',  priceEn: '₩9,900',  perKo: '크레딧당 ₩990',   perEn: '₩990 / credit',   recommended: true  },
  { nameKo: '프로',   nameEn: 'Pro',     credits: 30,  priceKo: '₩24,900', priceEn: '₩24,900', perKo: '크레딧당 ₩830',   perEn: '₩830 / credit',   recommended: false },
  { nameKo: '벌크',   nameEn: 'Bulk',    credits: 100, priceKo: '₩69,000', priceEn: '₩69,000', perKo: '크레딧당 ₩690',   perEn: '₩690 / credit',   recommended: false },
];
```
- 카드: 팩 이름, 크레딧 수(크게), 가격, 크레딧당 단가(faint), 추천 배지(베이직).
- 버튼: **비활성** `<button type="button" disabled>` — "구매 준비 중" / "Coming soon". `disabled:opacity-60 cursor-not-allowed`, 토큰 색 사용.
- 그리드 아래 작은 안내(faint): "추가 크레딧 구매는 곧 제공됩니다. 지금은 가입 5크레딧으로 체험하세요." / "Credit purchases are coming soon. For now, try it with your 5 free sign-up credits."

### (5) Enterprise 카드 (유지·정리)
문의 카드 1개:
- 팀 계정 / 자사 수지 DB 등록 / API 연동 / 전담 기술 지원
- ("커스텀 AI 파인튜닝", "SLA" 같은 과장 표현은 정리하되 유지 가능)
- 버튼: "문의하기" / "Contact" — `mailto:` 기존 주소 유지(단 도메인 확인). brand-ink color 등 토큰.

### (6) FAQ (개편)
**삭제:** API 키 FAQ.
**추가 2개 + 기존 3개 유지:**

신규:
- Q "크레딧은 어떻게 쓰나요?" / "How do credits work?"
  A "크레딧 1개로 진단 1건을 받고, 그 결과에 대한 추가 질문을 5번까지 무료로 할 수 있어요. 셋팅을 바꿔 다시 진단하면 새 크레딧 1개가 쓰이고, 저장된 결과를 다시 보는 건 무료입니다." / 영문 대응.
- Q "가입하면 뭘 받나요?" / "What do I get on sign-up?"
  A "가입 즉시 5크레딧을 무료로 드려요. 모든 기능을 동일한 품질로 쓸 수 있고, 플랜별 기능 차등은 없습니다." / 영문 대응.

유지(기존 그대로): 수지 지원 / 정확도(추정 도구) / 모바일 / 자사 수지 DB(Enterprise).

### (7) CTA — 기존 유지
"무료로 시작" → `/diagnose`. 문구 크레딧 모델에 맞게 미세 조정.

---

## 4. 검증
```bash
npx tsc --noEmit
npm run verify
```
- /pricing 렌더: 가입 5크레딧 카드 / 크레딧 팩 4종(베이직 추천) / 구매버튼 비활성("준비 중") / Enterprise 문의 / FAQ에 API키 항목 없음.
- 한/영 토글 정상. 모바일 375px에서 카드 1열로 깨짐 없음.
- 금지어 린트(`.claude/scripts/lint-banned.sh`)에 "Anthropic" 등 안 걸리는지.

통과하면 commit + push.

> 참고: 가격(₩5,500/9,900/24,900/69,000)·단가는 잠정. 토큰 실측 후 확정 예정이라 placeholder. 결제 연동은 다음 단계.
