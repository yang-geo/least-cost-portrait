// DOM Elements
const canvasOrig = document.getElementById('canvasOriginal');
const ctxOrig = canvasOrig.getContext('2d', { willReadFrequently: true });
const canvasGray = document.getElementById('canvasGray');
const ctxGray = canvasGray.getContext('2d');
const API_BASE = 'https://least-cost-portrait.onrender.com';
let seeds = []; 
let rawImage = null; // The loaded HTMLImageElement
let uploadedFile = null;

// Camera / Viewport State (Shared across both canvases)
let camera = { zoom: 1, x: 0, y: 0 };
let isDragging = false;
let dragStart = { x: 0, y: 0 };

// UI Binding
document.getElementById('friction').oninput = e => document.getElementById('frictionVal').innerText = e.target.value;
document.getElementById('levels').oninput = e => document.getElementById('levelsVal').innerText = e.target.value;

// --- 1. Image Loading & Grayscale Processing ---
document.getElementById('imageInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const uploadBtnText = document.getElementById('uploadBtnText');
    
    if (!file) {
        fileNameDisplay.innerText = '';
        uploadBtnText.innerText = '📁 Click to Choose Image';
        return;
    }
    
    fileNameDisplay.innerText = "Loaded: " + file.name;
    uploadBtnText.innerText = '🔄 Change Image';
    
    uploadedFile = file;
    seeds = [];
    camera = { zoom: 1, x: 0, y: 0 }; 

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            rawImage = img;
            resizeCanvases();
            generateGrayscaleCache();
            renderAll();
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(file);

    
});
// --- 1.5 Load Sample Images ---
async function loadSample(imagePath, displayName) {
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const uploadBtnText = document.getElementById('uploadBtnText');
    
    fileNameDisplay.innerText = "Loading " + displayName + "...";
    
    try {
        // 第一步：向本地服务器请求这张图片
        const response = await fetch(imagePath);
        if (!response.ok) throw new Error("Image not found");
        
        // 第二步：将图片数据转换为 Blob（二进制大对象）
        const blob = await response.blob();
        
        // 第三步（魔法核心）：把 Blob 包装成一个标准的 File 对象
        // 这样你的后端 main.py 就完全分辨不出它是用户上传的还是程序自己读取的了！
        uploadedFile = new File([blob], imagePath, { type: blob.type });
        
        // 第四步：在前端的 Canvas 上把它画出来
        const img = new Image();
        img.onload = function() {
            rawImage = img;
            seeds = []; // 清空之前的点
            camera = { zoom: 1, x: 0, y: 0 }; // 视角归位
            
            resizeCanvases();
            generateGrayscaleCache();
            renderAll();
            
            // 更新 UI 提示
            fileNameDisplay.innerText = "Sample Loaded: " + displayName;
            uploadBtnText.innerText = '🔄 Upload Own Image';
        };
        // URL.createObjectURL 可以直接把内存里的 Blob 变成图片的 src
        img.src = URL.createObjectURL(blob);
        
    } catch (err) {
        console.error(err);
        fileNameDisplay.innerText = "❌ Failed to load " + displayName;
        alert(`Cannot load sample. Please make sure '${imagePath}' is in the same folder, and you are accessing this via http://127.0.0.1 (not file://).`);
    }
}
// Create an offscreen canvas to hold the grayscale version for fast rendering
const offscreenGray = document.createElement('canvas');
const offscreenOrig = document.createElement('canvas');

function generateGrayscaleCache() {
    if (!rawImage) return;
    const w = rawImage.width;
    const h = rawImage.height;
    
    offscreenOrig.width = w; offscreenOrig.height = h;
    const ctxO = offscreenOrig.getContext('2d');
    ctxO.drawImage(rawImage, 0, 0);

    offscreenGray.width = w; offscreenGray.height = h;
    const ctxG = offscreenGray.getContext('2d');
    ctxG.drawImage(rawImage, 0, 0);
    
    const imgData = ctxG.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
        data[i] = data[i+1] = data[i+2] = gray;
    }
    ctxG.putImageData(imgData, 0, 0);
}

function resizeCanvases() {
    const rect = document.getElementById('containerOrig').getBoundingClientRect();
    canvasOrig.width = canvasGray.width = rect.width;
    canvasOrig.height = canvasGray.height = rect.height;
    if(rawImage) {
        const scaleX = rect.width / rawImage.width;
        const scaleY = rect.height / rawImage.height;
        camera.zoom = Math.min(scaleX, scaleY) * 0.9; 
        camera.x = rect.width / 2;
        camera.y = rect.height / 2;
    }
}
window.addEventListener('resize', () => { resizeCanvases(); renderAll(); });

// --- 2. Camera & Interaction System ---
function renderCanvas(canvas, ctx, sourceImg) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!rawImage) return;

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-rawImage.width / 2, -rawImage.height / 2);

    ctx.drawImage(sourceImg, 0, 0);

    ctx.fillStyle = '#00aaff'; 
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5 / camera.zoom; 

    seeds.forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 5 / camera.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    });

    ctx.restore();
}

function renderAll() {
    renderCanvas(canvasOrig, ctxOrig, offscreenOrig);
    renderCanvas(canvasGray, ctxGray, offscreenGray);
}

function getImgCoords(screenX, screenY, canvas) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = screenX - rect.left;
    const mouseY = screenY - rect.top;
    
    const imgX = (mouseX - camera.x) / camera.zoom + rawImage.width / 2;
    const imgY = (mouseY - camera.y) / camera.zoom + rawImage.height / 2;
    return [imgX, imgY];
}

[canvasOrig, canvasGray].forEach(canvas => {
    canvas.addEventListener('mousedown', e => {
        if(e.button !== 0) return; 
        isDragging = false; 
        dragStart = { x: e.clientX, y: e.clientY, camX: camera.x, camY: camera.y };
    });

    window.addEventListener('mousemove', e => {
        if (!dragStart.x) return;
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging = true;
        
        if (isDragging) {
            camera.x = dragStart.camX + dx;
            camera.y = dragStart.camY + dy;
            renderAll();
        }
    });

    window.addEventListener('mouseup', e => {
        dragStart = { x: 0, y: 0 };
    });

    canvas.addEventListener('click', e => {
        if (!rawImage || isDragging) return; 
        const coords = getImgCoords(e.clientX, e.clientY, canvas);
        
        if(coords[0] >= 0 && coords[0] <= rawImage.width && coords[1] >= 0 && coords[1] <= rawImage.height) {
            seeds.push(coords);
            renderAll();
        }
    });
});

window.addEventListener('wheel', e => {
    if (e.target.tagName !== 'CANVAS') return;
    e.preventDefault();
    if (!rawImage) return;

    const canvas = e.target;
    const zoomFactor = 1.1;
    const direction = e.deltaY > 0 ? -1 : 1;
    const mouseCoordsBefore = getImgCoords(e.clientX, e.clientY, canvas);

    if (direction === 1) camera.zoom *= zoomFactor;
    else camera.zoom /= zoomFactor;

    camera.zoom = Math.max(0.05, Math.min(camera.zoom, 20)); 

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    camera.x = mouseX - (mouseCoordsBefore[0] - rawImage.width/2) * camera.zoom;
    camera.y = mouseY - (mouseCoordsBefore[1] - rawImage.height/2) * camera.zoom;
    
    renderAll();
}, { passive: false });

document.querySelectorAll('.zoom-in').forEach(btn => btn.onclick = () => { camera.zoom *= 1.2; renderAll(); });
document.querySelectorAll('.zoom-out').forEach(btn => btn.onclick = () => { camera.zoom /= 1.2; renderAll(); });
document.querySelectorAll('.zoom-reset').forEach(btn => {
    btn.onclick = () => { resizeCanvases(); renderAll(); }
});

document.getElementById('clearPointsBtn').onclick = () => { seeds = []; renderAll(); };

// --- 3. Backend Communication & Export ---
document.getElementById('generateBtn').onclick = async () => {
    if (!uploadedFile) return alert("Please upload an image first.");

    const btn = document.getElementById('generateBtn');
    const loading = document.getElementById('loading');
    const resultImg = document.getElementById('resultImage');
    
    btn.disabled = true;
    loading.innerText = "Computing Cost Surface...";
    loading.style.display = 'block';
    resultImg.style.display = 'none';

    const formData = new FormData();
    formData.append('file', uploadedFile);
    formData.append('friction', document.getElementById('friction').value);
    formData.append('levels', document.getElementById('levels').value);
    formData.append('seeds_json', JSON.stringify(seeds));
    formData.append('export_format', 'png'); 

    try {
        const response = await fetch(`${API_BASE}/generate`, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const blob = await response.blob();
            resultImg.src = URL.createObjectURL(blob);
            resultImg.style.display = 'block';
        } else {
            alert("Server error. Check terminal for Python exceptions.");
        }
    } catch (err) {
        alert("Cannot connect to server. Is Uvicorn running on port 8000?");
    } finally {
        btn.disabled = false;
        loading.style.display = 'none';
    }
};

async function exportResult(format) {
    if (!uploadedFile) return alert("Please generate a portrait first.");
    
    const friction = document.getElementById('friction').value;
    const levels = document.getElementById('levels').value;
    
    const formData = new FormData();
    formData.append('file', uploadedFile);
    formData.append('friction', friction);
    formData.append('levels', levels);
    formData.append('seeds_json', JSON.stringify(seeds));
    formData.append('export_format', format);

    const loading = document.getElementById('loading');
    loading.innerText = `Exporting ${format.toUpperCase()}...`;
    loading.style.display = 'block';

    try {
        const response = await fetch(`${API_BASE}/generate`, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `least_cost_portrait_${Date.now()}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            alert("Export failed on the server.");
        }
    } catch (err) {
        console.error("Export failed", err);
    } finally {
        loading.innerText = "Computing Cost Surface...";
        loading.style.display = 'none';
    }
}