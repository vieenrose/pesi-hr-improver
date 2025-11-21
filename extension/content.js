// PESI HR UI/UX Improver - Content Script

console.log("PESI HR Improver loaded on:", window.location.href);

// DEBUG: Add a temporary border to EVERYTHING to prove the extension is running
// document.body.style.border = "5px solid red"; 

// Configuration for target forms
const TARGET_FORMS = {
    LEAVE: 'SW0029',        // 請假申請單作業
    BUSINESS_TRIP: 'SW0210' // 公出/出差申請單作業
};

// Feature flags (loaded from storage; defaults to safe/off)
const featureFlags = {
    extraUi: false, // dev/extra UI like analyzer buttons or template cards
};

chrome.storage && chrome.storage.local.get(['pesi_enable_extra_ui'], (res) => {
    featureFlags.extraUi = !!res.pesi_enable_extra_ui;
    // Re-run registry after flags load
    featureRegistry.runAll();
});

function enableExtraUi() {
    return !!featureFlags.extraUi;
}

// Simple feature registry to keep per-feature init idempotent
class FeatureRegistry {
    constructor() {
        this.features = [];
    }

    register(name, options) {
        this.features.push({ name, hasRun: false, ...options });
    }

    runAll() {
        this.features.forEach(feature => {
            const { shouldRun, init, runMode } = feature;
            if (shouldRun && !shouldRun()) return;
            if (runMode === 'once' && feature.hasRun) return;
            try {
                init();
                feature.hasRun = true;
            } catch (e) {
                console.error(`PESI feature '${feature.name}' failed to init`, e);
            }
        });
    }
}

const featureRegistry = new FeatureRegistry();

// Debounce helper to avoid hammering the DOM on noisy pages
function debounce(fn, wait = 300) {
    let timer = null;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), wait);
    };
}

// Guard: ensure we only operate on the HR domain
function isHrDomain() {
    return location.hostname.includes('hr.pesi.com.tw');
}

// Function to initialize improvements when a target form is detected
function initImprovements() {
    if (!isHrDomain()) {
        console.log("PESI HR Improver: Skipping non-HR domain.");
        return;
    }

    console.log("PESI HR Improver: Initializing...");
    
    // Run registered features (idempotent per-feature)
    featureRegistry.runAll();

    // SAFE MODE: Wait for the page to be fully settled
    // Legacy ASP.NET pages often have complex initialization scripts.
    // We wait 1 second after load to ensure we don't interfere with them.
    setTimeout(() => {
        checkAndEnhanceForms();
    }, 1000);

    // Fallback: Check on clicks (for navigation that might not trigger reload)
    document.addEventListener('click', () => setTimeout(checkAndEnhanceForms, 1000));

    // Observe DOM mutations to re-run enhancements after partial postbacks
    const debouncedEnhance = debounce(() => {
        featureRegistry.runAll();
        checkAndEnhanceForms();
    }, 400);
    const observer = new MutationObserver(() => debouncedEnhance());
    observer.observe(document.body, { childList: true, subtree: true });
}

function isLeaveContext() {
    const url = window.location.href;
    const title = document.title || '';
    const bodyText = document.body.textContent || '';
    const isLeaveUrl = url.includes("SW0029");
    const isLeaveText = bodyText.includes("請假申請") || title.includes("請假申請") || bodyText.includes("Leave Application");
    return isLeaveUrl || isLeaveText;
}

function isTripContext() {
    const url = window.location.href;
    const title = document.title || '';
    const bodyText = document.body.textContent || '';
    const isTripUrl = url.includes("SW0210") || url.includes("SW0212");
    const isTripText = bodyText.includes("公出") || bodyText.includes("出差") || title.includes("公出") || title.includes("出差") || bodyText.includes("Business Trip");
    return isTripUrl || isTripText;
}

function checkAndEnhanceForms() {
    featureRegistry.runAll();
}

// Legacy helper retained: placeholder for backward compat (no-op)
function checkInputExistence(id) {}

function addSmartInputFeatures(inputId, storageKey, defaultOptions = []) {
    const input = document.getElementById(inputId);
    if (!input) return; // Field not present on this page; skip quietly.

    // Container for chips
    const containerId = `pesi-smart-${inputId}`;
    if (document.getElementById(containerId)) return;

    // CLEAR BAD HISTORY for Dropdowns (Fix for "A13 illegal")
    if (input.tagName === 'SELECT') {
        const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
        // If history contains items that look like codes (A13, A14) but we want text,
        // or if they are causing issues, let's just purge them if they are invalid.
        // For now, we'll just rely on the "found" check below to prevent using them.
    }

    const container = document.createElement('span');
    container.id = containerId;
    container.className = 'pesi-smart-chips';
    container.style.marginLeft = '10px';
    container.style.display = 'inline-flex';
    container.style.flexWrap = 'nowrap';
    container.style.gap = '5px';
    container.style.verticalAlign = 'middle';

    // 1. Load History
    let history = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    // Combine defaults and history (unique values)
    // Handle if defaultOptions contains objects {text, value} or strings
    const normalizedDefaults = defaultOptions.map(opt => 
        typeof opt === 'string' ? {text: opt, value: opt} : opt
    );
    const normalizedHistory = history.map(opt => 
        typeof opt === 'string' ? {text: opt, value: opt} : opt
    );
    const allOptions = [...normalizedDefaults, ...normalizedHistory]
        .filter((opt, index, arr) => arr.findIndex(o => o.text === opt.text) === index)
        .slice(0, 8); // Limit to 8 chips

    // Create Chips (accessible + keyboard support)
    allOptions.forEach(option => {
        const chip = document.createElement('button');
        chip.textContent = option.text;
        chip.type = 'button';
        chip.className = 'pesi-chip';

        // Accessibility
        chip.setAttribute('role', 'button');
        chip.tabIndex = 0;
        chip.setAttribute('aria-pressed', 'false');

        // Keyboard support
        chip.addEventListener('keydown', (ke) => {
            if (ke.key === 'Enter' || ke.key === ' ') {
                ke.preventDefault();
                chip.click();
            }
        });

        chip.onclick = (e) => {
            e.preventDefault();

            // Re-fetch input to ensure we have the latest reference
            const currentInput = document.getElementById(inputId) || input;

            if (currentInput.tagName === 'SELECT') {
                // Prefer exact value match when a value is provided
                let applied = false;
                if (option.value) {
                    const optByValue = currentInput.querySelector(`option[value="${option.value}"]`);
                    if (optByValue) {
                        currentInput.value = option.value;
                        applied = true;
                    }
                }

                if (!applied) {
                    // Fallback: match by visible text (contains)
                    for (let i = 0; i < currentInput.options.length; i++) {
                        const opt = currentInput.options[i];
                        if (opt.text.trim().includes(option.text)) {
                            currentInput.selectedIndex = i;
                            currentInput.value = opt.value;
                            applied = true;
                            break;
                        }
                    }
                }

                if (!applied) {
                    console.warn(`Pesi Extension: Option '${option.text}' not found.`);
                    return;
                }
            } else {
                currentInput.value = option.value;
            }

            // Visual Feedback
            chip.setAttribute('aria-pressed', 'true');
            const originalBg = currentInput.style.backgroundColor;
            currentInput.style.transition = 'background-color 0.2s';
            currentInput.style.backgroundColor = '#fff3cd';
            setTimeout(() => currentInput.style.backgroundColor = originalBg, 300);

            // DELAYED TRIGGER: Give the browser 50ms to paint the selection before 
            // the page's scripts (Postback) kick in and potentially refresh the area.
            setTimeout(() => {
                triggerChange(currentInput);
                // reset aria-pressed after action
                setTimeout(() => chip.setAttribute('aria-pressed', 'false'), 500);
            }, 50);
        };

        container.appendChild(chip);
    });

    // Insert after input
    if (input.nextSibling) {
        input.parentNode.insertBefore(container, input.nextSibling);
    } else {
        input.parentNode.appendChild(container);
    }
    
    // FIX: Legacy tables often have fixed height cells that hide added content
    // DISABLED: Modifying table layout can break legacy forms
    /*
    if (input.parentNode.tagName === 'TD') {
        input.parentNode.style.height = 'auto';
        input.parentNode.style.overflow = 'visible';
    }
    */

    // 2. Save to History on Change
    // WARNING: For SELECT elements that trigger postbacks (like ab_type), 
    // adding a 'change' listener that modifies localStorage is fine, 
    // BUT if we trigger other DOM changes here, it might crash.
    // We will wrap this in a try-catch and avoid it for ab_type if needed.
    input.addEventListener('change', () => {
        // Skip history saving for ab_type to prevent potential conflicts with postbacks
        if (inputId === 'ab_type') return;

        const val = input.value.trim();
        if (val) {
            let currentHistory = JSON.parse(localStorage.getItem(storageKey) || '[]');
            // Add to front, remove duplicates
            currentHistory = [val, ...currentHistory.filter(x => x !== val)].slice(0, 5); // Keep last 5
            localStorage.setItem(storageKey, JSON.stringify(currentHistory));
        }
    });
}


// ...merged into main function...

function addRobustAnalyzer() {
    // 1. Keyboard Shortcut (Alt + Shift + A)
    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.shiftKey && e.code === 'KeyA') {
            runAnalysis();
        }
    });

    // 2. Floating Button (Bottom Left)
    if (document.getElementById('pesi-floating-analyze')) return;

    const btn = document.createElement('button');
    btn.id = 'pesi-floating-analyze';
    btn.textContent = "🛠️ Analyze IDs (Alt+Shift+A)";
    btn.style.position = 'fixed';
    btn.style.bottom = '20px';
    btn.style.left = '20px';
    btn.style.zIndex = '2147483647'; // Max Z-Index
    btn.style.backgroundColor = '#007bff'; // Blue
    btn.style.color = 'white';
    btn.style.border = '2px solid white';
    btn.style.padding = '12px 24px';
    btn.style.borderRadius = '50px';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    btn.style.fontWeight = 'bold';
    btn.style.fontSize = '14px';
    btn.style.pointerEvents = 'auto';
    btn.style.transition = 'transform 0.2s';

    btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
    btn.onmouseout = () => btn.style.transform = 'scale(1)';
    
    btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        runAnalysis();
    };
    
    // Append to <html> to avoid body relative positioning issues
    (document.documentElement || document.body).appendChild(btn);
}

function addTripTemplateFeatures() {
    if (document.querySelector('.pesi-template-actions')) return;

    // Try to find inputs, but don't fail if some are missing
    const reasonInput = document.getElementById('reason');
    const locationInput = document.getElementById('foodadd'); 
    const typeSelect = document.getElementById('ab_type');

    // Always create the container
    const container = document.createElement('div');
    container.className = 'pesi-template-actions';
    container.style.marginBottom = '15px';
    container.style.padding = '15px';
    container.style.backgroundColor = '#e2e6ea';
    container.style.borderRadius = '8px';
    container.style.display = 'flex';
    container.style.gap = '10px';
    container.style.alignItems = 'center';
    container.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';

    // LOGO
    const logo = document.createElement('div');
    logo.innerHTML = `
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="#007bff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    `;
    container.appendChild(logo);

    const title = document.createElement('span');
    title.textContent = 'Trip Templates: ';
    title.style.fontWeight = 'bold';
    title.style.color = '#495057';
    container.appendChild(title);

    if (reasonInput) {
        const saveBtn = createActionButton('💾 Save Current as Template', () => {
            const data = {
                reason: reasonInput.value,
                location: locationInput ? locationInput.value : '',
                type: typeSelect ? typeSelect.value : ''
            };
            localStorage.setItem('pesi_trip_template', JSON.stringify(data));
            
            // Visual feedback
            const originalText = saveBtn.textContent;
            saveBtn.textContent = '✅ Saved!';
            setTimeout(() => saveBtn.textContent = originalText, 2000);
        });

        const loadBtn = createActionButton('📂 Load Template', () => {
            const data = localStorage.getItem('pesi_trip_template');
            if (!data) {
                alert('No template saved yet. Fill out the form and click Save first.');
                return;
            }
            const template = JSON.parse(data);
            if (template.reason) {
                reasonInput.value = template.reason;
                triggerChange(reasonInput);
            }
            if (template.location && locationInput) {
                locationInput.value = template.location;
                triggerChange(locationInput);
            }
            if (template.type && typeSelect) {
                typeSelect.value = template.type;
                triggerChange(typeSelect);
            }
        });

        container.appendChild(loadBtn);
        container.appendChild(saveBtn);
    } else {
        const errorMsg = document.createElement('span');
        errorMsg.textContent = '(Inputs not found - please use the Blue Button)';
        errorMsg.style.color = '#dc3545';
        errorMsg.style.fontSize = '12px';
        container.appendChild(errorMsg);
    }

    // Insert before the first table (usually the form start)
    const firstTable = document.querySelector('table');
    if (firstTable) {
        firstTable.parentNode.insertBefore(container, firstTable);
    } else {
        document.body.insertBefore(container, document.body.firstChild);
    }
}

function runAnalysis() {
    console.clear();
    console.log("--- PESI FORM ANALYSIS START ---");
    const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
    const report = [];
    
    inputs.forEach(el => {
        const info = {
            tag: el.tagName.toLowerCase(),
            type: el.type,
            id: el.id || '(no-id)',
            name: el.name || '(no-name)',
            label: getLabelFor(el)
        };
        report.push(info);
    });
    
    const jsonOutput = JSON.stringify(report, null, 2);
    console.log(jsonOutput);
    console.log("--- PESI FORM ANALYSIS END ---");
    
    navigator.clipboard.writeText(jsonOutput).then(() => {
        alert("Analysis Copied to Clipboard!\n\nPlease paste it in the chat.");
    }).catch(() => {
        alert("Analysis Complete!\n\nCheck the Console (F12) to copy the result.");
    });
}

// --- Productivity Features ---

function addQuickDateButtons(inputId, relatedStartId = null) {
    const input = document.getElementById(inputId);
    if (!input) return; // Missing field on this page; skip quietly.
    
    // Prevent duplicate buttons using a specific ID for the container
    const containerId = `pesi-actions-${inputId}`;
    if (document.getElementById(containerId)) return;

    console.log(`Pesi Extension: Adding buttons for ${inputId} (Linked to: ${relatedStartId})`);

    const container = document.createElement('span');
    container.id = containerId;
    container.className = 'pesi-quick-actions';
    
    const todayBtn = createActionButton('今天', () => setDate(input, 0));
    const tmrBtn = createActionButton('明天', () => setDate(input, 1));
    
    container.appendChild(todayBtn);
    container.appendChild(tmrBtn);

    // If this is an End Date, add "Same as Start" button
    if (relatedStartId) {
        const syncBtn = createActionButton('同開始日', () => {
            const startInput = document.getElementById(relatedStartId);
            if (startInput && startInput.value) {
                input.value = startInput.value;
                // Use the new SAFE triggerChange (which avoids 'change' event on text inputs)
                triggerChange(input);
            } else {
                alert('請先選擇開始日期');
            }
        });
        // Make it distinct (Orange)
        syncBtn.style.backgroundColor = '#ffc107'; 
        syncBtn.style.color = '#212529';
        syncBtn.style.fontWeight = 'bold';
        container.appendChild(syncBtn);
    }
    
    input.parentNode.insertBefore(container, input.nextSibling);
}

function addQuickTimeButtons(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return; // Skip quietly if field not present.

    // Prevent duplicate buttons using a specific ID
    const containerId = `pesi-actions-${inputId}`;
    if (document.getElementById(containerId)) return;

    const container = document.createElement('div');
    container.id = containerId;
    container.className = 'pesi-md3-time-container';

    // Create MD3 time input field
    const timeField = document.createElement('div');
    timeField.className = 'pesi-md3-text-field';
    timeField.innerHTML = `
        <input class="pesi-md3-input" id="time-input-${inputId}" type="time" value="${input.value}">
        <label class="pesi-md3-label" for="time-input-${inputId}">時間</label>
        <div class="pesi-md3-outline"></div>
    `;

    // Sync changes back to original input
    const md3Input = timeField.querySelector('input');

    // When the MD3 input value changes, propagate to original input
    md3Input.addEventListener('change', () => {
        input.value = md3Input.value;
        triggerChange(input);
    });

    // Make clicking the whole field open the native picker where possible
    timeField.addEventListener('click', (e) => {
        // If the click was directly on the native input, let it behave normally
        if (e.target === md3Input) return;
        try {
            if (typeof md3Input.showPicker === 'function') {
                md3Input.showPicker();
                return;
            }
        } catch (err) {
            // ignore
        }
        // Fallback: focus + click to attempt to open the native control
        md3Input.focus();
        try { md3Input.click(); } catch (_) {}
    });

    container.appendChild(timeField);

    input.parentNode.insertBefore(container, input.nextSibling);
    input.style.display = 'none'; // Hide original input
}

function createActionButton(text, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.type = 'button'; // Prevent form submission
    btn.className = 'pesi-quick-btn';
    btn.onclick = (e) => {
        e.preventDefault();
        onClick();
    };
    return btn;
}

function setDate(input, daysOffset) {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    
    input.value = `${yyyy}/${mm}/${dd}`;
    // Use safe trigger
    triggerChange(input);
}

function setNativeValue(element, value) {
    const lastValue = element.value;
    element.value = value;
    const event = new Event('input', { bubbles: true });
    // Hack for React 15/16 or other frameworks that override value setter
    const tracker = element._valueTracker;
    if (tracker) {
        tracker.setValue(lastValue);
    }
    element.dispatchEvent(event);
}

function triggerChange(element) {
    // Trigger events so the legacy system knows the value changed
    try {
        // 1. Always set value via prototype to ensure frameworks detect it
        // (This helps if the page uses React/Vue/Angular on top of ASP.NET)
        // SKIP FOR SELECT: Setting value via prototype on SELECT can reset the visual selection in some browsers/legacy apps.
        if (element.tagName !== 'SELECT') {
            const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value');
            if (descriptor && descriptor.set) {
                descriptor.set.call(element, element.value);
            }
        }

        if (element.tagName === 'SELECT') {
            element.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            // For Text Inputs:
            // Fire 'input' for modern listeners
            element.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Fire 'change' GENTLY for legacy ASP.NET
            // We use a flag to prevent infinite loops if our own code listens to change
            if (!element._pesi_changing) {
                element._pesi_changing = true;
                element.dispatchEvent(new Event('change', { bubbles: true }));
                element._pesi_changing = false;
            }
        }
    } catch (e) {
        console.error("Pesi Extension: Error triggering change event", e);
    }
}

function initAutoDurationCalculator() {
    // Prevent duplicates
    if (document.getElementById('pesi-duration-display')) return;

    const inputs = ['from_date', 'from_time', 'to_date', 'to_time'];
    const elements = inputs.map(id => document.getElementById(id)).filter(el => el);
    
    if (elements.length !== 4) return; // Skip quietly if any field missing.

    // Create display element
    const display = document.createElement('div');
    display.id = 'pesi-duration-display';
    display.style.marginTop = '10px';
    display.style.fontWeight = 'bold';
    display.style.color = '#007bff';
    display.style.padding = '10px';
    display.style.backgroundColor = '#e7f1ff';
    display.style.borderRadius = '4px';
    display.style.display = 'inline-block';
    
    // Insert after the last time field (to_time) container
    // We try to find a good place to put it. Usually the parent of the input is a TD.
    const lastField = document.getElementById('to_time');
    if (lastField && lastField.parentNode) {
        lastField.parentNode.appendChild(display);
    }

    function calculate() {
        const fDate = document.getElementById('from_date').value;
        const fTime = document.getElementById('from_time').value;
        const tDate = document.getElementById('to_date').value;
        const tTime = document.getElementById('to_time').value;

        if (fDate && fTime && tDate && tTime) {
            // Replace / with - for better Date parsing compatibility if needed, 
            // though JS Date usually handles YYYY/MM/DD fine.
            const start = new Date(`${fDate} ${fTime}`);
            const end = new Date(`${tDate} ${tTime}`);
            const diffMs = end - start;
            
            if (diffMs > 0) {
                const diffHrs = diffMs / (1000 * 60 * 60);
                // Simple calculation (doesn't account for lunch breaks/work hours yet)
                const days = Math.floor(diffHrs / 24);
                const hours = (diffHrs % 24).toFixed(1);
                
                let text = `⏱️ 預計時數: `;
                if (days > 0) text += `${days} 天 `;
                text += `${hours} 小時`;
                
                display.textContent = text;
                display.style.color = '#007bff';
            } else {
                display.textContent = '⚠️ 結束時間必須晚於開始時間';
                display.style.color = '#dc3545';
            }
        } else {
            display.textContent = '';
        }
    }

    elements.forEach(el => {
        el.addEventListener('change', calculate);
        el.addEventListener('input', calculate);
        el.addEventListener('blur', calculate); 
    });
}

function addAnalyzerButton() {
    // Avoid adding multiple buttons
    if (document.getElementById('pesi-analyze-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'pesi-analyze-btn';
    btn.textContent = "🛠️ Analyze Form IDs";
    btn.style.position = 'fixed';
    btn.style.top = '10px';      // Moved to TOP
    btn.style.left = '10px';     // Moved to LEFT
    btn.style.zIndex = '2147483647'; // Max Z-Index
    btn.style.backgroundColor = '#dc3545'; 
    btn.style.color = 'white';
    btn.style.border = '2px solid white';
    btn.style.padding = '10px 20px';
    btn.style.borderRadius = '4px';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
    btn.style.fontWeight = 'bold';
    btn.style.fontSize = '14px';
    
    btn.onclick = function() {
        console.clear();
        console.log("--- PESI FORM ANALYSIS START ---");
        const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
        const report = [];
        
        inputs.forEach(el => {
            // Skip our own elements
            if (el.id === 'pesi-analyze-btn') return;
            
            const info = {
                tag: el.tagName.toLowerCase(),
                type: el.type,
                id: el.id || '(no-id)',
                name: el.name || '(no-name)',
                label: getLabelFor(el)
            };
            report.push(info);
        });
        
        const jsonOutput = JSON.stringify(report, null, 2);
        console.log(jsonOutput);
        console.log("--- PESI FORM ANALYSIS END ---");
        
        // Copy to clipboard automatically
        navigator.clipboard.writeText(jsonOutput).then(() => {
            alert("Analysis Copied to Clipboard!\n\nPlease paste it in the chat.");
        }).catch(() => {
            alert("Analysis Complete!\n\nCheck the Console (F12) to copy the result.");
        });
    };
    
    document.body.appendChild(btn);
}

function getLabelFor(element) {
    // Try to find a label
    if (element.id) {
        const label = document.querySelector(`label[for="${element.id}"]`);
        if (label) return label.innerText.trim();
    }
    // Try to find nearby text if no explicit label
    // This is common in legacy ASP.NET apps
    let parent = element.parentElement;
    if (parent && parent.tagName === 'TD') {
        // Look at previous TD
        let prevTd = parent.previousElementSibling;
        if (prevTd) return prevTd.innerText.trim();
    }
    return '(unknown)';
}

function createStatusBadge(text) {
    if (document.getElementById('pesi-status-badge')) return;
    const badge = document.createElement('div');
    badge.id = 'pesi-status-badge';
    badge.textContent = text;
    badge.style.position = 'fixed';
    badge.style.bottom = '10px';
    badge.style.right = '10px';
    badge.style.backgroundColor = '#28a745';
    badge.style.color = 'white';
    badge.style.padding = '5px 10px';
    badge.style.borderRadius = '20px';
    badge.style.fontSize = '12px';
    badge.style.zIndex = '9999';
    badge.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    badge.style.fontFamily = 'Segoe UI, sans-serif';
    badge.style.pointerEvents = 'none'; // Let clicks pass through
    document.body.appendChild(badge);
}

// Start the script
// Register features (auto-login, attendance scan) with the registry
featureRegistry.register('auto-login', {
    init: () => {
        if (typeof PesiAutoLogin !== 'undefined') {
            PesiAutoLogin.initAutoLogin({ isHrDomain, chromeObj: chrome, locationObj: location });
        }
    },
    shouldRun: () => isHrDomain(),
    runMode: 'once'
});

featureRegistry.register('attendance-scan', {
    init: () => {
        if (typeof PesiAttendanceScan !== 'undefined') {
            PesiAttendanceScan.initAttendanceScan({ isHrDomain, parser: PesiAttendanceParser, featureRegistry });
        }
    },
    shouldRun: () => isHrDomain()
});

featureRegistry.register('leave-enhancer', {
    init: () => {
        if (typeof PesiLeaveEnhancer !== 'undefined') {
            PesiLeaveEnhancer.enhanceLeaveApplication();
        }
        // Extra UI (debug/developer tools) gated by feature flag
        if (enableExtraUi() && typeof PesiAnalyzer !== 'undefined') {
            PesiAnalyzer.addRobustAnalyzer();
        }
    },
    shouldRun: () => isHrDomain() && isLeaveContext()
});

featureRegistry.register('trip-enhancer', {
    init: () => {
        if (typeof PesiTripEnhancer !== 'undefined') {
            PesiTripEnhancer.enhanceBusinessTripApplication();
        }
        // Extra UI (debug/developer tools) gated by feature flag
        if (enableExtraUi() && typeof PesiTemplates !== 'undefined') {
            PesiTemplates.addTripTemplateFeatures();
        }
        if (enableExtraUi() && typeof PesiAnalyzer !== 'undefined') {
            PesiAnalyzer.addAnalyzerButton();
        }
    },
    shouldRun: () => isHrDomain() && isTripContext()
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initImprovements);
} else {
    initImprovements();
}
