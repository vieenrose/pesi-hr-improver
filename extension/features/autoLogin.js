// Auto-login feature module
(function(root) {
    function shouldRun(isHrDomain, locationObj) {
        if (!isHrDomain()) return false;
        const href = locationObj.href || '';
        const path = locationObj.pathname || '';
        const host = locationObj.hostname || '';
        const loginHints = ['Login', 'login', 'Index.html', 'Default.aspx', '/Account', '/HtmlWorkFlow'];
        const isLikelyLogin = loginHints.some(hint => href.includes(hint));
        const pathLooksLogin = /login|index\.html|default\.aspx|account|htmlworkflow/i.test(path);
        const hostLooksLogin = /hr\.pesi\.com\.tw/i.test(host);
        return (isLikelyLogin || pathLooksLogin) && hostLooksLogin;
    }

    function perform(passwordField, chromeObj, locationObj, storage) {
        chromeObj.storage.local.get(['pesi_username', 'pesi_password', 'pesi_auto_login_enabled'], function(result) {
            const autoLoginEnabled = result.pesi_auto_login_enabled !== false; // default true
            if (!autoLoginEnabled) {
                console.log("PESI HR Improver: Auto-login disabled by user.");
                return;
            }
            if (!result.pesi_username || !result.pesi_password) return;

            let usernameField = null;

            const specificSelectors = [
                'input[name*="User"]', 'input[id*="User"]', 
                'input[name*="ID"]', 'input[id*="ID"]', 
                'input[name*="Account"]', 'input[id*="Account"]',
                'input[name*="uid"]', 'input[id*="uid"]'
            ];
            
            for (const selector of specificSelectors) {
                const el = document.querySelector(selector);
                if (el && el.offsetParent !== null) {
                    usernameField = el;
                    break;
                }
            }

            if (!usernameField) {
                const allInputs = Array.from(document.querySelectorAll('input'));
                const passIndex = allInputs.indexOf(passwordField);
                if (passIndex > 0) {
                    for (let i = passIndex - 1; i >= 0; i--) {
                        const input = allInputs[i];
                        const type = input.type ? input.type.toLowerCase() : 'text';
                        if ((type === 'text' || type === 'email') && input.offsetParent !== null) {
                            usernameField = input;
                            break;
                        }
                    }
                }
            }

            if (usernameField) {
                console.log("PESI HR Improver: Filling credentials...");
                
                usernameField.value = result.pesi_username;
                passwordField.value = result.pesi_password;

                ['input', 'change', 'blur'].forEach(eventType => {
                    usernameField.dispatchEvent(new Event(eventType, { bubbles: true }));
                    passwordField.dispatchEvent(new Event(eventType, { bubbles: true }));
                });

                setTimeout(() => {
                    let submitBtn = document.querySelector('input[type="submit"], button[type="submit"]');
                    
                    if (!submitBtn) {
                        const allButtons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="image"], a.btn, a[role="button"]'));
                        submitBtn = allButtons.find(btn => {
                            const text = (btn.innerText || btn.value || "").toLowerCase();
                            const id = (btn.id || "").toLowerCase();
                            return text.includes("login") || text.includes("登入") || id.includes("login") || id.includes("submit");
                        });
                    }

                    if (submitBtn) {
                        console.log("PESI HR Improver: Clicking login button...", submitBtn);
                        submitBtn.click();
                    } else {
                        console.log("PESI HR Improver: No submit button found, trying Enter key...");
                        passwordField.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
                        passwordField.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
                        passwordField.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
                    }
                }, 800);
            }
        });
    }

    function initAutoLogin(opts) {
        const { isHrDomain, chromeObj = chrome, locationObj = location } = opts;
        if (!shouldRun(isHrDomain, locationObj)) return;

        let attempts = 0;
        const maxAttempts = 10;
    
        const loginInterval = setInterval(() => {
            attempts++;
            const passwordField = document.querySelector('input[type="password"]');
            
            if (passwordField) {
                // Guard: ensure password field sits inside a form-like container
                const formAncestor = passwordField.closest('form') || passwordField.closest('table');
                if (!formAncestor) {
                    console.log("PESI HR Improver: Skipping auto-login; password field not in expected container.");
                    clearInterval(loginInterval);
                    return;
                }
                clearInterval(loginInterval);
                console.log("PESI HR Improver: Login page detected. Attempting auto-login...");
                perform(passwordField, chromeObj, locationObj);
            } else if (attempts >= maxAttempts) {
                clearInterval(loginInterval);
            }
        }, 500);
    }

    root.PesiAutoLogin = { initAutoLogin, shouldRun };
})(this);
