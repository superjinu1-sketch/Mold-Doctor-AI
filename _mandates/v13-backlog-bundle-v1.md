# Mandate: v13-backlog-bundle-v1 — v1.3 잔버그 묶음 4건

> 목적: v1.3 스토어 릴리스 트레인에 실을 잔버그를 한 번에 정리한다.
> **릴리스는 하지 않는다.** 구현·커밋까지만. 스토어 제출은 진우 판단 (릴리스 케이던스 = 묶음).
> 4건은 서로 독립적이다. 하나가 막히면 나머지를 진행하고 막힌 건을 보고하라.

---

## A. PWA 아이콘 404 (확정 버그, 우선순위 최상)

**실측**: `public/`에 png 파일이 **하나도 없다.** `public/manifest.json`이 `/icon-192.png`와 `/icon-512.png`를 가리키는데 둘 다 404다.

**영향**: PWA 홈화면 추가 시 아이콘 깨짐. Android/iOS 앱은 네이티브 아이콘을 쓰므로 무관하지만, **웹 사용자 전원에게 노출**된다.

**작업**
1. 앱 아이콘 원본을 찾는다 — `android/app/src/main/res/mipmap-*` 또는 `resources/` (Capacitor assets 산출물)에 있을 것
2. 원본에서 192×192, 512×512 png를 생성해 `public/icon-192.png`, `public/icon-512.png`로 배치
3. `manifest.json`의 512 항목에 `"purpose": "any maskable"` 추가 검토 (Android 적응형 아이콘)
4. 원본을 못 찾으면 **임의 생성하지 말고 보고하라.** 브랜드 아이콘을 코드로 그려내면 스토어 아이콘과 불일치한다

**검증**: `out/icon-192.png` 존재 + 빌드 후 `/manifest.json`의 두 경로가 200

---

## B. `/en` 페이지의 트위터·OG 메타가 한국어

**실측**: `app/layout.tsx`의 `metadata.twitter`가 한국어 고정이고 `openGraph.locale`이 `ko_KR`이다. 이게 **글로벌 기본값**이라 `/en/*` 페이지에도 그대로 상속된다.

**작업**
- `/en/*` 페이지들(`app/en/guide/*`, `app/en/resins/*`, 있다면 `app/en/*` 전부)의 `generateMetadata`에 `twitter`와 `openGraph.locale: 'en_US'` override를 추가
- 이미 canonical·hreflang은 신규 도메인으로 정합한 상태다([[site-domain-migration-v1]] 완료). **거기는 건드리지 마라.**
- 루트 기본값은 한국어 유지 (주 시장이 한국)

**검증**: 빌드 산출물 `out/en/guide/index.html`에서 `og:locale`이 `en_US`, `twitter:title`이 영문인지 grep

---

## C. Footer/Navbar 로케일 분기 + `/tools` i18n화

**실측 보강(2026-07-28 조사)**: en 라우트가 실재하는 페이지는 `/en/guide`·`/en/guide/[slug]`·`/en/resins`·`/en/resins/[slug]` 4개뿐이다.
그 외 `/ledger`·`/tryout`·`/pricing`·`/privacy`·`/terms`는 en 라우트가 없지만 **이미 `LocaleContext`로 완전히 i18n화되어 있다**(같은 URL이 로케일에 따라 언어 전환, 콘텐츠 재작성 불필요). `/tools`만 유일하게 `useLocale`/`t()` 호출이 0건인 **한국어 완전 하드코딩** 페이지다. Navbar(69·233행)도 `/tools`를 하드코딩 링크하는데, 라벨(`nt('nav.tools')`)은 번역되면서 목적지 본문은 한국어로 남아 불일치가 노출된다(nav="Free Tools" → 본문 한국어).

**작업 — 두 갈래로 분리**

**C-1. Footer·Navbar에서 `/guide`·`/resins` href만 로케일 분기**
- `Footer.tsx` 21행(`/guide`), 20행(`/resins`) — 기존 `pathname?.startsWith('/en')` 패턴을 href에도 적용
- `Navbar.tsx`의 `/tools` 링크(69·233행)는 **C-2 대상이라 여기선 제외**
- `/ledger`·`/tryout`·`/privacy`·`/terms`는 en 라우트가 없고 이미 `LocaleContext`로 정상 동작하므로 **손대지 마라**

**C-2. `/tools` i18n화**
- 한국어 하드코딩(`metadata`, `TOOLS` 배열의 title/desc, h1, 부제)을 `messages/ko.ts`·`en.ts` 키로 이관
- `/ledger`·`/tryout`·`/pricing`과 동일한 `LocaleContext` 방식 — 같은 URL에서 로케일에 따라 언어만 전환
- **`/en/tools` 라우트를 신설하지 마라.** canonical·hreflang 정합이 복잡해진다
- `metadata`는 서버 컴포넌트라 `t()`를 쓸 수 없다 — 이 제약을 어떻게 처리했는지 보고에 명시할 것(한국어 유지도 선택지)

**하지 않을 것**
- `/ledger` `/tryout` `/pricing` `/privacy` `/terms`는 이미 `LocaleContext`로 영어가 나온다. 깨지지 않으므로 손대지 마라
- `/en/*` 얇은 래퍼 신설 금지
- `/guide` `/resins`의 기존 정적 이중 라우트 구조 변경 금지
- 로케일은 기존 `LocaleContext`를 쓴다. **새 상태를 만들지 마라**

**검증**: en 로케일에서 Footer의 `/guide`·`/resins` 링크 → `/en/guide`·`/en/resins`로 이동. `/tools`는 en 로케일에서 영문 렌더(같은 URL). 나머지 Footer 링크(`/ledger`·`/tryout`·`/privacy`·`/terms`) 무회귀.

---

## D. 샘플 데모 판정이 사진을 무시한다 (무료 진단 누수)

**실측**: `app/diagnose/page.tsx:907`
```ts
const isDemo = demoSnapshot !== null && currentSnapshot === demoSnapshot;
```
`currentSnapshot`이 **셋팅값만** 비교한다. 그래서 사용자가 샘플을 불러온 뒤 **자기 불량 사진만 올려서 진단하면 여전히 `isDemo === true`** 로 판정되고, `app/api/diagnose/route.ts:455`에서 크레딧을 차감하지 않는다.

**이게 왜 문제인가**: 사진이 다르면 그건 실제 진단이다. API 원가($0.15/건)가 나가는데 크레딧이 차감되지 않는다. 셋팅을 그대로 두고 사진만 바꾸는 건 어려운 우회가 아니다.

**작업**
1. `currentSnapshot` 계산에 **업로드된 이미지의 식별자를 포함**시킨다
   - 원본 바이너리 해시는 비용이 크다. 파일명+크기+lastModified 조합, 또는 이미 있는 내부 키로 충분하다
   - 샘플 데모가 기본 제공하는 고정 이미지가 있다면 그 식별자를 기준값으로 삼는다
2. **서버에서도 방어한다.** 클라이언트가 `isDemo: true`를 보내는 구조는 그대로 신뢰하면 안 된다. `app/api/diagnose/route.ts`에서 데모 판정 시 요청 페이로드가 알려진 샘플 셋과 일치하는지 최소 검증을 추가
3. 진우 방침: **샘플 진단은 크레딧을 차감하지 않는다.** 이 원칙은 유지한다. 고치는 건 "샘플이 아닌데 샘플로 통과되는 경로"뿐이다

**검증**
- 샘플 그대로 진단 → 크레딧 차감 **없음** (기존 동작 유지)
- 샘플 로드 후 사진만 교체 → 크레딧 차감 **있음** (수정 대상)
- 샘플 로드 후 셋팅만 변경 → 크레딧 차감 **있음** (기존 동작 유지)

---

## 완료 기준 (DoD)

- [ ] A~D 각 건의 검증 항목 실측 첨부
- [ ] `npm run build` + `build:cap` 통과
- [ ] 기존 진단 플로우 회귀 없음 (웹 1회 실진단)
- [ ] 디자인 5대 규율 위반 0건 (raw hex·bg-white 신규 도입 없음)
- [ ] 민감정보 스윕 클린
- [ ] **커밋만. 스토어 릴리스·버전 번호 증가는 하지 마라**

## 보고 형식

- 건별 변경 파일·행 + 검증 실측
- D는 3가지 시나리오 결과를 표로
- A에서 아이콘 원본을 못 찾았으면 그 사실을 명시하고 중단
- 미완 항목은 미완으로 명시
