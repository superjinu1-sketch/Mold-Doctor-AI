import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/server';
import { reportError } from '@/lib/observability/server';

// SKU → 크레딧 매핑 (서버 단일 관리 — 웹훅 payload가 보낸 금액·수량은 신뢰하지 않음)
const PRODUCT_CREDITS: Record<string, number> = {
  credits_starter_5: 5,
  credits_standard_20: 20,
  credits_pro_50: 50,
  credits_bulk_100: 100,
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 길이·내용에 따른 타이밍 차이를 없애기 위해 두 값을 고정 길이 해시로 비교(HMAC 아님 — §확정사실 6).
function timingSafeMatch(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

// RevenueCat 웹훅은 sandbox/production 공용(Both) — RC_ALLOW_SANDBOX=1이 아니면 SANDBOX 이벤트를 prod DB에 적립하지 않는다.
function isSandboxBlocked(event: Record<string, unknown>): boolean {
  return event.environment === 'SANDBOX' && process.env.RC_ALLOW_SANDBOX !== '1';
}

export async function POST(request: NextRequest) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhooks/revenuecat] REVENUECAT_WEBHOOK_SECRET 미설정');
    return NextResponse.json({ error: 'not configured' }, { status: 503 });
  }

  const auth = request.headers.get('authorization') || '';
  if (!timingSafeMatch(auth, secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const event = body?.event ?? {};

    // 환불/취소 — 원 구매 크레딧 전액 차감(음수 잔액 허용, 정책 확정 대기 중 기본값).
    if (event.type === 'CANCELLATION') {
      if (isSandboxBlocked(event)) {
        console.warn('[webhooks/revenuecat] SANDBOX CANCELLATION 무시(RC_ALLOW_SANDBOX 미설정)');
        return NextResponse.json({ ok: true, ignored: true, code: 'SANDBOX_IGNORED' });
      }

      const txnId = event.transaction_id as string | undefined;
      if (!txnId) {
        reportError('webhooks/revenuecat', new Error('CANCELLATION missing transaction_id'));
        return NextResponse.json({ ok: true, ignored: true, code: 'MISSING_FIELDS' });
      }

      const { data, error } = await supabaseAdmin.rpc('revoke_purchase_credits', { p_txn_id: txnId });

      if (error) {
        reportError('webhooks/revenuecat', error);
        return NextResponse.json({ error: 'db error' }, { status: 500 }); // RevenueCat 재시도 유도
      }
      if (data?.code === 'NOT_FOUND') {
        reportError('webhooks/revenuecat', new Error(`revoke NOT_FOUND txn_id=${txnId}`));
      }
      return NextResponse.json({ ok: true, ...data });
    }

    // NON_RENEWING_PURCHASE(크레딧팩 = 소모성 단건 구매)만 처리. 그 외 타입은 재시도 방지 위해 200으로 무시.
    if (event.type !== 'NON_RENEWING_PURCHASE') {
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (isSandboxBlocked(event)) {
      console.warn('[webhooks/revenuecat] SANDBOX 구매 무시(RC_ALLOW_SANDBOX 미설정)');
      return NextResponse.json({ ok: true, ignored: true, code: 'SANDBOX_IGNORED' });
    }

    const productId = event.product_id as string | undefined;
    const credits = productId ? PRODUCT_CREDITS[productId] : undefined;
    if (!credits) {
      reportError('webhooks/revenuecat', new Error(`unknown product_id: ${productId}`));
      return NextResponse.json({ ok: true, ignored: true, code: 'UNKNOWN_PRODUCT' });
    }

    const userId = event.app_user_id as string | undefined;
    const txnId = event.transaction_id as string | undefined;
    if (!userId || !txnId) {
      reportError('webhooks/revenuecat', new Error(`missing app_user_id/transaction_id (product_id=${productId})`));
      return NextResponse.json({ ok: true, ignored: true, code: 'MISSING_FIELDS' });
    }

    // RevenueCat 익명 ID($RCAnonymousID:...) 등 비 UUID 유입 시 RPC(p_user_id uuid) 실패 → 500 무한 재시도 방지.
    if (!UUID_RE.test(userId)) {
      reportError('webhooks/revenuecat', new Error(`non-uuid app_user_id (product_id=${productId})`));
      return NextResponse.json({ ok: true, ignored: true, code: 'NON_UUID_USER' });
    }

    const { data, error } = await supabaseAdmin.rpc('grant_purchase_credits', {
      p_user_id: userId,
      p_credits: credits,
      p_txn_id: txnId,
      p_product_id: productId,
    });

    if (error) {
      reportError('webhooks/revenuecat', error);
      return NextResponse.json({ error: 'db error' }, { status: 500 }); // RevenueCat 재시도 유도
    }

    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    reportError('webhooks/revenuecat', error);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
