# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.ts >> 페이지 이동 >> 홈(/) 로드 — 타이틀 확인
- Location: e2e\navigation.spec.ts:5:7

# Error details

```
Error: expect(page).toHaveTitle(expected) failed

Expected pattern: /Mold Doctor/i
Received string:  "Juan's Quest ⚔️"
Timeout: 5000ms

Call log:
  - Expect "toHaveTitle" with timeout 5000ms
    8 × unexpected value "Juan's Quest ⚔️"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - button "📚" [ref=e4] [cursor=pointer]
  - generic [ref=e7]:
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: Juan's Quest
        - generic [ref=e11]: 30일 언어 도전 🚀
      - generic [ref=e12]: 🌱
    - generic [ref=e13]:
      - generic [ref=e14]:
        - generic [ref=e15]: Lv.1 새싹
        - generic [ref=e16]: 0 XP
      - generic [ref=e18]: 다음 레벨까지 300 XP
    - generic [ref=e19]:
      - generic [ref=e20]:
        - generic [ref=e21]: 30일 진도
        - generic [ref=e22]: 0/30일
      - generic [ref=e24]: 0% 완료
    - button "📅 오늘의 학습 Day 1 학습 영단어 10개 + 한국어 맞춤법 10문제 ▶" [ref=e26] [cursor=pointer]:
      - generic [ref=e27]:
        - generic [ref=e28]: 📅 오늘의 학습
        - generic [ref=e29]: Day 1 학습
        - generic [ref=e30]: 영단어 10개 + 한국어 맞춤법 10문제
      - generic [ref=e31]: ▶
    - generic [ref=e32]:
      - generic [ref=e33]:
        - generic [ref=e34]: 🔥
        - generic [ref=e35]: "1"
        - generic [ref=e36]: 일 연속 학습
      - generic [ref=e37]:
        - generic [ref=e38]: 📚
        - generic [ref=e39]: "0"
        - generic [ref=e40]: 개 영단어
      - generic [ref=e41]:
        - generic [ref=e42]: ✏️
        - generic [ref=e43]: "0"
        - generic [ref=e44]: 문제 맞춤법
    - generic [ref=e45]:
      - generic [ref=e46]: 🏅 획득한 배지
      - generic [ref=e47]: 0/12
    - generic [ref=e48]:
      - button "💾 백업 저장" [ref=e49] [cursor=pointer]
      - generic [ref=e50] [cursor=pointer]: 📂 백업 불러오기
    - button "진도 초기화" [ref=e51] [cursor=pointer]
  - navigation [ref=e52]:
    - link "🏠 홈" [ref=e53] [cursor=pointer]:
      - /url: /
      - generic [ref=e54]: 🏠
      - generic [ref=e55]: 홈
    - link "📅 진도표" [ref=e56] [cursor=pointer]:
      - /url: /calendar
      - generic [ref=e57]: 📅
      - generic [ref=e58]: 진도표
    - link "📖 학습" [ref=e59] [cursor=pointer]:
      - /url: /learn
      - generic [ref=e60]: 📖
      - generic [ref=e61]: 학습
    - link "📝 오답" [ref=e62] [cursor=pointer]:
      - /url: /wrong-note
      - generic [ref=e63]: 📝
      - generic [ref=e64]: 오답
    - link "🏆 보상" [ref=e65] [cursor=pointer]:
      - /url: /rewards
      - generic [ref=e66]: 🏆
      - generic [ref=e67]: 보상
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | // ─── 1. 페이지 이동 ─────────────────────────────────────────────────────────
  4  | test.describe('페이지 이동', () => {
  5  |   test('홈(/) 로드 — 타이틀 확인', async ({ page }) => {
  6  |     await page.goto('/');
> 7  |     await expect(page).toHaveTitle(/Mold Doctor/i);
     |                        ^ Error: expect(page).toHaveTitle(expected) failed
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
  23 |     await expect(page).toHaveTitle(/Mold Doctor/i);
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