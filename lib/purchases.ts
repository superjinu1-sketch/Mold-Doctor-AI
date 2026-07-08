'use client';

import { Purchases, PRODUCT_CATEGORY, PURCHASES_ERROR_CODE } from '@revenuecat/purchases-capacitor';
import type { PurchasesError } from '@revenuecat/purchases-capacitor';
import { isNativeApp } from './platform';

const apiKey = process.env.NEXT_PUBLIC_RC_ANDROID_KEY;

let configuredUserId: string | null = null;

// 로그인 확정 후 1회 호출(유저 변경 시 재-configure). 웹이거나 키 없으면 no-op.
export async function configurePurchases(userId: string) {
  if (!isNativeApp() || !apiKey) return;
  if (configuredUserId === userId) return;
  await Purchases.configure({ apiKey, appUserID: userId });
  configuredUserId = userId;
}

export async function logOutPurchases() {
  if (!isNativeApp() || !apiKey || !configuredUserId) return;
  configuredUserId = null;
  try {
    await Purchases.logOut();
  } catch { /* 실패 무시 */ }
}

export function isPurchaseCancelled(error: unknown): boolean {
  return (error as Partial<PurchasesError> | undefined)?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
}

// SKU 조회 후 구매. 크레딧 수·가격은 서버(웹훅)가 상수로 재확인 — 여기 반환값은 신뢰하지 않음.
export async function purchaseCredits(productId: string) {
  const { products } = await Purchases.getProducts({
    productIdentifiers: [productId],
    type: PRODUCT_CATEGORY.NON_SUBSCRIPTION,
  });
  const product = products[0];
  if (!product) throw new Error(`product not found: ${productId}`);
  return Purchases.purchaseStoreProduct({ product });
}
