// Leave application enhancer feature
(function(root) {
    const utils = root.PesiUtils;

    function enhanceLeaveApplication() {
        if (!document.body.classList.contains('pesi-enhanced-leave')) {
            document.body.classList.add('pesi-enhanced-leave');
        }
        
        addQuickDateButtons('from_date');
        addQuickDateButtons('to_date', 'from_date');
        addQuickTimeButtons('from_time');
        addQuickTimeButtons('to_time');
        
        initAutoDurationCalculator();
        
        addSmartInputFeatures('reason', 'pesi_history_reason', ['私事處理', '身體不適', '看診', '家庭照顧']);
        addSmartInputFeatures('ab_type', 'pesi_history_ab_type', [
            {text: '特休', value: 'a01'},
            {text: '補休', value: 'a02'},
            {text: '病假', value: 'a03'},
            {text: '事假', value: 'a04'}
        ]);
        
        enhanceHistoryTables();
    }

    function enhanceHistoryTables() {
        const tables = document.querySelectorAll('table');
        
        tables.forEach(table => {
            if (table.rows.length < 2) return;
            Array.from(table.rows).forEach(row => {
                const text = row.innerText;
                if (text.includes('已核准') || text.includes('Approved')) {
                    row.style.backgroundColor = '#d4edda';
                    row.style.borderLeft = '5px solid #28a745';
                } else if (text.includes('簽核中') || text.includes('Signing') || text.includes('Pending')) {
                    row.style.backgroundColor = '#fff3cd';
                    row.style.borderLeft = '5px solid #ffc107';
                } else if (text.includes('退回') || text.includes('Rejected') || text.includes('Return')) {
                    row.style.backgroundColor = '#f8d7da';
                    row.style.borderLeft = '5px solid #dc3545';
                }
            });
        });
    }

    // Small wrappers for common functions already in global scope
    function addQuickDateButtons(inputId, relatedStartId) {
        if (typeof root.addQuickDateButtons === 'function') {
            root.addQuickDateButtons(inputId, relatedStartId);
        }
    }
    function addQuickTimeButtons(inputId) {
        if (typeof root.addQuickTimeButtons === 'function') {
            root.addQuickTimeButtons(inputId);
        }
    }
    function initAutoDurationCalculator() {
        if (typeof root.initAutoDurationCalculator === 'function') {
            root.initAutoDurationCalculator();
        }
    }
    function addSmartInputFeatures(inputId, storageKey, defaults) {
        if (typeof root.addSmartInputFeatures === 'function') {
            root.addSmartInputFeatures(inputId, storageKey, defaults);
        }
    }

    root.PesiLeaveEnhancer = { enhanceLeaveApplication, enhanceHistoryTables };
})(this);
