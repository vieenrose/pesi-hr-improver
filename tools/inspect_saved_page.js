const puppeteer = require('puppeteer');
const fs = require('fs');
(async ()=>{
  const file = process.argv[2];
  if(!file){
    console.error('Usage: node inspect_saved_page.js path/to/SW0009.html');
    process.exit(2);
  }
  const browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  await page.goto('file://' + require('path').resolve(file), {waitUntil:'networkidle2'});
  // Try to locate the small square by finding the checkbox near #reason
  const result = await page.evaluate(()=>{
    function describe(el){
      if(!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(), id: el.id||null, classes: el.className||null,
        rect: {x: rect.x, y: rect.y, w: rect.width, h: rect.height}, outer: el.outerHTML.slice(0,300)
      };
    }
    const reason = document.getElementById('reason');
    const cross = document.getElementById('cross_holiday');
    const useAb = document.getElementById('use_ab_time');
    // elements from point at a few sample coords around reason
    const sample = [];
    if(reason){
      const r = reason.getBoundingClientRect();
      // points: left-middle of reason's left area where box appears in screenshot
      sample.push([r.left - 10, r.top + r.height/2]);
      sample.push([r.left - 30, r.top + r.height/2]);
      sample.push([r.left + 10, r.top + r.height/2]);
    }
    const hit = sample.map(p => {
      const els = document.elementsFromPoint(p[0], p[1]);
      return {point: p, stack: els.slice(0,8).map(describe)};
    });
    return {reason: describe(reason), cross: describe(cross), use_ab: describe(useAb), hits: hit};
  });
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
