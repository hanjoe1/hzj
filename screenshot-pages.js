const { chromium } = require('playwright');
const path = require('path');

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const baseUrl = 'http://localhost:8080';
  const outputDir = path.join(__dirname, 'screenshots');

  try {
    // 1. Homepage
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500); // Wait for particles animation
    await page.screenshot({ path: path.join(outputDir, '01-homepage.png'), fullPage: true });
    console.log('Saved: 01-homepage.png');

    // 2. Click 贪吃蛇 (Snake)
    await page.click('a[href="snake-game/"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outputDir, '02-snake-game.png'), fullPage: true });
    console.log('Saved: 02-snake-game.png');

    // 3. Go back and click 俄罗斯方块 (Tetris)
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.click('a[href="tetris-game/"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outputDir, '03-tetris-game.png'), fullPage: true });
    console.log('Saved: 03-tetris-game.png');

    // 4. Go back and click 2048
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.click('a[href="2048-game/"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outputDir, '04-2048-game.png'), fullPage: true });
    console.log('Saved: 04-2048-game.png');

    console.log('All screenshots saved to screenshots/');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

captureScreenshots();
