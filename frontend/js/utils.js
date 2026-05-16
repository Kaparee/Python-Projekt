const Utils = {
    formatTime: function (seconds) {
        if (!seconds) return "00:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
    },

    formatTimePrecise: function (seconds) {
        if (!seconds) return "00:00.00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0') + '.' + ms.toString().padStart(2, '0');
    },

    extractYouTubeId: function (url) {
        if (!url) return null;
        const decoded = decodeURIComponent(url);
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
        const match = decoded.match(regex);
        return (match && match[1]) ? match[1] : decoded.trim();
    },

    getVideoContextId: function () {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('v') || sessionStorage.getItem('va_video_id') || 'YE7VzlLtp-4';
    },

    showToast: function (message, type = 'primary') {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
            document.body.appendChild(container);

            const style = document.createElement('style');
            style.innerHTML = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        const toast = document.createElement('div');
        const bg = type === 'success' ? '#10B981' : (type === 'warning' ? '#F59E0B' : (type === 'danger' ? '#EF4444' : '#6366F1'));

        toast.style.cssText = `
            background-color: ${bg};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            min-width: 200px;
            animation: slideIn 0.3s ease-out;
            transition: opacity 0.5s;
        `;
        toast.innerHTML = `
            <div class="d-flex align-items-center gap-2">
                <i class="bi ${type === 'success' ? 'bi-check-circle' : (type === 'danger' ? 'bi-x-circle' : 'bi-exclamation-circle')}"></i>
                <span>${message}</span>
            </div>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }, 4000);
    }
};

window.Utils = Utils;
window.formatTime = Utils.formatTime;
window.showToast = Utils.showToast;
