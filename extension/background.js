// PESI Workflow Enhancer — background worker (extension only)
//
// Two jobs:
//  1) Toolbar button → one-click open the 出缺勤系統首頁.
//  2) Optional background 考勤異常 notifications: on a timer, quietly load the
//     dashboard in an inactive tab, let the content script parse the anomaly
//     count and report it back, then show a desktop notification. Uses your
//     EXISTING login session (cookie) — no password is ever stored or used.
//     When the session has expired, it nudges you to re-login instead.

var HOME = 'https://hr.pesi.com.tw/HtmlWorkFlow/Index.html';

/* ---------- toolbar: one-click 出缺勤系統首頁 ---------- */
chrome.action.onClicked.addListener(function () {
  try {
    chrome.tabs.query({ url: 'https://hr.pesi.com.tw/*' }, function (tabs) {
      if (chrome.runtime.lastError || !tabs || !tabs.length) { chrome.tabs.create({ url: HOME }); return; }
      var t = tabs[0];
      chrome.tabs.update(t.id, { active: true });
      if (t.windowId != null && chrome.windows) chrome.windows.update(t.windowId, { focused: true });
    });
  } catch (e) { chrome.tabs.create({ url: HOME }); }
});

/* ---------- background anomaly notifications ---------- */
function getSettings(cb) { chrome.storage.local.get('hrx_settings', function (o) { cb((o && o.hrx_settings) || {}); }); }

function scheduleAlarm() {
  getSettings(function (s) {
    chrome.alarms.clear('hrx_poll', function () {
      if (s.notify) chrome.alarms.create('hrx_poll', { periodInMinutes: Math.max(30, Number(s.notifyIntervalMin) || 60) });
    });
  });
}
chrome.runtime.onInstalled.addListener(scheduleAlarm);
if (chrome.runtime.onStartup) chrome.runtime.onStartup.addListener(scheduleAlarm);
chrome.storage.onChanged.addListener(function (ch, area) { if (area === 'local' && ch.hrx_settings) scheduleAlarm(); });
chrome.alarms.onAlarm.addListener(function (a) { if (a.name === 'hrx_poll') poll(); });

var pollTabId = null, pollLatest = null, pollTimer = null;

function poll() {
  if (pollTabId != null) return;                       // one poll at a time
  pollLatest = null;
  chrome.tabs.create({ url: HOME, active: false }, function (tab) {
    if (!tab) return;
    pollTabId = tab.id;
    pollTimer = setTimeout(finishPoll, 12000);          // dwell ~12s, then use last status
  });
}

function finishPoll() {
  var st = pollLatest, tab = pollTabId;
  pollTabId = null; pollLatest = null;
  if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
  if (tab != null) { try { chrome.tabs.remove(tab); } catch (e) { } }
  if (!st) return;
  if (!st.loggedIn) {
    chrome.storage.local.get('hrx_reloginNotified', function (o) {
      if (!(o && o.hrx_reloginNotified)) {
        notify('relogin', '請重新登入 PESI 出缺勤系統', '背景考勤異常檢查需要有效登入，登入後即可繼續接收通知。');
        chrome.storage.local.set({ hrx_reloginNotified: true });
      }
    });
  } else {
    chrome.storage.local.set({ hrx_reloginNotified: false });
    if (st.n > 0) {
      chrome.storage.local.get('hrx_lastN', function (o) {
        if ((o && o.hrx_lastN) !== st.n) notify('anomaly', '考勤異常待處理', '有 ' + st.n + ' 筆考勤異常待處理，點此前往批次處理。');
        chrome.storage.local.set({ hrx_lastN: st.n });
      });
    } else {
      chrome.storage.local.set({ hrx_lastN: 0 });
    }
  }
}

function notify(tag, title, message) {
  chrome.notifications.create('hrx_' + tag, { type: 'basic', iconUrl: 'icons/icon128.png', title: title, message: message, priority: 2 });
}
chrome.notifications.onClicked.addListener(function (id) { chrome.tabs.create({ url: HOME }); chrome.notifications.clear(id); });

// Content script reports { n, loggedIn } from any HR tab.
chrome.runtime.onMessage.addListener(function (msg, sender) {
  if (!msg || msg.type !== 'hrx_status') return;
  if (msg.loggedIn && typeof msg.n === 'number') {          // toolbar badge = anomaly count
    chrome.action.setBadgeText({ text: msg.n ? String(msg.n) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
  }
  if (sender.tab && sender.tab.id === pollTabId) pollLatest = { n: msg.n, loggedIn: msg.loggedIn };
});
