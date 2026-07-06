(function () {
  'use strict';

  var PATH = location.pathname;
  var FORM = (PATH.match(/SW\d{4}/) || [''])[0];

  /* ---------- shared date helpers ---------- */
  function gregToMinguo(v) {                 // "2026-07-10" -> "115/07/10"
    if (!v) return '';
    var p = v.split('-');
    return (Number(p[0]) - 1911) + '/' + p[1] + '/' + p[2];
  }
  function minguoToGreg(v) {                  // "115/07/10" -> "2026-07-10"
    if (!v) return '';
    var m = v.match(/(\d+)\D+(\d+)\D+(\d+)/);
    if (!m) return '';
    var y = Number(m[1]); if (y < 1911) y += 1911;
    return y + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  }
  function pad(n) { return ('0' + n).slice(-2); }
  function todayMinguo() {
    var d = new Date();
    return (d.getFullYear() - 1911) + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate());
  }
  function monthsAgoMinguo(n) {
    var d = new Date(); d.setMonth(d.getMonth() - n);
    return (d.getFullYear() - 1911) + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate());
  }
  function g(id) { return document.getElementById(id); }
  function setNative(id, val) {
    var e = g(id); if (!e) return;
    e.value = val;
    e.dispatchEvent(new Event('input', { bubbles: true }));
    e.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function ready(test, cb, tries) {
    tries = tries || 0;
    if (test()) return cb();
    if (tries > 80) return;                   // ~20s then give up
    setTimeout(function () { ready(test, cb, tries + 1); }, 250);
  }

  /* ---------- overlay-form comfort helpers: inline validation, remember
   * last-used type, and a per-form reason-history quick-pick ---------- */
  function showError(msg) { var el = g('hrx-err'); if (el) { el.textContent = msg; el.style.display = ''; } }
  function clearError() { var el = g('hrx-err'); if (el) el.style.display = 'none'; }
  function validateRange(fdId, ftId, tdId, ttId) {
    var fd = g(fdId).value, ft = g(ftId).value, td = g(tdId).value, tt = g(ttId).value;
    if (!fd || !ft || !td || !tt) return '請填寫完整的開始與結束日期時間';
    if (!(new Date(td + 'T' + tt) > new Date(fd + 'T' + ft))) return '結束時間必須晚於開始時間';
    return null;
  }
  function lastTypeKey(form) { return 'hrx_last_type_' + form; }
  function reasonHistKey(form) { return 'hrx_reason_hist_' + form; }
  function getReasonHistory(form) {
    try { return JSON.parse(localStorage.getItem(reasonHistKey(form)) || '[]'); } catch (e) { return []; }
  }
  function pushReasonHistory(form, reason) {
    reason = (reason || '').trim(); if (!reason) return;
    var list = getReasonHistory(form).filter(function (r) { return r !== reason; });
    list.unshift(reason); list = list.slice(0, 6);
    try { localStorage.setItem(reasonHistKey(form), JSON.stringify(list)); } catch (e) { }
  }
  function escHtml(s) { return s.replace(/[<>&]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]; }); }
  // Renders reason-history chips into #hrx-chips; clicking one fills the reason
  // textarea. Call once after the panel is in the DOM.
  function wireReasonChips(form, reasonId) {
    var box = g('hrx-chips'); if (!box) return;
    var hist = getReasonHistory(form);
    if (!hist.length) { box.innerHTML = ''; return; }
    box.innerHTML = hist.map(function (r, i) { return '<button type="button" class="hrx-chip" data-i="' + i + '">' + escHtml(r) + '</button>'; }).join('');
    [].slice.call(box.querySelectorAll('.hrx-chip')).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var el = g(reasonId); el.value = hist[Number(btn.dataset.i)];
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
  }
  // Prefill a <select> from the last value used for this form, if not already set.
  function restoreLastType(form, typeId, sync) {
    var lt = localStorage.getItem(lastTypeKey(form));
    if (lt && g(typeId) && !g(typeId).value) { g(typeId).value = lt; sync(); }
  }

  /* ---------- optional parallel Google Calendar event ----------
   * Opens Google Calendar's "render" quick-add page in a new tab, prefilled
   * with the same date/time/reason as the leave/trip application — the user
   * still has to click 儲存 there themselves, same "draft + human confirms"
   * pattern as the rest of this script. No Google API/OAuth involved. */
  function gcalPrefKey(form) { return 'hrx_gcal_' + form; }
  function openGCalEvent(title, fd, ft, td, tt, details) {
    function stamp(d, t) { return d.replace(/-/g, '') + 'T' + t.replace(':', '') + '00'; }
    var qs = 'action=TEMPLATE&text=' + encodeURIComponent(title) +
      '&dates=' + stamp(fd, ft) + '/' + stamp(td, tt) +
      '&details=' + encodeURIComponent(details || '') + '&ctz=Asia%2FTaipei';
    window.open('https://calendar.google.com/calendar/render?' + qs, '_blank');
  }
  function wireGCalToggle(form, checkboxId) {
    var cb = g(checkboxId); if (!cb) return;
    cb.checked = localStorage.getItem(gcalPrefKey(form)) === '1';
    cb.addEventListener('change', function () {
      try { localStorage.setItem(gcalPrefKey(form), cb.checked ? '1' : '0'); } catch (e) { }
    });
  }

  /* ---------- 考勤異常 decode + draft handoff ---------- */
  function oleGreg(s) {                       // OLE/Excel serial -> "YYYY-MM-DD"
    var d = new Date(Date.UTC(1899, 11, 30) + Number(s) * 86400000);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }
  function fracHHMM(f) { var m = Math.round(Number(f) * 1440); return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
  function hhmmH(t) { var p = t.split(':'); return Number(p[0]) + Number(p[1]) / 60; }
  // One-shot: a dashboard row stashes a draft in localStorage; the target form
  // reads + clears it on open and pre-fills itself (same-origin handoff).
  function takeDraft(form) {
    try {
      var raw = localStorage.getItem('hrx_draft'); if (!raw) return null;
      var d = JSON.parse(raw); if (d && d.form === form) { localStorage.removeItem('hrx_draft'); return d; }
    } catch (e) { }
    return null;
  }

  /* ---------- settings + background channel ----------
   * Settings (username / company / autoLogin / notify) are NON-SECRET. We never
   * store the password anywhere — auto-login relies on the browser's own
   * password manager autofilling the field; we only click 登入 afterwards. */
  function getSettings() { try { return JSON.parse(localStorage.getItem('hrx_settings') || '{}'); } catch (e) { return {}; } }
  function saveSettings(s) {
    try { localStorage.setItem('hrx_settings', JSON.stringify(s)); } catch (e) { }
    try { if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) chrome.storage.local.set({ hrx_settings: s }); } catch (e) { }
  }
  // Tell the extension background worker the current state (anomaly count / login
  // status). No-op in the Tampermonkey userscript (no chrome.runtime).
  function reportStatus(n, loggedIn) {
    try { if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) chrome.runtime.sendMessage({ type: 'hrx_status', n: n, loggedIn: loggedIn }); } catch (e) { }
  }
  function findByText(labels) {
    var all = document.querySelectorAll('a,button,input[type=button],input[type=submit],div,span');
    for (var i = 0; i < all.length; i++) {
      var t = (all[i].textContent || all[i].value || '').replace(/\s+/g, '').trim();
      for (var j = 0; j < labels.length; j++) if (t === labels[j]) return all[i];
    }
    return null;
  }

  /* ---------- live leave balance (scraped from parent banner) ---------- */
  function readBalance() {
    // The banner is a rotating marquee, so innerText only shows the visible
    // message. Scan leaf elements' textContent (incl. hidden ones) in the parent.
    try {
      var els = window.top.document.querySelectorAll('span,div,p,td,li,marquee,b,font');
      function scan(re) {
        for (var i = 0; i < els.length; i++) {
          if (els[i].children.length === 0) {
            var m = els[i].textContent.match(re);
            if (m) return m[1];
          }
        }
      }
      var rem = scan(/至[\d/]+\s*剩餘特休[:：]\s*([\d.]+)/);
      var used = scan(/已休特休[:：]\s*([\d.]+)/);
      var total = scan(/新增特休[:：]\s*([\d.]+)/);
      var period = scan(/(\d{2,3}\/\d{2}\/\d{2}\s*~\s*\d{2,3}\/\d{2}\/\d{2})/);
      if (!rem && !used) return null;
      return { rem: rem, used: used, total: total, period: period };
    } catch (e) { return null; }
  }
  function balanceHTML() {
    var b = readBalance();
    if (!b) return '剩餘特休：可從「功能選項 → 特補休剩餘天數」查詢';
    return '本年度剩餘特休 <b>' + (b.rem || '—') + ' 天</b>' +
      (b.used && b.total ? '　・　已休 ' + b.used + ' / ' + b.total + ' 天' : '') +
      (b.period ? '　<span style="color:#8a93a6">（' + b.period + '）</span>' : '');
  }

  /* ================= SW0009 : LEAVE FORM (full overlay) ================= */
  var TYPES = [
    ['a01', '特休'], ['a03', '病假'], ['a04', '事假'], ['a02', '補休'],
    ['a08', '婚假'], ['a09', '喪假'], ['a06', '公假'], ['a07', '公傷病假'],
    ['a10', '產假一'], ['a12', '陪產假'], ['a18', '生理假'], ['a19', '育嬰假'],
    ['a20', '家庭照顧假'], ['a21', '預告假'], ['a22', '安胎假'], ['a23', '產檢假'],
    ['a24', '防疫照顧假'], ['a25', '防疫隔離假一'], ['a28', '歲時祭儀假'],
    ['B01', '主管簽核特別假'], ['B03', '颱風假'], ['B07', '產檢假'], ['B08', '旅遊假'],
    ['B10', '特殊照顧假'], ['B11', '旅遊假(112剩餘)'], ['B12', '公出(員工聚餐)']
  ];

  function enhanceLeave() {
    if (g('hrx-panel')) return;
    var panel = document.createElement('div');
    panel.id = 'hrx-panel';
    panel.innerHTML = OVERLAY_CSS +
      '<button class="hrx-toggle" id="hrx-toggle">顯示原始介面 ▸</button>' +
      '<div id="hrx-card">' +
      '  <h1>🌴 請假申請</h1><p class="sub">表單 SW0009</p>' +
      '  <div class="hrx-bal" id="hrx-bal">' + balanceHTML() + '</div>' +
      '  <div class="hrx-row"><div class="hrx-f" style="flex:1 1 100%"><label>假別</label>' +
      '    <select id="hrx-type"><option value="">— 請選擇假別 —</option>' +
           TYPES.map(function (t) { return '<option value="' + t[0] + '">' + t[1] + '（' + t[0] + '）</option>'; }).join('') +
      '  </select></div></div>' +
      '  <div class="hrx-row">' +
      '    <div class="hrx-f"><label>開始日期</label><input type="date" id="hrx-fd"></div>' +
      '    <div class="hrx-f"><label>開始時間</label><input type="time" id="hrx-ft" step="600"></div></div>' +
      '  <div class="hrx-row">' +
      '    <div class="hrx-f"><label>結束日期</label><input type="date" id="hrx-td"></div>' +
      '    <div class="hrx-f"><label>結束時間</label><input type="time" id="hrx-tt" step="600"></div></div>' +
      '  <div class="hrx-presets">' +
      '    <button data-p="all">全天 (09:00–18:00)</button>' +
      '    <button data-p="am">上半天 (09:00–13:00)</button>' +
      '    <button data-p="pm">下半天 (14:00–18:00)</button></div>' +
      '  <div class="hrx-row"><div class="hrx-f" style="flex:1 1 100%"><label>請假事由</label>' +
      '    <textarea id="hrx-reason" rows="2" placeholder="例如：家庭旅遊"></textarea>' +
      '    <div class="hrx-chips" id="hrx-chips"></div></div></div>' +
      '  <div class="hrx-row"><div class="hrx-f" style="flex:1 1 100%"><label class="hrx-check"><input type="checkbox" id="hrx-gcal"> 同時建立 Google 日曆事件（另開分頁，需自行按「儲存」）</label></div></div>' +
      '  <div class="hrx-err" id="hrx-err" style="display:none"></div>' +
      '  <div class="hrx-act"><button class="hrx-primary" id="hrx-apply">送出申請</button>' +
      '    <button class="hrx-ghost" id="hrx-clear">清空</button>' +
      '    <button class="hrx-ghost" id="hrx-back">← 返回首頁</button></div>' +
      '</div>';
    document.body.appendChild(panel);

    var native = [].slice.call(document.body.children).filter(function (el) { return el.id !== 'hrx-panel'; });
    native.forEach(function (el) { el.dataset.hrxPrev = el.style.visibility || ''; el.style.visibility = 'hidden'; });

    function sync() {
      var code = g('hrx-type').value;
      var match = TYPES.filter(function (x) { return x[0] === code; })[0];
      setNative('ab_type', code);
      if (g('ab_name')) g('ab_name').textContent = match ? match[1] : '';
      setNative('from_date', gregToMinguo(g('hrx-fd').value));
      setNative('to_date', gregToMinguo(g('hrx-td').value));
      setNative('from_time', g('hrx-ft').value);
      setNative('to_time', g('hrx-tt').value);
      setNative('reason', g('hrx-reason').value);
    }
    ['hrx-type', 'hrx-fd', 'hrx-ft', 'hrx-td', 'hrx-tt', 'hrx-reason'].forEach(function (id) {
      g(id).addEventListener('change', sync); g(id).addEventListener('input', sync);
    });
    [].slice.call(document.querySelectorAll('.hrx-presets button')).forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.dataset.p;
        if (g('hrx-fd').value && !g('hrx-td').value) g('hrx-td').value = g('hrx-fd').value;
        if (p === 'all') { g('hrx-ft').value = '09:00'; g('hrx-tt').value = '18:00'; }
        if (p === 'am') { g('hrx-ft').value = '09:00'; g('hrx-tt').value = '13:00'; }
        if (p === 'pm') { g('hrx-ft').value = '14:00'; g('hrx-tt').value = '18:00'; }
        sync();
      });
    });
    g('hrx-clear').addEventListener('click', function () {
      ['hrx-type', 'hrx-fd', 'hrx-ft', 'hrx-td', 'hrx-tt', 'hrx-reason'].forEach(function (id) { g(id).value = ''; });
      sync();
    });
    g('hrx-apply').addEventListener('click', function () {
      var err = !g('hrx-type').value ? '請選擇假別'
        : validateRange('hrx-fd', 'hrx-ft', 'hrx-td', 'hrx-tt')
        || (!g('hrx-reason').value.trim() ? '請填寫請假事由' : null);
      if (err) { showError(err); return; }
      clearError();
      sync();
      localStorage.setItem(lastTypeKey('SW0009'), g('hrx-type').value);
      pushReasonHistory('SW0009', g('hrx-reason').value);
      if (g('hrx-gcal').checked) {
        var match = TYPES.filter(function (x) { return x[0] === g('hrx-type').value; })[0];
        openGCalEvent('請假：' + (match ? match[1] : ''),
          g('hrx-fd').value, g('hrx-ft').value, g('hrx-td').value, g('hrx-tt').value,
          g('hrx-reason').value);
      }
      // Reveal the native form FIRST, so the system's own confirmation / result
      // dialogs (which the overlay would otherwise cover) are visible.
      var p = g('hrx-panel'); if (p) p.style.display = 'none';
      native.forEach(function (el) { el.style.visibility = 'visible'; });
      var b = g('apply_button'); if (b) b.click();
    });
    g('hrx-back').addEventListener('click', function () { var q = g('quit_button'); if (q) q.click(); });

    var shown = false;
    g('hrx-toggle').addEventListener('click', function () {
      shown = !shown;
      g('hrx-card').style.display = shown ? 'none' : '';
      native.forEach(function (el) { el.style.visibility = shown ? 'visible' : 'hidden'; });
      g('hrx-toggle').textContent = shown ? '◂ 回到新版介面' : '顯示原始介面 ▸';
    });

    wireReasonChips('SW0009', 'hrx-reason');
    wireGCalToggle('SW0009', 'hrx-gcal');
    restoreLastType('SW0009', 'hrx-type', sync);
    var draft = takeDraft('SW0009');   // pre-fill from a 考勤異常 batch draft, if any
    if (draft) {
      if (draft.typeCode) g('hrx-type').value = draft.typeCode;
      if (draft.date) { g('hrx-fd').value = draft.date; g('hrx-td').value = draft.date; }
      if (draft.from) g('hrx-ft').value = draft.from;
      if (draft.to) g('hrx-tt').value = draft.to;
      if (draft.reason) g('hrx-reason').value = draft.reason;
      sync();
    }
  }

  /* ================= SW0212 : 公出/出差 (full overlay) ================= */
  var TRIP_TYPES = [['a13', '公出'], ['a14', '出差']];

  function enhanceTrip() {
    if (g('hrx-panel')) return;
    var panel = document.createElement('div');
    panel.id = 'hrx-panel';
    panel.innerHTML = OVERLAY_CSS +
      '<button class="hrx-toggle" id="hrx-toggle">顯示原始介面 ▸</button>' +
      '<div id="hrx-card">' +
      '  <h1>🚗 公出／出差申請</h1><p class="sub">表單 SW0212</p>' +
      '  <div class="hrx-row"><div class="hrx-f" style="flex:1 1 100%"><label>類別</label>' +
      '    <select id="hrx-type"><option value="">— 請選擇 —</option>' +
           TRIP_TYPES.map(function (t) { return '<option value="' + t[0] + '">' + t[1] + '（' + t[0] + '）</option>'; }).join('') +
      '  </select></div></div>' +
      '  <div class="hrx-row">' +
      '    <div class="hrx-f"><label>開始日期</label><input type="date" id="hrx-fd"></div>' +
      '    <div class="hrx-f"><label>開始時間</label><input type="time" id="hrx-ft" step="600"></div></div>' +
      '  <div class="hrx-row">' +
      '    <div class="hrx-f"><label>結束日期</label><input type="date" id="hrx-td"></div>' +
      '    <div class="hrx-f"><label>結束時間</label><input type="time" id="hrx-tt" step="600"></div></div>' +
      '  <div class="hrx-presets">' +
      '    <button data-p="all">全天 (09:00–18:00)</button>' +
      '    <button data-p="am">上半天 (09:00–13:00)</button>' +
      '    <button data-p="pm">下半天 (14:00–18:00)</button></div>' +
      '  <div class="hrx-row"><div class="hrx-f" style="flex:1 1 100%"><label>事由</label>' +
      '    <textarea id="hrx-reason" rows="2" placeholder="例如：客戶拜訪 / 供應商稽核"></textarea>' +
      '    <div class="hrx-chips" id="hrx-chips"></div></div></div>' +
      '  <div class="hrx-row"><div class="hrx-f" style="flex:1 1 100%"><label class="hrx-check"><input type="checkbox" id="hrx-gcal"> 同時建立 Google 日曆事件（另開分頁，需自行按「儲存」）</label></div></div>' +
      '  <div class="hrx-err" id="hrx-err" style="display:none"></div>' +
      '  <div class="hrx-act"><button class="hrx-primary" id="hrx-apply">送出申請</button>' +
      '    <button class="hrx-ghost" id="hrx-clear">清空</button>' +
      '    <button class="hrx-ghost" id="hrx-back">← 返回首頁</button></div>' +
      '</div>';
    document.body.appendChild(panel);

    var native = [].slice.call(document.body.children).filter(function (el) { return el.id !== 'hrx-panel'; });
    native.forEach(function (el) { el.dataset.hrxPrev = el.style.visibility || ''; el.style.visibility = 'hidden'; });

    function sync() {
      setNative('ab_type', g('hrx-type').value);   // native <select>, .value selects the option
      setNative('from_date', gregToMinguo(g('hrx-fd').value));
      setNative('to_date', gregToMinguo(g('hrx-td').value));
      setNative('from_time', g('hrx-ft').value);
      setNative('to_time', g('hrx-tt').value);
      setNative('reason', g('hrx-reason').value);
    }
    ['hrx-type', 'hrx-fd', 'hrx-ft', 'hrx-td', 'hrx-tt', 'hrx-reason'].forEach(function (id) {
      g(id).addEventListener('change', sync); g(id).addEventListener('input', sync);
    });
    [].slice.call(document.querySelectorAll('.hrx-presets button')).forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.dataset.p;
        if (g('hrx-fd').value && !g('hrx-td').value) g('hrx-td').value = g('hrx-fd').value;
        if (p === 'all') { g('hrx-ft').value = '09:00'; g('hrx-tt').value = '18:00'; }
        if (p === 'am') { g('hrx-ft').value = '09:00'; g('hrx-tt').value = '13:00'; }
        if (p === 'pm') { g('hrx-ft').value = '14:00'; g('hrx-tt').value = '18:00'; }
        sync();
      });
    });
    g('hrx-clear').addEventListener('click', function () {
      ['hrx-type', 'hrx-fd', 'hrx-ft', 'hrx-td', 'hrx-tt', 'hrx-reason'].forEach(function (id) { g(id).value = ''; });
      sync();
    });
    g('hrx-apply').addEventListener('click', function () {
      var err = !g('hrx-type').value ? '請選擇類別'
        : validateRange('hrx-fd', 'hrx-ft', 'hrx-td', 'hrx-tt')
        || (!g('hrx-reason').value.trim() ? '請填寫事由' : null);
      if (err) { showError(err); return; }
      clearError();
      sync();
      localStorage.setItem(lastTypeKey('SW0212'), g('hrx-type').value);
      pushReasonHistory('SW0212', g('hrx-reason').value);
      if (g('hrx-gcal').checked) {
        var match = TRIP_TYPES.filter(function (x) { return x[0] === g('hrx-type').value; })[0];
        openGCalEvent((match ? match[1] : '公出/出差') + '：' + g('hrx-reason').value,
          g('hrx-fd').value, g('hrx-ft').value, g('hrx-td').value, g('hrx-tt').value,
          g('hrx-reason').value);
      }
      // Reveal the native form FIRST, so the system's own confirmation / result
      // dialogs (which the overlay would otherwise cover) are visible.
      var p = g('hrx-panel'); if (p) p.style.display = 'none';
      native.forEach(function (el) { el.style.visibility = 'visible'; });
      var b = g('apply_button'); if (b) b.click();
    });
    g('hrx-back').addEventListener('click', function () { var q = g('quit_button'); if (q) q.click(); });

    var shown = false;
    g('hrx-toggle').addEventListener('click', function () {
      shown = !shown;
      g('hrx-card').style.display = shown ? 'none' : '';
      native.forEach(function (el) { el.style.visibility = shown ? 'visible' : 'hidden'; });
      g('hrx-toggle').textContent = shown ? '◂ 回到新版介面' : '顯示原始介面 ▸';
    });

    wireReasonChips('SW0212', 'hrx-reason');
    restoreLastType('SW0212', 'hrx-type', sync);
    wireGCalToggle('SW0212', 'hrx-gcal');
    var draft = takeDraft('SW0212');   // pre-fill from a 考勤異常 batch draft, if any
    if (draft) {
      if (draft.typeCode) g('hrx-type').value = draft.typeCode;
      if (draft.date) { g('hrx-fd').value = draft.date; g('hrx-td').value = draft.date; }
      if (draft.from) g('hrx-ft').value = draft.from;
      if (draft.to) g('hrx-tt').value = draft.to;
      if (draft.reason) g('hrx-reason').value = draft.reason;
      sync();
    }
  }

  /* ================= SW0013 : 補卡/忘打卡 (full overlay) ================= */
  var PUNCH_TYPES = [['0', '上班'], ['1', '下班'], ['2', '休息開始'], ['3', '休息結束'], ['4', '加班開始']];

  function enhancePunch() {
    if (g('hrx-panel')) return;
    var panel = document.createElement('div');
    panel.id = 'hrx-panel';
    panel.innerHTML = OVERLAY_CSS +
      '<button class="hrx-toggle" id="hrx-toggle">顯示原始介面 ▸</button>' +
      '<div id="hrx-card">' +
      '  <h1>🕐 補卡申請（忘打卡）</h1><p class="sub">表單 SW0013</p>' +
      '  <div class="hrx-bal" style="background:#fff7e6;border-color:#ffe0a3;color:#8a6d1a">💡 系統偵測到的忘打卡，可在「顯示原始介面 → 帶入考勤忘打卡」自動帶入；此處為手動補登。</div>' +
      '  <div class="hrx-row">' +
      '    <div class="hrx-f"><label>補卡類別</label><select id="hrx-type"><option value="">— 請選擇 —</option>' +
           PUNCH_TYPES.map(function (t) { return '<option value="' + t[0] + '">' + t[1] + '</option>'; }).join('') +
      '    </select></div>' +
      '    <div class="hrx-f"><label>補卡日期</label><input type="date" id="hrx-pd"></div>' +
      '    <div class="hrx-f"><label>補卡時間</label><input type="time" id="hrx-pt" step="60"></div></div>' +
      '  <div class="hrx-row"><div class="hrx-f" style="flex:1 1 100%"><label>事由</label>' +
      '    <textarea id="hrx-reason" rows="2" placeholder="例如：忘記打下班卡"></textarea>' +
      '    <div class="hrx-chips" id="hrx-chips"></div></div></div>' +
      '  <div class="hrx-err" id="hrx-err" style="display:none"></div>' +
      '  <div class="hrx-act"><button class="hrx-primary" id="hrx-apply">送出申請</button>' +
      '    <button class="hrx-ghost" id="hrx-clear">清空</button>' +
      '    <button class="hrx-ghost" id="hrx-back">← 返回首頁</button></div>' +
      '</div>';
    document.body.appendChild(panel);

    var native = [].slice.call(document.body.children).filter(function (el) { return el.id !== 'hrx-panel'; });
    native.forEach(function (el) { el.dataset.hrxPrev = el.style.visibility || ''; el.style.visibility = 'hidden'; });

    function sync() {
      setNative('typeName', g('hrx-type').value);
      setNative('punch_date', gregToMinguo(g('hrx-pd').value));
      setNative('punch_time', g('hrx-pt').value);
      setNative('reason', g('hrx-reason').value);
    }
    ['hrx-type', 'hrx-pd', 'hrx-pt', 'hrx-reason'].forEach(function (id) {
      g(id).addEventListener('change', sync); g(id).addEventListener('input', sync);
    });
    g('hrx-clear').addEventListener('click', function () {
      ['hrx-type', 'hrx-pd', 'hrx-pt', 'hrx-reason'].forEach(function (id) { g(id).value = ''; }); sync();
    });
    g('hrx-apply').addEventListener('click', function () {
      var err = !g('hrx-type').value ? '請選擇補卡類別'
        : (!g('hrx-pd').value || !g('hrx-pt').value) ? '請填寫補卡日期與時間'
        : (!g('hrx-reason').value.trim() ? '請填寫事由' : null);
      if (err) { showError(err); return; }
      clearError();
      sync();
      localStorage.setItem(lastTypeKey('SW0013'), g('hrx-type').value);
      pushReasonHistory('SW0013', g('hrx-reason').value);
      // Reveal the native form FIRST, so the system's own confirmation / result
      // dialogs (which the overlay would otherwise cover) are visible.
      var p = g('hrx-panel'); if (p) p.style.display = 'none';
      native.forEach(function (el) { el.style.visibility = 'visible'; });
      var b = g('apply_button'); if (b) b.click();
    });
    g('hrx-back').addEventListener('click', function () { var q = g('quit_button'); if (q) q.click(); });

    var shown = false;
    g('hrx-toggle').addEventListener('click', function () {
      shown = !shown;
      g('hrx-card').style.display = shown ? 'none' : '';
      native.forEach(function (el) { el.style.visibility = shown ? 'visible' : 'hidden'; });
      g('hrx-toggle').textContent = shown ? '◂ 回到新版介面' : '顯示原始介面 ▸';
    });

    wireReasonChips('SW0013', 'hrx-reason');
    restoreLastType('SW0013', 'hrx-type', sync);
  }

  /* ================= SW0005 : OVERTIME (companion pickers) ================= */
  function attachCompanions(dateIds, timeIds) {
    dateIds.forEach(function (id) {
      var f = g(id); if (!f || f.dataset.hrxDone) return; f.dataset.hrxDone = '1';
      var c = document.createElement('input');
      c.type = 'date'; c.className = 'hrx-comp';
      c.value = minguoToGreg(f.value);
      c.addEventListener('change', function () { setNative(id, gregToMinguo(c.value)); });
      f.parentNode.insertBefore(c, f.nextSibling);
    });
    timeIds.forEach(function (id) {
      var f = g(id); if (!f || f.dataset.hrxDone) return; f.dataset.hrxDone = '1';
      var c = document.createElement('input');
      c.type = 'time'; c.step = '600'; c.className = 'hrx-comp';
      c.value = /^\d{1,2}:\d{2}/.test(f.value) ? f.value : '';
      c.addEventListener('change', function () { setNative(id, c.value); });
      f.parentNode.insertBefore(c, f.nextSibling);
    });
    if (!g('hrx-comp-style')) {
      var s = document.createElement('style'); s.id = 'hrx-comp-style';
      s.textContent = '.hrx-comp{margin-left:6px;font-size:14px;padding:4px 6px;border:1.5px solid #1558d6;border-radius:6px;vertical-align:middle}';
      document.head.appendChild(s);
    }
  }
  function enhanceOvertime() {
    // NOTE: intentionally does NOT touch 考勤日期 (punch_date). Choosing that date
    // triggers a server-side lookup that populates the overtime-type <select>
    // (typeName) via the native date-picker's own callback — a programmatic value
    // set does not fire it. So punch_date + typeName stay fully native; we only
    // add native pickers to the overtime-hours fields (from/to date & time).
    attachCompanions(['from_date', 'to_date'], ['from_time', 'to_time']);
  }

  /* ================= SW0037 : LEAVE QUERY (auto-widen range) ================= */
  function enhanceQuery() {
    var s = g('start_date'), e = g('end_date');
    if (!s || !e || s.dataset.hrxDone) return;
    s.dataset.hrxDone = '1';
    // Default the single-day range to the last 6 months so results show up.
    s.value = monthsAgoMinguo(6); s.dispatchEvent(new Event('change', { bubbles: true }));
    e.value = todayMinguo();      e.dispatchEvent(new Event('change', { bubbles: true }));
    var btn = g('select_btn'); if (btn) btn.click();   // auto-run the (read-only) search
  }

  /* ============= SW0405 : 不加班說明 (range default + companions) ============= */
  function enhanceExplain() {
    var st = g('punch_date_st'), ed = g('punch_date_ed');
    if (!st || !ed || st.dataset.hrxDone) return;
    st.dataset.hrxDone = '1';
    st.value = monthsAgoMinguo(2); st.dispatchEvent(new Event('change', { bubbles: true }));
    ed.value = todayMinguo();      ed.dispatchEvent(new Event('change', { bubbles: true }));
    attachCompanions(['punch_date_st', 'punch_date_ed'], []);  // native pickers to adjust
    var btn = g('selectButton'); if (btn) btn.click();          // auto-load records needing explanation
  }

  /* ============= EIP 預約管理 : 會議室預約 (companion pickers + reason chips) =============
   * Runs inside eip.pesi.com.tw's am_view.htm mainFrame. Fields have no ids
   * (only `name`), and the AM/PM hour <select> uses values like "AM 09" /
   * "PM 05" with 0 as "AM 00" and noon as "PM 12" — quarter-hour minute
   * options only (00/15/30/45). We add native date/time pickers next to the
   * native selects (same non-invasive pattern as SW0005/SW0405) rather than
   * a full overlay, since this is a shared cross-department resource booker
   * we don't want to redesign wholesale. */
  function byName(n) { return document.getElementsByName(n)[0]; }
  function hourToSelectValue(h) {
    if (h === 0) return 'AM 00';
    if (h < 12) return 'AM ' + pad(h);
    if (h === 12) return 'PM 12';
    return 'PM ' + pad(h - 12);
  }
  function selectValueToHour(v) {
    var m = /^([AP]M) (\d{2})$/.exec(v || ''); if (!m) return null;
    var hh = Number(m[2]);
    return m[1] === 'AM' ? hh : (hh === 12 ? 12 : hh + 12);
  }
  function ensureRoomStyle() {
    if (g('hrx-comp-style')) return;
    var s = document.createElement('style'); s.id = 'hrx-comp-style';
    s.textContent = '.hrx-comp{margin-left:6px;font-size:14px;padding:4px 6px;border:1.5px solid #1558d6;border-radius:6px;vertical-align:middle}' +
      '.hrx-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}' +
      '.hrx-chip{border:1px solid #cdd5e4;background:#f7f9fd;color:#43506b;border-radius:14px;padding:5px 11px;font-size:12px;cursor:pointer;font-family:inherit}' +
      '.hrx-chip:hover{border-color:#1558d6;color:#1558d6;background:#eef4ff}';
    document.head.appendChild(s);
  }
  function enhanceRoomBooking() {
    var rentDate = g('rentDate');
    if (!rentDate || rentDate.dataset.hrxDone) return;
    rentDate.dataset.hrxDone = '1';
    ensureRoomStyle();

    var dc = document.createElement('input');
    dc.type = 'date'; dc.className = 'hrx-comp';
    dc.value = rentDate.value.replace(/\//g, '-');
    dc.addEventListener('change', function () {
      var p = dc.value.split('-');
      rentDate.value = p[0] + '/' + p[1] + '/' + p[2];
      rentDate.dispatchEvent(new Event('change', { bubbles: true }));
    });
    rentDate.parentNode.insertBefore(dc, rentDate.nextSibling);

    function timeCompanion(hrName, minName) {
      var hrSel = byName(hrName), minSel = byName(minName);
      if (!hrSel || !minSel) return;
      var tc = document.createElement('input');
      tc.type = 'time'; tc.step = '900'; tc.className = 'hrx-comp';
      var h = selectValueToHour(hrSel.value);
      if (h !== null) tc.value = pad(h) + ':' + (minSel.value || '00');
      tc.addEventListener('change', function () {
        var m = /^(\d{2}):(\d{2})/.exec(tc.value); if (!m) return;
        var hh = Number(m[1]), mm = Math.round(Number(m[2]) / 15) * 15;
        if (mm === 60) { mm = 0; hh = (hh + 1) % 24; }
        hrSel.value = hourToSelectValue(hh); hrSel.dispatchEvent(new Event('change', { bubbles: true }));
        minSel.value = pad(mm); minSel.dispatchEvent(new Event('change', { bubbles: true }));
      });
      hrSel.parentNode.insertBefore(tc, minSel.nextSibling);
    }
    timeCompanion('hr1', 'min1');
    timeCompanion('hr2', 'min2');

    // reason-history quick-pick chips for the custom-purpose textarea
    var useBox = byName('useBox');
    if (useBox) {
      var box = document.createElement('div'); box.className = 'hrx-chips';
      useBox.parentNode.insertBefore(box, useBox.nextSibling);
      var render = function () {
        var hist = getReasonHistory('MEETING');
        box.innerHTML = hist.map(function (r, i) {
          return '<button type="button" class="hrx-chip" data-i="' + i + '">' + escHtml(r) + '</button>';
        }).join('');
        [].slice.call(box.querySelectorAll('.hrx-chip')).forEach(function (btn) {
          btn.addEventListener('click', function () {
            useBox.value = hist[Number(btn.dataset.i)];
            useBox.dispatchEvent(new Event('input', { bubbles: true }));
            var radios = document.getElementsByName('use');   // select the custom-text radio, not the common-phrase one
            if (radios[1]) radios[1].checked = true;
          });
        });
      };
      render();
      useBox.addEventListener('change', function () { pushReasonHistory('MEETING', useBox.value); render(); });
    }
  }

  /* ---------- shared overlay CSS ---------- */
  var OVERLAY_CSS =
    '<style>' +
    '#hrx-panel{position:fixed;inset:0;z-index:99999;background:#f4f6fb;font-family:"Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif;overflow:auto;padding:20px;box-sizing:border-box}' +
    '#hrx-card{max-width:640px;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 8px 30px rgba(20,40,90,.12);padding:26px 30px;box-sizing:border-box}' +
    '#hrx-card h1{font-size:22px;margin:0 0 4px;color:#1a2b4a}' +
    '#hrx-card .sub{color:#8a93a6;font-size:13px;margin:0 0 20px}' +
    '.hrx-bal{background:#eef4ff;border:1px solid #d6e4ff;border-radius:10px;padding:10px 14px;font-size:14px;color:#25406e;margin-bottom:20px}' +
    '.hrx-bal b{font-size:17px;color:#1558d6}' +
    '.hrx-row{display:flex;gap:16px;margin-bottom:18px;flex-wrap:wrap}' +
    '.hrx-f{flex:1;min-width:180px;display:flex;flex-direction:column;gap:6px}' +
    '.hrx-f label{font-size:13px;font-weight:600;color:#43506b}' +
    // height:auto/min-height/appearance are !important to beat the legacy form's
    // leaked "select{height:28px;appearance:none}" which clipped the text.
    '.hrx-f input,.hrx-f select,.hrx-f textarea{font-size:16px;padding:11px 12px;border:1.5px solid #cdd5e4;border-radius:9px;background:#fff;color:#1a2b4a;outline:none;font-family:inherit;box-sizing:border-box;height:auto!important;min-height:46px!important;line-height:1.25}' +
    '.hrx-f select{-webkit-appearance:menulist!important;appearance:menulist!important;padding-right:8px}' +
    '.hrx-f input:focus,.hrx-f select:focus,.hrx-f textarea:focus{border-color:#1558d6;box-shadow:0 0 0 3px rgba(21,88,214,.15)}' +
    '.hrx-presets{display:flex;gap:8px;margin:-6px 0 14px}' +
    '.hrx-presets button{flex:1;padding:9px;border:1.5px solid #cdd5e4;background:#f7f9fd;border-radius:8px;font-size:14px;cursor:pointer;color:#43506b;font-family:inherit}' +
    '.hrx-presets button:hover{border-color:#1558d6;color:#1558d6;background:#eef4ff}' +
    '.hrx-act{display:flex;gap:12px;margin-top:8px}' +
    '.hrx-primary{flex:2;padding:14px;border:0;border-radius:10px;background:#1558d6;color:#fff;font-size:17px;font-weight:700;cursor:pointer;font-family:inherit}' +
    '.hrx-primary:hover{background:#0f47b3}' +
    '.hrx-ghost{flex:1;padding:14px;border:1.5px solid #cdd5e4;border-radius:10px;background:#fff;color:#43506b;font-size:15px;cursor:pointer;font-family:inherit}' +
    '.hrx-toggle{position:fixed;top:12px;right:16px;font-size:12px;color:#8a93a6;background:#fff;border:1px solid #dde3ee;border-radius:20px;padding:6px 12px;cursor:pointer;z-index:100000}' +
    '.hrx-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}' +
    '.hrx-chip{border:1px solid #cdd5e4;background:#f7f9fd;color:#43506b;border-radius:14px;padding:5px 11px;font-size:12px;cursor:pointer;font-family:inherit}' +
    '.hrx-chip:hover{border-color:#1558d6;color:#1558d6;background:#eef4ff}' +
    '.hrx-err{background:#fdecea;border:1px solid #f5b5b0;color:#a33;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:12px}' +
    '.hrx-check{display:flex!important;align-items:center;gap:8px;font-weight:400!important;cursor:pointer}' +
    '.hrx-check input{min-height:auto!important;width:auto!important;padding:0!important}' +
    '</style>';

  /* ============ LOGIN (Index.html, logged-out) : username/company prefill ============ */
  // Prefills the NON-SECRET username + company code so you only type the
  // password. Never stores or touches the password (let the browser's own
  // password manager autofill that securely).
  function runLogin() {
    var s = getSettings();
    var pw = document.querySelector('input[type=password]');
    var form = (pw && pw.form) || document;
    var user = form.querySelector('input[type=text]');
    var company = form.querySelector('select');
    if (s.username && user && !user.value) { user.value = s.username; user.dispatchEvent(new Event('input', { bubbles: true })); }
    if (s.company != null && s.company !== '' && company) {
      try { company.value = s.company; company.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) { }
    }
    // Remember username/company on login (password is never captured).
    function remember() { var s2 = getSettings(); if (user) s2.username = user.value; if (company) s2.company = company.value; saveSettings(s2); }
    var btn = findByText(['登入', '登 入']);
    if (btn) btn.addEventListener('click', remember);
    if (form && form.tagName === 'FORM') form.addEventListener('submit', remember);
    reportStatus(0, false);   // tell the background worker: logged out
  }

  // Small persistent toggle for background anomaly notifications (extension only).
  function injectNotifyToggle() {
    if (document.getElementById('hrx-notify')) return;
    var el = document.createElement('div');
    el.id = 'hrx-notify';
    el.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:99997;font-family:"Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif;font-size:13px;background:#fff;border:1px solid #dde3ee;border-radius:20px;padding:7px 13px;box-shadow:0 4px 14px rgba(20,40,90,.12);cursor:pointer;color:#43506b;user-select:none';
    var draw = function () { el.textContent = getSettings().notify ? '🔔 背景通知：開' : '🔕 背景通知：關'; };
    draw();
    el.addEventListener('click', function () {
      var s = getSettings(); s.notify = !s.notify; if (s.notifyIntervalMin == null) s.notifyIntervalMin = 60;
      saveSettings(s); draw();
    });
    document.body.appendChild(el);
  }

  // Decide login vs dashboard once the SPA has rendered.
  function runHome(tries) {
    tries = tries || 0;
    if (document.querySelector('input[type=password]')) return runLogin();
    if (/考勤表單流程/.test(document.body.textContent || '')) return runDashboard();
    if (tries > 40) return;
    setTimeout(function () { runHome(tries + 1); }, 300);
  }

  /* ============ DASHBOARD (Index.html) : 考勤異常 批次處理 ============ */
  // Configurable rule engine — first matching rule wins. EDIT THIS to add buckets.
  // Each rule: match(anomaly) -> boolean; draft(anomaly) -> the corrective filing.
  var ANOMALY_RULES = [
    {
      label: '遲到 09:00–10:00 → 公出（拜訪客戶）08:00→到班',
      match: function (a) { return a.kind === 'absence' && a.entryH >= 9 && a.entryH < 10; },
      draft: function (a) {
        return { form: 'SW0212', cat: '公出/出差', formName: '公出', typeCode: 'a13',
                 date: a.date, from: '08:00', to: a.entry, reason: '拜訪客戶' };
      }
    }
    // e.g. add: 遲到 10:00–12:00 → 請假 事假；或 特定情形 → 出差(a14) ...
  ];

  // Parse the dashboard's 考勤異常 rows into structured anomalies (only the
  // "有缺勤時數無請假單" ones carry a machine-readable date/time deep-link).
  function parseAnomalies() {
    var list = [], seen = {};
    [].slice.call(document.querySelectorAll('a')).forEach(function (a) {
      var h = a.getAttribute('href') || a.getAttribute('onclick') || '';
      var m = h.match(/FROM_DATE:([\d.]+),FROM_TIME:([\d.]+),TO_DATE:[\d.]+,TO_TIME:([\d.]+)/);
      if (!m || !/缺勤/.test(a.textContent || '')) return;
      var date = oleGreg(m[1]), entry = fracHHMM(m[3]);
      var key = date + entry; if (seen[key]) return; seen[key] = 1;
      var an = { kind: 'absence', date: date, from: fracHHMM(m[2]), entry: entry, entryH: hhmmH(entry) };
      for (var i = 0; i < ANOMALY_RULES.length; i++) {
        if (ANOMALY_RULES[i].match(an)) { an.draft = ANOMALY_RULES[i].draft(an); an.rule = ANOMALY_RULES[i].label; break; }
      }
      list.push(an);
    });
    list.sort(function (x, y) { return x.date < y.date ? -1 : 1; });
    return list;
  }

  // Open a form the reliable way: click an EXISTING page control (dashboard tile
  // or menu item) whose handler already navigates to it. A synthetic .click()
  // fires that element's page-world onclick, so this works from the isolated
  // content-script world — a javascript: anchor created here would NOT, because
  // it can't see page globals like setSelectedForm.
  function openForm(formId) {
    var els = document.querySelectorAll('[onclick],[href]');
    for (var i = 0; i < els.length; i++) {
      var h = (els[i].getAttribute('onclick') || '') + ' ' + (els[i].getAttribute('href') || '');
      if (h.indexOf(formId) !== -1 && /setSelectedForm/.test(h)) { els[i].click(); return true; }
    }
    return false;
  }

  var DASH_CSS =
    '<style>' +
    '#hrx-badge{position:fixed;top:44px;left:50%;transform:translateX(-50%);z-index:99998;background:#fff;border:1px solid #ffd6a0;border-left:6px solid #f59e0b;border-radius:12px;box-shadow:0 6px 20px rgba(20,40,90,.15);padding:12px 18px;font-family:"Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif;display:flex;align-items:center;gap:14px;font-size:15px;color:#7a4a06}' +
    '#hrx-badge b{background:#f59e0b;color:#fff;border-radius:20px;padding:2px 11px;font-size:15px}' +
    '#hrx-badge button{border:0;border-radius:8px;background:#1558d6;color:#fff;font-size:14px;font-weight:700;padding:8px 16px;cursor:pointer;font-family:inherit}' +
    '#hrx-badge .x{cursor:pointer;color:#b98a3a;font-size:18px;padding:0 2px}' +
    '#hrx-modal{position:fixed;inset:0;z-index:99999;background:rgba(20,30,55,.45);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:36px 16px;font-family:"Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif}' +
    '#hrx-sheet{background:#fff;border-radius:16px;box-shadow:0 12px 40px rgba(20,40,90,.3);max-width:760px;width:100%;padding:24px 26px;box-sizing:border-box}' +
    '#hrx-sheet h2{margin:0 0 4px;font-size:20px;color:#1a2b4a}' +
    '#hrx-sheet .sub{color:#8a93a6;font-size:13px;margin:0 0 16px}' +
    '.hrx-t{width:100%;border-collapse:collapse;font-size:14px}' +
    '.hrx-t th,.hrx-t td{text-align:left;padding:9px 8px;border-bottom:1px solid #eef1f6;vertical-align:middle;color:#28344d}' +
    '.hrx-t th{font-size:12px;color:#8a93a6;font-weight:600}' +
    '.hrx-t input.rsn{width:130px;font-size:13px;padding:6px 8px;border:1.5px solid #cdd5e4;border-radius:7px;font-family:inherit}' +
    '.hrx-pill{display:inline-block;background:#eef4ff;color:#1558d6;border-radius:6px;padding:2px 8px;font-size:12px;font-weight:700}' +
    '.hrx-pill.na{background:#f4f5f7;color:#98a1b2}' +
    '.hrx-go{border:0;border-radius:8px;background:#1558d6;color:#fff;font-size:13px;font-weight:700;padding:7px 12px;cursor:pointer;font-family:inherit}' +
    '.hrx-go:disabled{background:#cbd3e1;cursor:not-allowed}' +
    '#hrx-sheet .note{margin:14px 0 0;font-size:12px;color:#8a6d1a;background:#fff7e6;border:1px solid #ffe0a3;border-radius:8px;padding:9px 12px}' +
    '#hrx-sheet .foot{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}' +
    '#hrx-sheet .foot button{border:1.5px solid #cdd5e4;background:#fff;border-radius:9px;padding:10px 18px;font-size:14px;cursor:pointer;font-family:inherit;color:#43506b}' +
    '</style>';

  function openReview(anomalies) {
    if (document.getElementById('hrx-modal')) return;
    var rows = anomalies.map(function (a, i) {
      var d = a.draft;
      var action = d
        ? '<span class="hrx-pill">' + d.formName + '</span> ' + d.from + '–' + d.to +
          ' <input class="rsn" data-i="' + i + '" value="' + d.reason + '">'
        : '<span class="hrx-pill na">無對應規則</span>';
      var btn = d
        ? '<button class="hrx-go" data-i="' + i + '">填入並開啟 ▸</button>'
        : '<button class="hrx-go" disabled>—</button>';
      return '<tr><td>' + a.date + '</td><td>到班 ' + a.entry + '</td><td>' + action + '</td><td>' + btn + '</td></tr>';
    }).join('');
    var withRule = anomalies.filter(function (a) { return a.draft; }).length;
    var modal = document.createElement('div');
    modal.id = 'hrx-modal';
    modal.innerHTML = DASH_CSS +
      '<div id="hrx-sheet">' +
      '  <h2>🗂️ 考勤異常批次處理</h2>' +
      '  <p class="sub">共 ' + anomalies.length + ' 筆缺勤異常，' + withRule + ' 筆符合規則、已自動草擬</p>' +
      '  <table class="hrx-t"><thead><tr><th>日期</th><th>到班時間</th><th>建議處理（可改事由）</th><th></th></tr></thead>' +
      '  <tbody>' + rows + '</tbody></table>' +
      '  <p class="note">⚠️ 送出前請確認事由與實際情形相符。按「填入並開啟」會開啟已填好的表單，最後仍由你按【送出申請】確認，不會自動送出。</p>' +
      '  <div class="foot"><button id="hrx-close">關閉</button></div>' +
      '</div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
    document.getElementById('hrx-close').addEventListener('click', function () { modal.remove(); });
    [].slice.call(modal.querySelectorAll('.rsn')).forEach(function (inp) {
      inp.addEventListener('input', function () { anomalies[Number(inp.dataset.i)].draft.reason = inp.value; });
    });
    [].slice.call(modal.querySelectorAll('.hrx-go[data-i]')).forEach(function (b) {
      b.addEventListener('click', function () {
        var d = anomalies[Number(b.dataset.i)].draft; if (!d) return;
        localStorage.setItem('hrx_draft', JSON.stringify(d));
        modal.remove();
        openForm(d.form);
      });
    });
  }

  function runDashboard() {
    injectNotifyToggle();
    var render = function () {
      var old = document.getElementById('hrx-badge'); if (old) old.remove();
      var anomalies = parseAnomalies();
      reportStatus(anomalies.length, true);        // update badge / background poll
      if (!anomalies.length) return;               // N == 0 → no nag
      var badge = document.createElement('div');
      badge.id = 'hrx-badge';
      badge.innerHTML = DASH_CSS + '⚠️ 有 <b>' + anomalies.length + '</b> 筆考勤異常待處理' +
        '<button id="hrx-open">批次處理 ▸</button><span class="x" title="關閉">×</span>';
      document.body.appendChild(badge);
      badge.querySelector('#hrx-open').addEventListener('click', function () { openReview(parseAnomalies()); });
      badge.querySelector('.x').addEventListener('click', function () { badge.remove(); });
    };
    // The anomaly list loads asynchronously; render now and re-check briefly.
    render();
    var tries = 0, iv = setInterval(function () { if (++tries > 12 || document.getElementById('hrx-badge')) { clearInterval(iv); return; } render(); }, 1000);
  }

  /* ---------- dispatch by form ---------- */
  if (FORM === 'SW0009') ready(function () { return g('ab_type') && g('apply_button'); }, enhanceLeave);
  else if (FORM === 'SW0212') ready(function () { return g('ab_type') && g('apply_button'); }, enhanceTrip);
  else if (FORM === 'SW0013') ready(function () { return g('punch_date') && g('apply_button'); }, enhancePunch);
  else if (FORM === 'SW0005') ready(function () { return g('from_date') && g('to_time'); }, enhanceOvertime);
  else if (FORM === 'SW0037') ready(function () { return g('start_date') && g('select_btn'); }, enhanceQuery);
  else if (FORM === 'SW0405') ready(function () { return g('punch_date_st') && g('selectButton'); }, enhanceExplain);
  else if (!FORM && /Index\.html/i.test(PATH) && window.top === window.self) runHome();
  else if (location.hostname === 'eip.pesi.com.tw') {
    ready(function () { return g('rentDate') && byName('hr1'); }, enhanceRoomBooking);
  }
})();
