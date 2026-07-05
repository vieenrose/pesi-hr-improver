// PESI Workflow Enhancer — background worker (extension only)
//
// Toolbar button → one-click open/focus the 出缺勤系統首頁.

var HOME = 'https://hr.pesi.com.tw/HtmlWorkFlow/Index.html';

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
