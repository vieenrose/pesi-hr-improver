document.addEventListener('DOMContentLoaded', function() {
  // Display version
  const manifest = chrome.runtime.getManifest();
  document.getElementById('version').textContent = `v${manifest.version}`;

  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const saveBtn = document.getElementById('save-btn');
  const loginBtn = document.getElementById('login-btn');
  const statusMsg = document.getElementById('status-msg');

  // Load saved credentials
  chrome.storage.local.get(['pesi_username', 'pesi_password'], function(result) {
    if (result.pesi_username) {
      usernameInput.value = result.pesi_username;
    }
    if (result.pesi_password) {
      passwordInput.value = result.pesi_password;
    }
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
