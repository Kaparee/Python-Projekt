window.selectedBox = null;
window.isEditingBox = false;

let activeHandle = null;
let editStartX, editStartY;
let moveStartX, moveStartY;
let isMovingBox = false;
let originalBoxState = null;

const HANDLE_SIZE = 8;
const canvasEl = document.getElementById('annotationCanvas');

window.selectBox = function(box) {
    window.selectedBox = box;
    if(typeof window.drawAllBoxes === 'function') window.drawAllBoxes();
    if(typeof window.updateCoordinatesPanel === 'function') window.updateCoordinatesPanel();
};



window.drawHandles = function(box, ctx) {
    ctx.fillStyle = box.color;
    
    const handles = getHandles(box);
    handles.forEach(h => {
        ctx.fillRect(h.x - (HANDLE_SIZE/2), h.y - (HANDLE_SIZE/2), HANDLE_SIZE, HANDLE_SIZE);
    });
};

function getHandles(box) {
    return [
        { id: 'tl', x: box.x, y: box.y }, 
        { id: 'tr', x: box.x + box.width, y: box.y }, 
        { id: 'bl', x: box.x, y: box.y + box.height }, 
        { id: 'br', x: box.x + box.width, y: box.y + box.height } 
    ];
}

window.deleteSelectedBox = function() {
    if (!window.selectedBox || window.isReadOnly) return;
    
    const idToDelete = window.selectedBox.id;
    AppState.boxes = AppState.boxes.filter(b => b.id !== idToDelete);
    window.selectedBox = null;
    
    AppState.notify();
    
    const token = localStorage.getItem('access_token');
    if(idToDelete && !String(idToDelete).startsWith('mock')) {
        fetch(`http://localhost:8000/annotations/${idToDelete}`, {
            method: 'DELETE',
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
        })
        .then(res => {
            if (!res.ok) throw new Error("API Unauthorized or missing");
            console.log("Deleted from server successfully");
        })
        .catch(err => {
            console.warn("API Delete failed, kept local state only:", err);
            Utils.showToast("Usunięto lokalnie (Brak połączenia z serwerem)", "warning");
        });
    }
};


canvasEl.addEventListener('mousedown', (e) => {
    if(window.isReadOnly || !window.selectedBox) return;
    
    const rect = canvasEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const handles = getHandles(window.selectedBox);
    activeHandle = handles.find(h => 
        Math.abs(x - h.x) <= (HANDLE_SIZE + 2) && Math.abs(y - h.y) <= (HANDLE_SIZE + 2)
    );
    
    if(activeHandle) {
        window.isEditingBox = true;
        editStartX = x;
        editStartY = y;
        originalBoxState = { ...window.selectedBox };
    } else {
        const b = window.selectedBox;
        if(x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
            isMovingBox = true;
            moveStartX = x;
            moveStartY = y;
            originalBoxState = { ...b };
            canvasEl.style.cursor = 'grabbing';
        }
    }
});

canvasEl.addEventListener('mousemove', (e) => {
    if(!window.isEditingBox || !activeHandle || !window.selectedBox) return;
    
    const rect = canvasEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const dx = x - editStartX;
    const dy = y - editStartY;
    
    const b = window.selectedBox;
    
    if(activeHandle.id === 'br') {
        b.width = Math.max(10, originalBoxState.width + dx);
        b.height = Math.max(10, originalBoxState.height + dy);
    } else if(activeHandle.id === 'tl') {
        if(originalBoxState.width - dx > 10) { b.x = originalBoxState.x + dx; b.width = originalBoxState.width - dx; }
        if(originalBoxState.height - dy > 10) { b.y = originalBoxState.y + dy; b.height = originalBoxState.height - dy; }
    } else if(activeHandle.id === 'tr') {
        b.width = Math.max(10, originalBoxState.width + dx);
        if(originalBoxState.height - dy > 10) { b.y = originalBoxState.y + dy; b.height = originalBoxState.height - dy; }
    } else if(activeHandle.id === 'bl') {
        if(originalBoxState.width - dx > 10) { b.x = originalBoxState.x + dx; b.width = originalBoxState.width - dx; }
        b.height = Math.max(10, originalBoxState.height + dy);
    }
    
    if(typeof window.drawAllBoxes === 'function') window.drawAllBoxes();
});

canvasEl.addEventListener('mousemove', (e) => {
    if(!isMovingBox || !window.selectedBox) return;
    
    const rect = canvasEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const dx = x - moveStartX;
    const dy = y - moveStartY;
    
    const b = window.selectedBox;
    b.x = originalBoxState.x + dx;
    b.y = originalBoxState.y + dy;
    
    if(typeof window.drawAllBoxes === 'function') window.drawAllBoxes();
});

canvasEl.addEventListener('mouseup', () => {
    if(window.isEditingBox || isMovingBox) {
        window.isEditingBox = false;
        isMovingBox = false;
        canvasEl.style.cursor = window.isReadOnly ? 'default' : 'crosshair';
        activeHandle = null;
        
        AppState.notify();
        
        const updatedBox = { ...window.selectedBox };
        const idToUpdate = updatedBox.id;
        const token = localStorage.getItem('access_token');
        
        if(idToUpdate && !String(idToUpdate).startsWith('mock')) {
            fetch(`http://localhost:8000/annotations/${idToUpdate}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    x: updatedBox.x,
                    y: updatedBox.y,
                    width: updatedBox.width,
                    height: updatedBox.height
                })
            })
            .then(res => {
                if(!res.ok) throw new Error("API Update failed");
                console.log("Updated on server");
            })
            .catch(err => {
                console.warn("Update failed, kept local:", err);
                Utils.showToast("Zmiany zapisane lokalnie", "warning");
            });
        }
    }
});

document.addEventListener('keydown', (e) => {
    if(window.isReadOnly) return;
    if((e.key === 'Delete' || e.key === 'Backspace') && window.selectedBox) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        window.deleteSelectedBox();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const trashBtn = document.getElementById('floatingTrashBtn');
    const renameBtn = document.getElementById('floatingRenameBtn');

    if (trashBtn) {
        trashBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof window.deleteSelectedBox === 'function') {
                window.deleteSelectedBox();
            }
        });
    }

    if (renameBtn) {
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!window.selectedBox) return;
            
            const labels = document.querySelectorAll('.coord-label');
            const targetLabel = Array.from(labels).find(l => {
                const boxIndex = l.getAttribute('data-box-index');
                return window.boxes[boxIndex] === window.selectedBox;
            });

            if (targetLabel && typeof window.startLabelEdit === 'function') {
                window.startLabelEdit(targetLabel, window.selectedBox);
            }
        });
    }
});
