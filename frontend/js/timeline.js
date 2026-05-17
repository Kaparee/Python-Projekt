

(function () {
    const canvas = document.getElementById('scrubTimeline');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let isDragging = false;
    let animationFrame;
    let thumbnailImages = [];
    let thumbnailsLoaded = false;
    let playerStarted = false;

    const THUMBNAIL_COUNT = 20;

    const COLORS = {
        bg: '#0b0f19',
        track: '#1F2937',
        trackFill: 'rgba(99, 102, 241, 0.35)',
        tickMajor: '#4B5563',
        tickMinor: '#1F2937',
        labelColor: '#9CA3AF',
        playhead: '#6366F1',
        playheadGlow: 'rgba(99, 102, 241, 0.35)',
        annotation: 'rgba(99, 102, 241, 0.6)',
        thumbOverlay: 'rgba(11, 15, 25, 0.55)',
        thumbBorder: 'rgba(31, 41, 55, 0.6)',
    };

    const TIMELINE_HEIGHT = 64;

    function resize() {
        const parent = canvas.parentElement;
        canvas.width = parent.clientWidth;
        canvas.height = TIMELINE_HEIGHT;
        draw();
    }

    const ro = new ResizeObserver(() => {
        resize();
    });
    ro.observe(canvas.parentElement);

    window.addEventListener('resize', resize);
    resize();

    function getDuration() {
        if (window.player && typeof window.player.getDuration === 'function') {
            return window.player.getDuration() || 0;
        }
        return 0;
    }

    function getCurrentTime() {
        if (window.player && typeof window.player.getCurrentTime === 'function') {
            return window.player.getCurrentTime() || 0;
        }
        return 0;
    }

    function loadThumbnails() {
        const videoId = Utils.extractYouTubeId(Utils.getVideoContextId());

        const thumbUrls = [
            `https://img.youtube.com/vi/${videoId}/0.jpg`,
            `https://img.youtube.com/vi/${videoId}/1.jpg`,
            `https://img.youtube.com/vi/${videoId}/2.jpg`,
            `https://img.youtube.com/vi/${videoId}/3.jpg`,
        ];

        let loadedCount = 0;
        thumbnailImages = [];

        thumbUrls.forEach((url, i) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                thumbnailImages[i] = img;
                loadedCount++;
                if (loadedCount === thumbUrls.length) {
                    thumbnailsLoaded = true;
                    draw();
                }
            };
            img.onerror = () => {
                loadedCount++;
                if (loadedCount === thumbUrls.length && thumbnailImages.filter(Boolean).length > 0) {
                    thumbnailsLoaded = true;
                    draw();
                }
            };
            img.src = url;
        });
    }

    function drawThumbnailStrip(W, H) {
        if (!thumbnailsLoaded || thumbnailImages.filter(Boolean).length === 0) return;

        const validThumbs = thumbnailImages.filter(Boolean);
        const thumbCount = THUMBNAIL_COUNT;
        const thumbWidth = W / thumbCount;
        const thumbHeight = H;

        for (let i = 0; i < thumbCount; i++) {
            const img = validThumbs[i % validThumbs.length];
            if (!img) continue;

            const dx = i * thumbWidth;

            const imgAspect = img.width / img.height;
            const slotAspect = thumbWidth / thumbHeight;

            let sx, sy, sw, sh;
            if (imgAspect > slotAspect) {
                sh = img.height;
                sw = sh * slotAspect;
                sx = (img.width - sw) / 2;
                sy = 0;
            } else {
                sw = img.width;
                sh = sw / slotAspect;
                sx = 0;
                sy = (img.height - sh) / 2;
            }

            const offsetFactor = i / thumbCount;
            sx = Math.min(sx + offsetFactor * img.width * 0.15, img.width - sw);
            sx = Math.max(0, sx);

            ctx.drawImage(img, sx, sy, sw, sh, dx, 0, thumbWidth, thumbHeight);

            ctx.strokeStyle = COLORS.thumbBorder;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(dx, 0);
            ctx.lineTo(dx, H);
            ctx.stroke();
        }

        ctx.fillStyle = COLORS.thumbOverlay;
        ctx.fillRect(0, 0, W, H);
    }

    function draw() {
        if (!ctx) return;
        const W = canvas.width;
        const H = canvas.height;
        const duration = getDuration();
        const currentTime = getCurrentTime();

        ctx.clearRect(0, 0, W, H);

        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, W, H);

        if (duration > 0) {
            drawThumbnailStrip(W, H);

            const pixelsPerSecond = W / duration;
            const minorStep = pickTickStep(pixelsPerSecond);
            const majorStep = minorStep * 5;

            for (let t = 0; t <= duration; t += minorStep) {
                const x = (t / duration) * W;
                const isMajor = Math.abs(Math.round(t / majorStep) * majorStep - t) < 0.01;

                ctx.strokeStyle = isMajor ? COLORS.tickMajor : COLORS.tickMinor;
                ctx.lineWidth = 1;
                ctx.beginPath();
                const trackY = H / 2;
                ctx.moveTo(x, isMajor ? trackY - 10 : trackY - 5);
                ctx.lineTo(x, trackY + (isMajor ? 10 : 5));
                ctx.stroke();

                if (isMajor && t > 0) {
                    ctx.fillStyle = COLORS.labelColor;
                    ctx.font = '600 10px Inter, monospace';
                    ctx.textAlign = 'center';
                    const label = Utils.formatTime(t);
                    const tw = ctx.measureText(label).width + 6;
                    ctx.fillStyle = 'rgba(11, 15, 25, 0.75)';
                    ctx.fillRect(x - tw / 2, H - 16, tw, 14);
                    ctx.fillStyle = COLORS.labelColor;
                    ctx.fillText(label, x, H - 4);
                }
            }

            const trackY = H / 2;
            const trackH = 3;
            ctx.fillStyle = COLORS.track;
            ctx.beginPath();
            ctx.roundRect(0, trackY - trackH / 2, W, trackH, 2);
            ctx.fill();

            const progressW = (currentTime / duration) * W;
            ctx.fillStyle = COLORS.trackFill;
            ctx.beginPath();
            ctx.roundRect(0, trackY - trackH / 2, progressW, trackH, 2);
            ctx.fill();

            if (window.boxes && window.boxes.length > 0) {
                window.boxes.forEach(box => {
                    if (box.timestamp !== undefined) {
                        const bx = (box.timestamp / duration) * W;

                        ctx.shadowBlur = 4;
                        ctx.shadowColor = 'rgba(0, 229, 255, 0.5)';

                        ctx.fillStyle = '#00E5FF';
                        ctx.beginPath();
                        ctx.roundRect(bx - 2, trackY - 8, 4, 16, 2);
                        ctx.fill();

                        ctx.shadowBlur = 0;
                    }
                });
            }

            if (window.notes && window.notes.length > 0) {
                window.notes.forEach(note => {
                    if (note.time !== undefined) {
                        const nx = (note.time / duration) * W;
                        ctx.fillStyle = '#FFFFFF';
                        ctx.beginPath();
                        ctx.roundRect(nx - 1, trackY - 5, 2, 10, 1);
                        ctx.fill();
                    }
                });
            }

            const playX = (currentTime / duration) * W;

            ctx.fillStyle = COLORS.playheadGlow;
            ctx.beginPath();
            ctx.arc(playX, trackY, 12, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = COLORS.playhead;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(playX, 4);
            ctx.lineTo(playX, H - 16);
            ctx.stroke();

            ctx.fillStyle = COLORS.playhead;
            ctx.beginPath();
            ctx.moveTo(playX - 7, 2);
            ctx.lineTo(playX + 7, 2);
            ctx.lineTo(playX, 11);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(playX, trackY, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = COLORS.playhead;
            ctx.lineWidth = 2;
            ctx.stroke();

            const timeLabel = Utils.formatTimePrecise(currentTime);
            ctx.font = '600 9px Inter, monospace';
            const timeLabelW = ctx.measureText(timeLabel).width + 8;
            let timeLabelX = playX - timeLabelW / 2;
            timeLabelX = Math.max(2, Math.min(W - timeLabelW - 2, timeLabelX));
            ctx.fillStyle = 'rgba(99, 102, 241, 0.9)';
            ctx.beginPath();
            ctx.roundRect(timeLabelX, H - 14, timeLabelW, 12, 3);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText(timeLabel, timeLabelX + timeLabelW / 2, H - 4);
        } else {
            ctx.fillStyle = COLORS.labelColor;
            ctx.font = '500 12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⏳ Ładowanie timeline — oczekiwanie na film...', W / 2, H / 2 + 4);
        }
    }

    function pickTickStep(pxPerSec) {
        if (pxPerSec > 100) return 1;
        if (pxPerSec > 30) return 2;
        if (pxPerSec > 10) return 5;
        if (pxPerSec > 4) return 10;
        if (pxPerSec > 1) return 30;
        return 60;
    }

    function seekTo(clientX) {
        const duration = getDuration();
        if (!duration) return;
        const rect = canvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, canvas.width));
        const t = (x / canvas.width) * duration;
        if (window.player && typeof window.player.seekTo === 'function') {
            window.player.seekTo(t, true);
        }
    }




    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        seekTo(e.clientX);
        if (window.player && typeof window.player.pauseVideo === 'function') {
            window.player.pauseVideo();
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        seekTo(e.clientX);
        draw();
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });

    canvas.addEventListener('touchstart', (e) => {
        isDragging = true;
        seekTo(e.touches[0].clientX);
    });
    canvas.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        seekTo(e.touches[0].clientX);
        draw();
    }, { passive: false });
    canvas.addEventListener('touchend', () => { isDragging = false; });

    canvas.style.cursor = 'pointer';


    function loop() {
        draw();
        animationFrame = requestAnimationFrame(loop);
    }

    function startTimeline() {
        if (playerStarted) return;
        playerStarted = true;
        resize();
        loadThumbnails();
        loop();
    }


    window.addEventListener('playerReady', () => {
        let retries = 0;
        function waitForDuration() {
            if (getDuration() > 0) {
                startTimeline();
            } else if (retries < 20) {
                retries++;
                setTimeout(waitForDuration, 300);
            } else {
                startTimeline();
            }
        }
        waitForDuration();
    });

    function checkIfAlreadyReady() {
        if (window.player && typeof window.player.getDuration === 'function' && window.player.getDuration() > 0) {
            startTimeline();
        } else {
            let attempts = 0;
            const maxAttempts = 30;
            function poll() {
                if (playerStarted) return;
                if (window.player && typeof window.player.getDuration === 'function' && window.player.getDuration() > 0) {
                    startTimeline();
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(poll, 500);
                } else {
                    resize();
                    loadThumbnails();
                }
            }
            poll();
        }
    }

    async function loadPanelData() {
        const tagSelect = document.getElementById('tag-select');
        const stateSelect = document.getElementById('state-select');

        if (!tagSelect || !stateSelect) return;

        try {
            const [tagsRes, statesRes] = await Promise.all([
                fetch('http://localhost:8000/tags/'),
                fetch('http://localhost:8000/tags/states')
            ]);

            const tags = await tagsRes.json();
            const states = await statesRes.json();

            tagSelect.innerHTML = '<option value="">-- Select Tag --</option>' +
                tags.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

            stateSelect.innerHTML = '<option value="">-- Select State --</option>' +
                states.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        } catch (error) {
            console.error("Błąd API:", error);
        }
    }

    function setupTimeControls() {
        const setTime = (inputId) => {
            if (window.player && typeof window.player.getCurrentTime === 'function') {
                const time = window.player.getCurrentTime().toFixed(2);
                document.getElementById(inputId).value = time;
            }
        };

        document.getElementById('set-start-btn')?.addEventListener('click', () => setTime('start-time-input'));
        document.getElementById('set-end-btn')?.addEventListener('click', () => setTime('end-time-input'));

        document.getElementById('quick-start-btn')?.addEventListener('click', () => setTime('start-time-input'));
        document.getElementById('quick-stop-btn')?.addEventListener('click', () => setTime('end-time-input'));
    }

    async function saveEvent() {
        const videoId = Utils.getVideoContextId();

        const payload = {
            video_id: videoId,
            tag_id: parseInt(document.getElementById('tag-select').value) || null,
            state_id: parseInt(document.getElementById('state-select').value) || null,
            start_time: parseFloat(document.getElementById('start-time-input').value),
            end_time: parseFloat(document.getElementById('end-time-input').value),
            comment: document.getElementById('event-comment').value
        };

        try {
            const res = await fetch('http://localhost:8000/events/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                Utils.showToast('Zdarzenie zapisane!', 'success');
                document.getElementById('event-comment').value = '';
                // Odśwież listę logów po zapisaniu
                fetchAndRenderEvents(videoId);
            } else {
                const err = await res.json();
                Utils.showToast('Błąd: ' + (err.detail || 'Sprawdź czy czasy się nie nakładają'), 'danger');
            }
        } catch (e) {
            console.error('Save error:', e);
        }
    }

    function initPanels() {
        loadPanelData();
        setupTimeControls();

        const saveBtn = document.getElementById('save-event-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveEvent);
        }

        // Zaladuj eventy zalogowanego usera przy starcie
        const videoId = Utils.getVideoContextId();
        if (videoId) fetchAndRenderEvents(videoId);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPanels);
    } else {
        initPanels();
    }

    let activeViewingUserId = null;

    async function fetchAndRenderEvents(videoId, userId = null) {
        const listContainer = document.getElementById('eventsTimelineList');
        const badge = document.getElementById('eventCountBadge');
        let currentUserId = null;
        try {
            const tokenPayload = JSON.parse(atob(localStorage.getItem('token').split('.')[1]));
            currentUserId = tokenPayload.user_id || tokenPayload.sub;
        } catch(e) {
            console.error('JWT decode error:', e);
            return;
        }

        const targetUserId = userId || currentUserId;
        activeViewingUserId = targetUserId;

        try {
            const res = await fetch(`http://localhost:8000/events/?video_id=${videoId}&user_id=${targetUserId}`);
            const events = await res.json();

            badge.innerText = `${events.length} logs`;
            listContainer.innerHTML = '';

            events.forEach(event => {
                const isOwner = event.user_id == currentUserId;
                const item = document.createElement('div');
                item.className = 'timeline-item';
                item.innerHTML = `
                <div class="timeline-dot"></div>
                <div class="timeline-line"></div>
                <div class="d-flex justify-content-between align-items-start w-100">
                    <div>
                        <div class="timeline-time">${Utils.formatTime(event.start_time)} - ${Utils.formatTime(event.end_time)}</div>
                        <div class="timeline-text" id="content-${event.id}">${event.comment || 'No comment'}</div>
                        <div class="badge bg-secondary" style="font-size: 0.6rem;">${event.tag?.name || ''}</div>
                    </div>
                    ${isOwner ? `
                        <div class="event-actions">
                            <i class="bi bi-pencil-square text-muted me-2 pointer" onclick="editEventPrompt(${event.id})"></i>
                            <i class="bi bi-trash text-danger pointer" onclick="deleteEvent(${event.id})"></i>
                        </div>
                    ` : ''}
                </div>
            `;
                listContainer.appendChild(item);
            });

            applyReadOnlyLogic(targetUserId == currentUserId);

        } catch (e) { console.error('Load Events Error:', e); }
    }

    window.fetchAndRenderEvents = fetchAndRenderEvents;

    async function deleteEvent(id) {
        if (!confirm('Usunąć ten log?')) return;
        const currentVideoId = Utils.getVideoContextId();
        const res = await fetch(`http://localhost:8000/events/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
            Utils.showToast('Log usunięty', 'success');
            fetchAndRenderEvents(currentVideoId);
        }
    }

    function editEventPrompt(id) {
        const textEl = document.getElementById(`content-${id}`);
        const oldText = textEl.innerText;

        textEl.style.display = 'none';

        const inputEl = document.createElement('input');
        inputEl.type = 'text';
        inputEl.className = 'form-control form-control-sm mt-1 mb-1';
        inputEl.value = oldText;

        const saveEdit = async () => {
            const newText = inputEl.value;
            const currentVideoId = Utils.getVideoContextId();
            if (newText !== oldText) {
                const res = await fetch(`http://localhost:8000/events/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ comment: newText })
                });
                if (res.ok) {
                    Utils.showToast('Komentarz zaktualizowany', 'success');
                    fetchAndRenderEvents(currentVideoId);
                }
            } else {
                inputEl.remove();
                textEl.style.display = 'block';
            }
        };

        inputEl.addEventListener('blur', saveEdit);
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                inputEl.blur();
            } else if (e.key === 'Escape') {
                inputEl.remove();
                textEl.style.display = 'block';
            }
        });

        textEl.parentNode.insertBefore(inputEl, textEl.nextSibling);
        inputEl.focus();
    }

    let noteInputContainerCache = null;

    function applyReadOnlyLogic(isOwner) {
        let inputArea = document.querySelector('.note-input-container');
        const stateBtns = document.querySelectorAll('.btn-state');
        const timeBtns = document.querySelectorAll('.btn-outline-secondary');

        if (!isOwner) {
            if (inputArea) {
                noteInputContainerCache = inputArea;
                inputArea.remove();
            }
            stateBtns.forEach(b => b.classList.add('disabled'));
            timeBtns.forEach(b => b.style.display = 'none');
        } else {
            if (!inputArea && noteInputContainerCache) {
                const sidebar = document.querySelector('.workspace-sidebar');
                sidebar.appendChild(noteInputContainerCache);
            }
            stateBtns.forEach(b => b.classList.remove('disabled'));
            timeBtns.forEach(b => b.style.display = 'flex');
        }
    }

    window.deleteEvent = deleteEvent;
    window.editEventPrompt = editEventPrompt;

    window.addEventListener('resize', resize);
    resize();
    checkIfAlreadyReady();
})();
