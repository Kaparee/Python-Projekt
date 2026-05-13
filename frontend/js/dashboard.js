document.addEventListener('DOMContentLoaded', () => {
    const projectsGrid = document.getElementById('projectsGrid');
    const createBtn = document.getElementById('createProjectBtn');
    const urlInput = document.getElementById('videoUrl');
    const nameInput = document.getElementById('projectName');


    let projects = [
        { 
            id: 1, 
            title: 'Highway Traffic Analysis (Cam 04)', 
            meta: 'May 1, 2026 • 142 Annotations', 
            ytId: 'YE7VzlLtp-4',
            img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80'
        },
        { 
            id: 2, 
            title: 'Street View Pedestrian Tracking', 
            meta: 'Apr 28, 2026 • 87 Annotations', 
            ytId: '5_XDiK-Y-6A',
            img: 'https://images.unsplash.com/photo-1557800636-894a64c1696f?auto=format&fit=crop&w=600&q=80'
        },
        { 
            id: 3, 
            title: 'Factory Assembly QA Check', 
            meta: 'Apr 25, 2026 • 304 Annotations', 
            ytId: 'u6X_D_0pGAs',
            img: 'https://images.unsplash.com/photo-1612810806563-4cb8265db55b?auto=format&fit=crop&w=600&q=80'
        }
    ];

    function renderProjects() {
        if (!projectsGrid) return;
        projectsGrid.innerHTML = '';

        projects.forEach(project => {
            const card = document.createElement('div');
            card.className = 'col-md-4';
            card.innerHTML = `
                <div class="va-card project-card">
                    <div class="project-card-img" style="background-image: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.7)), url('${project.img}'); background-size: cover; background-position: center;"></div>
                    <div class="project-card-body">
                        <h3 class="project-card-title">${project.title}</h3>
                        <div class="project-card-meta">${project.meta}</div>
                        <div class="project-actions">
                            <a href="#" class="btn btn-icon open-project-btn" data-ytid="${project.ytId}" title="Edit Project"><i class="bi bi-pencil"></i></a>
                            <button class="btn btn-icon delete-project-btn" data-id="${project.id}" title="Delete Project"><i class="bi bi-trash"></i></button>
                        </div>
                    </div>
                </div>
            `;
            projectsGrid.appendChild(card);
        });


        document.querySelectorAll('.open-project-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const ytId = btn.getAttribute('data-ytid');
                sessionStorage.setItem('va_video_id', ytId);
                window.location.href = 'index.html?v=' + ytId;
            });
        });


        document.querySelectorAll('.delete-project-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(btn.getAttribute('data-id'));
                if (confirm('Are you sure you want to delete this project?')) {
                    projects = projects.filter(p => p.id !== id);
                    renderProjects();
                    console.log(`Project ${id} deleted (local state)`);

                }
            });
        });
    }

    if (createBtn && urlInput && nameInput) {
        createBtn.addEventListener('click', () => {
            const url = urlInput.value.trim();
            const name = nameInput.value.trim() || 'Untitled Project';
            
            if (!url) {
                alert('Please enter a Video URL.');
                return;
            }

            const videoId = Utils.extractYouTubeId(url);

            if (videoId) {
                const newProject = {
                    id: Date.now(),
                    title: name,
                    meta: `${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • 0 Annotations`,
                    ytId: videoId,
                    img: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80'
                };

                projects.unshift(newProject);
                renderProjects();


                const modalEl = document.getElementById('newProjectModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();


                urlInput.value = '';
                nameInput.value = '';

                console.log('New project created:', newProject);
            } else {
                alert('Invalid YouTube URL. Please make sure it contains a video ID.');
            }
        });
    }

    renderProjects();
});
