// ==================== STATE MANAGEMENT ====================
const app = {
    credits: 60,
    maxCredits: 60,
    currentTool: 'chat',
    uploadedImages: [],
    uploadedAudio: null,
    selectedImageForEdit: null,
    generatedItems: [],
    chatHistory: [],
    
    init() {
        this.loadState();
        this.setupEventListeners();
        this.renderCredits();
    },
    
    loadState() {
        const saved = localStorage.getItem('novaStudioState');
        if (saved) {
            const state = JSON.parse(saved);
            this.credits = state.credits || 60;
            this.uploadedImages = state.uploadedImages || [];
            this.chatHistory = state.chatHistory || [];
            this.generatedItems = state.generatedItems || [];
        }
        this.renderChatHistory();
    },
    
    saveState() {
        const state = {
            credits: this.credits,
            uploadedImages: this.uploadedImages,
            chatHistory: this.chatHistory,
            generatedItems: this.generatedItems
        };
        localStorage.setItem('novaStudioState', JSON.stringify(state));
    },
    
    // ==================== SETUP ====================
    setupEventListeners() {
        // Hamburger Menu
        document.getElementById('hamburgerMenu').addEventListener('click', () => this.toggleSidebar());
        document.getElementById('closeSidebar').addEventListener('click', () => this.closeSidebar());
        
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTool(link.dataset.tool);
            });
        });
        
        // Chat
        document.getElementById('sendChatBtn').addEventListener('click', () => this.handleChat());
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) this.handleChat();
        });
        
        // Image Generator
        document.getElementById('generateImageBtn').addEventListener('click', () => this.generateImage());
        
        // Video Maker
        document.getElementById('generateVideoBtn').addEventListener('click', () => this.generateVideo());
        document.getElementById('playBtn').addEventListener('click', () => document.getElementById('generatedVideo').play());
        document.getElementById('pauseBtn').addEventListener('click', () => document.getElementById('generatedVideo').pause());
        document.getElementById('deleteVideoBtn').addEventListener('click', () => this.deleteVideo());
        
        const videoElement = document.getElementById('generatedVideo');
        const timeline = document.getElementById('videoTimeline');
        
        videoElement.addEventListener('timeupdate', () => {
            timeline.value = (videoElement.currentTime / videoElement.duration) * 100 || 0;
            this.updateTimeDisplay();
        });
        
        timeline.addEventListener('input', () => {
            videoElement.currentTime = (timeline.value / 100) * videoElement.duration;
        });
        
        // Image Editor
        document.getElementById('uploadImageBtn').addEventListener('click', () => document.getElementById('imageFileInput').click());
        document.getElementById('imageFileInput').addEventListener('change', (e) => this.handleImageUpload(e));
        document.getElementById('applyEditBtn').addEventListener('click', () => this.applyImageEdit());
        
        // Voiceover
        document.getElementById('generateVoiceBtn').addEventListener('click', () => this.generateVoice());
        document.getElementById('uploadAudioBtn').addEventListener('click', () => document.getElementById('audioFileInput').click());
        document.getElementById('audioFileInput').addEventListener('change', (e) => this.handleAudioUpload(e));
        document.getElementById('applyVoiceChangeBtn').addEventListener('click', () => this.applyVoiceChange());
        
        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
        
        // Refresh Credits
        document.getElementById('refreshCredits').addEventListener('click', () => this.showNotification('Credits refresh automatically every 24 hours!', 'success'));
    },
    
    // ==================== NAVIGATION ====================
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const hamburger = document.getElementById('hamburgerMenu');
        sidebar.classList.toggle('active');
        hamburger.classList.toggle('active');
    },
    
    closeSidebar() {
        document.getElementById('sidebar').classList.remove('active');
        document.getElementById('hamburgerMenu').classList.remove('active');
    },
    
    switchTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.tool-section').forEach(s => s.classList.remove('active'));
        document.getElementById(tool + 'Section').classList.add('active');
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
        this.closeSidebar();
    },
    
    switchTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        event.target.classList.add('active');
        document.getElementById(tab + 'Tab').classList.add('active');
    },
    
    // ==================== CHAT ====================
    handleChat() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Add user message
        this.chatHistory.push({ role: 'user', content: message });
        this.renderChatMessage('user', message);
        input.value = '';
        
        // Simulate AI response
        setTimeout(() => {
            const responses = [
                'That\'s a great question! Let me help you with that.',
                'I understand. Here\'s what I think about that...',
                'Absolutely! Here are some insights on your topic.',
                'Thanks for asking! This is interesting because...',
                'I\'d be happy to help with that. Consider the following...'
            ];
            const aiResponse = responses[Math.floor(Math.random() * responses.length)];
            this.chatHistory.push({ role: 'assistant', content: aiResponse });
            this.renderChatMessage('assistant', aiResponse);
        }, 800);
        
        this.saveState();
    },
    
    renderChatMessage(role, content) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        messageDiv.innerHTML = `<div class="message-bubble">${content}</div>`;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },
    
    renderChatHistory() {
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.innerHTML = '';
        this.chatHistory.forEach(msg => {
            this.renderChatMessage(msg.role, msg.content);
        });
    },
    
    // ==================== IMAGE GENERATION ====================
    generateImage() {
        const prompt = document.getElementById('imagePrompt').value.trim();
        
        if (!prompt) {
            this.showNotification('Please enter a description!', 'error');
            return;
        }
        
        if (this.credits <= 0) {
            this.showNotification('No credits left! Credits refresh daily.', 'error');
            document.getElementById('generateImageBtn').disabled = true;
            return;
        }
        
        this.showLoading();
        
        setTimeout(() => {
            try {
                // Deduct credit after successful generation
                this.deductCredit();
                
                const item = {
                    id: Date.now(),
                    type: 'image',
                    prompt: prompt,
                    status: 'success',
                    data: 'https://via.placeholder.com/400x300?text=' + encodeURIComponent(prompt.substring(0, 30))
                };
                
                this.generatedItems.push(item);
                this.renderImageGallery();
                this.showNotification('✓ Image generated successfully!', 'success');
                document.getElementById('imagePrompt').value = '';
                this.saveState();
            } catch (error) {
                this.showNotification('Generation failed - credit refunded!', 'error');
                this.refundCredit();
            }
            this.hideLoading();
        }, 2000);
    },
    
    renderImageGallery() {
        const gallery = document.getElementById('imageGallery');
        gallery.innerHTML = '';
        
        const images = this.generatedItems.filter(i => i.type === 'image');
        
        if (images.length === 0) {
            gallery.innerHTML = '<div class="placeholder">Your generated images will appear here</div>';
            return;
        }
        
        images.forEach(item => {
            const div = document.createElement('div');
            div.className = 'gallery-item';
            div.innerHTML = `
                <img src="${item.data}" alt="${item.prompt}">
                <div class="gallery-item-content">
                    <div class="gallery-item-title">Generated Image</div>
                    <div class="gallery-item-status ${item.status}">${item.status === 'success' ? '✓ Success' : '✗ Failed'}</div>
                    <div class="gallery-item-buttons">
                        <button onclick="app.downloadItem('${item.id}')">📥 Download</button>
                        <button onclick="app.deleteItem('${item.id}')">🗑 Delete</button>
                    </div>
                </div>
            `;
            gallery.appendChild(div);
        });
    },
    
    // ==================== VIDEO GENERATION ====================
    generateVideo() {
        const prompt = document.getElementById('videoPrompt').value.trim();
        
        if (!prompt) {
            this.showNotification('Please describe your video!', 'error');
            return;
        }
        
        if (this.credits <= 0) {
            this.showNotification('No credits left! Credits refresh daily.', 'error');
            document.getElementById('generateVideoBtn').disabled = true;
            return;
        }
        
        this.showLoading();
        
        setTimeout(() => {
            try {
                // Create mock video (in production, this would be from an API)
                const canvas = document.createElement('canvas');
                canvas.width = 800;
                canvas.height = 600;
                const ctx = canvas.getContext('2d');
                
                ctx.fillStyle = 'linear-gradient(135deg, #6366f1, #8b5cf6)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 40px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(prompt.substring(0, 40), canvas.width/2, canvas.height/2);
                
                const videoUrl = canvas.toDataURL();
                
                // Deduct credit after successful generation
                this.deductCredit();
                
                document.getElementById('generatedVideo').src = videoUrl;
                document.getElementById('videoPlayerContainer').classList.remove('hidden');
                document.getElementById('videoPlaceholder').style.display = 'none';
                
                const item = {
                    id: Date.now(),
                    type: 'video',
                    prompt: prompt,
                    status: 'success',
                    data: videoUrl
                };
                
                this.generatedItems.push(item);
                this.showNotification('✓ Video generated successfully!', 'success');
                document.getElementById('videoPrompt').value = '';
                this.saveState();
            } catch (error) {
                this.showNotification('Video generation failed - credit refunded!', 'error');
                this.refundCredit();
            }
            this.hideLoading();
        }, 3000);
    },
    
    deleteVideo() {
        document.getElementById('videoPlayerContainer').classList.add('hidden');
        document.getElementById('videoPlaceholder').style.display = 'block';
        document.getElementById('generatedVideo').src = '';
        this.generatedItems = this.generatedItems.filter(i => i.type !== 'video');
        this.saveState();
        this.showNotification('Video deleted', 'success');
    },
    
    updateTimeDisplay() {
        const video = document.getElementById('generatedVideo');
        const current = Math.floor(video.currentTime);
        const duration = Math.floor(video.duration) || 0;
        
        document.getElementById('currentTime').textContent = `${Math.floor(current/60)}:${(current%60).toString().padStart(2, '0')}`;
        document.getElementById('duration').textContent = `${Math.floor(duration/60)}:${(duration%60).toString().padStart(2, '0')}`;
    },
    
    // ==================== IMAGE EDITOR ====================
    handleImageUpload(e) {
        const files = Array.from(e.target.files);
        
        if (files.length + this.uploadedImages.length > 10) {
            this.showNotification('Maximum 10 images allowed!', 'error');
            return;
        }
        
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                this.uploadedImages.push({
                    id: Date.now() + Math.random(),
                    src: event.target.result,
                    name: file.name
                });
                this.renderEditorGallery();
                this.saveState();
            };
            reader.readAsDataURL(file);
        });
        
        document.getElementById('uploadInfo').textContent = `${this.uploadedImages.length} image(s) uploaded`;
        document.getElementById('imageFileInput').value = '';
    },
    
    renderEditorGallery() {
        const gallery = document.getElementById('editorGallery');
        gallery.innerHTML = '';
        
        if (this.uploadedImages.length === 0) return;
        
        this.uploadedImages.forEach(img => {
            const div = document.createElement('div');
            div.className = 'gallery-item';
            div.innerHTML = `
                <img src="${img.src}" alt="${img.name}" onclick="app.selectImageForEdit('${img.id}')" style="cursor: pointer; border: 2px solid transparent;" id="img-${img.id}">
                <div class="gallery-item-content">
                    <div class="gallery-item-title">${img.name}</div>
                    <div class="gallery-item-buttons">
                        <button onclick="app.selectImageForEdit('${img.id}')">✏️ Edit</button>
                        <button onclick="app.deleteUploadedImage('${img.id}')">🗑 Delete</button>
                    </div>
                </div>
            `;
            gallery.appendChild(div);
        });
        
        document.getElementById('editControls').style.display = this.uploadedImages.length > 0 ? 'block' : 'none';
    },
    
    selectImageForEdit(id) {
        this.selectedImageForEdit = id;
        document.querySelectorAll('#editorGallery img').forEach(img => {
            img.style.borderColor = 'transparent';
        });
        document.getElementById(`img-${id}`).style.borderColor = '#6366f1';
        this.showNotification('Image selected for editing', 'success');
    },
    
    applyImageEdit() {
        if (!this.selectedImageForEdit) {
            this.showNotification('Please select an image first!', 'error');
            return;
        }
        
        const prompt = document.getElementById('editPrompt').value.trim();
        if (!prompt) {
            this.showNotification('Please enter an edit description!', 'error');
            return;
        }
        
        if (this.credits <= 0) {
            this.showNotification('No credits left!', 'error');
            return;
        }
        
        this.showLoading();
        
        setTimeout(() => {
            try {
                this.deductCredit();
                this.showNotification('✓ Image edited successfully!', 'success');
                document.getElementById('editPrompt').value = '';
                this.saveState();
            } catch (error) {
                this.showNotification('Edit failed - credit refunded!', 'error');
                this.refundCredit();
            }
            this.hideLoading();
        }, 2000);
    },
    
    deleteUploadedImage(id) {
        this.uploadedImages = this.uploadedImages.filter(img => img.id !== id);
        if (this.selectedImageForEdit === id) this.selectedImageForEdit = null;
        this.renderEditorGallery();
        document.getElementById('uploadInfo').textContent = `${this.uploadedImages.length} image(s) uploaded`;
        this.saveState();
    },
    
    // ==================== VOICEOVER ====================
    generateVoice() {
        const text = document.getElementById('voiceText').value.trim();
        const voice = document.getElementById('voiceModel').value;
        
        if (!text) {
            this.showNotification('Please enter text!', 'error');
            return;
        }
        
        if (this.credits <= 0) {
            this.showNotification('No credits left!', 'error');
            return;
        }
        
        this.showLoading();
        
        setTimeout(() => {
            try {
                this.deductCredit();
                this.renderAudioOutput(text, voice, 'tts');
                this.showNotification('✓ Voiceover generated!', 'success');
                document.getElementById('voiceText').value = '';
                this.saveState();
            } catch (error) {
                this.showNotification('Generation failed - credit refunded!', 'error');
                this.refundCredit();
            }
            this.hideLoading();
        }, 2000);
    },
    
    handleAudioUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                this.uploadedAudio = {
                    src: event.target.result,
                    name: file.name
                };
                document.getElementById('audioFileName').textContent = `✓ ${file.name} uploaded`;
            };
            reader.readAsDataURL(file);
        }
    },
    
    applyVoiceChange() {
        if (!this.uploadedAudio) {
            this.showNotification('Please upload an audio file!', 'error');
            return;
        }
        
        const voice = document.getElementById('voiceChangerModel').value;
        
        if (this.credits <= 0) {
            this.showNotification('No credits left!', 'error');
            return;
        }
        
        this.showLoading();
        
        setTimeout(() => {
            try {
                this.deductCredit();
                this.renderAudioOutput(this.uploadedAudio.name, voice, 'voice-change');
                this.showNotification('✓ Voice changed successfully!', 'success');
                this.saveState();
            } catch (error) {
                this.showNotification('Voice change failed - credit refunded!', 'error');
                this.refundCredit();
            }
            this.hideLoading();
        }, 2000);
    },
    
    renderAudioOutput(label, voice, type) {
        const output = document.getElementById('audioOutput');
        const div = document.createElement('div');
        div.className = 'audio-player';
        div.innerHTML = `
            <h3>${type === 'tts' ? 'Generated Voiceover' : 'Voice Changed Audio'}</h3>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0.5rem 0;">Voice: ${voice} | ${label}</p>
            <audio controls style="width: 100%; margin-top: 1rem;">
                <source src="data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==" type="audio/wav">
                Your browser does not support the audio element.
            </audio>
            <button class="btn btn-secondary" style="margin-top: 1rem; width: 100%;" onclick="app.downloadAudio()">📥 Download Audio</button>
        `;
        output.innerHTML = '';
        output.appendChild(div);
    },
    
    // ==================== CREDITS SYSTEM ====================
    deductCredit() {
        if (this.credits > 0) {
            this.credits--;
            this.renderCredits();
            this.saveState();
        }
    },
    
    refundCredit() {
        if (this.credits < this.maxCredits) {
            this.credits++;
            this.renderCredits();
            this.saveState();
        }
    },
    
    renderCredits() {
        document.getElementById('currentCredits').textContent = this.credits;
        
        // Disable generation buttons if no credits
        if (this.credits <= 0) {
            document.getElementById('generateImageBtn').disabled = true;
            document.getElementById('generateVideoBtn').disabled = true;
            document.getElementById('applyEditBtn').disabled = true;
            document.getElementById('generateVoiceBtn').disabled = true;
            document.getElementById('applyVoiceChangeBtn').disabled = true;
        } else {
            document.getElementById('generateImageBtn').disabled = false;
            document.getElementById('generateVideoBtn').disabled = false;
            document.getElementById('applyEditBtn').disabled = false;
            document.getElementById('generateVoiceBtn').disabled = false;
            document.getElementById('applyVoiceChangeBtn').disabled = false;
        }
    },
    
    // ==================== UTILITIES ====================
    deleteItem(id) {
        this.generatedItems = this.generatedItems.filter(i => i.id != id);
        this.renderImageGallery();
        this.saveState();
    },
    
    downloadItem(id) {
        const item = this.generatedItems.find(i => i.id == id);
        if (item) {
            const a = document.createElement('a');
            a.href = item.data;
            a.download = `nova-${Date.now()}.png`;
            a.click();
            this.showNotification('Download started!', 'success');
        }
    },
    
    downloadAudio() {
        const a = document.createElement('a');
        a.href = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==';
        a.download = `nova-audio-${Date.now()}.wav`;
        a.click();
        this.showNotification('Audio downloaded!', 'success');
    },
    
    showLoading() {
        document.getElementById('loadingOverlay').classList.add('active');
    },
    
    hideLoading() {
        document.getElementById('loadingOverlay').classList.remove('active');
    },
    
    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification show ${type}`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => app.init());