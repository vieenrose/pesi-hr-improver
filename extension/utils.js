// Shared DOM/utils for the PESI HR extension
const PesiUtils = (() => {
    function safeQuery(id) {
        return document.getElementById(id) || null;
    }

    function addClassOnce(el, className) {
        if (!el) return;
        if (!el.classList.contains(className)) {
            el.classList.add(className);
        }
    }

    function ensureContainer(parent, tag, id, className) {
        if (!parent) return null;
        const existing = parent.querySelector(`#${id}`);
        if (existing) return existing;
        const el = document.createElement(tag);
        el.id = id;
        if (className) el.className = className;
        parent.appendChild(el);
        return el;
    }

    return { safeQuery, addClassOnce, ensureContainer };
})();

// Export for Node (tests) if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PesiUtils;
}
