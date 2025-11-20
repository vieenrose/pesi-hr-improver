// Business trip application enhancer feature
(function(root) {
    function enhanceBusinessTripApplication() {
        if (!document.body.classList.contains('pesi-enhanced-trip')) {
            document.body.classList.add('pesi-enhanced-trip');
        }
        
        addQuickDateButtons('from_date');
        addQuickDateButtons('to_date', 'from_date');
        addQuickTimeButtons('from_time');
        addQuickTimeButtons('to_time');
        
        initAutoDurationCalculator();
        
        addSmartInputFeatures('reason', 'pesi_history_trip_reason', ['客戶拜訪', '專案會議', '教育訓練', '設備維護']);
        addSmartInputFeatures('ab_type', 'pesi_trip_type_safe', ['公出', '出差']);
        
        if (root.PesiDateTimePicker) {
            root.PesiDateTimePicker.attachPickers({
                dateIds: ['from_date', 'to_date'],
                timeIds: ['from_time', 'to_time']
            });
        }

        enhanceHistoryTables();
    }

    function enhanceHistoryTables() {
        if (root.PesiLeaveEnhancer) {
            root.PesiLeaveEnhancer.enhanceHistoryTables();
        }
    }

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

    root.PesiTripEnhancer = { enhanceBusinessTripApplication };
})(this);
