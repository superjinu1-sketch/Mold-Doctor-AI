# 크레딧 잔액 UI 표출

## 목적
크레딧 차감은 서버에서 정상 작동하지만(start_session RPC) UI에 잔액이 안 보여 검증 불가.
`diagnose` route가 이미 보내는 `X-Credit-Balance` 헤더(route.ts L761)를 클라가 받아서 Navbar에 배지로 표시하고, 로그인/진단 후 자동 갱신한다.

## 절대 원칙
- 기존 크레딧 로직(RPC/차감/환불) 변경 금지. **읽어서 보여주기만** 한다.
- 디자인 규율 준수: 토큰만 사용(raw hex 금지), 터치타겟 44px, 의미색 오용 금지. 배지는 "라벨/태그"라 text-label(13px) 허용.
- `diagnose-chat`은 크레딧 안 깎으므로 건드리지 마라.
- 끝나면 `npx tsc --noEmit` + `npm run build` 통과, push 금지, 변경 파일 목록 보고.

## 작업 1 — AuthContext에 크레딧 상태 추가
`contexts/AuthContext.tsx`:
- `import { supabase }` 이미 있음.
- 인터페이스 `AuthCtx`에 추가:
  ```ts
  credits: number | null;
  setCredits: (n: number | null) => void;
  refreshCredits: () => Promise<void>;
  ```
  기본값도 동일하게(`credits: null, setCredits: () => {}, refreshCredits: async () => {}`).
- Provider 안에 상태: `const [credits, setCredits] = useState<number | null>(null);`
- `refreshCredits` 정의:
  ```ts
  const refreshCredits = async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) { setCredits(null); return; }
    const { data } = await supabase
      .from('user_credits')
      .select('credit_balance')
      .eq('user_id', u.id)
      .maybeSingle();
    setCredits(data?.credit_balance ?? null);
  };
  ```
- `user`가 바뀔 때 갱신하는 effect 추가:
  ```ts
  useEffect(() => {
    if (user) { refreshCredits(); } else { setCredits(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  ```
- Provider value에 `credits, setCredits, refreshCredits` 추가.

## 작업 2 — Navbar에 크레딧 배지
`components/Navbar.tsx`:
- `const { user, loading, signInWithGoogle, signOut, credits } = useAuth();`
- **데스크탑 우측**(KO/EN 토글과 계정 버튼 사이): 로그인 상태 + `credits !== null`일 때만 렌더.
  ```tsx
  {!loading && user && credits !== null && (
    <Link
      href="/pricing"
      className="min-h-[44px] flex items-center gap-1 px-3 rounded-full bg-brand-tint text-brand-ink text-xs font-bold border border-[var(--brand-border)] hover:bg-brand-tint/70 transition-colors"
      aria-label={`${t('nav.credits')} ${credits}`}
    >
      <span>{t('nav.credits')}</span>
      <span className="tabular-nums">{credits}</span>
    </Link>
  )}
  ```
- **모바일 우측**: 아바타 버튼 왼쪽에 컴팩트 배지(로그인 + credits !== null일 때):
  ```tsx
  {!loading && user && credits !== null && (
    <Link href="/pricing" className="min-h-[44px] flex items-center px-2.5 rounded-full bg-brand-tint text-brand-ink text-xs font-bold tabular-nums shrink-0">
      {credits}
    </Link>
  )}
  ```
- **모바일 메뉴 계정 박스**(이메일 표시 영역) 안에도 한 줄 추가: `{t('nav.credits')}: {credits}` (text-muted, text-sm).

## 작업 3 — 진단 성공 후 잔액 갱신
`app/diagnose/page.tsx`:
- `useAuth()`에서 `setCredits` 가져오기(이미 useAuth 쓰고 있으면 구조분해에 추가).
- 헤더 읽는 구간(L535~537, `X-Diagnosis-Tier`/`X-Session-Id` 읽는 곳) 바로 아래에 추가:
  ```ts
  const creditHeader = res.headers.get('X-Credit-Balance');
  if (creditHeader !== null) setCredits(Number(creditHeader));
  ```
  (데모는 헤더가 없어 null → 갱신 안 함, 정상.)

## 작업 4 — i18n 키
`messages/ko.ts`에 `'nav.credits': '크레딧'`, `messages/en.ts`에 `'nav.credits': 'Credits'` 추가(기존 nav.* 키 옆에).

## 변경 파일 요약 (예상)
- 수정: `contexts/AuthContext.tsx`, `components/Navbar.tsx`, `app/diagnose/page.tsx`, `messages/ko.ts`, `messages/en.ts`
- 불변: route 파일 전부, 마이그레이션, next.config.ts

## 검증
1. `npx tsc --noEmit` + `npm run build` 통과.
2. 로그인 시 Navbar에 "크레딧 N" 배지 표시(N = user_credits.credit_balance).
3. 진단 1회 → 배지 숫자 1 감소(새로고침 없이).
4. 비로그인/데모 진단 → 배지 안 뜸, 에러 없음.
