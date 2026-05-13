const AppState = {
    boxes: [],
    notes: [],
    observers: [],

    init: function () {
        if (!this.boxes || this.boxes.length === 0) {
            this.boxes = window.boxes || [];
        }
        if (!this.notes || this.notes.length === 0) {
            this.notes = window.notes || [];
        }
        console.log("AppState initialized with", this.boxes.length, "boxes and", this.notes.length, "notes");
    },

    addObserver: function (callback) {
        if (typeof callback === 'function' && !this.observers.includes(callback)) {
            this.observers.push(callback);
        }
    },

    notify: function () {
        console.log("Notifying", this.observers.length, "observers of state change");
        window.boxes = this.boxes;
        window.notes = this.notes;

        this.observers.forEach(callback => {
            try {
                callback();
            } catch (e) {
                console.error("Observer notification error:", e);
            }
        });

        this.save();
    },

    save: function () {
        if (!window.isReadOnly) {
            localStorage.setItem('va_boxes_kacper', JSON.stringify(this.boxes));
            localStorage.setItem('va_notes_kacper', JSON.stringify(this.notes));
        }
    },

    updateBoxes: function (newBoxes) {
        this.boxes = newBoxes;
        this.notify();
    },

    updateNotes: function (newNotes) {
        this.notes = newNotes;
        this.notify();
    }
};

window.AppState = AppState;
document.addEventListener('DOMContentLoaded', () => {
    AppState.init();

    if (typeof window.drawAllBoxes === 'function') AppState.addObserver(window.drawAllBoxes);
    if (typeof window.updateCoordinatesPanel === 'function') AppState.addObserver(window.updateCoordinatesPanel);
    if (typeof window.updateSidebarTimeline === 'function') AppState.addObserver(window.updateSidebarTimeline);
});
