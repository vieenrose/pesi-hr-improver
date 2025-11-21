// Temporary verification helper retired.
// This file previously contained a Puppeteer script used to verify the
// duration display behavior during debugging. The test was executed and
// the logic removed to keep the repository tidy. Recreate locally if you
// need to re-run verification outside the repository.

module.exports = {};
const puppeteer = require('puppeteer');
(async ()=>{
  const file = process.argv[2];
  if(!file){ console.error('Usage: node tools/verify_duration.js path/to/SW0009.html'); process.exit(2); }
  const path = require('path');
  const browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(file), {waitUntil:'networkidle2'});
  const before = await page.evaluate(()=>{
    const el = document.getElementById('pesi-duration-display');
    if(!el) return {exists:false};
    const cs = window.getComputedStyle(el);
    return {exists:true, text: (el.textContent||'').trim(), computedDisplay: cs.display, inlineStyle: el.getAttribute('style')};
  });
  // apply normalization: hide if empty
  const applied = await page.evaluate(()=>{
    const el = document.getElementById('pesi-duration-display');
    if(!el) return {applied:false};
    const txt = (el.textContent||'').trim();
    if(txt.length===0){ el.style.display='none'; return {applied:true, action:'hidden'}; }
    else { el.style.display='inline-block'; return {applied:true, action:'shown'}; }
  });
  const after = await page.evaluate(()=>{
    const el = document.getElementById('pesi-duration-display');
    if(!el) return {exists:false};
    const cs = window.getComputedStyle(el);
    return {exists:true, text: (el.textContent||'').trim(), computedDisplay: cs.display, inlineStyle: el.getAttribute('style')};
  });
  console.log('BEFORE:', JSON.stringify(before,null,2));
  console.log('APPLIED:', JSON.stringify(applied,null,2));
  console.log('AFTER:', JSON.stringify(after,null,2));
  await browser.close();
})();
