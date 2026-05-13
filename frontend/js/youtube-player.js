let isPlayerReady = false;
let updateInterval;

function onYouTubeIframeAPIReady() {
    const videoId = Utils.extractYouTubeId(Utils.getVideoContextId());

    window.player = new YT.Player('ytplayer', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
            'playsinline': 1,
            'controls': 0,
            'disablekb': 1,
            'modestbranding': 1,
            'rel': 0,
            'fs': 0
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    isPlayerReady = true;
    updateDuration();

    window.dispatchEvent(new CustomEvent('playerReady'));

    document.getElementById('playPauseBtn').addEventListener('click', togglePlay);
    document.getElementById('prevFrameBtn').addEventListener('click', () => stepFrame(-1));
    document.getElementById('nextFrameBtn').addEventListener('click', () => stepFrame(1));

    const progressContainer = document.getElementById('progressBarContainer');
    progressContainer.addEventListener('click', (e) => {
        if (!isPlayerReady) return;
        const rect = progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        window.player.seekTo(pos * window.player.getDuration(), true);
    });

    updateInterval = setInterval(updateProgress, 100);
}

function togglePlay() {
    if (!isPlayerReady) return;
    const state = window.player.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
        window.player.pauseVideo();
    } else {
        window.player.playVideo();
    }
}

function stepFrame(direction) {
    if (!isPlayerReady) return;
    window.player.pauseVideo();
    const currentTime = window.player.getCurrentTime();
    const frameDuration = 1 / 30;
    window.player.seekTo(currentTime + (direction * frameDuration), true);
    updateProgress();
}

function onPlayerStateChange(event) {
    const playIcon = document.getElementById('playIcon');
    if (event.data === YT.PlayerState.PLAYING) {
        playIcon.classList.replace('bi-play-fill', 'bi-pause-fill');
    } else {
        playIcon.classList.replace('bi-pause-fill', 'bi-play-fill');
    }
}

function updateProgress() {
    if (!isPlayerReady) return;
    const currentTime = window.player.getCurrentTime();
    const duration = window.player.getDuration();

    document.getElementById('currentTimeDisplay').innerText = Utils.formatTime(currentTime);

    if (duration > 0) {
        const percent = (currentTime / duration) * 100;
        document.getElementById('progressBar').style.width = percent + '%';
        const handle = document.querySelector('.progress-handle');
        if (handle) handle.style.left = percent + '%';
    }

    if (typeof window.drawAllBoxes === 'function') {
        window.drawAllBoxes();
    }
}

function updateDuration() {
    const duration = window.player.getDuration();
    document.getElementById('durationDisplay').innerText = Utils.formatTime(duration);
}
