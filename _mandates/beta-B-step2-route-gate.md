# 베타-B 2단계 — route.ts 인증 + 크레딧 게이트 (CC mandate)

> ⚠️ 이 단계만 적용하고 **git push 금지**. 3단계(클라 배선)까지 끝낸 뒤 한 번에 push.
> (이 단계만 배포하면 클라가 아직 JWT를 안 보내서 프로덕션 전 진단이 401.)

대상 3개:
1. `supabase/migrations/0002_refund_session.sql` (신규) — 생성 후 진우가 Supabase SQL Editor에서 Run
2. `app/api/diagnose/route.ts`
3. `app/api/diagnose-chat/route.ts`

---

## 1. supabase/migrations/0002_refund_session.sql (신규)

```sql
-- 베타-B 보강: 진단 API 실패 시 차감된 크레딧 환불(멱등).
-- start_session으로 1 차감했으나 결과를 못 준 경우 호출.
create or replace function refund_session(p_session_id uuid, p_user_id uuid)
returns json
language plpgsql
as $$
declare
  v_balance int;
begin
  if not exists (
    select 1 from diagnosis_sessions where id = p_session_id and user_id = p_user_id
  ) then
    return json_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;

  -- 이미 환불된 세션이면 중복 금지(멱등)
  if exists (
    select 1 from credit_ledger where session_id = p_session_id and kind = 'refund'
  ) then
    return json_build_object('ok', false, 'code', 'ALREADY_REFUNDED');
  end if;

  update user_credits
    set credit_balance = credit_balance + 1, updated_at = now()
    where user_id = p_user_id
    returning credit_balance into v_balance;

  insert into credit_ledger(user_id, delta, kind, session_id, balance_after, note)
    values (p_user_id, 1, 'refund', p_session_id, v_balance, 'diagnosis api failure refund');

  return json_build_object('ok', true, 'credit_balance', v_balance);
end;
$$;
```

---

## 2. app/api/diagnose/route.ts

### 2-a. import 추가 (상단 import 블록)

```ts
import { supabaseAdmin } from '@/lib/supabase/server';
```

### 2-b. POST 진입부 — refundCtx 선언 + 인증/크레딧 게이트

`export async function POST(request: NextRequest) {` 직후에 `refundCtx`를 `try` 밖에 선언하고, `const mock = tryMock(body); if (mock) return mock;` **아래에** 게이트 삽입:

```ts
export async function POST(request: NextRequest) {
  // 진단 throw 시 환불에 쓸 컨텍스트 (start_session 성공 후 채워짐)
  let refundCtx: { sessionId: string; userId: string } | null = null;
  try {
    const body = await request.json();
    const mock = tryMock(body); if (mock) return mock;

    // ── 베타-B 인증 + 크레딧 게이트 ──────────────────────────
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 });
    }
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 });
    }
    const userId = userData.user.id;

    // 진단 본 호출 전 크레딧 원자 차감(신규는 lazy 5크레딧 grant 후 1 차감)
    const { data: sessRaw, error: sessErr } = await supabaseAdmin.rpc('start_session', { p_user_id: userId });
    if (sessErr) {
      return NextResponse.json({ error: '크레딧 처리 중 오류가 발생했습니다.', code: 'CREDIT_ERROR' }, { status: 500 });
    }
    const sess = sessRaw as { ok: boolean; code?: string; session_id?: string; credit_balance?: number };
    if (!sess?.ok) {
      return NextResponse.json(
        { error: '크레딧이 부족합니다.', code: 'INSUFFICIENT', credit_balance: sess?.credit_balance ?? 0 },
        { status: 402 }
      );
    }
    const sessionId = sess.session_id as string;
    const creditBalance = sess.credit_balance as number;
    refundCtx = { sessionId, userId };
    // ──────────────────────────────────────────────────────
```

> 위치 주의: 이미지 downscale·Anthropic 호출보다 **앞**이라 0크레딧 유저는 비싼 호출 전에 막힘.

### 2-c. env 미설정 401 → 500 (인증 401과 충돌 제거)

`if (!apiKey) { ... status: 401 }`을 `status: 500`으로 변경.

### 2-d. 파싱 폴백 플래그 — 부분성공(구조화 실패) 감지

`let result;` 아래에 `let parseFallback = false;` 추가, 3차 폴백(가장 안쪽 catch) 시작에 `parseFallback = true;` 추가:

```ts
    let result;
    let parseFallback = false;       // 3차 폴백(구조화 실패) = 부분성공 → 환불 대상
    try {
      const sanitized = sanitizeJsonNewlines(rawText);
      result = JSON.parse(sanitized);
    } catch {
      try {
        const match = rawText.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('No JSON');
        result = JSON.parse(sanitizeJsonNewlines(match[0]));
      } catch {
        parseFallback = true;        // ← 추가
        // 3차: 핵심 필드만 regex로 추출, raw_response fallback (기존 블록 그대로 유지)
      }
    }
```

### 2-e. 성공 응답 — 부분성공 환불 + 세션 헤더

`return NextResponse.json(result, {...})` 직전에 환불 처리, 헤더에 잔액 반영:

```ts
    // 부분성공(파싱 폴백)이면 크레딧 환불(멱등). throw 아니라 200 경로라 여기서 처리.
    let finalBalance = creditBalance;
    if (parseFallback && refundCtx) {
      try {
        const { data: rfRaw } = await supabaseAdmin.rpc('refund_session', {
          p_session_id: refundCtx.sessionId,
          p_user_id: refundCtx.userId,
        });
        const rf = rfRaw as { ok?: boolean; credit_balance?: number };
        finalBalance = rf?.ok && typeof rf.credit_balance === 'number' ? rf.credit_balance : creditBalance + 1;
      } catch {
        finalBalance = creditBalance + 1;
      }
    }

    // 성공 = 헤더로 세션·잔액 전달. 실패(401·402·500)는 body의 code로 분기(헤더 안 씀).
    return NextResponse.json(result, {
      headers: {
        'X-Diagnosis-Tier': tier,
        'X-Diagnosis-Round': String(round),
        'X-Session-Id': sessionId,
        'X-Credit-Balance': String(finalBalance),
      },
    });
```

### 2-f. catch — 진단 throw 시 크레딧 환불

```ts
  } catch (error) {
    console.error('Diagnose API error:', error);
    if (refundCtx) {
      try {
        await supabaseAdmin.rpc('refund_session', {
          p_session_id: refundCtx.sessionId,
          p_user_id: refundCtx.userId,
        });
      } catch { /* 환불 실패는 무시(로그만) */ }
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '진단 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
```

> 멱등 RPC라 (2-e 부분성공 환불)과 (2-f throw 환불)이 같은 세션에 겹쳐도 이중 환불 안 됨.

---

## 3. app/api/diagnose-chat/route.ts

### 3-a. import 추가

```ts
import { supabaseAdmin } from '@/lib/supabase/server';
```

### 3-b. 인증 + 팔로업 5회 한도 게이트

`if (!question?.trim()) {...}` 아래에 삽입(`session_id`는 body에서):

```ts
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 });
    }
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 });
    }
    const userId = userData.user.id;

    const sessionId = body.session_id as string | undefined;
    if (!sessionId) {
      return NextResponse.json({ error: '세션 정보가 없습니다. 새 추정을 시작해주세요.', code: 'NO_SESSION' }, { status: 400 });
    }
    const { data: fuRaw, error: fuErr } = await supabaseAdmin.rpc('add_follow_up', {
      p_session_id: sessionId,
      p_user_id: userId,
    });
    if (fuErr) {
      return NextResponse.json({ error: '팔로업 처리 중 오류가 발생했습니다.', code: 'FOLLOWUP_ERROR' }, { status: 500 });
    }
    const fu = fuRaw as { ok: boolean; code?: string; follow_up_count?: number };
    if (!fu?.ok) {
      if (fu?.code === 'FOLLOWUP_LIMIT') {
        return NextResponse.json({ error: '이 추정의 추가 질문 5회를 모두 사용했습니다. 새 추정을 시작해 주세요.', code: 'FOLLOWUP_LIMIT' }, { status: 402 });
      }
      return NextResponse.json({ error: '세션을 찾을 수 없습니다.', code: 'NOT_FOUND' }, { status: 403 });
    }
```

### 3-c. env 미설정 401 → 500

`if (!apiKey) { ... status: 401 }`을 `status: 500`으로 변경.

---

## 4. CC 자체 검증

```bash
npx tsc --noEmit
```
- 토큰 없이 호출 → 401 확인:
  ```bash
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/diagnose -H "Content-Type: application/json" -d '{"defectType":"Flash"}'
  ```
- ⚠️ 전체 플로우 검증은 3단계 후 브라우저로. 지금은 **push 금지**.

---

## 알려진 트레이드오프 (의도된 것)

- 진단 throw(Anthropic 에러·타임아웃) → `refund_session` 자동 환불(멱등). **파싱 3차 폴백(raw_response, 구조화 실패)도 환불** — 부분성공은 쓸만한 결과 아님(진우 확정). 1·2차 파싱 성공만 차감 유지.
- 팔로업 챗은 `add_follow_up`을 호출 "전"에 카운트 → 챗 API가 죽으면 5회 중 1회 소모됨. 무료·저가치라 환불 미구현(허용).
