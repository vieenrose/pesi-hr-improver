// Analyzer tools feature (form analysis buttons)
(function(root) {
    function addAnalyzerButton() {
        if (document.getElementById('pesi-analyze-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'pesi-analyze-btn';
        btn.textContent = "🛠️ Analyze Form IDs";
        btn.style.position = 'fixed';
        btn.style.top = '10px';
        btn.style.left = '10px';
        btn.style.zIndex = '2147483647';
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
            runAnalysis();
        };
        
        document.body.appendChild(btn);
    }

    function addRobustAnalyzer() {
        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.shiftKey && e.code === 'KeyA') {
                runAnalysis();
            }
        });

        if (document.getElementById('pesi-floating-analyze')) return;

        const btn = document.createElement('button');
        btn.id = 'pesi-floating-analyze';
        btn.textContent = "🛠️ Analyze IDs (Alt+Shift+A)";
        btn.style.position = 'fixed';
        btn.style.bottom = '20px';
        btn.style.left = '20px';
        btn.style.zIndex = '2147483647';
        btn.style.backgroundColor = '#007bff';
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
        
        (document.documentElement || document.body).appendChild(btn);
    }

    function runAnalysis() {
        console.clear();
        console.log("--- PESI FORM ANALYSIS START ---");
        const inputs = document.querySelectorAll('input:not([type=\"hidden\"]), select, textarea');
        const report = [];
        
        inputs.forEach(el => {
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
        
        navigator.clipboard.writeText(jsonOutput).then(() => {
            alert("Analysis Copied to Clipboard!\\n\\nPlease paste it in the chat.");
        }).catch(() => {
            alert("Analysis Complete!\\n\\nCheck the Console (F12) to copy the result.");
        });
    }

    function getLabelFor(element) {
        if (element.id) {
            const label = document.querySelector(`label[for=\"${element.id}\"]`);
            if (label) return label.innerText.trim();
        }
        let parent = element.parentElement;
        if (parent && parent.tagName === 'TD') {
            let prevTd = parent.previousElementSibling;
            if (prevTd) return prevTd.innerText.trim();
        }
        return '(unknown)';
    }

    root.PesiAnalyzer = { addAnalyzerButton, addRobustAnalyzer };
})(this);
