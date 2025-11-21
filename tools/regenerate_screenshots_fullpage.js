const puppeteer = require('puppeteer');
const path = require('path');

(async ()=>{
  try {
    const browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
    const page = await browser.newPage();

    const pages = [
      {
        file: path.resolve(__dirname, '../webpages/leave_application/表單流程系統[A01](A727)_files/SW0009.html'),
        out: path.resolve(__dirname, '../extension/screenshots/real_leave_application_masked_full.png'),
        employee: {id: 'B999', name: '王小明'}
      },
      {
        file: path.resolve(__dirname, '../webpages/business_trip_application/表單流程系統[A01](A727)_files/SW0212.html'),
        out: path.resolve(__dirname, '../extension/screenshots/real_business_trip_application_masked_full.png'),
        employee: {id: 'B888', name: '陳小華'}
      }
    ];

    for (const p of pages) {
      const url = 'file://' + p.file;
      await page.goto(url, {waitUntil: 'networkidle0'});
      await page.setViewport({width: 1200, height: 900});

      // Safer masking: hide file inputs and replace small/label-like nodes that mention attachments only
      await page.evaluate((employee) => {
        try {
          // Hide file inputs
          document.querySelectorAll('input[type=file]').forEach(el => { el.style.display = 'none'; });

          // Find candidate nodes that likely represent attachment labels or small blocks
          const candidates = Array.from(document.querySelectorAll('label,span,div,p'));
          candidates.forEach(el => {
            try {
              const txt = (el.textContent || '').trim();
              if (!txt) return;
              // only target nodes that mention attachment keywords and are relatively small in text length
              if ((txt.includes('附加檔案') || txt.includes('附件') || txt.includes('附檔')) && txt.length < 120) {
                // protect against replacing the whole document: skip if element is body/html or large container
                const tag = (el.tagName || '').toLowerCase();
                if (tag === 'body' || tag === 'html') return;
                const rect = el.getBoundingClientRect();
                // only replace if element visual area is reasonable (not huge)
                if (rect.width > 50 && rect.height > 8 && rect.width < 1200 && rect.height < 800) {
                  el.innerHTML = '<div style="font-size:12px;color:#666;padding:6px;">(附件已隱藏)</div>';
                  el.style.minHeight = '36px';
                  el.style.border = '1px dashed #ccc';
                }
              }
            } catch(e){}
          });

          // update employee fields if simple ids exist
          const emNo = document.getElementById('em_no'); if (emNo) { try { emNo.value = employee.id; } catch(e){} }
          const emName = document.getElementById('em_name'); if (emName) { try { emName.innerText = employee.name; } catch(e){} }
        } catch(e){}
      }, p.employee);

      // Small delay then take full page screenshot
      await page.waitForTimeout(250);
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
