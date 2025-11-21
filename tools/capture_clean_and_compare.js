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
        clean: path.resolve(__dirname, '../extension/screenshots/real_leave_application_clean.png'),
        enhanced: path.resolve(__dirname, '../extension/screenshots/real_leave_application_reenhanced.png'),
        compare: path.resolve(__dirname, '../extension/screenshots/real_leave_application_clean_compare.png')
      },
      {
        file: path.resolve(__dirname, '../webpages/business_trip_application/表單流程系統[A01](A727)_files/SW0212.html'),
        clean: path.resolve(__dirname, '../extension/screenshots/real_business_trip_application_clean.png'),
        enhanced: path.resolve(__dirname, '../extension/screenshots/real_business_trip_application_reenhanced.png'),
        compare: path.resolve(__dirname, '../extension/screenshots/real_business_trip_application_clean_compare.png')
      }
    ];

    // Load content.js and patch isHrDomain to return true
    const contentJsPath = path.resolve(__dirname, '../extension/content.js');
    let contentJs = fs.readFileSync(contentJsPath, 'utf8');
    contentJs = contentJs.replace(/function\s+isHrDomain\s*\([\s\S]*?\}\n/, 'function isHrDomain(){ return true; }\n');

    // Known selectors/classes/ids added by the extension to remove for clean capture
    const removalSelectors = [
      '[id^="pesi-"]',
      '[class^="pesi-"]',
      '#pesi-floating-analyze',
      '.pesi-smart-chips',
      '.pesi-template-actions',
      '.pesi-chip',
      '.pesi-floating-analyze',
      '.pesi-redact-overlay'
    ];

    await page.setViewport({width: 1400, height: 1200, deviceScaleFactor: 2});

    for (const t of tasks) {
      const url = 'file://' + t.file;
      console.log('Opening', url);
      await page.goto(url, {waitUntil: 'networkidle0', timeout: 30000});
      await page.waitForTimeout(250);

      // Clean injected extension nodes
      await page.evaluate((selectors) => {
        try {
          selectors.forEach(s => {
            try { Array.from(document.querySelectorAll(s)).forEach(el => el.remove()); } catch(e){}
          });

          // Also remove nodes that match known labels
          Array.from(document.querySelectorAll('*')).forEach(el => {
            try {
              const txt = (el.innerText || '').trim();
              if (!txt) return;
              if (/Trip Templates|Analyze IDs|Analyze|pesi/i.test(txt)) {
                el.remove();
              }
            } catch(e){}
          });
        } catch(e){}
        // scroll to top after removal
        try { window.scrollTo(0,0); } catch(e){}
      }, removalSelectors);

      await page.waitForTimeout(200);
      await page.screenshot({path: t.clean, fullPage: true});
      console.log('Saved clean:', t.clean);

      // Reload original page to get fresh DOM, then inject extension code to reapply enhancements
      await page.goto(url, {waitUntil: 'networkidle0', timeout: 30000});
      await page.waitForTimeout(250);
      await page.addScriptTag({content: contentJs});
      await page.waitForTimeout(800);
      await page.screenshot({path: t.enhanced, fullPage: true});
      console.log('Saved re-enhanced:', t.enhanced);

      // Compose comparison HTML
      const imgClean = fs.readFileSync(t.clean).toString('base64');
      const imgEnh = fs.readFileSync(t.enhanced).toString('base64');
      const html = `
        <html><body style="margin:0;padding:10px;background:#fff;">
          <div style="display:flex;gap:10px;align-items:flex-start;">
            <div style="flex:1;text-align:center;font-family:Arial;font-size:14px;color:#333;"><div>Clean (no extension DOM)</div><img src="data:image/png;base64,${imgClean}" style="width:100%;height:auto;border:1px solid #ddd;"/></div>
            <div style="flex:1;text-align:center;font-family:Arial;font-size:14px;color:#333;"><div>With Extension (reapplied)</div><img src="data:image/png;base64,${imgEnh}" style="width:100%;height:auto;border:1px solid #ddd;"/></div>
          </div>
        </body></html>`;

      await page.setContent(html, {waitUntil: 'networkidle0'});
      await page.waitForTimeout(200);
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
