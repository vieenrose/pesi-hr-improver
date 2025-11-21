const puppeteer = require('puppeteer');
const fs = require('fs');
(async ()=>{
  const file = process.argv[2];
  if(!file){
    console.error('Usage: node tools/identify_artifact.js path/to/SW0009.html');
    process.exit(2);
  }
  const browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  await page.goto('file://' + require('path').resolve(file), {waitUntil:'networkidle2'});
  const result = await page.evaluate(()=>{
    const reason = document.getElementById('reason');
    if(!reason) return {error:'no reason field'};
    const rr = reason.getBoundingClientRect();
    const yCenter = rr.top + rr.height/2;
    const candidates = Array.from(document.querySelectorAll('*'))
      .map(el=>{ try { const r=el.getBoundingClientRect(); return {el, r}; } catch(e){ return null; } })
      .filter(x=>x && x.r && x.r.width>0 && x.r.height>0)
      .filter(x=>{
        // intersects a horizontal band around reason
        const bandTop = yCenter - 40; const bandBottom = yCenter + 40;
        return !(x.r.bottom < bandTop || x.r.top > bandBottom);
      })
      .filter(x=> x.r.width<=80 && x.r.height<=80); // small-ish

    function describeEl(el){
      const s = window.getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        // Temporary inspection helper retired.
        // This file previously contained a Puppeteer helper used during debugging
        // to locate small visual artifacts. It has been intentionally removed to
        // keep the repository clean. Recreate a local script in /tmp if you need
        // to run such inspections again outside the repo.

        module.exports = {};
    return {reasonRect:{x:Math.round(rr.left), y:Math.round(rr.top), w:Math.round(rr.width), h:Math.round(rr.height)}, candidates: candidates.map(c=>describeEl(c.el)) };
