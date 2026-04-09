# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.ts >> 페이지 이동 >> /guide 로드
- Location: e2e\navigation.spec.ts:21:7

# Error details

```
Error: expect(page).toHaveTitle(expected) failed

Expected pattern: /Mold Doctor/i
Received string:  "Juan's Quest ⚔️"
Timeout: 5000ms

Call log:
  - Expect "toHaveTitle" with timeout 5000ms
    9 × unexpected value "Juan's Quest ⚔️"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - button "📚" [ref=e4] [cursor=pointer]
  - navigation [ref=e6]:
    - link "🏠 홈" [ref=e7] [cursor=pointer]:
      - /url: /
      - generic [ref=e8]: 🏠
      - generic [ref=e9]: 홈
    - link "📅 진도표" [ref=e10] [cursor=pointer]:
      - /url: /calendar
      - generic [ref=e11]: 📅
      - generic [ref=e12]: 진도표
    - link "📖 학습" [ref=e13] [cursor=pointer]:
      - /url: /learn
      - generic [ref=e14]: 📖
      - generic [ref=e15]: 학습
    - link "📝 오답" [ref=e16] [cursor=pointer]:
      - /url: /wrong-note
      - generic [ref=e17]: 📝
      - generic [ref=e18]: 오답
    - link "🏆 보상" [ref=e19] [cursor=pointer]:
      - /url: /rewards
      - generic [ref=e20]: 🏆
      - generic [ref=e21]: 보상
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | // ─── 1. 페이지 이동 ─────────────────────────────────────────────────────────
  4  | test.describe('페이지 이동', () => {
  5  |   test('홈(/) 로드 — 타이틀 확인', async ({ page }) => {
  6  |     await page.goto('/');
  7  |     await expect(page).toHaveTitle(/Mold Doctor/i);
  8  |     await expect(page.locator('body')).not.toContainText('Error');
  9  |     await expect(page.locator('body')).not.toContainText('500');
  10 |   });
  11 | 
  12 |   test('/diagnose 로드 — 핵심 UI 존재', async ({ page }) => {
  13 |     await page.goto('/diagnose');
  14 |     await expect(page.locator('body')).not.toContainText('Error');
  15 |     // 수지 종류 드롭다운 존재
  16 |     await expect(page.locator('select').first()).toBeVisible();
  17 |     // 진단 시작 버튼 존재
  18 |     await expect(page.getByRole('button', { name: /AI 진단 시작/i })).toBeVisible();
  19 |   });
  20 | 
  21 |   test('/guide 로드', async ({ page }) => {
  22 |     await page.goto('/guide');
> 23 |     await expect(page).toHaveTitle(/Mold Doctor/i);
     |                        ^ Error: expect(page).toHaveTitle(expected) failed
  24 |     await expect(page.locator('body')).not.toContainText('Error');
  25 |     await expect(page.locator('body')).not.toContainText('500');
  26 |   });
  27 | 
  28 |   test('/pricing 로드', async ({ page }) => {
  29 |     await page.goto('/pricing');
  30 |     await expect(page).toHaveTitle(/Mold Doctor/i);
  31 |     await expect(page.locator('body')).not.toContainText('Error');
  32 |   });
  33 | 
  34 |   test('존재하지 않는 페이지 — 404 처리', async ({ page }) => {
  35 |     const res = await page.goto('/nonexistent-page-xyz');
  36 |     // Next.js는 404를 200으로 내려줄 수도 있음 (not-found page)
  37 |     expect([200, 404]).toContain(res?.status());
  38 |   });
  39 | });
  40 | 
  41 | // ─── 2. Navbar 네비게이션 ────────────────────────────────────────────────────
  42 | test.describe('Navbar', () => {
  43 |   test('로고 클릭 → 홈으로 이동', async ({ page }) => {
  44 |     await page.goto('/diagnose');
  45 |     await page.getByRole('link', { name: /mold doctor/i }).first().click();
  46 |     await expect(page).toHaveURL('/');
  47 |   });
  48 | 
  49 |   test('진단하기 링크 → /diagnose 이동', async ({ page }) => {
  50 |     await page.goto('/');
  51 |     await page.getByRole('link', { name: /진단하기/i }).first().click();
  52 |     await expect(page).toHaveURL('/diagnose');
  53 |   });
  54 | 
  55 |   test('불량 가이드 링크 → /guide 이동', async ({ page }) => {
  56 |     await page.goto('/');
  57 |     await page.getByRole('link', { name: /불량 가이드/i }).first().click();
  58 |     await expect(page).toHaveURL('/guide');
  59 |   });
  60 | });
  61 | 
```