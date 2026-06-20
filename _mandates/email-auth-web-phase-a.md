# Mandate: 이메일/비번 로그인 — 웹 추가 (Phase A)

> 단방향 Cowork→CC. 작성 2026-06-16. 진우 지시.
> 출처/재활용: `_mandates/capacitor-step3-auth.md` Phase A. 이번엔 **웹 단독**으로 선행 구현(네이티브 Phase B는 별개, 건드리지 않음).
> 구조 사실: 네이티브 앱은 `server.url`로 이 웹앱을 원격로드(capacitor-step2) → **웹에 구현하면 추후 스토어 앱에 그대로 반영.** 손해 0.

## 절대 원칙
- 기존 크레딧/세션/AuthContext 구조 깨지 말 것. **추가만.**
- 디자인 5대 규율: 토큰만(raw hex 금지), 입력 필드 본문 17px, 터치타겟 44px(CTA 48px), 모바일 우선.
- 기존 구글 웹 OAuth(`signInWithOAuth` → `/auth/callback`)는 **그대로 유지.** 이메일 경로를 병행 추가.
- 끝나면 `npx tsc --noEmit` + `npm run build` 통과, push 금지, 변경 파일 보고.

## 핵심 사실 (반드시 인지)
크레딧은 **가입 트리거가 아니라 `start_session` RPC가 첫 진단 때 lazy 지급**한다(`supabase/migrations/0001_beta_b_credits.sql` 64–72행: `insert ... on conflict do nothing` + signup_bonus 5). 즉 **`auth.users` 가입 트리거는 repo에 없고, 이메일 가입에 트리거가 필요 없다.** 이메일 가입자도 첫 진단 시 자동으로 5크레딧 받는다. (구글 유저와 동일 경로)

---

## 작업 0 — 먼저 진짜 가입 경로 점검 (가정 금지)
직전 세션에서 Admin API `createUser`가 500 났으나, 그건 일반 가입 경로가 아니다. **일반 `supabase.auth.signUp()`(anon 키, 실유저와 동일 경로)이 실제로 되는지 먼저 확인.**
- A1~A5 구현 후, 로컬 dev에서 새 이메일로 회원가입 1회 실제 시도.
- **성공** → 트리거 이슈는 Admin 경로 한정이었음. 추가 조치 불필요. 작업 1로.
- **여기서도 500 "Database error creating new user"** → 대시보드에 수동 추가된 `on_auth_user_created`/`handle_new_user` 류 트리거가 있고 깨진 것. 크레딧은 lazy라 **그 트리거는 불필요(redundant)** → 진우에게 보고하고 "DROP 또는 수정" 결정 요청. (CC가 임의로 대시보드 트리거 건드리지 말 것. SQL 제안만.)
- 어느 쪽이든 **결과를 보고**에 명시.

---

## 작업 1 — AuthContext에 이메일 메서드 추가
`contexts/AuthContext.tsx` 인터페이스 + 구현 (기존 구조 유지, 추가만):
```ts
signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null; needsConfirm: boolean }>;
```
구현:
```ts
const signInWithEmail = async (email: string, password: string) => {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
};
const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  // Confirm email ON이면 session=null(인증 메일 대기), OFF면 즉시 session 존재.
  return { error: error?.message ?? null, needsConfirm: !error && !data.session };
};
```
- `AuthContext` value에 두 메서드 노출. onAuthStateChange가 이미 user/credits 갱신하므로 성공 시 자동 반영.
- 기존 `signInWithGoogle`/`signOut`/credits 로직 **변경 금지.**

## 작업 2 — 로그인 모달 `components/AuthModal.tsx` (신규, 클라이언트)
- 이메일 + 비밀번호 입력 2칸, **로그인 ↔ 회원가입 토글**, 인라인 에러 표시.
- 하단(또는 상단) "Google로 계속" 버튼 = 기존 `signInWithGoogle` 연결(분기 없음, 웹 그대로).
- **Confirm email 토글 무관하게 동작하도록**: `signUpWithEmail` 결과가
  - `needsConfirm:true` → 모달에 "인증 메일을 보냈습니다. 메일의 링크를 클릭해 가입을 완료하세요." (warn 아님, 안내 톤) 표시, 폼 유지.
  - `needsConfirm:false` → 즉시 로그인됨 → 모달 닫기.
- 에러: `error` 있으면 입력 아래 인라인(이메일 형식/중복/비번 약함 등 Supabase 메시지 매핑은 i18n 폴백).
- 디자인: `surface` 카드, 토큰만, 입력 17px, 버튼 `min-h-[var(--touch-cta)]`(48). 닫기(X) + 배경 클릭 닫기. `type="button"` 필수.
- 접근성: 라벨 연결, 비번 필드 `type="password"`, 모바일 375px 단일 컬럼.

## 작업 3 — Navbar에서 모달 트리거
`components/Navbar.tsx`: 비로그인 상태의 "Google로 로그인"/"무료 추정" 진입 버튼이 현재 `signInWithGoogle` 직접 호출 → **`setAuthModalOpen(true)`로 변경**(데스크탑·모바일 둘 다). 모달 렌더 추가.
- 기존에 `signInWithGoogle`을 직접 부르던 다른 진입점(예: `app/diagnose/page.tsx`의 401 처리)도 모달을 띄우도록 통일할지 검토 → 최소 변경 원칙상 우선 Navbar만, 진단 페이지 진입점은 기존 유지하되 보고에 언급.

## 작업 4 — i18n
`messages/ko.ts`·`en.ts`에 키 추가(기존 `auth.*` 네임스페이스):
`auth.email`, `auth.password`, `auth.login`, `auth.signup`, `auth.toggle_to_signup`, `auth.toggle_to_login`, `auth.or`(구글과 구분선), `auth.email_invalid`, `auth.fail`, `auth.confirm_sent`(인증 메일 안내), `auth.weak_password` 등 필요한 만큼. 본문 17px 적용 대상.

## 작업 5 — Supabase 수동설정 (진우, 대시보드 — CC 불가)
- Auth > Providers > **Email 활성**(기본 on).
- **Confirm email 정책 결정 (진우)**:
  - **ON(권장, 프로덕션)**: 가짜 이메일로 5크레딧 파밍 차단. 단 가입 후 메일 인증 클릭 필요(모달이 안내 처리함).
  - **OFF(마찰 최소)**: 가입 즉시 로그인. 대신 가짜 이메일 가입·크레딧 남용 위험.
  - 크레딧이 가입 즉시가 아니라 첫 진단 때 지급되므로 남용 영향은 "계정당 5크레딧". 그래도 봇 파밍 막으려면 ON 권장.
- 작업 0에서 깨진 트리거 발견 시: 진우가 대시보드에서 해당 트리거 처리(DROP 등) 후 재검증.

## 검증 (DoD)
- [ ] `npx tsc --noEmit` + `npm run build` 통과.
- [ ] **웹**: 새 이메일 회원가입 → (Confirm OFF면) 즉시 로그인 / (ON이면) 인증 메일 안내 표시 후 인증→로그인.
- [ ] 이메일 로그인 → 크레딧 배지 정상(첫 진단 시 5크레딧 lazy 지급 확인).
- [ ] 기존 **구글 로그인 회귀 0**(웹 OAuth 그대로), 비로그인 샘플 진단 회귀 0.
- [ ] 작업 0 결과(일반 signUp 성공 여부 / 트리거 이슈 유무) 보고.
- [ ] 변경·신규 파일 목록 보고. push 금지(진우 결정).

## 범위 밖 (이번 mandate 아님)
- 네이티브 구글 OAuth(Phase B), Capacitor 의존성, AndroidManifest, 딥링크 — capacitor-step3 Phase B로 분리 유지.
- 비밀번호 재설정(reset password) — 필요 시 후속. 이번엔 가입/로그인까지.
