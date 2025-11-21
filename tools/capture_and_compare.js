const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async ()=>{
  try {
    const browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
    const page = await browser.newPage();

    const tasks = [
      {
        file: path.resolve(__dirname, '../webpages/leave_application/表單流程系統[A01](A727)_files/SW0009.html'),
        plain: path.resolve(__dirname, '../extension/screenshots/real_leave_application_plain.png'),
        enhanced: path.resolve(__dirname, '../extension/screenshots/real_leave_application_enhanced.png'),
        compare: path.resolve(__dirname, '../extension/screenshots/real_leave_application_compare.png')
      },
      {
        file: path.resolve(__dirname, '../webpages/business_trip_application/表單流程系統[A01](A727)_files/SW0212.html'),
        plain: path.resolve(__dirname, '../extension/screenshots/real_business_trip_application_plain.png'),
        enhanced: path.resolve(__dirname, '../extension/screenshots/real_business_trip_application_enhanced.png'),
        compare: path.resolve(__dirname, '../extension/screenshots/real_business_trip_application_compare.png')
      }
    ];

    // Load content.js and patch isHrDomain to return true
    const contentJsPath = path.resolve(__dirname, '../extension/content.js');
    let contentJs = fs.readFileSync(contentJsPath, 'utf8');
    contentJs = contentJs.replace(/function\s+isHrDomain\s*\([\s\S]*?\}\n/, 'function isHrDomain(){ return true; }\n');

    await page.setViewport({width: 1400, height: 1200, deviceScaleFactor: 2});

    for (const t of tasks) {
      const url = 'file://' + t.file;
      console.log('Opening', url);
      await page.goto(url, {waitUntil: 'networkidle0', timeout: 30000});
      await page.waitForTimeout(250);

      // Plain
      await page.screenshot({path: t.plain, fullPage: true});
      console.log('Saved plain:', t.plain);

      // Inject extension code (patched) to simulate enhancement
      await page.addScriptTag({content: contentJs});
      await page.waitForTimeout(600);
      await page.screenshot({path: t.enhanced, fullPage: true});
      console.log('Saved enhanced:', t.enhanced);

      // Build a small HTML page embedding the two images side-by-side as data URIs
      const imgPlain = fs.readFileSync(t.plain).toString('base64');
      const imgEnh = fs.readFileSync(t.enhanced).toString('base64');
      const html = `
        <html><body style="margin:0;padding:10px;background:#fff;">
          <div style="display:flex;gap:10px;align-items:flex-start;">
            <div style="text-align:center;font-family:Arial;font-size:14px;color:#333;"><div>Plain</div><img src="data:image/png;base64,${imgPlain}" style="max-width:100%;height:auto;border:1px solid #ddd;"/></div>
            <div style="text-align:center;font-family:Arial;font-size:14px;color:#333;"><div>With Extension</div><img src="data:image/png;base64,${imgEnh}" style="max-width:100%;height:auto;border:1px solid #ddd;"/></div>
          </div>
        </body></html>`;

      await page.setContent(html, {waitUntil: 'networkidle0'});
      // compute width based on image widths
      // take a screenshot of the content
      await page.screenshot({path: t.compare, fullPage: true});
      console.log('Saved compare:', t.compare);
    }

    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Error', err);
    process.exit(1);
  }
})();
