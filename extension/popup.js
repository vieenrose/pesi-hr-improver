document.addEventListener('DOMContentLoaded', function() {
  // Display version
  const manifest = chrome.runtime.getManifest();
  document.getElementById('version').textContent = `v${manifest.version}`;

  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const saveBtn = document.getElementById('save-btn');
  const loginBtn = document.getElementById('login-btn');
  const statusMsg = document.getElementById('status-msg');
  
  // Notification Elements
  const notificationArea = document.getElementById('notification-area');
  const abnormalCount = document.getElementById('abnormal-count');
  const abnormalList = document.getElementById('abnormal-list');
  const lastUpdated = document.getElementById('last-updated');

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
      if (tabs[0] && tabs[0].url && tabs[0].url.includes('hr.pesi.com.tw')) {
        // Show loading state
        const originalText = lastUpdated.textContent;
        lastUpdated.innerHTML = '正在更新... <div class="loading-spinner"></div>';
        
        // Send message to content script
        chrome.tabs.sendMessage(tabs[0].id, {action: "scan_attendance"}, function(response) {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            lastUpdated.textContent = "掃描失敗 (請重新整理網頁)";
            return;
          }

          if (response && response.success) {
            // Reload from storage to get the fresh data
            setTimeout(() => {
              chrome.storage.local.get(['pesi_notifications'], function(newResult) {
                updateNotificationUI(newResult.pesi_notifications);
                if (!newResult.pesi_notifications || newResult.pesi_notifications.count === 0) {
                   // If nothing found after manual scan, show "No issues"
                   notificationArea.style.display = 'block'; 
                   abnormalCount.textContent = '0';
                   abnormalList.innerHTML = '<li>✅ 目前無異常 (No issues found)</li>';
                   lastUpdated.textContent = `更新於: ${new Date().toLocaleString()}`;
                }
              });
            }, 500); // Wait for storage write
          } else {
            lastUpdated.textContent = originalText;
          }
        });
      }
    });
  }

  // Load saved credentials and notifications
  chrome.storage.local.get(['pesi_username', 'pesi_password', 'pesi_notifications'], function(result) {
    if (result.pesi_username) {
      usernameInput.value = result.pesi_username;
    }
    if (result.pesi_password) {
      passwordInput.value = result.pesi_password;
    }
    
    // Initial Load
    if (result.pesi_notifications) {
      updateNotificationUI(result.pesi_notifications);
    }

    // Active Update on Open
    scanAttendance();
  });

  // Save credentials function
  function saveCredentials(callback) {
    const username = usernameInput.value;
    const password = passwordInput.value;

    chrome.storage.local.set({
      pesi_username: username,
      pesi_password: password
    }, function() {
      statusMsg.textContent = '已儲存 (Saved)!';
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
      const targetUrl = 'https://hr.pesi.com.tw/HtmlWorkFlow/Index.html';
      
      // Check if tab already exists
      chrome.tabs.query({url: "https://hr.pesi.com.tw/*"}, function(tabs) {
        if (tabs.length > 0) {
          // Update existing tab
          chrome.tabs.update(tabs[0].id, {active: true, url: targetUrl});
          window.close(); // Close popup
        } else {
          // Create new tab
          chrome.tabs.create({url: targetUrl});
          window.close(); // Close popup
        }
      });
    });
  });
});
