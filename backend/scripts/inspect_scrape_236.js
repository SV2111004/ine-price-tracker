import { chromium } from 'playwright';

async function testProduct236() {
  console.log('=== TESTING CLICK AND NETWORK FLOW FOR PRODUCT #236 ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE ${msg.type()}]: ${msg.text()}`);
  });

  page.on('request', req => {
    console.log(`-> REQUEST: ${req.method()} ${req.url()}`);
  });

  page.on('response', async res => {
    let bodyText = '';
    try {
      bodyText = await res.text();
    } catch (_) {}
    console.log(`<- RESPONSE [${res.status()}]: ${res.url()} | body: ${bodyText.substring(0, 160)}`);
  });

  await page.goto('https://demo.inelabteamdev.com/product/236', { waitUntil: 'networkidle' });

  const priceBlock = page.locator('.price-block');
  const revealBtn = page.locator('button:has-text("Reveal price")');

  const box = await priceBlock.boundingBox();
  console.log('Price block box:', box);

  if (box) {
    // Perform natural movement
    for (let i = 1; i <= 15; i++) {
      const targetX = box.x + 10 + (i * (box.width - 20) / 15);
      const targetY = box.y + 20 + (i % 2 === 0 ? 10 : 20);
      await page.mouse.move(targetX, targetY);
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(800);
  }

  const isEnabled = await revealBtn.isEnabled();
  console.log('Button isEnabled:', isEnabled);

  // If enabled, try clicking and observe if network calls happen
  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`Click attempt ${attempt}...`);
    await revealBtn.click();
    console.log(`Waiting 2 seconds to observe network...`);
    await page.waitForTimeout(2000);

    const blockText = await priceBlock.textContent();
    console.log(`Price block text after click ${attempt}: "${blockText}"`);
    if (!blockText.includes('Price hidden')) {
      console.log('Phase changed from idle!');
      break;
    }
  }

  await page.waitForTimeout(3000);
  await browser.close();
}

testProduct236().catch(err => {
  console.error('Inspection failed:', err);
  process.exit(1);
});
