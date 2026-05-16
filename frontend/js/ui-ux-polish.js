document.addEventListener('DOMContentLoaded', () => {

    const saveBranchBtn = document.querySelector('.btn-secondary-dark');
    const exportDataBtn = document.querySelector('.btn-primary.btn-sm');

    if (saveBranchBtn && saveBranchBtn.innerText.includes('Save Branch')) {
        saveBranchBtn.addEventListener('click', () => {
            if (typeof window.saveToLocalStorage === 'function') {
                window.saveToLocalStorage();
                Utils.showToast('Branch state saved to browser storage.', 'success');
            }
        });
    }

    if (exportDataBtn && exportDataBtn.innerText.includes('Export Data')) {
        exportDataBtn.addEventListener('click', () => {
            const data = JSON.stringify({
                video_id: Utils.getVideoContextId(),
                annotations: AppState.boxes || [],
                notes: AppState.notes || []
            }, null, 2);
            const blob = new Blob([data], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'visionannotate-export.json';
            a.click();
            Utils.showToast('Exporting dataset...', 'primary');
        });
    }

    const startEventBtn = document.querySelector('.btn-start');
    const stopEventBtn = document.querySelector('.btn-stop');

    if (startEventBtn) {
        startEventBtn.addEventListener('click', () => {
            const time = window.player ? window.player.getCurrentTime() : 0;
            Utils.showToast('Event recording started at ' + time.toFixed(2), 'success');
        });
    }

    if (stopEventBtn) {
        stopEventBtn.addEventListener('click', () => {
            Utils.showToast('Event recording stopped.', 'danger');
        });
    }

    const gearBtn = document.querySelector('.player-controls .btn-icon i.bi-gear')?.parentElement;
    if (gearBtn) {
        gearBtn.addEventListener('click', () => {
            Utils.showToast('Settings: Visual quality and keyframes auto-detection.', 'primary');
        });
    }

    const classCheckBtn = document.querySelector('.sidebar-panel .btn-primary i.bi-check2')?.parentElement;
    const customLink = document.querySelector('.sidebar-panel .text-primary i.bi-plus')?.parentElement;

    if (classCheckBtn) {
        classCheckBtn.addEventListener('click', () => {
            const input = document.querySelector('.sidebar-panel input[placeholder*="classification"]');
            const val = input ? input.value.trim() : '';
            
            if (val) {
                if (window.selectedBox && !window.isReadOnly) {
                    window.selectedBox.label = val;
                    Utils.showToast(`Updated box label to "${val}"`, 'success');
                    AppState.notify();
                    input.value = '';
                } else {
                    Utils.showToast(`Classification "${val}" noted for sequence.`, 'primary');
                    input.value = '';
                }
            } else {
                Utils.showToast('Please enter a classification name.', 'warning');
            }
        });
    }

    if (customLink) {
        customLink.addEventListener('click', (e) => {
            e.preventDefault();
            Utils.showToast('Custom event types feature is coming soon.', 'primary');
        });
    }



    const noteInput = document.querySelector('.note-input');
    if (noteInput) {
        noteInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const val = noteInput.value.trim();
                if (val) {
                    const time = window.player ? window.player.getCurrentTime() : 0;
                    AppState.notes.push({
                        id: Date.now(),
                        time: time,
                        text: val,
                        type: 'note'
                    });
                    noteInput.value = '';
                    AppState.notify();
                    Utils.showToast('Note added at ' + Utils.formatTime(time), 'success');
                }
            }
        });
    }

    window.updateSidebarTimeline = function() {
        const container = document.querySelector('.timeline-container');
        if (!container) return;

        container.innerHTML = '';
        
        const items = [
            ...(AppState.boxes || []).map(b => ({ time: b.timestamp || 0, text: `Annotation: ${b.label}`, type: 'box', ref: b })),
            ...(AppState.notes || [])
        ].sort((a, b) => a.time - b.time);

        items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'timeline-item';
            el.style.cursor = 'pointer';
            el.innerHTML = `
                <div class="timeline-dot" style="background-color: ${item.type === 'box' ? 'var(--va-accent-cyan)' : 'var(--va-primary)'}"></div>
                <div class="timeline-line"></div>
                <div class="timeline-time">${Utils.formatTime(item.time)}</div>
                <div class="d-flex align-items-start justify-content-between">
                    <div class="timeline-text flex-grow-1">${item.text}</div>
                    ${item.type === 'note' && !window.isReadOnly ? '<i class="bi bi-x-circle text-muted delete-note-btn ms-2" style="font-size: 0.85rem; cursor: pointer;"></i>' : ''}
                </div>
            `;
            
            el.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-note-btn')) {
                    e.stopPropagation();
                    AppState.notes = AppState.notes.filter(n => n.id !== item.id);
                    AppState.notify();
                    Utils.showToast('Note deleted.', 'danger');
                    return;
                }
                if (window.player) window.player.seekTo(item.time, true);
                if (item.type === 'box' && typeof window.selectBox === 'function') {
                    window.selectBox(item.ref);
                }
            });
            container.appendChild(el);
        });

        const badge = document.querySelector('.sidebar-panel:last-child .panel-badge');
        if (badge) badge.innerText = `${items.length} events`;
    };

    AppState.addObserver(window.updateSidebarTimeline);
    window.updateSidebarTimeline();
});
