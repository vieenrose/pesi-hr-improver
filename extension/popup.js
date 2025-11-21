document.addEventListener('DOMContentLoaded', function() {
  // Display version
  const manifest = chrome.runtime.getManifest();
  document.getElementById('version').textContent = `v${manifest.version}`;

  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const saveBtn = document.getElementById('save-btn');
  const loginBtn = document.getElementById('login-btn');
  const statusMsg = document.getElementById('status-msg');
  const autoLoginToggle = document.getElementById('auto-login-toggle');
  const extraUiToggle = document.getElementById('extra-ui-toggle');
  const savePasswordToggle = document.getElementById('save-password-toggle');
  const forgetPasswordBtn = document.getElementById('forget-password-btn');
  
  // New UI Elements for Material Design 3
  const statusSection = document.getElementById('status-section');
  const statusIcon = document.getElementById('status-icon');
  const statusText = document.getElementById('status-text');
  const statusList = document.getElementById('status-list');
  const lastUpdated = document.getElementById('last-updated');
  const refreshBtn = document.getElementById('refresh-notification-btn');
  const aboutLink = document.getElementById('about-link');

  // UX controls for status list
  const MAX_VISIBLE = 5;
  let lastNotificationData = null;
  let statusShowAll = false;

  // Enhanced Status Management
  function updateStatusUI(data) {
    lastNotificationData = data;
    if (!data) {
      showStatusMessage('獲取資料時發生錯誤', 'error');
      return;
    }

    // Reset status list
    statusList.innerHTML = '';
    
    if (data.count > 0) {
      // Show abnormal items
      statusText.textContent = `檢測到 ${data.count} 筆考勤異常`;
      
      // Add icon for warning state
      statusIcon.textContent = '⚠️';
      statusIcon.className = 'status-icon warning';
      
      const itemsToShow = statusShowAll ? data.items : data.items.slice(0, MAX_VISIBLE);
      itemsToShow.forEach(item => {
        const li = document.createElement('li');
        li.className = 'status-item warning';
        li.innerHTML = `<span>•</span><span class="item-text">${item}</span>`;
        statusList.appendChild(li);
      });
      if (data.items.length > MAX_VISIBLE) {
        const remaining = data.items.length - MAX_VISIBLE;
        const showMoreLi = document.createElement('li');
        showMoreLi.className = 'status-item show-more';
        const btn = document.createElement('button');
        btn.className = 'show-more-btn';
        btn.textContent = statusShowAll ? '顯示較少' : `顯示更多 (${remaining})`;
        btn.addEventListener('click', function() {
          statusShowAll = !statusShowAll;
          updateStatusUI(lastNotificationData);
        });
        showMoreLi.appendChild(btn);
        statusList.appendChild(showMoreLi);
      }
      
      if (data.lastUpdated) {
        const date = new Date(data.lastUpdated);
        lastUpdated.textContent = `最後更新: ${date.toLocaleString('zh-TW')}`;
      }
    } else {
      // reset list expansion when no items
      statusShowAll = false;
      // No issues found
      statusText.textContent = '目前無異常';
      
      // Add success icon
      statusIcon.textContent = '✓';
      statusIcon.className = 'status-icon normal';
      
      const li = document.createElement('li');
      li.className = 'status-item success';
      li.innerHTML = `<span>✓</span><span>所有資料都是最新的</span>`;
      statusList.appendChild(li);
      
      lastUpdated.textContent = '最後更新: ' + new Date().toLocaleString('zh-TW');
    }
  }

  // Enhanced status message system
  function showStatusMessage(message, type = 'success') {
    statusMsg.textContent = message;
    statusMsg.className = `status-message ${type} show`;
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      statusMsg.className = 'status-message';
    }, 3000);
  }

  function clearStatusMessage() {
    statusMsg.className = 'status-message';
  }

  // Scan Attendance Function
  function scanAttendance() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs[0]) return;

      // Show loading state
      statusText.textContent = '正在檢查中...';
      statusIcon.innerHTML = '<div class="loading-spinner"></div>';
      statusIcon.className = 'status-icon';

      if (tabs[0].url && tabs[0].url.includes('hr.pesi.com.tw')) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "scan_attendance" }, function(response) {
          if (chrome.runtime.lastError || !response || !response.data) {
            // If receiver missing (e.g., content script not yet injected), quietly fall back
            statusText.textContent = '嘗試備援掃描中...';
            runFallbackScan(tabs[0].id);
            return;
          }

          const data = response.data;
          updateStatusUI(data);

          if (data.count === 0) {
            showStatusMessage('檢查完成 - 目前無異常', 'success');
          } else {
            showStatusMessage(`檢測到 ${data.count} 筆考勤異常`, 'warning');
          }

          chrome.storage.local.set({ 'pesi_notifications': data });
        });
      } else {
        statusText.textContent = "請前往 hr.pesi.com.tw";
        statusIcon.textContent = '⚠️';
        statusIcon.className = 'status-icon warning';
      }
    });
  }

  function runFallbackScan(tabId) {
    if (!chrome.scripting) {
      lastUpdated.textContent = "無法掃描，請重新整理頁面";
      showStatusMessage('掃描失敗：請在 HR 頁面重新整理後再試', 'error');
      return;
    }

    chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: function() {
        // Inline parser fallback
        var KEYWORDS = ['遲到', '早退', '曠職', '未刷卡', '異常', '缺勤', '加班'];
        var DATE_REGEXES = [
          /\d{3,4}\s*[\/\-\.]\s*\d{2}\s*[\/\-\.]\s*\d{2}/,
          /\d{2}\s*[\/\-\.]\s*\d{2}/
        ];

        function normalize(text) {
          return (text || '').replace(/\s+/g, ' ').trim();
        }

        function parseRow(text, cells) {
          var rowText = normalize(text);
          if (!rowText) return null;
          var hasKw = KEYWORDS.some(function(k) { return rowText.includes(k); });
          if (!hasKw) return null;
          var dateMatch = DATE_REGEXES.map(function(rx){ return rowText.match(rx); }).find(Boolean);
          if (!dateMatch) return null;
          var reason = '';
          cells.forEach(function(cellText) {
            var norm = normalize(cellText);
            if (KEYWORDS.some(function(k){ return norm.includes(k); })) reason = norm;
          });
          if (!reason) {
            var m = rowText.match(new RegExp('(' + KEYWORDS.join('|') + ')'));
            if (m) reason = m[0];
          }
          if (!reason) return null;
          if (reason.length > 25) reason = reason.slice(0,25) + '...';
          return dateMatch[0].replace(/\s/g,'') + ' ' + reason;
        }

        var issues = [];
        var rows = document.querySelectorAll('tr');
        rows.forEach(function(row){
          var txt = row.innerText || row.textContent || '';
          var cells = Array.from(row.querySelectorAll('td')).map(function(td){ return td.innerText || td.textContent || ''; });
          var issue = parseRow(txt, cells);
          if (issue) issues.push(issue);
        });
        return Array.from(new Set(issues));
      }
    }, function(results) {
      try {
        var allIssues = [];
        if (results && results.length > 0) {
          results.forEach(function(r) {
            if (r.result && Array.isArray(r.result)) {
              allIssues = allIssues.concat(r.result);
            }
          });
        }
        allIssues = Array.from(new Set(allIssues));
        var data = {
          count: allIssues.length,
          items: allIssues.slice(0,5),
          lastUpdated: Date.now()
        };
        updateStatusUI(data);
        chrome.storage.local.set({ 'pesi_notifications': data });
        showStatusMessage(data.count > 0 ? `找到 ${data.count} 筆異常` : '掃描完成', data.count > 0 ? 'warning' : 'success');
      } catch (e) {
        lastUpdated.textContent = "備援掃描失敗";
        showStatusMessage('掃描失敗，請重新整理 HR 頁面', 'error');
      }
    });
  }

  // Load saved credentials and notifications
  chrome.storage.local.get(['pesi_username', 'pesi_password', 'pesi_password_saved', 'pesi_notifications', 'pesi_auto_login_enabled', 'pesi_enable_extra_ui'], function(result) {
    if (result.pesi_username) {
      usernameInput.value = result.pesi_username;
    }
    // Only pre-fill password if it was explicitly saved by the user (opt-in)
    if (result.pesi_password && result.pesi_password_saved) {
      passwordInput.value = result.pesi_password;
      if (savePasswordToggle) savePasswordToggle.checked = true;
    } else if (savePasswordToggle) {
      savePasswordToggle.checked = false;
    }
    autoLoginToggle.checked = result.pesi_auto_login_enabled !== false; // default true
    extraUiToggle.checked = !!result.pesi_enable_extra_ui;
    
    // Initial Load
    if (result.pesi_notifications) {
      updateStatusUI(result.pesi_notifications);
    } else {
      // Initialize with loading state
      statusText.textContent = '正在檢查中...';
      statusIcon.innerHTML = '<div class="loading-spinner"></div>';
      statusIcon.className = 'status-icon';
    }

    // Active Update on Open: only auto-scan when user is on HR site
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].url && tabs[0].url.includes('hr.pesi.com.tw')) {
        setTimeout(scanAttendance, 1000);
      } else {
        statusText.textContent = '請在 HR 頁面使用掃描 (或按重新掃描)';
      }
    });
  });

  // Forget saved password button
  if (forgetPasswordBtn) {
    forgetPasswordBtn.addEventListener('click', function() {
      chrome.storage.local.remove(['pesi_password','pesi_password_saved'], function() {
        passwordInput.value = '';
        if (savePasswordToggle) savePasswordToggle.checked = false;
        showStatusMessage('已移除儲存的密碼', 'success');
      });
    });
  }

  // Save credentials function
  function saveCredentials(callback) {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const autoLoginEnabled = autoLoginToggle.checked;
    const extraUiEnabled = extraUiToggle.checked;
    const savePassword = savePasswordToggle ? savePasswordToggle.checked : false;

    if (!username || !password) {
      showStatusMessage('請輸入員工代號與密碼', 'error');
      return;
    }

    // Prepare storage payload; only include password if user opted in
    const payload = {
      pesi_username: username,
      pesi_auto_login_enabled: autoLoginEnabled,
      pesi_enable_extra_ui: extraUiEnabled
    };
    if (savePassword && password) {
      payload.pesi_password = password;
      payload.pesi_password_saved = true;
    } else {
      payload.pesi_password_saved = false;
    }

    chrome.storage.local.set(payload, function() {
      // If user did not opt in, ensure any previously stored password is removed
      if (!savePassword) chrome.storage.local.remove('pesi_password');
      showStatusMessage('設定已儲存', 'success');
      if (callback) callback();
    });
  }

  // Save button click
  saveBtn.addEventListener('click', function() {
    saveCredentials();
  });

  // Login button click
  loginBtn.addEventListener('click', function() {
    saveCredentials(function() {
      showStatusMessage('開啟 HR 頁面並自動登入中...', 'success');
      const targetUrl = 'https://hr.pesi.com.tw/HtmlWorkFlow/Index.html';
      
      chrome.tabs.query({url: "https://hr.pesi.com.tw/*"}, function(tabs) {
        if (tabs.length > 0) {
          chrome.tabs.update(tabs[0].id, {active: true, url: targetUrl});
        } else {
          chrome.tabs.create({url: targetUrl});
        }
        // Slight delay before close to allow status to show briefly
        setTimeout(() => window.close(), 200);
      });
    });
  });
  
  // Refresh button click
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function() {
      scanAttendance();
    });
  }
  
  // About link opens repository in a new tab
  if (aboutLink) {
    aboutLink.addEventListener('click', function(e) {
      e.preventDefault();
      const repoUrl = 'https://github.com/vieenrose/pesi-hr-improver';
      chrome.tabs.create({ url: repoUrl });
    });
  }
});