// Trip template save/load feature
(function(root) {
    function addTripTemplateFeatures() {
        if (document.querySelector('.pesi-template-actions')) return;

        const reasonInput = document.getElementById('reason');
        const locationInput = document.getElementById('foodadd'); 
        const typeSelect = document.getElementById('ab_type');

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
                if (template.reason && reasonInput) {
                    reasonInput.value = template.reason;
                    if (typeof root.triggerChange === 'function') root.triggerChange(reasonInput);
                }
                if (template.location && locationInput) {
                    locationInput.value = template.location;
                    if (typeof root.triggerChange === 'function') root.triggerChange(locationInput);
                }
                if (template.type && typeSelect) {
                    typeSelect.value = template.type;
                    if (typeof root.triggerChange === 'function') root.triggerChange(typeSelect);
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

        const firstTable = document.querySelector('table');
        if (firstTable) {
            firstTable.parentNode.insertBefore(container, firstTable);
        } else {
            document.body.insertBefore(container, document.body.firstChild);
        }
    }

    function createActionButton(text, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.type = 'button';
        btn.className = 'pesi-quick-btn';
        btn.onclick = (e) => {
            e.preventDefault();
            onClick();
        };
        return btn;
    }

    root.PesiTemplates = { addTripTemplateFeatures };
})(this);
