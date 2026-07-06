// PESI Workflow Enhancer — popup: fires a one-shot message to the background
// service worker and gets out of the way. All the actual tab/click/scrape
// logic lives in background.js because it must survive the popup closing
// (which happens the instant we focus another tab).

document.getElementById('hr').addEventListener('click', function () {
  chrome.runtime.sendMessage({ type: 'openHRHome' });
  window.close();
});
document.getElementById('eip').addEventListener('click', function () {
  chrome.runtime.sendMessage({ type: 'openReservation' });
  window.close();
});
document.getElementById('leave').addEventListener('click', function () {
  chrome.runtime.sendMessage({ type: 'openHRForm', formId: 'SW0009' });
  window.close();
});
document.getElementById('trip').addEventListener('click', function () {
  chrome.runtime.sendMessage({ type: 'openHRForm', formId: 'SW0212' });
  window.close();
});
document.getElementById('punch').addEventListener('click', function () {
  chrome.runtime.sendMessage({ type: 'openHRForm', formId: 'SW0013' });
  window.close();
});

// Swipe lookup stays open in the popup (no focus change involved) so the
// user can see the result inline.
document.getElementById('swipe-btn').addEventListener('click', function () {
  var btn = document.getElementById('swipe-btn'), out = document.getElementById('swipe-result');
  btn.disabled = true;
  out.textContent = '查詢中…';
  chrome.runtime.sendMessage({ type: 'fetchTodaySwipe' }, function (resp) {
    btn.disabled = false;
    if (!resp || !resp.ok) { out.textContent = '查詢失敗（找不到刷卡資料表單）'; return; }
    if (!resp.rows.length) { out.textContent = '今日尚無刷卡紀錄'; return; }
    // Sort the day's punches by time; first = check-in, last = check-out.
    var times = resp.rows.map(function (r) { return r.time; }).sort();
    var first = times[0], last = times[times.length - 1];
    var html = '<div class="swipe-head">今日刷卡（' + times.length + ' 筆）</div>';
    if (times.length > 1) {
      html += '<div class="swipe-io"><span class="io-in">上班 ' + first + '</span>' +
        '<span class="io-arrow">→</span><span class="io-out">下班 ' + last + '</span></div>';
    }
    html += '<div class="swipe-all">' + times.join(' · ') + '</div>';
    out.innerHTML = html;
  });
});
