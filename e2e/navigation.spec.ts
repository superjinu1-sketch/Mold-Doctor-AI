import { test, expect } from '@playwright/test';

// ─── 1. 페이지 이동 ─────────────────────────────────────────────────────────
test.describe('페이지 이동', () => {
  test('홈(/) 로드 — 타이틀 확인', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Mold Doctor/i);
    await expect(page.locator('body')).not.toContainText('Error');
    await expect(page.locator('body')).not.toContainText('500');
  });

  test('/diagnose 로드 — 핵심 UI 존재', async ({ page }) => {
    await page.goto('/diagnose');
    await expect(page.locator('body')).not.toContainText('Error');
    // 수지 종류 드롭다운 존재
    await expect(page.locator('select').first()).toBeVisible();
    // 진단 시작 버튼 존재
    await expect(page.getByRole('button', { name: /AI 진단 시작/i })).toBeVisible();
  });

  test('/guide 로드', async ({ page }) => {
    await page.goto('/guide');
    await expect(page).toHaveTitle(/Mold Doctor/i);
    await expect(page.locator('body')).not.toContainText('Error');
    await expect(page.locator('body')).not.toContainText('500');
  });

  test('/pricing 로드', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page).toHaveTitle(/Mold Doctor/i);
    await expect(page.locator('body')).not.toContainText('Error');
  });

  test('존재하지 않는 페이지 — 404 처리', async ({ page }) => {
    const res = await page.goto('/nonexistent-page-xyz');
    // Next.js는 404를 200으로 내려줄 수도 있음 (not-found page)
    expect([200, 404]).toContain(res?.status());
  });
});

// ─── 2. Navbar 네비게이션 ────────────────────────────────────────────────────
test.describe('Navbar', () => {
  test('로고 클릭 → 홈으로 이동', async ({ page }) => {
    await page.goto('/diagnose');
    await page.getByRole('link', { name: /mold doctor/i }).first().click();
    await expect(page).toHaveURL('/');
  });

  test('진단하기 링크 → /diagnose 이동', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /진단하기/i }).first().click();
    await expect(page).toHaveURL('/diagnose');
  });

  test('불량 가이드 링크 → /guide 이동', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /불량 가이드/i }).first().click();
    await expect(page).toHaveURL('/guide');
  });
});
