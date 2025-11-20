// Pesi HR UI/UX Improver - Content Script

console.log("Pesi HR Improver loaded on:", window.location.href);

// DEBUG: Add a temporary border to EVERYTHING to prove the extension is running
// document.body.style.border = "5px solid red"; 

// Configuration for target forms
const TARGET_FORMS = {
    LEAVE: 'SW0029',        // 請假申請單作業
    BUSINESS_TRIP: 'SW0210' // 公出/出差申請單作業
};

// Function to initialize improvements when a target form is detected
function initImprovements() {
    console.log("Pesi HR Improver: Initializing...");
    
    // SAFE MODE: Wait for the page to be fully settled
    // Legacy ASP.NET pages often have complex initialization scripts.
    // We wait 1 second after load to ensure we don't interfere with them.
    setTimeout(() => {
        checkAndEnhanceForms();
    }, 1000);

    // Fallback: Check on clicks (for navigation that might not trigger reload)
    document.addEventListener('click', () => setTimeout(checkAndEnhanceForms, 1000));
}

function checkAndEnhanceForms() {
    // Use textContent instead of innerText to avoid forcing layout reflows
    const bodyText = document.body.textContent;
    const url = window.location.href;
    const title = document.title;

    // Debug: Check what we are seeing
    // console.log("Checking page content...");

    // Detection logic
    // 1. Check URL for Function IDs
    const isLeaveUrl = url.includes("SW0029");
    const isTripUrl = url.includes("SW0210") || url.includes("SW0212");

    // 2. Check Content/Title for Keywords
    // Note: "公出/出差" might be split or encoded differently. We check for parts of it.
    const isLeaveText = bodyText.includes("請假申請") || title.includes("請假申請") || bodyText.includes("Leave Application");
    const isTripText = bodyText.includes("公出") || bodyText.includes("出差") || title.includes("公出") || title.includes("出差") || bodyText.includes("Business Trip");

    if (isLeaveUrl || isLeaveText) {
        enhanceLeaveApplication();
    }
    
    if (isTripUrl || isTripText) {
        enhanceBusinessTripApplication();
    }
}

function enhanceLeaveApplication() {
    // REMOVED BLOCKING CHECK:
    // We must allow this function to run again if the page does a partial update (AJAX),
    // otherwise our buttons might disappear and never come back.
    
    console.log("MATCH: Leave Application detected. Checking features...");
    if (!document.body.classList.contains('pesi-enhanced-leave')) {
        document.body.classList.add('pesi-enhanced-leave');
    }
    
    // Add Productivity Features
    addQuickDateButtons('from_date');
    addQuickDateButtons('to_date', 'from_date'); // Link End Date to Start Date
    addQuickTimeButtons('from_time');
    addQuickTimeButtons('to_time');
    
    // Add Real-time Duration Calculator
    initAutoDurationCalculator();
    
    // Smart Input Features (History & Presets)
    addSmartInputFeatures('reason', 'pesi_history_reason', ['私事處理', '身體不適', '看診', '家庭照顧']);
    
    // Defaults & Visuals
    enhanceHistoryTables();
}


function enhanceBusinessTripApplication() {
    // REMOVED BLOCKING CHECK:
    // Allow re-running to restore buttons after AJAX updates.
    
    console.log("MATCH: Business Trip Application detected. Checking features...");
    if (!document.body.classList.contains('pesi-enhanced-trip')) {
        document.body.classList.add('pesi-enhanced-trip');
    }
    
    // Productivity Features
    addQuickDateButtons('from_date');
    addQuickDateButtons('to_date', 'from_date'); // Link End Date to Start Date
    addQuickTimeButtons('from_time');
    addQuickTimeButtons('to_time');
    
    initAutoDurationCalculator();
    
    // Smart Input Features for Trip
    addSmartInputFeatures('reason', 'pesi_history_trip_reason', ['客戶拜訪', '專案會議', '教育訓練', '設備維護']);
    
    // Re-enable Smart Chips for ab_type (Leave Type)
    addSmartInputFeatures('ab_type', 'pesi_trip_type_safe', ['公出', '出差']);
    
    // Defaults & Visuals
    enhanceHistoryTables();
}

function checkInputExistence(id) {
    if (!document.getElementById(id)) {
        console.warn(`Pesi Extension: Expected input '${id}' not found on this page.`);
    }
}

// --- Productivity Features ---

function applyDefaults() {
    const fTime = document.getElementById('from_time');
    const tTime = document.getElementById('to_time');
    
    // Only set if empty
    if (fTime && !fTime.value) {
        fTime.value = '09:00';
        triggerChange(fTime);
    }
    if (tTime && !tTime.value) {
        tTime.value = '18:00';
        triggerChange(tTime);
    }
}

function enhanceHistoryTables() {
    // Find tables that look like data grids (usually have headers or many rows)
    const tables = document.querySelectorAll('table');
    
    tables.forEach(table => {
        // Check if it's likely a data table
        if (table.rows.length < 2) return;
        
        // Check rows for status keywords
        Array.from(table.rows).forEach(row => {
            const text = row.innerText;
            
            // Status Coloring
            if (text.includes('已核准') || text.includes('Approved')) {
                row.style.backgroundColor = '#d4edda'; // Green tint
                row.style.borderLeft = '5px solid #28a745';
            } else if (text.includes('簽核中') || text.includes('Signing') || text.includes('Pending')) {
                row.style.backgroundColor = '#fff3cd'; // Orange tint
                row.style.borderLeft = '5px solid #ffc107';
            } else if (text.includes('退回') || text.includes('Rejected') || text.includes('Return')) {
                row.style.backgroundColor = '#f8d7da'; // Red tint
                row.style.borderLeft = '5px solid #dc3545';
            }
        });
    });
}

function addSmartInputFeatures(inputId, storageKey, defaultOptions = []) {
    const input = document.getElementById(inputId);
    if (!input) return;

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
    const allOptions = [...new Set([...defaultOptions, ...history])].slice(0, 8); // Limit to 8 chips

    // Create Chips
    allOptions.forEach(text => {
        const chip = document.createElement('button');
        chip.textContent = text;
        chip.type = 'button';
        chip.className = 'pesi-chip';
        chip.onclick = (e) => {
            e.preventDefault();
            
            // Re-fetch input to ensure we have the latest reference
            const currentInput = document.getElementById(inputId) || input;

            if (currentInput.tagName === 'SELECT') {
                let found = false;
                for (let i = 0; i < currentInput.options.length; i++) {
                    const opt = currentInput.options[i];
                    if (opt.text.trim().includes(text)) {
                        // SIMPLIFIED: Just set selectedIndex. 
                        // Don't touch .selected property manually to avoid fighting the browser.
                        currentInput.selectedIndex = i;
                        currentInput.value = opt.value;
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    console.warn(`Pesi Extension: Option '${text}' not found.`);
                    return; 
                }
            } else {
                currentInput.value = text;
            }
            
            // Visual Feedback
            const originalBg = currentInput.style.backgroundColor;
            currentInput.style.transition = 'background-color 0.2s';
            currentInput.style.backgroundColor = '#fff3cd';
            setTimeout(() => currentInput.style.backgroundColor = originalBg, 300);

            // DELAYED TRIGGER: Give the browser 50ms to paint the selection before 
            // the page's scripts (Postback) kick in and potentially refresh the area.
            setTimeout(() => {
                triggerChange(currentInput);
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
    if (!input) {
        console.warn(`Pesi Extension: Input ${inputId} not found.`);
        return;
    }
    
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
    if (!input) return;

    // Prevent duplicate buttons using a specific ID
    const containerId = `pesi-actions-${inputId}`;
    if (document.getElementById(containerId)) return;

    const container = document.createElement('span');
    container.id = containerId;
    container.className = 'pesi-quick-actions';

    let times = ['09:00', '13:00', '18:00'];

    // Customize times based on input type
    if (inputId === 'from_time') {
        // Add 08:00 for Start Time
        times = ['08:00', '09:00', '13:00', '18:00'];
    } else if (inputId === 'to_time') {
        // Add 10:00 for End Time
        times = ['09:00', '10:00', '13:00', '18:00'];
    }
    
    times.forEach(time => {
        const btn = createActionButton(time, () => {
            input.value = time;
            triggerChange(input);
        });
        container.appendChild(btn);
    });

    input.parentNode.insertBefore(container, input.nextSibling);
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
    
    if (elements.length !== 4) return;

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
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initImprovements);
} else {
    initImprovements();
}
