const { chromium } = require('playwright');
const path = require('path');

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(__dirname, 'screenshots', 'check-homepage.png'), fullPage: true });
    console.log('Screenshot saved to screenshots/check-homepage.png');
  } finally {
    await browser.close();
  }
}
capture();
