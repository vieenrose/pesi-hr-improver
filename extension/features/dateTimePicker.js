// Lightweight date/time picker for PESI inputs
(function(root) {
    const CLOSE_EVENTS = ['scroll', 'resize'];

    function createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'pesi-picker';
        document.body.appendChild(overlay);
        return overlay;
    }

    function positionOverlay(overlay, input) {
        const rect = input.getBoundingClientRect();
        overlay.style.position = 'fixed';
        overlay.style.top = `${rect.bottom + 4}px`;
        overlay.style.left = `${rect.left}px`;
        overlay.style.zIndex = 2147483647;
        overlay.style.minWidth = `${Math.max(rect.width, 220)}px`;
    }

    function buildCalendar(currentDate, onSelect) {
        const viewDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const container = document.createElement('div');
        container.className = 'pesi-calendar';

        const header = document.createElement('div');
        header.className = 'pesi-calendar-header';
        const prev = document.createElement('button');
        prev.type = 'button';
        prev.textContent = '‹';
        const next = document.createElement('button');
        next.type = 'button';
        next.textContent = '›';
        const title = document.createElement('div');
        title.textContent = `${viewDate.getFullYear()} / ${String(viewDate.getMonth() + 1).padStart(2, '0')}`;
        header.appendChild(prev);
        header.appendChild(title);
        header.appendChild(next);
        container.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'pesi-calendar-grid';
        const weekdays = ['日','一','二','三','四','五','六'];
        weekdays.forEach(d => {
            const cell = document.createElement('div');
            cell.className = 'pesi-calendar-cell pesi-calendar-weekday';
            cell.textContent = d;
            grid.appendChild(cell);
        });

        const firstDay = viewDate.getDay();
        const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 0).getDate();
        for (let i = 0; i < firstDay; i++) {
            const spacer = document.createElement('div');
            spacer.className = 'pesi-calendar-cell pesi-calendar-empty';
            grid.appendChild(spacer);
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement('button');
            cell.type = 'button';
            cell.className = 'pesi-calendar-cell';
            cell.textContent = day;
            const selected = currentDate.getDate() === day &&
                currentDate.getMonth() === viewDate.getMonth() &&
                currentDate.getFullYear() === viewDate.getFullYear();
            if (selected) cell.classList.add('active');
            cell.onclick = () => {
                const selectedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                onSelect(selectedDate);
            };
            grid.appendChild(cell);
        }

        prev.onclick = () => {
            const newDate = new Date(viewDate);
            newDate.setMonth(viewDate.getMonth() - 1);
            const rebuilt = buildCalendar(newDate, onSelect);
            container.replaceWith(rebuilt);
        };
        next.onclick = () => {
            const newDate = new Date(viewDate);
            newDate.setMonth(viewDate.getMonth() + 1);
            const rebuilt = buildCalendar(newDate, onSelect);
            container.replaceWith(rebuilt);
        };

        container.appendChild(grid);
        return container;
    }

    function buildTimeList(currentTime, onSelect) {
        const container = document.createElement('div');
        container.className = 'pesi-time-list';
        const presets = ['08:00','08:30','09:00','12:00','13:00','17:30','18:00','19:00'];
        presets.forEach(time => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'pesi-time-item';
            btn.textContent = time;
            if (time === currentTime) btn.classList.add('active');
            btn.onclick = () => onSelect(time);
            container.appendChild(btn);
        });
        return container;
    }

    function parseDateFromInput(input) {
        if (!input.value) return new Date();
        const parts = input.value.split(/[\/\-\.]/).filter(Boolean);
        if (parts.length === 3) {
            const [y, m, d] = parts.map(p => parseInt(p, 10));
            return new Date(y, m - 1, d);
        }
        return new Date();
    }

    function attachDatePicker(input) {
        if (input.dataset.pesiPicker) return;
        input.dataset.pesiPicker = 'true';

        let overlay = null;

        function close() {
            if (overlay) {
                overlay.remove();
                overlay = null;
            }
            CLOSE_EVENTS.forEach(ev => window.removeEventListener(ev, close));
            document.removeEventListener('mousedown', onDocClick, true);
        }

        function onDocClick(e) {
            if (overlay && !overlay.contains(e.target) && e.target !== input) {
                close();
            }
        }

        input.addEventListener('focus', () => {
            close();
            overlay = createOverlay();
            positionOverlay(overlay, input);
            const currentDate = parseDateFromInput(input);
            const calendar = buildCalendar(currentDate, (picked) => {
                const yyyy = picked.getFullYear();
                const mm = String(picked.getMonth() + 1).padStart(2, '0');
                const dd = String(picked.getDate()).padStart(2, '0');
                input.value = `${yyyy}/${mm}/${dd}`;
                if (typeof root.triggerChange === 'function') {
                    root.triggerChange(input);
                } else {
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
                close();
            });
            overlay.appendChild(calendar);
            CLOSE_EVENTS.forEach(ev => window.addEventListener(ev, close));
            setTimeout(() => document.addEventListener('mousedown', onDocClick, true), 0);
        });
    }

    function attachTimePicker(input) {
        if (input.dataset.pesiPicker) return;
        input.dataset.pesiPicker = 'true';

        let overlay = null;

        function close() {
            if (overlay) {
                overlay.remove();
                overlay = null;
            }
            CLOSE_EVENTS.forEach(ev => window.removeEventListener(ev, close));
            document.removeEventListener('mousedown', onDocClick, true);
        }

        function onDocClick(e) {
            if (overlay && !overlay.contains(e.target) && e.target !== input) {
                close();
            }
        }

        input.addEventListener('focus', () => {
            close();
            overlay = createOverlay();
            positionOverlay(overlay, input);
            const timeList = buildTimeList(input.value, (picked) => {
                input.value = picked;
                if (typeof root.triggerChange === 'function') {
                    root.triggerChange(input);
                } else {
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
                close();
            });
            overlay.appendChild(timeList);
            CLOSE_EVENTS.forEach(ev => window.addEventListener(ev, close));
            setTimeout(() => document.addEventListener('mousedown', onDocClick, true), 0);
        });
    }

    function attachPickers(opts) {
        const { dateIds = [], timeIds = [] } = opts || {};
        dateIds.forEach(id => {
            const input = document.getElementById(id);
            if (input) attachDatePicker(input);
        });
        timeIds.forEach(id => {
            const input = document.getElementById(id);
            if (input) attachTimePicker(input);
        });
    }

    root.PesiDateTimePicker = { attachPickers };
})(this);
