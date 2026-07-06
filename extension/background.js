// PESI Workflow Enhancer — background service worker.
//
// Owns every action the popup can trigger. This must live here, not in
// popup.js: focusing a tab (active:true) blurs the popup and Chrome tears
// down its JS context immediately, killing any in-flight retry/setTimeout
// chain. The service worker has no such lifetime problem.

function waitComplete(tabId, cb) {
  chrome.tabs.get(tabId, function (tab) {
    if (chrome.runtime.lastError) return;
    if (tab.status === 'complete') { cb(tabId); return; }
    var listener = function (id, info) {
      if (id === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        cb(tabId);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

function openOrFocus(urlPattern, homeUrl, cb) {
  chrome.tabs.query({ url: urlPattern }, function (tabs) {
    if (chrome.runtime.lastError || !tabs || !tabs.length) {
      chrome.tabs.create({ url: homeUrl }, function (tab) { waitComplete(tab.id, cb); });
      return;
    }
    var t = tabs[0];
    chrome.tabs.update(t.id, { active: true });
    if (t.windowId != null && chrome.windows) chrome.windows.update(t.windowId, { focused: true });
    waitComplete(t.id, cb);
  });
}

// 請假/公出出差/忘記打卡: the HR dashboard's tiles are plain elements with an
// onclick containing the target form id (setSelectedFormCloseNav(...,'SW0009',...)).
// Clicking that element (not navigating a bare URL) is what actually opens the
// form reliably — a raw form URL alone hits a session/idle error page.
function clickHRTile(tabId, formId, tries) {
  tries = tries || 0;
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: function (fid) {
      var els = document.querySelectorAll('[onclick]');
      for (var i = 0; i < els.length; i++) {
        var oc = els[i].getAttribute('onclick') || '';
        if (oc.indexOf(fid) !== -1 && /setSelectedForm/.test(oc)) { els[i].click(); return true; }
      }
      return false;
    },
    args: [formId]
  }, function (results) {
    var ok = results && results[0] && results[0].result;
    if (!ok && tries < 20) setTimeout(function () { clickHRTile(tabId, formId, tries + 1); }, 300);
  });
}

// EIP's 會議室預約 view has no stable deep-link URL (its own script breaks
// when loaded outside the full frameset), so we open the EIP home page and
// invoke the same internal navigation the "預約管理" toolbar icon uses.
//
// Switch the EIP content area to the 預約管理 (AM) module. From there the user
// picks 會議室 / 公務車 / 來賓車位 from the left tree — driving that selection
// programmatically is unreliable (the module resets its view mid-init), so we
// stop at the module and leave the category choice to the user.
//
// MUST run in world:'MAIN'. The toolbar entry is an <a href="javascript:
// go_ap('../am/index_am.htm')">; that javascript: URL only executes in the
// PAGE's JS world. From the default isolated content-script world, .click()
// on it does nothing — which is exactly why this shortcut kept landing on the
// EIP home page. We click the real anchor (verified to navigate correctly;
// calling go_ap() directly mis-resolves the path and 404s) but in the MAIN
// world so the javascript: navigation actually fires.
function openAmModule(tabId, tries) {
  tries = tries || 0;
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    world: 'MAIN',
    func: function () {
      try {
        var wTop = document.querySelector('frame[name="content"]').contentWindow.frames['topFrame'];
        var els = wTop.document.querySelectorAll('a');
        for (var i = 0; i < els.length; i++) {
          if (/am\/index_am\.htm/.test(els[i].getAttribute('href') || '')) { els[i].click(); return true; }
        }
      } catch (e) { }
      return false;
    }
  }, function (results) {
    var ok = results && results[0] && results[0].result;
    if (!ok && tries < 20) setTimeout(function () { openAmModule(tabId, tries + 1); }, 300);
  });
}

// ---- today's 刷卡資料 (read-only lookup, runs in a background/inactive tab) ----
var SWIPE_MENU_PATH = ['報表', '考勤報表', '刷卡資料'];

function clickMenuStep(tabId, step, tries, done) {
  tries = tries || 0;
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: function (label) {
      var els = document.querySelectorAll('a,span,div,td');
      for (var i = 0; i < els.length; i++) {
        if ((els[i].textContent || '').replace(/\s+/g, '').trim() === label) { els[i].click(); return true; }
      }
      return false;
    },
    args: [SWIPE_MENU_PATH[step]]
  }, function (results) {
    var ok = results && results[0] && results[0].result;
    if (ok) { done(true); return; }
    if (tries < 15) { setTimeout(function () { clickMenuStep(tabId, step, tries + 1, done); }, 300); return; }
    done(false);
  });
}
// Only advances to the next menu level once the current click actually
// succeeded — advancing unconditionally was the bug that made this always
// report "not found" (each later step failed since the dropdown never opened).
function openSwipeMenu(tabId, step, cb) {
  if (step >= SWIPE_MENU_PATH.length) { cb(true); return; }
  clickMenuStep(tabId, step, 0, function (ok) {
    if (!ok) { cb(false); return; }
    setTimeout(function () { openSwipeMenu(tabId, step + 1, cb); }, 400);
  });
}
function pollSwipeForm(tabId, tries, cb) {
  tries = tries || 0;
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: function () {
      function pad(n) { return ('0' + n).slice(-2); }
      var f = document.querySelector('frame[name="刷卡資料"],iframe[name="刷卡資料"]');
      if (!f) return false;
      var d = f.contentWindow.document;
      var s1 = d.getElementById('SActDEdit1'), s2 = d.getElementById('SActDEdit2'), apply = d.getElementById('apply_button');
      if (!s1 || !s2 || !apply) return false;
      var today = new Date();
      var minguo = (today.getFullYear() - 1911) + '/' + pad(today.getMonth() + 1) + '/' + pad(today.getDate());
      s1.value = minguo; s1.dispatchEvent(new Event('change', { bubbles: true }));
      s2.value = minguo; s2.dispatchEvent(new Event('change', { bubbles: true }));
      apply.click();
      return true;
    }
  }, function (results) {
    var ok = results && results[0] && results[0].result;
    if (ok) { cb(true); return; }
    if (tries < 20) { setTimeout(function () { pollSwipeForm(tabId, tries + 1, cb); }, 400); return; }
    cb(false);
  });
}
// The query is an async job+poll on the server, so the result table fills in
// a moment AFTER apply_button is clicked. Poll the frame until rows show up
// (or we've waited long enough) instead of reading once too early. Rows are
// matched by content (a Minguo date cell + an HH:MM time cell) rather than a
// fixed column index, so incidental layout tables don't confuse us.
function scrapeSwipeResult(tabId, tries, cb) {
  tries = tries || 0;
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: function () {
      var f = document.querySelector('frame[name="刷卡資料"],iframe[name="刷卡資料"]');
      if (!f) return null;
      var d = f.contentWindow.document;
      var rows = [].slice.call(d.querySelectorAll('tr'));
      var out = [];
      rows.forEach(function (r) {
        var cells = [].slice.call(r.children).map(function (x) { return x.textContent.trim(); });
        var date = '', time = '';
        cells.forEach(function (c) {
          if (/^\d{2,3}\/\d{1,2}\/\d{1,2}$/.test(c)) date = c;
          else if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(c)) time = c;
        });
        if (date && time) out.push({ date: date, time: time });
      });
      return out;
    }
  }, function (results) {
    var rows = results && results[0] ? results[0].result : null;
    if (rows && rows.length) { cb(rows); return; }
    if (tries < 12) { setTimeout(function () { scrapeSwipeResult(tabId, tries + 1, cb); }, 400); return; }
    cb(rows || []);
  });
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.type === 'openHRHome') {
    openOrFocus('https://hr.pesi.com.tw/*', 'https://hr.pesi.com.tw/HtmlWorkFlow/Index.html', function () { });
    return false;
  }
  if (msg.type === 'openHRForm') {
    openOrFocus('https://hr.pesi.com.tw/*', 'https://hr.pesi.com.tw/HtmlWorkFlow/Index.html', function (tabId) {
      clickHRTile(tabId, msg.formId, 0);
    });
    return false;
  }
  if (msg.type === 'openReservation') {
    // Use openOrFocus, NOT a reload: EIP's URL is always findex.php no matter
    // which module is shown, so forcing url=findex.php on a tab already there
    // is a no-op navigation — 'complete' never fires again and we'd hang,
    // leaving the tab on its home page (the exact bug reported). The module
    // switcher link lives in content>topFrame on every EIP page, so we just
    // focus the existing tab (or open a new one) and drive it — no reload.
    openOrFocus('https://eip.pesi.com.tw/*', 'https://eip.pesi.com.tw/tw/findex.php', function (tabId) {
      openAmModule(tabId, 0);
    });
    return false;
  }
  if (msg.type === 'fetchTodaySwipe') {
    chrome.tabs.create({ url: 'https://hr.pesi.com.tw/HtmlWorkFlow/Index.html', active: false }, function (tab) {
      waitComplete(tab.id, function (tabId) {
        openSwipeMenu(tabId, 0, function (ok) {
          if (!ok) { chrome.tabs.remove(tabId); sendResponse({ ok: false }); return; }
          pollSwipeForm(tabId, 0, function (ok2) {
            if (!ok2) { chrome.tabs.remove(tabId); sendResponse({ ok: false }); return; }
            scrapeSwipeResult(tabId, 0, function (rows) {
              chrome.tabs.remove(tabId);
              sendResponse({ ok: true, rows: rows });
            });
          });
        });
      });
    });
    return true; // keep the message channel open for the async sendResponse
  }
});
