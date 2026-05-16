
document.addEventListener('DOMContentLoaded', async () => {
    let currentUser = null;
    let currentUserId = null;
    let videoId = Utils.getVideoContextId();

    try {
        let rUser = await fetch('http://localhost:8000/auth/user', {
            headers: {'Authorization': 'Bearer ' + localStorage.getItem('token')}
        });
        if(rUser.ok) {
            currentUser = await rUser.json();
            currentUserId = currentUser.id.toString();
        } else if(rUser.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }

        let rVideo = await fetch(`http://localhost:8000/videos/${videoId}`, {
            headers: {'Authorization': 'Bearer ' + localStorage.getItem('token')}
        });
        if(rVideo.ok) {
            let v = await rVideo.json();
            document.getElementById('projectTitleDisplay').innerText = v.title || v.youtube_id;
        }

        let rVersions = await fetch(`http://localhost:8000/videos/${videoId}/versions`);
        if(rVersions.ok) {
            let users = await rVersions.json();
            let carousel = document.getElementById('userCarousel');
            if(carousel) {
                carousel.innerHTML = '';
                users.forEach(u => {
                    let pill = document.createElement('div');
                    pill.className = 'avatar-pill';
                    pill.setAttribute('data-userid', u.id.toString());
                    if(u.id.toString() === currentUserId) pill.classList.add('active');
                    pill.innerHTML = `<div class="status-dot dot-blue"></div> @${u.username}`;
                    carousel.appendChild(pill);
                });
                
                if(!users.find(u => u.id.toString() === currentUserId) && currentUser) {
                    let myPill = document.createElement('div');
                    myPill.className = 'avatar-pill active';
                    myPill.setAttribute('data-userid', currentUserId);
                    myPill.innerHTML = `<div class="status-dot dot-green"></div> @${currentUser.username}`;
                    carousel.insertBefore(myPill, carousel.firstChild);
                }
            }
        }
    } catch(e) {}

    document.addEventListener('click', (e) => {
        const chip = e.target.closest('.avatar-pill');
        if (chip) {
            const chips = document.querySelectorAll('.avatar-pill');
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            
            const selectedUserId = chip.getAttribute('data-userid');
            console.log("Version chip clicked:", selectedUserId);

            updateAccessMode(selectedUserId, currentUserId);
            if(typeof window.loadUserAnnotations === 'function') {
                window.loadUserAnnotations(selectedUserId);
            }
        }
    });

    const activeChip = document.querySelector('.avatar-pill.active');
    if (activeChip) {
        const selectedUserId = activeChip.getAttribute('data-userid');
        updateAccessMode(selectedUserId, currentUserId);
        setTimeout(() => {
            if(typeof window.loadUserAnnotations === 'function') {
                window.loadUserAnnotations(selectedUserId);
            }
        }, 300);
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
            banner.classList.remove('d-none');
            banner.classList.add('d-flex');
            let displayName = selectedUserId.replace('user_', '');
            let userPill = document.querySelector(`.avatar-pill[data-userid="${selectedUserId}"]`);
            if (userPill) {
                let nameMatch = userPill.innerText.trim().replace('@', '');
                if (nameMatch) displayName = nameMatch;
            }
            banner.innerHTML = `<i class="bi bi-eye"></i> Viewing @${displayName}'s version (Read-only)`;
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
        if(banner) {
            banner.classList.add('d-none');
            banner.classList.remove('d-flex');
        }

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

async function loadUserAnnotations(userId) {
    console.log("Rendering annotations for:", userId);
    
    if(typeof window.selectBox === 'function') window.selectBox(null);

    let videoId = new URLSearchParams(window.location.search).get('v') || sessionStorage.getItem('va_video_id');
    let loadedBoxes = [];
    
    try {
        let rawId = userId.replace('user_', '');
        let r = await fetch(`http://localhost:8000/videos/${videoId}/annotations?user_id=${rawId}`, {
            headers: {'Authorization': 'Bearer ' + localStorage.getItem('token')}
        });
        if(r.ok) {
            loadedBoxes = await r.json();
            console.log("Loaded", loadedBoxes.length, "boxes from API");
        } else {
            console.error("Failed to load from API");
        }
    } catch(e) {
        console.error("Error fetching annotations", e);
    }

    AppState.updateBoxes(loadedBoxes);
}

window.saveToLocalStorage = function() {
    AppState.save();
};
