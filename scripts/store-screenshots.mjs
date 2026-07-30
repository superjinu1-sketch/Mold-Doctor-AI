// scripts/store-screenshots.mjs
// App Store 6.9" 스크린샷 5장 생성 (ios-screenshots-v1_3-v1, 진우 지시로 04/05 교체 반영).
// 전제: `npm run build && npm start` 로 프로덕션 서버가 http://localhost:3000 에 떠 있어야 한다.
// 로그인 자격은 환경변수 SCREENSHOT_EMAIL / SCREENSHOT_PASSWORD 로만 받는다 — 값은 어디에도 로깅하지 않는다.
//
// 대상 5장:
//   1 01-home.png             홈(랜딩)             — 비로그인
//   2 02-diagnose-input.png   진단 입력            — 로그인 필요
//   3 03-diagnose-result.png  진단 결과(기존 이력)  — 로그인 필요, 신규 진단 실행 없음
//   4 04-tryout.png           시사출 체크리스트    — 로그인 필요(/tryout 자체가 로그인 게이트)
//   5 05-tools.png            무료 도구 모음       — 비로그인 (/tools, useAuth 미사용·이메일 미노출)
//
// 자격이 없으면 로그인 불요 대상(1·5)만 찍고, 로그인 필요 대상은 건너뛰며 안내를 출력한다.
// --only=<쉼표로 구분된 번호> 로 특정 번호만 재실행 가능 (예: --only=4,5).
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.SCREENSHOT_BASE_URL || 'http://localhost:3000';
const OUT_DIR = path.join(process.cwd(), 'store-assets', 'ios-v1.3');
const EMAIL = process.env.SCREENSHOT_EMAIL;
const PASSWORD = process.env.SCREENSHOT_PASSWORD;
const HAS_CREDENTIALS = Boolean(EMAIL && PASSWORD);

const VIEWPORT = { width: 440, height: 956 };

function log(msg) {
  console.log(`[store-screenshots] ${msg}`);
}

function parseOnly() {
  const arg = process.argv.find((a) => a.startsWith('--only='));
  if (!arg) return null;
  const nums = arg.slice('--only='.length).split(',').map((s) => parseInt(s.trim(), 10)).filter(Boolean);
  return new Set(nums);
}

async function loginViaModal(page) {
  log('로그인 진행...');
  await page.getByRole('button', { name: '로그인', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible', timeout: 10000 });
  await dialog.locator('#auth-email').fill(EMAIL);
  await dialog.locator('#auth-password').fill(PASSWORD);
  await dialog.getByRole('button', { name: '로그인', exact: true }).click();
  await dialog.waitFor({ state: 'hidden', timeout: 15000 });
  await page.waitForTimeout(1500); // 로그인 상태 반영(네비바 갱신) 대기
  log('로그인 완료');
}

const TARGETS = [
  {
    n: 1,
    file: '01-home.png',
    needsLogin: false,
    capture: async (page) => {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
      await page.waitForSelector('h1', { timeout: 15000 });
      await page.screenshot({ path: path.join(OUT_DIR, '01-home.png'), fullPage: false });
    },
  },
  {
    n: 2,
    file: '02-diagnose-input.png',
    needsLogin: true,
    capture: async (page) => {
      await page.goto(`${BASE_URL}/diagnose`, { waitUntil: 'networkidle' });
      await page.waitForSelector('text=불량유형 직접 선택', { timeout: 15000 });
      await page.screenshot({ path: path.join(OUT_DIR, '02-diagnose-input.png'), fullPage: false });
    },
  },
  {
    n: 3,
    file: '03-diagnose-result.png',
    needsLogin: true,
    capture: async (page) => {
      // 기존 진단 이력 1건을 "다시 보기"로 연다 — 신규 진단 실행·크레딧 소모 없음.
      await page.goto(`${BASE_URL}/account`, { waitUntil: 'networkidle' });
      const historyHeading = page.getByRole('button', { name: /추정 기록 \(\d+\)/ });
      await historyHeading.waitFor({ state: 'visible', timeout: 15000 });
      const headingText = await historyHeading.textContent();
      const recordCount = parseInt((headingText || '').match(/\((\d+)\)/)?.[1] || '0', 10);
      log(`계정 히스토리 레코드 수: ${recordCount}`);
      if (recordCount < 1) {
        throw new Error('진단 이력이 0건입니다 — 03-diagnose-result 캡처 불가(신규 진단 실행 금지, 멈추고 보고).');
      }
      // 히스토리 카드만 'p-0 overflow-hidden' 조합을 쓴다(계정헤더·크레딧 카드는 p-5) — 그 클래스로 특정.
      const firstCard = page.locator('.ui-card.p-0.overflow-hidden').first();
      await firstCard.locator('button').first().click();
      const restoreButton = firstCard.getByRole('button', { name: '다시 보기' });
      await restoreButton.waitFor({ state: 'visible', timeout: 10000 });
      await restoreButton.click();
      await page.waitForURL('**/diagnose', { timeout: 15000 });
      await page.waitForTimeout(1000); // 복원 렌더 안정화
      await page.screenshot({ path: path.join(OUT_DIR, '03-diagnose-result.png'), fullPage: false });
    },
  },
  {
    n: 4,
    file: '04-tryout.png',
    needsLogin: true, // /tryout 리스트 페이지 자체가 로그인 게이트 — 비로그인이면 안내 카드만 보임
    capture: async (page) => {
      await page.goto(`${BASE_URL}/tryout`, { waitUntil: 'networkidle' });
      await page.waitForSelector('h1', { timeout: 15000 });
      await page.screenshot({ path: path.join(OUT_DIR, '04-tryout.png'), fullPage: false });
    },
  },
  {
    n: 5,
    file: '05-tools.png',
    needsLogin: false, // useAuth 미사용 — 로그인 게이트 없음, 이메일도 미노출
    capture: async (page) => {
      await page.goto(`${BASE_URL}/tools`, { waitUntil: 'networkidle' });
      await page.waitForSelector('h1', { timeout: 15000 });
      await page.screenshot({ path: path.join(OUT_DIR, '05-tools.png'), fullPage: false });
    },
  },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const only = parseOnly();
  const selected = only ? TARGETS.filter((t) => only.has(t.n)) : TARGETS;
  if (selected.length === 0) {
    console.error(`--only 값이 유효한 대상과 매치되지 않습니다 (1~${TARGETS.length}).`);
    process.exit(1);
  }

  const capturable = selected.filter((t) => !t.needsLogin || HAS_CREDENTIALS);
  const skipped = selected.filter((t) => t.needsLogin && !HAS_CREDENTIALS);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: 'ko-KR',
  });
  // localStorage 값은 아직 page가 없어 addInitScript로 모든 페이지에 선주입 — locale 강제 고정(ko).
  await context.addInitScript(() => {
    try { localStorage.setItem('molddoctor_locale', 'ko'); } catch { /* ignore */ }
  });
  const page = await context.newPage();

  let loggedIn = false;
  for (const target of capturable) {
    if (target.needsLogin && !loggedIn) {
      await loginViaModal(page);
      loggedIn = true;
    }
    log(`${target.file}: 캡처 시작...`);
    await target.capture(page);
    log(`${target.file} 저장 완료`);
  }

  await browser.close();

  if (skipped.length > 0) {
    const nums = skipped.map((t) => t.n).join(',');
    log(`로그인 필요 대상(${nums})은 SCREENSHOT_EMAIL/SCREENSHOT_PASSWORD 미설정으로 건너뜀 — 진우가 직접 실행.`);
    log(`실행: SCREENSHOT_EMAIL=... SCREENSHOT_PASSWORD=... node scripts/store-screenshots.mjs --only=${nums}`);
  } else {
    log(`선택한 ${capturable.length}장 전체 캡처 완료.`);
  }
}

main().catch((err) => {
  console.error('스크린샷 생성 실패:', err.message);
  process.exit(1);
});
