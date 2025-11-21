const puppeteer = require('puppeteer');
const path = require('path');

(async ()=>{
  try {
    const browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
    const page = await browser.newPage();

    const pages = [
      {
        file: path.resolve(__dirname, '../webpages/leave_application/表單流程系統[A01](A727)_files/SW0009.html'),
        out: path.resolve(__dirname, '../extension/screenshots/real_leave_application.png')
      },
      {
        file: path.resolve(__dirname, '../webpages/business_trip_application/表單流程系統[A01](A727)_files/SW0212.html'),
        out: path.resolve(__dirname, '../extension/screenshots/real_business_trip_application.png')
      }
    ];

    await page.setViewport({width: 1400, height: 1200, deviceScaleFactor: 2});

    for (const p of pages) {
      const url = 'file://' + p.file;
      console.log('Opening', url);
      await page.goto(url, {waitUntil: 'networkidle0', timeout: 30000});
      await page.waitForTimeout(300);
      await page.screenshot({path: p.out, fullPage: true});
      console.log('Saved:', p.out);
    }

    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Error', err);
    process.exit(1);
  }
})();
