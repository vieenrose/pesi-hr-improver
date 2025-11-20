// Attendance scan feature module
(function(root) {
    let lastRun = 0;
    const COOLDOWN_MS = 2000;
    let messagingInitialized = false;
    let manualScanListenerAdded = false;

    function setupMessaging(checkFn) {
        if (messagingInitialized) return;
        messagingInitialized = true;

        // Listen for messages from Popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === "scan_attendance") {
                console.log("PESI HR Improver: Manual scan requested by popup (via message).");
                const data = checkFn(true);
                // Return fresh data immediately; fallback to storage if missing
                if (data) {
                    sendResponse({ success: true, data });
                } else {
                    chrome.storage.local.get(['pesi_notifications'], (result) => {
                        const payload = result.pesi_notifications || { count: 0, items: [], lastUpdated: Date.now() };
                        sendResponse({ success: true, data: payload });
                    });
                }
                return true;
            }
        });

        if (!manualScanListenerAdded) {
            manualScanListenerAdded = true;
            document.addEventListener('pesi_manual_scan', function() {
                console.log("PESI HR Improver: Manual scan requested by popup (via Event).");
                checkFn(true);
            });
        }
    }

    function checkAttendanceAbnormalities(parser, isManual = false) {
        const now = Date.now();
        if (!isManual && now - lastRun < COOLDOWN_MS) return;
        lastRun = now;

        // Only scan top-level frame to avoid duplicate subframes
        if (window.top !== window) {
            return;
        }

        const foundIssues = parser ? parser.parseIssuesFromDom(document) : [];

        const data = {
            count: foundIssues.length,
            items: foundIssues.slice(0, 5),
            lastUpdated: Date.now()
        };

        chrome.storage.local.set({ 'pesi_notifications': data });

        if (foundIssues.length > 0) {
            console.log("PESI: Total unique issues found:", foundIssues.length);
        } else {
            console.log("PESI: No issues found in this frame.");
        }

        return data;
    }

    function initAttendanceScan(opts) {
        const {
            isHrDomain,
            parser = root.PesiAttendanceParser,
            featureRegistry
        } = opts;
        if (!isHrDomain()) return;

        setupMessaging((manual) => checkAttendanceAbnormalities(parser, manual));
        checkAttendanceAbnormalities(parser, false);
        // Secondary delayed scan to catch late-loading tables
        setTimeout(() => checkAttendanceAbnormalities(parser, true), 1500);
    }

    root.PesiAttendanceScan = { initAttendanceScan };
})(this);
