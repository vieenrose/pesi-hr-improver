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
  
  // Notification Elements
  const notificationArea = document.getElementById('notification-area');
  const abnormalCount = document.getElementById('abnormal-count');
  const abnormalList = document.getElementById('abnormal-list');
  const lastUpdated = document.getElementById('last-updated');
  const aboutLink = document.getElementById('about-link');

  // Display Notifications Function
  function updateNotificationUI(data) {
    if (data && data.count > 0) {
      notificationArea.style.display = 'block';
      abnormalCount.textContent = data.count;
      
      abnormalList.innerHTML = '';
      data.items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        abnormalList.appendChild(li);
      });
      
      if (data.lastUpdated) {
        const date = new Date(data.lastUpdated);
        lastUpdated.textContent = `更新於: ${date.toLocaleString()}`;
      }
    } else {
      notificationArea.style.display = 'none';
    }
  }

  // Scan Attendance Function
  function scanAttendance() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs[0]) return;

      // Show loading state
      lastUpdated.innerHTML = '正在更新... <div class="loading-spinner"></div>';

      if (tabs[0].url && tabs[0].url.includes('hr.pesi.com.tw')) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "scan_attendance" }, function(response) {
          if (chrome.runtime.lastError || !response || !response.data) {
            // If receiver missing (e.g., content script not yet injected), quietly fall back
            lastUpdated.innerHTML = '嘗試備援掃描中... <div class="loading-spinner"></div>';
            statusMsg.textContent = '訊息未送達，改用備援掃描';
            statusMsg.style.color = '#ffc107';
            runFallbackScan(tabs[0].id);
            return;
          }

          const data = response.data;
          updateNotificationUI(data);

          if (data.count === 0) {
            notificationArea.style.display = 'block'; 
            abnormalCount.textContent = '0';
            abnormalList.innerHTML = '<li>✅ 目前無異常 (No issues found)</li>';
            lastUpdated.textContent = '更新於: ' + new Date().toLocaleString();
          }

          chrome.storage.local.set({ 'pesi_notifications': data });
        });
      } else {
        lastUpdated.textContent = "請前往 hr.pesi.com.tw 再試一次";
      }
    });
  }

  function runFallbackScan(tabId) {
    if (!chrome.scripting) {
      lastUpdated.textContent = "無法掃描，請重整頁面";
      statusMsg.textContent = '掃描失敗：請在 HR 頁重整後再試';
      statusMsg.style.color = '#dc3545';
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
        updateNotificationUI(data);
        if (data.count === 0) {
          notificationArea.style.display = 'block'; 
          abnormalCount.textContent = '0';
          abnormalList.innerHTML = '<li>✅ 目前無異常 (No issues found)</li>';
          lastUpdated.textContent = '更新於: ' + new Date().toLocaleString();
        }
        chrome.storage.local.set({ 'pesi_notifications': data });
        statusMsg.textContent = data.count > 0 ? `找到 ${data.count} 筆異常` : '掃描完成';
        statusMsg.style.color = '#28a745';
      } catch (e) {
        lastUpdated.textContent = "備援掃描失敗，請重整 HR 頁面後再試";
        statusMsg.textContent = '掃描失敗，請重整後再試';
        statusMsg.style.color = '#dc3545';
      }
    });
  }

  // Load saved credentials and notifications
  chrome.storage.local.get(['pesi_username', 'pesi_password', 'pesi_notifications', 'pesi_auto_login_enabled', 'pesi_enable_extra_ui'], function(result) {
    if (result.pesi_username) {
      usernameInput.value = result.pesi_username;
    }
    if (result.pesi_password) {
      passwordInput.value = result.pesi_password;
    }
    autoLoginToggle.checked = result.pesi_auto_login_enabled !== false; // default true
    extraUiToggle.checked = !!result.pesi_enable_extra_ui;
    
    // Initial Load
    if (result.pesi_notifications) {
      updateNotificationUI(result.pesi_notifications);
    }

    // Active Update on Open
    scanAttendance();
  });

  // Save credentials function
  function saveCredentials(callback) {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const autoLoginEnabled = autoLoginToggle.checked;
    const extraUiEnabled = extraUiToggle.checked;

    if (!username || !password) {
      statusMsg.textContent = '請輸入帳號與密碼 (Username and password required)';
      statusMsg.style.color = '#dc3545';
      return;
    }

    chrome.storage.local.set({
      pesi_username: username,
      pesi_password: password,
      pesi_auto_login_enabled: autoLoginEnabled,
      pesi_enable_extra_ui: extraUiEnabled
    }, function() {
      statusMsg.textContent = '已儲存 (Saved)!';
      statusMsg.style.color = '#28a745';
      setTimeout(() => {
        statusMsg.textContent = '';
      }, 2000);
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
      statusMsg.textContent = '開啟 HR 頁面並自動登入中...';
      statusMsg.style.color = '#28a745';
      const targetUrl = 'https://hr.pesi.com.tw/HtmlWorkFlow/Index.html';
      
      chrome.tabs.query({url: "https://hr.pesi.com.tw/*"}, function(tabs) {
        if (tabs.length > 0) {
          chrome.tabs.update(tabs[0].id, {active: true, url: targetUrl});
        } else {
          chrome.tabs.create({url: targetUrl});
        }
        // Slight delay before close to allow status to show briefly
        setTimeout(() => window.close(), 150);
      });
    });
  });
  
  // About link opens repository in a new tab
  if (aboutLink) {
    aboutLink.addEventListener('click', function(e) {
      e.preventDefault();
      const repoUrl = 'https://github.com/vieenrose/pesi-hr-improver';
      chrome.tabs.create({ url: repoUrl });
    });
  }
});
