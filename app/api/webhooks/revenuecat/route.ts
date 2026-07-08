import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { reportError } from '@/lib/observability/server';

// SKU → 크레딧 매핑 (서버 단일 관리 — 웹훅 payload가 보낸 금액·수량은 신뢰하지 않음)
const PRODUCT_CREDITS: Record<string, number> = {
  credits_starter_5: 5,
  credits_standard_20: 20,
  credits_pro_50: 50,
  credits_bulk_100: 100,
};

export async function POST(request: NextRequest) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhooks/revenuecat] REVENUECAT_WEBHOOK_SECRET 미설정');
    return NextResponse.json({ error: 'not configured' }, { status: 503 });
  }

  const auth = request.headers.get('authorization') || '';
  if (auth !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const event = body?.event ?? {};

    // NON_RENEWING_PURCHASE(크레딧팩 = 소모성 단건 구매)만 처리. 그 외 타입은 재시도 방지 위해 200으로 무시.
    if (event.type !== 'NON_RENEWING_PURCHASE') {
      return NextResponse.json({ ok: true, ignored: true });
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
