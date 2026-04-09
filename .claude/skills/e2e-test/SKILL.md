# E2E 테스트 스킬

## 테스트 프레임워크
- Playwright (@playwright/test)
- 테스트 위치: tests/ 폴더
- 설정 파일: playwright.config.ts

## 테스트 파일 규칙
- 파일명: [기능명].spec.ts
- 기존 테스트: tests/navigation.spec.ts, tests/diagnose.spec.ts

## 테스트 패턴

### 페이지 접속 테스트
```typescript
test('페이지 로드', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Mold Doctor/);
});
```

### 폼 입력 + 제출 테스트
```typescript
test('진단 폼 제출', async ({ page }) => {
  await page.goto('/diagnose');
  await page.selectOption('[data-testid="resin-select"]', 'PA66');
  await page.fill('[data-testid="nozzle-temp"]', '280');
  await page.click('[data-testid="submit-btn"]');
  await expect(page.locator('[data-testid="result-card"]')).toBeVisible({ timeout: 30000 });
});
```

### API 응답 테스트
```typescript
test('API 정상 응답', async ({ request }) => {
  const response = await request.post('/api/diagnose', {
    data: { defectType: '은줄', resinType: 'PA66', machineSettings: { nozzle_temp: 280 } }
  });
  expect(response.ok()).toBeTruthy();
  const json = await response.json();
  expect(json.defect_type).toBeDefined();
});
```

## 새 기능 추가 시 테스트 작성 규칙
1. 해당 기능의 핵심 유저 플로우를 테스트 (happy path)
2. 에러 케이스 최소 1개 (빈 입력, 잘못된 값)
3. data-testid 속성을 컴포넌트에 추가해서 셀렉터로 사용
4. API 호출이 포함된 테스트는 timeout 30초 설정

## 실행
- 전체: npx playwright test
- 특정 파일: npx playwright test tests/diagnose.spec.ts
- UI 모드: npx playwright test --ui
- 디버그: npx playwright test --debug
