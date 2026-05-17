const canvas = document.getElementById('annotationCanvas');
const ctx = canvas.getContext('2d');
const videoContainer = document.getElementById('videoContainer');

let isDrawing = false;
let startX, startY;
let currentBox = null;

window.boxes = [];

function resizeCanvas() {
    canvas.width = videoContainer.clientWidth;
    canvas.height = videoContainer.clientHeight;
    drawAllBoxes();
}

window.addEventListener('resize', resizeCanvas);
setTimeout(resizeCanvas, 100);

canvas.addEventListener('mousedown', (e) => {
    if (window.isReadOnly) return;
    if (window.isEditingBox) return;
    
    const rect = canvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
    
    let clickedBox = null;
    const currentBoxes = AppState.boxes || [];
    let currentTime = 0;
    try { if(window.player && typeof window.player.getCurrentTime === 'function') currentTime = window.player.getCurrentTime(); } catch(e) {}
    for(let i = currentBoxes.length - 1; i >= 0; i--) {
        const b = currentBoxes[i];
        const timeDiff = window.player ? Math.abs((b.timestamp || 0) - currentTime) : 0;
        if(timeDiff <= 0.5 && startX >= b.x && startX <= b.x + b.width && startY >= b.y && startY <= b.y + b.height) {
            clickedBox = b;
            break;
        }
    }
    
    if(clickedBox) {
        if(typeof window.selectBox === 'function') window.selectBox(clickedBox);
        return;
    }
    
    if(typeof window.selectBox === 'function') window.selectBox(null);
    isDrawing = true;
});

canvas.addEventListener('mousemove', (e) => {
    if (window.isReadOnly || window.isEditingBox || !isDrawing) return;
    
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    currentBox = {
        x: Math.min(startX, currentX),
        y: Math.min(startY, currentY),
        width: Math.abs(currentX - startX),
        height: Math.abs(currentY - startY),
        color: '#00E5FF'
    };
    
    drawAllBoxes();
});

canvas.addEventListener('mouseup', () => {
    if (window.isReadOnly) return;
    
    if (isDrawing && currentBox && currentBox.width > 10 && currentBox.height > 10) {
        currentBox.id = 'box_' + Date.now();
        currentBox.label = 'New_Object';
        let t = 0;
        try { if(window.player && typeof window.player.getCurrentTime === 'function') t = window.player.getCurrentTime(); } catch(e) { console.warn("Player time error", e); }
        currentBox.timestamp = t;
        
        AppState.boxes.push(currentBox);
        AppState.notify();
        
        console.log("Local box saved at timestamp:", currentBox.timestamp);
    }
    isDrawing = false;
    currentBox = null;
    drawAllBoxes();
});

function drawAllBoxes() {
    if(!ctx || !AppState.boxes) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let currentTime = 0;
    try { if(window.player && typeof window.player.getCurrentTime === 'function') currentTime = window.player.getCurrentTime(); } catch(e) {}
    
    AppState.boxes.forEach(box => {
        if (window.player) {
            const timeDiff = Math.abs((box.timestamp || 0) - currentTime);
            if (timeDiff > 0.5) return;
        }

        const color = window.isReadOnly ? '#8F9BB3' : (box.color || '#00E5FF');
        
        ctx.fillStyle = color + '33'; 
        ctx.fillRect(box.x, box.y, box.width, box.height);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        
        ctx.fillStyle = color;
        ctx.font = '600 11px Inter';
        const padding = 8;
        const displayLabel = (box.label || 'OBJECT').toUpperCase();
        const textWidth = Math.ceil(ctx.measureText(displayLabel).width);
        ctx.fillRect(box.x, box.y - 20, textWidth + (padding*2), 20);
        ctx.fillStyle = '#000';
        ctx.fillText(displayLabel, box.x + padding, box.y - 6);
        
        if(window.selectedBox === box && !window.isReadOnly && typeof window.drawHandles === 'function') {
            window.drawHandles(box, ctx);
        }
    });
    
    if (isDrawing && currentBox) {
        ctx.strokeStyle = currentBox.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(currentBox.x, currentBox.y, currentBox.width, currentBox.height);
    }
    
    updateFloatingTrash();
}

function updateFloatingTrash() {
    const actionMenu = document.getElementById('floatingActionMenu');
    if (!actionMenu) return;
    
    if (!window.selectedBox || window.isReadOnly) {
        actionMenu.style.display = 'none';
        return;
    }
    
    const box = window.selectedBox;
    const canvasRect = canvas.getBoundingClientRect();
    const mainArea = document.querySelector('.workspace-main');
    if (!mainArea) return;
    const mainRect = mainArea.getBoundingClientRect();
    
    let menuLeft = canvasRect.left - mainRect.left + box.x + box.width + 6;
    let menuTop = canvasRect.top - mainRect.top + box.y - 4;
    
    const menuWidth = 70;
    if (menuLeft + menuWidth > mainRect.width) {
        menuLeft = canvasRect.left - mainRect.left + box.x - menuWidth - 6;
    }
    if (menuTop < 0) {
        menuTop = canvasRect.top - mainRect.top + box.y + box.height + 6;
    }
    
    actionMenu.style.display = 'flex';
    actionMenu.style.left = menuLeft + 'px';
    actionMenu.style.top = menuTop + 'px';
}

function updateCoordinatesPanel() {
    const list = document.getElementById('coordinatesList');
    const badge = document.getElementById('coordCountBadge');
    
    if(!list || !badge || !AppState.boxes) return;
    
    list.innerHTML = '';
    badge.innerText = AppState.boxes.length;
    
    AppState.boxes.forEach((box, index) => {
        const colorClass = window.isReadOnly ? 'text-muted' : 'label-cyan';
        const isSelected = window.selectedBox === box;
        const frameNum = Math.floor((box.timestamp || 0) * 30);
        const row = document.createElement('div');
        row.className = 'coord-row' + (isSelected ? ' coord-row-selected' : '');
        row.innerHTML = `
            <div class="coord-col text-start ${colorClass} coord-label" data-box-index="${index}" title="Edytuj nazwę">${box.label}</div>
            <div class="coord-col">${box.x.toFixed(0)}</div>
            <div class="coord-col">${box.y.toFixed(0)}</div>
            <div class="coord-col text-muted" style="font-size: 0.7rem;">F:${frameNum}</div>
        `;
        
        row.addEventListener('click', () => {
            if(typeof window.selectBox === 'function') window.selectBox(box);
            if(window.player && box.timestamp !== undefined) {
                window.player.seekTo(box.timestamp, true);
            }
            updateCoordinatesPanel();
        });
        
        const labelEl = row.querySelector('.coord-label');
        if (!window.isReadOnly) {
            labelEl.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                window.startLabelEdit(labelEl, box);
            });
        }
        
        list.appendChild(row);
    });
}

function startLabelEdit(labelEl, box) {
    if (labelEl.querySelector('input')) return;
    
    const currentName = box.label;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'coord-label-input';
    
    labelEl.textContent = '';
    labelEl.appendChild(input);
    input.focus();
    input.select();
    
    let finished = false;
    function saveEdit() {
        if (finished) return;
        finished = true;
        const newName = input.value.trim() || currentName;
        box.label = newName;
        labelEl.textContent = newName;
        AppState.notify();
    }
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { saveEdit(); } 
        else if (e.key === 'Escape') { finished = true; labelEl.textContent = currentName; }
    });
    
    input.addEventListener('blur', saveEdit);
}

window.drawAllBoxes = drawAllBoxes;
window.updateCoordinatesPanel = updateCoordinatesPanel;
window.startLabelEdit = startLabelEdit;

document.addEventListener('DOMContentLoaded', () => {
    updateCoordinatesPanel();
});
