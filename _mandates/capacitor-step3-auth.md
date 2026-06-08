# Capacitor Step 3 — 로그인: 이메일/비번 + 구글 네이티브 OAuth

## 배경
원격로드 APK는 origin=WebView라 구글 OAuth가 차단됨(`disallowed_useragent`). 해결:
- **Phase A: 이메일/비밀번호 로그인** — WebView서 정상 동작, 외부설정 최소. 데모 로그인 최단경로.
- **Phase B: 구글 네이티브 OAuth** — 시스템 브라우저(Custom Tab) + 딥링크 복귀. 스토어 재사용.

기존 구글 웹 OAuth(`signInWithOAuth` redirectTo `/auth/callback`)는 **웹 브라우저용으로 그대로 유지**. 네이티브일 때만 분기.

## 절대 원칙
- 기존 크레딧/세션/AuthContext 구조 깨지 말 것. 추가만.
- 디자인 토큰만(raw hex 금지), 터치타겟 44px, 입력 필드 본문 17px.
- 거버넌스 카피 규칙 유지(의료기기성 표현 금지 등 — 로그인엔 무관하나 문구 추가 시 주의).
- 끝나면 `npx tsc --noEmit` + `npm run build` 통과, push 금지, 변경 파일 보고.

────────────────────────────────────────
## Phase A — 이메일/비밀번호 로그인
────────────────────────────────────────

### A1. AuthContext에 메서드 추가
`contexts/AuthContext.tsx` 인터페이스 + 구현:
```ts
signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
```
구현:
```ts
const signInWithEmail = async (email: string, password: string) => {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
};
const signUpWithEmail = async (email: string, password: string) => {
  const { error } = await supabase.auth.signUp({ email, password });
  return { error: error?.message ?? null };
};
```
(onAuthStateChange가 이미 user/credits 갱신하므로 성공 시 자동 반영.)

### A2. 로그인 모달 컴포넌트
새 파일 `components/AuthModal.tsx` (클라이언트):
- 이메일 + 비밀번호 입력 2칸, 로그인/회원가입 토글, 에러 표시.
- 상단 또는 하단에 "Google로 계속" 버튼(기존 signInWithGoogle/네이티브 분기는 Phase B에서 연결, 일단 기존 signInWithGoogle 연결).
- 디자인: surface 카드, 토큰 사용, 입력 17px, 버튼 min-h 48.
- 닫기(X), 배경 클릭 닫기.

### A3. Navbar에서 모달 트리거
`components/Navbar.tsx`: 기존 비로그인 "로그인" 버튼 onClick을 `signInWithGoogle` 직접호출 → `setAuthModalOpen(true)`로 변경(데스크탑/모바일 둘 다). 모달 렌더 추가.

### A4. Supabase 수동설정 (진우, 대시보드)
- Auth > Providers > **Email** 활성(기본 on).
- 데모 편의: Auth > Providers > Email > **"Confirm email" OFF**(회원가입 즉시 로그인). 안 끄면 가입 후 이메일 인증 클릭 필요.
- ※ 이 토글은 CC가 못 함. 진우가 직접.

### A5. i18n
`messages/ko.ts`·`en.ts`에 키 추가: `auth.email`, `auth.password`, `auth.login`, `auth.signup`, `auth.toggle_to_signup`, `auth.toggle_to_login`, `auth.or`, `auth.email_invalid`, `auth.fail` 등 필요한 만큼.

────────────────────────────────────────
## Phase B — 구글 네이티브 OAuth (Capacitor)
────────────────────────────────────────

### B1. 의존성
```bash
npm i @capacitor/browser@latest @capacitor/app@latest
npx cap sync android
```

### B2. 네이티브 분기 로그인
`contexts/AuthContext.tsx`의 `signInWithGoogle`을 플랫폼 분기:
```ts
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

const signInWithGoogle = async () => {
  if (Capacitor.isNativePlatform()) {
    const { data } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'com.jinsimlabs.molddoctor://login-callback',
        skipBrowserRedirect: true,
      },
    });
    if (data?.url) await Browser.open({ url: data.url });
    return;
  }
  // 웹: 기존 그대로
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
};
```

### B3. 딥링크 복귀 핸들러
AuthProvider useEffect 안에 (네이티브에서만):
```ts
import { App } from '@capacitor/app';
// ...
if (Capacitor.isNativePlatform()) {
  const sub = App.addListener('appUrlOpen', async ({ url }) => {
    if (url.includes('login-callback')) {
      const code = new URL(url).searchParams.get('code');
      if (code) await supabase.auth.exchangeCodeForSession(code);
      await Browser.close();
    }
  });
  // cleanup: sub.then(s => s.remove()) on unmount
}
```
(supabase client는 PKCE flow 기준. 만약 현재 client가 토큰 fragment 방식이면 Supabase 공식 Capacitor 가이드의 패턴을 따를 것.)

### B4. Android 딥링크 intent filter
`android/app/src/main/AndroidManifest.xml`의 MainActivity `<activity>`에 추가:
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="com.jinsimlabs.molddoctor" android:host="login-callback" />
</intent-filter>
```

### B5. Supabase 수동설정 (진우, 대시보드)
- Auth > URL Configuration > **Redirect URLs**에 추가: `com.jinsimlabs.molddoctor://login-callback`
- 구글 provider는 Supabase가 콜백을 받으므로 Google Cloud 콘솔 redirect는 보통 추가 불필요(Supabase 콜백 URL만 등록돼 있으면 됨). 동작 안 하면 그때 점검.
- ※ CC가 못 함. 진우가 직접.

## 검증
1. `npx tsc --noEmit` + `npm run build` 통과.
2. **웹**: 이메일 가입/로그인 동작, 구글 로그인 기존대로(웹 OAuth) 동작 — 회귀 0.
3. **APK**(빌드 후 진우): 이메일 로그인 → 크레딧 배지 표시·진단 가능 / 구글 버튼 → 시스템 브라우저 열림 → 로그인 후 앱 복귀·세션 잡힘.
4. 비로그인 샘플 진단 회귀 0.

## 사전 의존
- Phase B는 step2(Capacitor 셋업, android/ 폴더 존재) 완료 후. Phase A는 step2 무관하게 웹에서 바로 검증 가능.
