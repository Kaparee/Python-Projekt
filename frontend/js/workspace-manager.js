
document.addEventListener('DOMContentLoaded', () => {
    const currentUserId = 'user_kacper'; 

    document.addEventListener('click', (e) => {
        const chip = e.target.closest('.avatar-pill');
        if (chip) {
            const chips = document.querySelectorAll('.avatar-pill');
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            
            const selectedUserId = chip.getAttribute('data-userid');
            console.log("Version chip clicked:", selectedUserId);

            updateAccessMode(selectedUserId, currentUserId);
            loadUserAnnotations(selectedUserId);
        }
    });

    const activeChip = document.querySelector('.avatar-pill.active');
    if (activeChip) {
        const selectedUserId = activeChip.getAttribute('data-userid');
        updateAccessMode(selectedUserId, currentUserId);
        setTimeout(() => loadUserAnnotations(selectedUserId), 300);
    }
});

function updateAccessMode(selectedUserId, currentUserId) {
    console.log("Updating access mode for:", selectedUserId, "Owner:", currentUserId);
    const isOwner = selectedUserId === currentUserId;
    window.isReadOnly = !isOwner;

    const noteInput = document.querySelector('.note-input');
    const classInput = document.querySelector('.sidebar-panel input[placeholder*="classification"]');
    const classBtn = document.querySelector('.sidebar-panel .btn-primary i.bi-check2')?.parentElement;
    const startEventBtn = document.querySelector('.btn-start');
    const stopEventBtn = document.querySelector('.btn-stop');
    const saveBtn = document.querySelector('.btn-secondary-dark');
    const canvasEl = document.getElementById('annotationCanvas');
    const banner = document.getElementById('viewModeBanner');

    if(!isOwner) {

        if(canvasEl) canvasEl.style.cursor = 'default';
        if(banner) {
            banner.style.display = 'flex';
            banner.innerHTML = `<i class="bi bi-eye"></i> Viewing @${selectedUserId.replace('user_', '')}'s version (Read-only)`;
        }

        if(noteInput) { 
            noteInput.disabled = true; 
            noteInput.placeholder = "Read-only mode (Cannot add notes)"; 
            noteInput.style.opacity = '0.6';
        }
        if(classInput) { 
            classInput.disabled = true; 
            classInput.style.opacity = '0.6';
        }
        if(classBtn) {
            classBtn.disabled = true;
            classBtn.style.opacity = '0.6';
            classBtn.style.pointerEvents = 'none';
        }
        if(startEventBtn) {
            startEventBtn.disabled = true;
            startEventBtn.style.opacity = '0.6';
            startEventBtn.style.pointerEvents = 'none';
        }
        if(stopEventBtn) {
            stopEventBtn.disabled = true;
            stopEventBtn.style.opacity = '0.6';
            stopEventBtn.style.pointerEvents = 'none';
        }
        if(saveBtn) saveBtn.style.display = 'none';
        
    } else {

        if(canvasEl) canvasEl.style.cursor = 'crosshair';
        if(banner) banner.style.display = 'none';

        if(noteInput) { 
            noteInput.disabled = false; 
            noteInput.placeholder = "Add note at..."; 
            noteInput.style.opacity = '1';
        }
        if(classInput) { 
            classInput.disabled = false; 
            classInput.style.opacity = '1';
        }
        if(classBtn) {
            classBtn.disabled = false;
            classBtn.style.opacity = '1';
            classBtn.style.pointerEvents = 'auto';
        }
        if(startEventBtn) {
            startEventBtn.disabled = false;
            startEventBtn.style.opacity = '1';
            startEventBtn.style.pointerEvents = 'auto';
        }
        if(stopEventBtn) {
            stopEventBtn.disabled = false;
            stopEventBtn.style.opacity = '1';
            stopEventBtn.style.pointerEvents = 'auto';
        }
        if(saveBtn) saveBtn.style.display = 'block';
    }

    const actionMenu = document.getElementById('floatingActionMenu');
    if (actionMenu && window.isReadOnly) {
        actionMenu.style.display = 'none';
    }
}

function loadUserAnnotations(userId) {
    console.log("Rendering annotations for:", userId);
    
    if(typeof window.selectBox === 'function') window.selectBox(null);

    let mockBoxes = [];
    if (userId === 'user_kacper') {
        const saved = localStorage.getItem('va_boxes_kacper');
        if (saved) {
            try {
                mockBoxes = JSON.parse(saved);
                console.log("Loaded owner boxes from localStorage");
            } catch(e) {
                console.error("Error parsing saved boxes", e);
            }
        } else {
            mockBoxes = [
                { id: 'box_k1', label: 'Car_3', x: 210, y: 150, width: 300, height: 180, color: '#00E5FF', timestamp: 0.5 }
            ];
        }
    } else if (userId === 'user_tomasz') {
        mockBoxes = [
            { id: 'box_t1', label: 'Truck_A', x: 450, y: 200, width: 250, height: 150, color: '#FFD700', timestamp: 1.2 },
            { id: 'box_t2', label: 'License_Plate', x: 500, y: 320, width: 80, height: 40, color: '#FFD700', timestamp: 1.2 }
        ];
    } else if (userId === 'user_alex') {
        mockBoxes = [
            { id: 'box_a1', label: 'Person_Walking', x: 600, y: 400, width: 60, height: 120, color: '#8B5CF6', timestamp: 2.8 }
        ];
    } else {
        mockBoxes = [
            { id: 'box_m1', label: 'Sign_Post', x: 100, y: 50, width: 120, height: 100, color: '#F59E0B', timestamp: 3.5 }
        ];
    }

    AppState.updateBoxes(mockBoxes);
}

window.saveToLocalStorage = function() {
    AppState.save();
};
