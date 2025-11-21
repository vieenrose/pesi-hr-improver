const puppeteer = require('puppeteer');
const path = require('path');
(async ()=>{
  try {
    const browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
    const page = await browser.newPage();
    const file = path.resolve(__dirname, '../extension/popup.html');
    const url = 'file://' + file;
    await page.goto(url, {waitUntil: 'networkidle2'});
    // ensure styles/scripts loaded
    await page.waitForTimeout(400);
    // set viewport a bit larger than popup width
    await page.setViewport({width: 420, height: 800, deviceScaleFactor: 2});
    // measure body bounding box
    const rect = await page.evaluate(()=>{
      const el = document.body;
      const r = el.getBoundingClientRect();
      return {x: Math.floor(r.left), y: Math.floor(r.top), w: Math.ceil(r.width), h: Math.ceil(Math.max(document.documentElement.scrollHeight, r.height))};
    });
    const out = path.resolve(__dirname, '../extension/screenshots/popup-panel.png');
    await page.screenshot({path: out, clip: {x: rect.x, y: rect.y, width: Math.min(rect.w, 800), height: Math.min(rect.h, 1200)}});
    console.log('Saved popup screenshot to', out);
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Error capturing popup panel', err);
    process.exit(1);
  }
})();
