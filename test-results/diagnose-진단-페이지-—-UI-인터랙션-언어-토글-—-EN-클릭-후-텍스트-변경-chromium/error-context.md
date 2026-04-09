# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: diagnose.spec.ts >> 진단 페이지 — UI 인터랙션 >> 언어 토글 — EN 클릭 후 텍스트 변경
- Location: e2e\diagnose.spec.ts:9:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /English/i })

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
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('진단 페이지 — UI 인터랙션', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     await page.goto('/diagnose');
  6   |   });
  7   | 
  8   |   // ─── 언어 토글 ──────────────────────────────────────────────────────────
  9   |   test('언어 토글 — EN 클릭 후 텍스트 변경', async ({ page }) => {
> 10  |     await page.getByRole('button', { name: /English/i }).click();
      |                                                          ^ Error: locator.click: Test timeout of 30000ms exceeded.
  11  |     await expect(page.getByRole('button', { name: /English/i })).toBeVisible();
  12  |     // 다시 한국어로
  13  |     await page.getByRole('button', { name: /한국어/i }).click();
  14  |     await expect(page.getByRole('button', { name: /한국어/i })).toBeVisible();
  15  |   });
  16  | 
  17  |   // ─── 샘플 케이스 로드 ───────────────────────────────────────────────────
  18  |   test('샘플 케이스 클릭 — 폼 자동 입력', async ({ page }) => {
  19  |     // PA66 GF33% 은줄 케이스
  20  |     await page.getByRole('button', { name: /PA66 GF33%/i }).click();
  21  |     // 수지 드롭다운이 PA66으로 설정됐는지 (select 그룹 중 수지 종류)
  22  |     const resinSelect = page.locator('select').first();
  23  |     const selectedVal = await resinSelect.inputValue();
  24  |     expect(selectedVal).toBe('PA66');
  25  |     // 은줄 버튼이 하이라이트 클래스를 가지는지 (정확한 버튼 텍스트로 매칭)
  26  |     const silverBtn = page.getByRole('button', { name: '은줄 (Silver Streak)' });
  27  |     await expect(silverBtn).toBeVisible();
  28  |   });
  29  | 
  30  |   test('여러 샘플 케이스 클릭 — 오류 없이 전환', async ({ page }) => {
  31  |     const sampleButtons = page.locator('button').filter({ hasText: /PA66|PC |POM|PP GF|ABS|PPS|PBT|PC\/ABS/ });
  32  |     const count = await sampleButtons.count();
  33  |     expect(count).toBeGreaterThan(0);
  34  |     // 처음 3개 클릭해보기
  35  |     for (let i = 0; i < Math.min(3, count); i++) {
  36  |       await sampleButtons.nth(i).click();
  37  |       await expect(page.locator('body')).not.toContainText('Error');
  38  |     }
  39  |   });
  40  | 
  41  |   // ─── 불량 유형 선택 ─────────────────────────────────────────────────────
  42  |   test('불량 유형 버튼 클릭 — 선택/해제', async ({ page }) => {
  43  |     // 정확한 텍스트로 매칭해 샘플 버튼과 구분
  44  |     const flashBtn = page.getByRole('button', { name: '플래시 (Flash)' });
  45  |     await flashBtn.click();
  46  |     await expect(flashBtn).toBeVisible();
  47  |     // 다시 클릭 — 해제
  48  |     await flashBtn.click();
  49  |   });
  50  | 
  51  |   // ─── 수지 종류 필수 검증 ────────────────────────────────────────────────
  52  |   test('수지 미선택 시 진단 버튼 클릭 — 에러 메시지', async ({ page }) => {
  53  |     // 수지 선택 없이 바로 진단 클릭
  54  |     const resinSelect = page.locator('select').first();
  55  |     await resinSelect.selectOption('');  // 빈 값
  56  |     await page.getByRole('button', { name: /AI 진단 시작/i }).click();
  57  |     await expect(page.locator('text=수지 종류를 선택해주세요')).toBeVisible();
  58  |   });
  59  | 
  60  |   // ─── 고급 설정 토글 ─────────────────────────────────────────────────────
  61  |   test('고급 설정 토글 — 열기/닫기', async ({ page }) => {
  62  |     const advancedBtn = page.getByRole('button', { name: /고급 설정|Advanced/i });
  63  |     await advancedBtn.click();
  64  |     // V/P 전환 필드가 나타나야 함
  65  |     await expect(page.locator('text=V/P 전환').first()).toBeVisible({ timeout: 3000 });
  66  |     // 다시 닫기
  67  |     await advancedBtn.click();
  68  |   });
  69  | 
  70  |   // ─── 이미지 드롭존 존재 ─────────────────────────────────────────────────
  71  |   test('이미지 업로드 영역 존재', async ({ page }) => {
  72  |     // 드래그앤드롭 영역
  73  |     await expect(page.locator('text=불량 사진 업로드').first()).toBeVisible();
  74  |   });
  75  | 
  76  |   // ─── 콘솔 에러 없음 ─────────────────────────────────────────────────────
  77  |   test('페이지 로드 시 콘솔 에러 없음', async ({ page }) => {
  78  |     const errors: string[] = [];
  79  |     page.on('console', msg => {
  80  |       if (msg.type() === 'error') errors.push(msg.text());
  81  |     });
  82  |     page.on('pageerror', err => errors.push(err.message));
  83  |     await page.goto('/diagnose');
  84  |     await page.waitForLoadState('networkidle');
  85  |     // 심각한 JS 에러만 잡기 (hydration warning 등 제외)
  86  |     const serious = errors.filter(e =>
  87  |       !e.includes('Warning') &&
  88  |       !e.includes('hydrat') &&
  89  |       !e.includes('favicon')
  90  |     );
  91  |     expect(serious).toHaveLength(0);
  92  |   });
  93  | });
  94  | 
  95  | // ─── guide 페이지 아코디언 ──────────────────────────────────────────────────
  96  | test.describe('가이드 페이지', () => {
  97  |   test('아코디언 항목 클릭 — 내용 열림', async ({ page }) => {
  98  |     await page.goto('/guide');
  99  |     // main 영역 내 첫 번째 버튼 (Navbar 제외)
  100 |     const firstAccordion = page.locator('main button[type="button"]').first();
  101 |     await firstAccordion.click();
  102 |     // 페이지에 에러 없음
  103 |     await expect(page.locator('body')).not.toContainText('TypeError');
  104 |   });
  105 | 
  106 |   test('콘솔 에러 없음', async ({ page }) => {
  107 |     const errors: string[] = [];
  108 |     page.on('pageerror', err => errors.push(err.message));
  109 |     await page.goto('/guide');
  110 |     await page.waitForLoadState('networkidle');
```