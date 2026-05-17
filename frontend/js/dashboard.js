document.addEventListener('DOMContentLoaded', async () => {
    const projectsGrid = document.getElementById('projectsGrid');
    const createBtn = document.getElementById('createProjectBtn');
    const urlInput = document.getElementById('videoUrl');
    const nameInput = document.getElementById('projectName');

    let projects = [];

    async function load() {
        let r = await fetch('http://localhost:8000/user/videos', {
            headers: {'Authorization': 'Bearer ' + localStorage.getItem('token')}
        });
        if(r.ok) {
            projects = await r.json();
            renderProjects();
        } else if(r.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        }
    }

    function renderProjects() {
        if (!projectsGrid) return;
        projectsGrid.innerHTML = '';
        projects.forEach(project => {
            const card = document.createElement('div');
            card.className = 'col-md-4';
            card.innerHTML = `
                <div class="va-card project-card">
                    <div class="project-card-img" style="background-image: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.7)), url('https://img.youtube.com/vi/${project.youtube_id}/hqdefault.jpg'); background-size: cover; background-position: center;"></div>
                    <div class="project-card-body">
                        <h3 class="project-card-title">${project.title || project.youtube_id}</h3>
                        <div class="project-actions">
                            <a href="#" class="btn btn-icon open-project-btn" data-ytid="${project.youtube_id}"><i class="bi bi-pencil"></i></a>
                            <button class="btn btn-icon delete-project-btn" data-id="${project.id}"><i class="bi bi-trash"></i></button>
                        </div>
                    </div>
                </div>
            `;
            projectsGrid.appendChild(card);
        });

        document.querySelectorAll('.open-project-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                sessionStorage.setItem('va_video_id', btn.getAttribute('data-ytid'));
                window.location.href = 'index.html?v=' + btn.getAttribute('data-ytid');
            });
        });

        document.querySelectorAll('.delete-project-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                let r = await fetch('http://localhost:8000/videos/' + btn.getAttribute('data-id'), {
                    method: 'DELETE',
                    headers: {'Authorization': 'Bearer ' + localStorage.getItem('token')}
                });
                if(r.ok) {
                    load();
                } else {
                    alert("Blad");
                }
            });
        });
    }

    if (createBtn) {
        createBtn.addEventListener('click', async () => {
            let r = await fetch('http://localhost:8000/videos', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('token'),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: urlInput.value,
                    title: nameInput.value.trim() || 'Untitled Project'
                })
            });
            if(r.ok) {
                bootstrap.Modal.getInstance(document.getElementById('newProjectModal')).hide();
                load();
            } else {
                try {
                    let err = await r.json();
                    alert("Błąd: " + (err.detail || "Nieznany błąd"));
                } catch(e) {
                    alert("Wystąpił błąd podczas dodawania projektu.");
                }
            }
        });
    }

    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            if(confirm("Czy na pewno chcesz usunąć konto? To bezpowrotnie skasuje wszystkie Twoje adnotacje!")) {
                let r = await fetch('http://localhost:8000/auth/user', {
                    method: 'DELETE',
                    headers: {'Authorization': 'Bearer ' + localStorage.getItem('token')}
                });
                if(r.ok) {
                    localStorage.removeItem('token');
                    alert("Konto zostało usunięte. Do zobaczenia!");
                    window.location.href = 'register.html';
                } else {
                    alert("Wystąpił błąd podczas usuwania konta.");
                }
            }
        });
    }

    async function saveNewEvent() {
        const videoId = new URLSearchParams(window.location.search).get('v_id') || 1; // Przykładowe pobieranie ID filmu
        const startTime = parseFloat(document.getElementById('start-time-input').value);
        const endTime = parseFloat(document.getElementById('end-time-input').value);
        const tagId = document.getElementById('tag-select').value;
        const stateId = document.getElementById('state-select').value;
        const commentText = document.getElementById('event-comment')?.value;

        const eventData = {
            video_id: parseInt(videoId),
            tag_id: tagId ? parseInt(tagId) : null,
            state_id: stateId ? parseInt(stateId) : null,
            start_time: startTime,
            end_time: endTime,
            content: commentText
        };

        try {
            const response = await fetch('http://localhost:8000/events/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(eventData)
            });

            if (response.status === 201) {
                alert("Zdarzenie dodane pomyślnie!");
            } else if (response.status === 409) {
                alert("Błąd: Czas nakłada się na inne zdarzenie!");
            } else {
                const err = await response.json();
                alert("Błąd: " + err.detail);
            }
        } catch (error) {
            console.error("Błąd zapisu:", error);
        }
    }

    load();
});
