import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[Browser ${msg.type()}] ${msg.text()}`);
  });
  
  page.on('pageerror', err => {
    console.log(`[Browser ERROR] ${err.toString()}`);
  });
  
  page.on('requestfailed', req => {
    console.log(`[Browser Request Failed] ${req.url()} - ${req.failure().errorText}`);
  });

  console.log('Navigating to http://localhost:3000/...');
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0', timeout: 30000 });
  } catch (e) {
    console.log('Navigation error:', e);
  }
  
  console.log('Done.');
  await browser.close();
})();
