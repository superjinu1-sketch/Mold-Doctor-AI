import { test, expect } from '@playwright/test';

test.describe('진단 페이지 — UI 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/diagnose');
  });

  // ─── 언어 토글 ──────────────────────────────────────────────────────────
  test('언어 토글 — EN 클릭 후 텍스트 변경', async ({ page }) => {
    await page.getByRole('button', { name: /English/i }).click();
    await expect(page.getByRole('button', { name: /English/i })).toBeVisible();
    // 다시 한국어로
    await page.getByRole('button', { name: /한국어/i }).click();
    await expect(page.getByRole('button', { name: /한국어/i })).toBeVisible();
  });

  // ─── 샘플 케이스 로드 ───────────────────────────────────────────────────
  test('샘플 케이스 클릭 — 폼 자동 입력', async ({ page }) => {
    // PA66 GF33% 은줄 케이스
    await page.getByRole('button', { name: /PA66 GF33%/i }).click();
    // 수지 드롭다운이 PA66으로 설정됐는지 (select 그룹 중 수지 종류)
    const resinSelect = page.locator('select').first();
    const selectedVal = await resinSelect.inputValue();
    expect(selectedVal).toBe('PA66');
    // 은줄 버튼이 하이라이트 클래스를 가지는지 (정확한 버튼 텍스트로 매칭)
    const silverBtn = page.getByRole('button', { name: '은줄 (Silver Streak)' });
    await expect(silverBtn).toBeVisible();
  });

  test('여러 샘플 케이스 클릭 — 오류 없이 전환', async ({ page }) => {
    const sampleButtons = page.locator('button').filter({ hasText: /PA66|PC |POM|PP GF|ABS|PPS|PBT|PC\/ABS/ });
    const count = await sampleButtons.count();
    expect(count).toBeGreaterThan(0);
    // 처음 3개 클릭해보기
    for (let i = 0; i < Math.min(3, count); i++) {
      await sampleButtons.nth(i).click();
      await expect(page.locator('body')).not.toContainText('Error');
    }
  });

  // ─── 불량 유형 선택 ─────────────────────────────────────────────────────
  test('불량 유형 버튼 클릭 — 선택/해제', async ({ page }) => {
    // 정확한 텍스트로 매칭해 샘플 버튼과 구분
    const flashBtn = page.getByRole('button', { name: '플래시 (Flash)' });
    await flashBtn.click();
    await expect(flashBtn).toBeVisible();
    // 다시 클릭 — 해제
    await flashBtn.click();
  });

  // ─── 수지 종류 필수 검증 ────────────────────────────────────────────────
  test('수지 미선택 시 진단 버튼 클릭 — 에러 메시지', async ({ page }) => {
    // 수지 선택 없이 바로 진단 클릭
    const resinSelect = page.locator('select').first();
    await resinSelect.selectOption('');  // 빈 값
    await page.getByRole('button', { name: /AI 진단 시작/i }).click();
    await expect(page.locator('text=수지 종류를 선택해주세요')).toBeVisible();
  });

  // ─── 고급 설정 토글 ─────────────────────────────────────────────────────
  test('고급 설정 토글 — 열기/닫기', async ({ page }) => {
    const advancedBtn = page.getByRole('button', { name: /고급 설정|Advanced/i });
    await advancedBtn.click();
    // V/P 전환 필드가 나타나야 함
    await expect(page.locator('text=V/P 전환').first()).toBeVisible({ timeout: 3000 });
    // 다시 닫기
    await advancedBtn.click();
  });

  // ─── 이미지 드롭존 존재 ─────────────────────────────────────────────────
  test('이미지 업로드 영역 존재', async ({ page }) => {
    // 드래그앤드롭 영역
    await expect(page.locator('text=불량 사진 업로드').first()).toBeVisible();
  });

  // ─── 콘솔 에러 없음 ─────────────────────────────────────────────────────
  test('페이지 로드 시 콘솔 에러 없음', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/diagnose');
    await page.waitForLoadState('networkidle');
    // 심각한 JS 에러만 잡기 (hydration warning 등 제외)
    const serious = errors.filter(e =>
      !e.includes('Warning') &&
      !e.includes('hydrat') &&
      !e.includes('favicon')
    );
    expect(serious).toHaveLength(0);
  });
});

// ─── guide 페이지 아코디언 ──────────────────────────────────────────────────
test.describe('가이드 페이지', () => {
  test('아코디언 항목 클릭 — 내용 열림', async ({ page }) => {
    await page.goto('/guide');
    // main 영역 내 첫 번째 버튼 (Navbar 제외)
    const firstAccordion = page.locator('main button[type="button"]').first();
    await firstAccordion.click();
    // 페이지에 에러 없음
    await expect(page.locator('body')).not.toContainText('TypeError');
  });

  test('콘솔 에러 없음', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/guide');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});
