/**
 * Browser Test Skeleton
 * ---------------------
 * Reusable Puppeteer template for testing the Shadchanit web app.
 * Copy this file, rename it, and modify the test steps.
 *
 * Prerequisites:
 *   npm install --no-save puppeteer   (one-time, already installed)
 *   npm run dev                       (must be running on localhost:3000)
 *
 * Usage:
 *   node tests/browser-test-skeleton.js
 */

const puppeteer = require('puppeteer');

// ── CONFIG ──────────────────────────────────────────────────────────
const BASE_URL = 'http://localhost:3000';
const HEADLESS = false;          // set true for CI / no-GUI runs
const SLOW_MO = 50;             // ms delay between actions (0 for fast)
const DEFAULT_TIMEOUT = 30000;  // 30s
const SCREENSHOT_DIR = './tests/screenshots';

// ── HELPERS ─────────────────────────────────────────────────────────

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function screenshot(page, name) {
  const fs = require('fs');
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const path = `${SCREENSHOT_DIR}/${name}-${Date.now()}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`  Screenshot: ${path}`);
}

async function waitForText(page, text, timeout = DEFAULT_TIMEOUT) {
  await page.waitForFunction(
    t => document.body.innerText.includes(t),
    { timeout },
    text
  );
}

async function fillInput(page, selector, value) {
  await page.waitForSelector(selector, { timeout: DEFAULT_TIMEOUT });
  await page.click(selector, { clickCount: 3 });
  await page.type(selector, value);
}

async function selectDropdown(page, selector, value) {
  await page.waitForSelector(selector, { timeout: DEFAULT_TIMEOUT });
  await page.select(selector, value);
}

async function clickButton(page, text) {
  await page.evaluate(t => {
    const btns = [...document.querySelectorAll('button')];
    const btn = btns.find(b => b.textContent.includes(t));
    if (btn) btn.click();
    else throw new Error(`Button "${t}" not found`);
  }, text);
}

// ── MAIN TEST ───────────────────────────────────────────────────────

(async () => {
  const browser = await puppeteer.launch({
    headless: HEADLESS,
    slowMo: SLOW_MO,
    args: ['--window-size=1280,900'],
    defaultViewport: { width: 1280, height: 900 },
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(DEFAULT_TIMEOUT);

  try {
    // ─── STEP 1: Navigate ───────────────────────────────────────────
    console.log('Step 1: Navigate to page');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await screenshot(page, 'step1');

    // ─── STEP 2: Example interaction ────────────────────────────────
    // Replace with your test logic.
    //
    // Common patterns:
    //
    //   await fillInput(page, 'input[name="fullName"]', 'Test User');
    //   await selectDropdown(page, 'select[name="gender"]', 'male');
    //   await clickButton(page, 'Next');
    //   await waitForText(page, 'Step 2');
    //   await screenshot(page, 'step2');
    //
    // For the external client form:
    //   await page.goto(`${BASE_URL}/form/YOUR_TOKEN_HERE`, { waitUntil: 'networkidle2' });
    //   await fillInput(page, 'input[placeholder*="Email"]', 'test@example.com');
    //   await clickButton(page, 'Continue');
    //   await sleep(1000);
    //   await clickButton(page, 'English');
    //   ...fill form steps...

    console.log('Step 2: (your test here)');

    // ─── RESULT ─────────────────────────────────────────────────────
    console.log('\nRESULT: PASS');

  } catch (err) {
    console.error('\nRESULT: FAIL');
    console.error(err.message);
    await screenshot(page, 'error');
  } finally {
    await browser.close();
  }
})();
