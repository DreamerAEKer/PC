const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.toString());
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });

  await page.goto('http://localhost:5173/#/staff', { waitUntil: 'networkidle0' });
  console.log('Page loaded');
  
  // Find the 'นำเข้าข้อมูล' button and click it
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('นำเข้าข้อมูล') || text.includes('กล้องเว็บแคม')) {
      console.log('Clicking button:', text);
      await btn.click();
      break;
    }
  }
  
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Done');
  await browser.close();
})();
