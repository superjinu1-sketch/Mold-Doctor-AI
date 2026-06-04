# 베타-B 3단계 — 클라이언트 배선 (page.tsx + DiagnosisResultPanel) CC mandate

> 2단계(route 게이트)와 **같은 배포에 묶는다.** 둘 다 끝나고 `npm run verify` 통과 후 한 번에 push.
> 목표: 클라가 ① JWT를 Authorization 헤더로 전송 ② 비로그인/402 처리 ③ `X-Session-Id`를 받아 저장 ④ 팔로업에 session_id 전달.

대상:
1. `lib/supabase/authHeader.ts` (신규)
2. `app/diagnose/page.tsx`
3. `components/DiagnosisResultPanel.tsx`
4. `contexts/LocaleContext.tsx` (i18n 3키)

---

## 1. lib/supabase/authHeader.ts (신규)

```ts
import { supabase } from './client';

// 현재 세션의 JWT를 Authorization 헤더로. 비로그인이면 빈 객체.
export async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
```

---

## 2. app/diagnose/page.tsx

### 2-a. import 추가/수정

기존 `import { useSearchParams } from 'next/navigation';` →

```ts
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { authHeaders } from '@/lib/supabase/authHeader';
```

### 2-b. 컴포넌트 내부 훅 + state 추가 (다른 useState 근처)

```ts
  const { user, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
```

### 2-c. handleDiagnose 진입부 — 로그인 게이트 (`setIsLoading(true)` 직전)

```ts
    if (!user) {
      setError(t('auth.login_required'));
      await signInWithGoogle();
      return;
    }
```

### 2-d. fetch — auth 헤더 + 401/402 분기 + session_id 수신

기존 `/api/diagnose` fetch 블록을 아래로 교체:

```ts
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        setError(t('auth.login_required'));
        await signInWithGoogle();
        return;
      }
      if (res.status === 402) {
        setError(t('credit.insufficient'));
        router.push('/pricing');
        return;
      }
      if (!res.ok) {
        let errMsg = t('err.estimate_fail');
        try { const err = await res.json(); errMsg = err.error || errMsg; } catch { /* ignore */ }
        throw new Error(errMsg);
      }

      const diagnosisTier = (res.headers.get('X-Diagnosis-Tier') || 'simple') as 'simple' | 'complex';
      const diagnosisRound = Number(res.headers.get('X-Diagnosis-Round') || round);
      const newSessionId = res.headers.get('X-Session-Id');
      if (newSessionId) setSessionId(newSessionId);

      const data = await res.json();
      data.tier = diagnosisTier;
      data.round = diagnosisRound;
      if (newSessionId) data.session_id = newSessionId;   // 새로고침 내성: 아래 localStorage 저장에 자동 합류
      setResult(data);
```

> 기존 `history.unshift({ ...data, ... })` 저장은 그대로 — `data.session_id`가 자동으로 함께 저장됨.

### 2-e. (보류) 과거 진단 복원

현 코드엔 `diagnoseHistory`를 result로 복원하는 경로가 **없다**(setResult 2곳뿐, /history 라우트 없음). 새로고침하면 result 자체가 소실되며 이는 기존 동작·베타-B 범위 밖. **저장만 하고 복원 코드는 짜지 않는다.** 나중에 "마지막 진단 복원" 기능 만들 때 복원 지점에 `setSessionId(restored.session_id ?? null)` 한 줄 넣으면 팔로업 연속성 해결.

### 2-f. 패널에 sessionId prop 전달

`<DiagnosisResultPanel ... />`에 `sessionId={sessionId}` 한 줄 추가.

---

## 3. components/DiagnosisResultPanel.tsx

### 3-a. import 추가

```ts
import { authHeaders } from '@/lib/supabase/authHeader';
```

### 3-b. Props + 구조분해에 sessionId 추가

`interface Props`에 `sessionId?: string | null;` 추가.
`export default function DiagnosisResultPanel({ result, onSavePDF, round = 1, followUpHistory = [], onResolved, onStartFollowUp, resinType, machineSettings, sessionId }: Props) {`

### 3-c. sendChat — auth 헤더 + session_id + 402/401 분기

기존 `/api/diagnose-chat` fetch 블록을 아래로 교체:

```ts
      const res = await fetch('/api/diagnose-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({
          question: q,
          diagnosisResult: result,
          chatHistory: chatMessages,
          resinType,
          machineSettings,
          locale,
          session_id: sessionId,
        }),
      });

      if (res.status === 401) {
        setChatError(t('auth.login_required'));
        setIsChatLoading(false);
        return;
      }
      if (res.status === 402) {            // FOLLOWUP_LIMIT — 5회 소진
        setChatError(t('chat.followup_limit'));
        setIsChatLoading(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('chat.error'));
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
```

> 클라측 `MAX_CHAT_TURNS = 5` 가드는 UX용으로 유지(서버 add_follow_up이 진짜 소스).

---

## 4. contexts/LocaleContext.tsx — i18n 키 3개 (ko/en 둘 다)

```
auth.login_required   ko: '로그인 후 이용할 수 있습니다. 구글 로그인 창으로 이동합니다.'
                      en: 'Please sign in to continue. Redirecting to Google login.'
credit.insufficient   ko: '크레딧이 부족합니다. 충전 페이지로 이동합니다.'
                      en: 'Not enough credits. Redirecting to the pricing page.'
chat.followup_limit   ko: '이 추정의 추가 질문 5회를 모두 사용했어요. 새 추정을 시작해 주세요.'
                      en: 'You have used all 5 follow-up questions for this estimate. Start a new estimate.'
```
(`chat.error` 키 없으면 같이 추가하거나 기존 에러 문구 재사용.)

---

## 5. 통합 검증 (2+3단계 합쳐서, push 전)

```bash
npx tsc --noEmit
npm run verify
```

브라우저(로컬 dev 또는 프리뷰) + Supabase Table Editor:

| # | 시나리오 | 기대 |
|---|---|---|
| 1 | 비로그인 진단 제출 | 401 → 구글 로그인 유도, 차감 없음 |
| 2 | 첫 로그인 후 진단 1회 | 정상 + 잔액 4 |
| 3 | 5회 진단 후 6번째 | 402 → /pricing, ledger diagnosis 5건 |
| 4 | 한 진단상담 팔로업 5회 후 6번째 | 402 FOLLOWUP_LIMIT |
| 5 | 결과 띄운 채 새로고침 → 팔로업 | (복원 기능 없으므로) result 소실 = 정상. NO_SESSION 폴백 확인 |
| 6 | Anthropic 키 인위 오류로 throw | 500 + ledger refund 1건, 잔액 원복 |

## 6. 배포

```bash
npm run verify && git add -A && git commit -m "feat(beta-B): 크레딧 인증 게이트 — route + 클라 배선" && git push
```
⚠️ 0001(테이블·RPC)·0002(refund_session) SQL이 프로덕션 Supabase에 Run 돼 있어야 함.
