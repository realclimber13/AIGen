// State Management
const state = {
    apiKey: localStorage.getItem('hf_api_key') || '',
    gallery: JSON.parse(localStorage.getItem('gallery') || '[]'),
    currentTab: 'image-tab'
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    updateApiStatus();
    renderGallery();
});

// Event Listeners
function initializeEventListeners() {
    // API Key Management
    document.getElementById('saveApiKey').addEventListener('click', saveApiKey);
    document.getElementById('apiKey').addEventListener('input', (e) => {
        state.apiKey = e.target.value;
    });

    // Tab Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab);
        });
    });

    // Image Generator
    document.getElementById('generateImageBtn').addEventListener('click', generateImage);
    document.getElementById('downloadImageBtn').addEventListener('click', downloadImage);
    document.getElementById('saveToGalleryBtn').addEventListener('click', saveImageToGallery);

    // Video Creator
    document.getElementById('generateVideoBtn').addEventListener('click', generateVideo);
    document.getElementById('downloadVideoBtn').addEventListener('click', downloadVideo);
    document.getElementById('saveVideoToGalleryBtn').addEventListener('click', saveVideoToGallery);

    // Sliders
    document.getElementById('imageSteps').addEventListener('input', (e) => {
        document.getElementById('stepsValue').textContent = e.target.value;
    });

    document.getElementById('imageGuidance').addEventListener('input', (e) => {
        document.getElementById('guidanceValue').textContent = e.target.value;
    });

    // Load API key from localStorage
    if (state.apiKey) {
        document.getElementById('apiKey').value = state.apiKey;
    }
}

// API Key Management
function saveApiKey() {
    const apiKey = document.getElementById('apiKey').value.trim();
    
    if (!apiKey) {
        showError('apiKey', 'Please enter an API key');
        return;
    }

    state.apiKey = apiKey;
    localStorage.setItem('hf_api_key', apiKey);
    updateApiStatus();
    showSuccess('API key saved successfully!');
}

function updateApiStatus() {
    const statusEl = document.getElementById('apiStatus');
    if (state.apiKey) {
        statusEl.textContent = '✓ Configured';
        statusEl.className = 'status-indicator saved';
    } else {
        statusEl.textContent = '✗ Not configured';
        statusEl.className = 'status-indicator';
    }
}

// Tab Navigation
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active from buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    state.currentTab = tabName;
}

// Image Generation
async function generateImage() {
    const prompt = document.getElementById('imagePrompt').value.trim();
    const model = document.getElementById('imageModel').value;
    const steps = parseInt(document.getElementById('imageSteps').value);
    const guidanceScale = parseFloat(document.getElementById('imageGuidance').value);

    if (!prompt) {
        showError('imageError', 'Please enter a prompt');
        return;
    }

    if (!state.apiKey) {
        showError('imageError', 'Please configure your API key first');
        return;
    }

    try {
        showLoader('imageLoader');
        hideError('imageError');

        const response = await callHuggingFaceAPI(model, {
            inputs: prompt,
            parameters: {
                num_inference_steps: steps,
                guidance_scale: guidanceScale,
            }
        });

        if (response instanceof Blob) {
            const imageUrl = URL.createObjectURL(response);
            displayGeneratedImage(imageUrl);
        } else {
            throw new Error('Invalid response from API');
        }
    } catch (error) {
        console.error('Image generation error:', error);
        showError('imageError', `Error: ${error.message}`);
    } finally {
        hideLoader('imageLoader');
    }
}

// Video Generation (Simulated with Canvas Animation)
async function generateVideo() {
    const prompt = document.getElementById('videoPrompt').value.trim();
    const duration = parseInt(document.getElementById('videoDuration').value);
    const fps = parseInt(document.getElementById('videoFPS').value);

    if (!prompt) {
        showError('videoError', 'Please enter a prompt');
        return;
    }

    if (!state.apiKey) {
        showError('videoError', 'Please configure your API key first');
        return;
    }

    try {
        showLoader('videoLoader');
        hideError('videoError');

        // Generate multiple frames
        const frameCount = duration * fps;
        const frames = [];

        for (let i = 0; i < frameCount; i++) {
            const progress = i / frameCount;
            const framePrompt = `${prompt} - frame ${i + 1}/${frameCount}`;

            const response = await callHuggingFaceAPI('stabilityai/stable-diffusion-2', {
                inputs: framePrompt,
                parameters: {
                    num_inference_steps: 15,
                    guidance_scale: 7.5,
                }
            });

            if (response instanceof Blob) {
                frames.push(response);
                // Update progress
                const progressPercent = Math.round(progress * 100);
                document.getElementById('videoLoader').textContent = \
                    `${progressPercent}%`;
            }
        }

        // Create video from frames
        const videoBlob = await createVideoFromFrames(frames, fps);
        const videoUrl = URL.createObjectURL(videoBlob);
        displayGeneratedVideo(videoUrl);
    } catch (error) {
        console.error('Video generation error:', error);
        showError('videoError', `Error: ${error.message}`);
    } finally {
        hideLoader('videoLoader');
    }
}

// Hugging Face API Call
async function callHuggingFaceAPI(model, payload) {
    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        headers: {
            Authorization: `Bearer ${state.apiKey}`,
        },
        method: 'POST',
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API request failed');
    }

    return await response.blob();
}

// Create Video from Frames
async function createVideoFromFrames(frames, fps) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 512;

        // Simulate video creation by combining frames
        const imageDataList = [];
        let loadedFrames = 0;

        frames.forEach((frameBlob, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, 0, 0);
                    imageDataList[index] = canvas.toDataURL('image/png');
                    loadedFrames++;

                    if (loadedFrames === frames.length) {
                        // Create a simple video file (as WebM)
                        const canvas2 = document.createElement('canvas');
                        const ctx2 = canvas2.getContext('2d');
                        const stream = canvas2.captureStream(fps);
                        const mediaRecorder = new MediaRecorder(stream);
                        const chunks = [];

                        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
                        mediaRecorder.onstop = () => {
                            const blob = new Blob(chunks, { type: 'video/webm' });
                            resolve(blob);
                        };

                        // Draw frames sequentially
                        let frameIndex = 0;
                        const interval = setInterval(() => {
                            if (frameIndex < imageDataList.length) {
                                const img = new Image();
                                img.src = imageDataList[frameIndex];
                                img.onload = () => {
                                    ctx2.drawImage(img, 0, 0);
                                };
                                frameIndex++;
                            } else {
                                clearInterval(interval);
                                mediaRecorder.stop();
                            }
                        }, 1000 / fps);

                        mediaRecorder.start();
                    }
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(frameBlob);
        });
    });
}

// Display Generated Image
function displayGeneratedImage(imageUrl) {
    document.getElementById('generatedImage').src = imageUrl;
    document.getElementById('imageOutput').classList.remove('hidden');
    window.generatedImageUrl = imageUrl;
}

// Display Generated Video
function displayGeneratedVideo(videoUrl) {
    const video = document.getElementById('generatedVideo');
    video.src = videoUrl;
    document.getElementById('videoOutput').classList.remove('hidden');
    window.generatedVideoUrl = videoUrl;
}

// Gallery Management
function saveImageToGallery() {
    if (!window.generatedImageUrl) return;

    const item = {
        id: Date.now(),
        type: 'image',
        url: window.generatedImageUrl,
        prompt: document.getElementById('imagePrompt').value,
        created: new Date().toLocaleString()
    };

    state.gallery.push(item);
    localStorage.setItem('gallery', JSON.stringify(state.gallery));
    renderGallery();
    showSuccess('Image saved to gallery!');
}

function saveVideoToGallery() {
    if (!window.generatedVideoUrl) return;

    const item = {
        id: Date.now(),
        type: 'video',
        url: window.generatedVideoUrl,
        prompt: document.getElementById('videoPrompt').value,
        created: new Date().toLocaleString()
    };

    state.gallery.push(item);
    localStorage.setItem('gallery', JSON.stringify(state.gallery));
    renderGallery();
    showSuccess('Video saved to gallery!');
}

function renderGallery() {
    const container = document.getElementById('galleryContainer');

    if (state.gallery.length === 0) {
        container.innerHTML = '<p class="empty-state">No items in gallery yet. Create something!</p>';
        return;
    }

    container.innerHTML = state.gallery.map(item => `
        <div class="gallery-item">
            ${item.type === 'image' 
                ? `<img src="${item.url}" alt="Gallery item">` 
                : `<video src="${item.url}"></video>`
            }
            <div class="gallery-item-overlay">
                <button class="btn btn-secondary" onclick="downloadGalleryItem('${item.id}', '${item.type}')">Download</button>
                <button class="btn btn-secondary" onclick="deleteGalleryItem(${item.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

function deleteGalleryItem(id) {
    state.gallery = state.gallery.filter(item => item.id !== id);
    localStorage.setItem('gallery', JSON.stringify(state.gallery));
    renderGallery();
}

function downloadGalleryItem(id, type) {
    const item = state.gallery.find(i => i.id === id);
    if (!item) return;

    const link = document.createElement('a');
    link.href = item.url;
    link.download = `creation-${id}.${type === 'image' ? 'png' : 'webm'}`;
    link.click();
}

// Download Functions
function downloadImage() {
    if (!window.generatedImageUrl) return;

    const link = document.createElement('a');
    link.href = window.generatedImageUrl;
    link.download = `generated-image-${Date.now()}.png`;
    link.click();
}

function downloadVideo() {
    if (!window.generatedVideoUrl) return;

    const link = document.createElement('a');
    link.href = window.generatedVideoUrl;
    link.download = `generated-video-${Date.now()}.webm`;
    link.click();
}

// Utility Functions
function showLoader(elementId) {
    const loader = document.getElementById(elementId);
    loader.classList.remove('hidden');
    loader.textContent = '';
}

function hideLoader(elementId) {
    document.getElementById(elementId).classList.add('hidden');
}

function showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

function hideError(elementId) {
    document.getElementById(elementId).classList.add('hidden');
}

function showSuccess(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--success-color);
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);