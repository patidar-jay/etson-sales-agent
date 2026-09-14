const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('http://localhost:5173/whatsapp');
  
  // Inject credentials into localStorage
  await page.evaluate(() => {
    localStorage.setItem('hs_config', JSON.stringify({
      instanceId: 'a2baa204-415c-488a-9642-8f6ebf5ed1cf',
      apiKey: '1605|nv6JfUjofGIIYATtE3IvGlQSrfUH4E6WG53IXtrC73f3426e'
    }));
  });
  
  console.log('✅ Credentials injected into localStorage via Playwright');
  await browser.close();
})();
