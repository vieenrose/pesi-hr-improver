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
      if (tabs[0] && tabs[0].url && tabs[0].url.includes('hr.pesi.com.tw')) {
        // Show loading state
        const originalText = lastUpdated.textContent;
        lastUpdated.innerHTML = '正在更新... <div class="loading-spinner"></div>';
        
        // Check if scripting API is available
        if (!chrome.scripting) {
            console.error("PESI: chrome.scripting API not available. Reload extension.");
            lastUpdated.textContent = "請重新載入擴充功能";
            return;
        }

        // Execute script in ALL frames and COLLECT results directly
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id, allFrames: true },
            func: function() {
                // --- INJECTED SCRAPER LOGIC START ---
                var foundIssues = [];
                var keywords = ['遲到', '早退', '曠職', '未刷卡', '異常', '缺勤', '加班'];
                
                try {
                    var rows = document.querySelectorAll('tr');
                    rows.forEach(function(row) {
                        var text = (row.innerText || row.textContent || "").trim();
                        
                        // Check keywords
                        var hasIssue = false;
                        for (var i = 0; i < keywords.length; i++) {
                            if (text.includes(keywords[i])) {
                                hasIssue = true;
                                break;
                            }
                        }
                        
                        if (hasIssue) {
                            // Check date (Relaxed regex)
                            var dateMatch = text.match(/\d{3,4}\s*[\/\-\.]\s*\d{2}\s*[\/\-\.]\s*\d{2}/) || text.match(/\d{2}\s*[\/\-\.]\s*\d{2}/);
                            
                            if (dateMatch) {
                                // Extract reason
                                var reasonText = '';
                                var cells = row.querySelectorAll('td');
                                cells.forEach(function(cell) {
                                    var cellText = (cell.innerText || cell.textContent || "").trim();
                                    for (var j = 0; j < keywords.length; j++) {
                                        if (cellText.includes(keywords[j])) {
                                            reasonText = cellText;
                                            break;
                                        }
                                    }
                                });

                                if (!reasonText) {
                                     var match = text.match(new RegExp('(' + keywords.join('|') + ')'));
                                     if (match) reasonText = match[0];
                                }

                                if (reasonText) {
                                    reasonText = reasonText.replace(/\s+/g, ' ').trim();
                                    if (reasonText.length > 25) reasonText = reasonText.substring(0, 25) + '...';
                                    var dateStr = dateMatch[0].replace(/\s/g, '');
                                    foundIssues.push(dateStr + ' ' + reasonText);
                                }
                            }
                        }
                    });
                } catch (e) {
                    console.error("PESI Scraper Error:", e);
                }
                return foundIssues;
                // --- INJECTED SCRAPER LOGIC END ---
            }
        }, function(results) {
            // Process results from ALL frames
            var allIssues = [];
            if (results && results.length > 0) {
                results.forEach(function(frameResult) {
                    if (frameResult.result && Array.isArray(frameResult.result)) {
                        allIssues = allIssues.concat(frameResult.result);
                    }
                });
            }

            // Deduplicate
            allIssues = [...new Set(allIssues)];

            // Update UI
            var data = {
                count: allIssues.length,
                items: allIssues.slice(0, 5),
                lastUpdated: Date.now()
            };
            
            updateNotificationUI(data);
            
            if (allIssues.length === 0) {
                notificationArea.style.display = 'block'; 
                abnormalCount.textContent = '0';
                abnormalList.innerHTML = '<li>✅ 目前無異常 (No issues found)</li>';
                lastUpdated.textContent = '更新於: ' + new Date().toLocaleString();
            }

            // Save to storage
            chrome.storage.local.set({ 'pesi_notifications': data });
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
  
  // About link opens repository in a new tab
  if (aboutLink) {
    aboutLink.addEventListener('click', function(e) {
      e.preventDefault();
      const repoUrl = 'https://github.com/vieenrose/pesi-hr-improver';
      chrome.tabs.create({ url: repoUrl });
    });
  }
});
