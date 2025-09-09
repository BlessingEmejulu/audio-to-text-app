import elements from './dom.js';
import appState from './state.js';
import { showToast } from './utils.js';
import { appendToEditor, updateInterimText } from './editor.js';

export class SmartSpeechRecognition {
    constructor() {
        this.isOnline = navigator.onLine;
        this.googleSpeechAvailable = false;
        this.useGoogleSpeech = false;
        this.isRecording = false;
        this.browserRecognition = null;
        this.audioContext = null;
        this.processor = null;
        this.mediaStream = null;
        this.pendingChunks = 0; 
        
        this.setupConnectionMonitoring();
    }

    setupConnectionMonitoring() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('📶 Connection restored');
            showToast('Online - Google Cloud Speech available', 'success');
            this.checkGoogleSpeechAvailability();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('📵 Connection lost');
            showToast('Offline - using browser speech', 'warning');
            this.useGoogleSpeech = false;
        });
    }

    async checkGoogleSpeechAvailability() {
        if (!this.isOnline) return false;

        try {
            console.log('🔍 Testing Google Cloud Speech...');
            
            // Test connection first
            const pingResponse = await fetch('https://api-54wbzdzd5a-uc.a.run.app/ping', {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            });
            
            if (!pingResponse.ok) {
                throw new Error('Ping failed');
            }
            
            console.log('✅ Firebase Functions connection OK');
            
            // Test speech API
            const response = await fetch('https://api-54wbzdzd5a-uc.a.run.app/speech-test', {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });
            
            const data = await response.json();
            console.log('Speech test response:', data);
            
            if (data.success && data.available) {
                this.googleSpeechAvailable = true;
                this.useGoogleSpeech = true;
                console.log('✅ Google Cloud Speech API ready');
                showToast('Google Cloud Speech ready', 'success');
                return true;
            } else {
                throw new Error(data.message || 'Speech API not available');
            }
            
        } catch (error) {
            console.log('❌ Google Speech unavailable:', error.message);
            this.googleSpeechAvailable = false;
            this.useGoogleSpeech = false;
            showToast('Using browser speech recognition', 'info');
            return false;
        }
    }

    setupBrowserSpeech() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) return false;
        
        console.log('✅ Browser speech recognition available');
        
        this.browserRecognition = new SpeechRecognition();
        this.browserRecognition.continuous = true;
        this.browserRecognition.interimResults = true;
        this.browserRecognition.lang = 'en-US';
        
        this.browserRecognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }
            
            // Show interim results
            if (interimTranscript) {
                updateInterimText(interimTranscript);
            }
            
            // Add final results to editor
            if (finalTranscript.trim()) {
                console.log('📝 Browser speech result:', finalTranscript);
                updateInterimText(""); // Clear interim text
                appendToEditor(finalTranscript.trim());
            }
        };
        
        this.browserRecognition.onerror = (event) => {
            console.error('❌ Browser speech error:', event.error);
            if (event.error !== 'no-speech') {
                this.stopRecording();
                showToast(`Speech error: ${event.error}`, 'error');
            }
        };
        
        this.browserRecognition.onend = () => {
            console.log('🔄 Browser speech ended');
            if (this.isRecording && !this.useGoogleSpeech) {
                setTimeout(() => this.startBrowserRecognition(), 100);
            }
        };
        
        return true;
    }

    async startRecording() {
        try {
            console.log('🎬 Starting recording...');
            console.log('📶 Online:', this.isOnline);
            console.log('🌐 Google Available:', this.googleSpeechAvailable);
            console.log('🚀 Use Google:', this.useGoogleSpeech);
            
            if (this.isOnline && this.googleSpeechAvailable && this.useGoogleSpeech) {
                console.log('🚀 Starting Google Cloud Speech...');
                await this.startGoogleSpeechRecording();
                elements.statusText.textContent = 'Recording with Google Cloud Speech...';
                showToast('Recording with Google Cloud Speech', 'success');
            } else if (this.browserRecognition) {
                console.log('🌐 Starting browser speech...');
                this.startBrowserRecognition();
                elements.statusText.textContent = 'Recording with browser speech...';
                showToast('Recording with browser speech', 'info');
            } else {
                throw new Error('No speech recognition available');
            }
            
            this.isRecording = true;
            appState.isRecording = true;
            elements.recordBtn.classList.add('recording');
            elements.statusIndicator.classList.add('active');
            
        } catch (error) {
            console.error('❌ Recording failed:', error);
            
            // Try browser fallback
            if (this.useGoogleSpeech && this.browserRecognition) {
                console.log('🔄 Falling back to browser speech');
                this.useGoogleSpeech = false;
                this.startBrowserRecognition();
                this.isRecording = true;
                appState.isRecording = true;
                elements.recordBtn.classList.add('recording');
                elements.statusIndicator.classList.add('active');
                elements.statusText.textContent = 'Recording with browser speech...';
                showToast('Using browser speech fallback', 'warning');
            } else {
                showToast('Failed to start recording', 'error');
            }
        }
    }

    async startGoogleSpeechRecording() {
        try {
            console.log('🎤 Getting microphone access for Google Speech...');
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                } 
            });
            
            console.log('✅ Microphone access granted');
            this.mediaStream = stream;
            
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ 
                sampleRate: 16000 
            });
            
            const source = this.audioContext.createMediaStreamSource(stream);
            this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
            
            let audioBuffer = [];
            let chunkCount = 0;
            const SEND_EVERY = 4; // Send every 4 chunks (~1.5 seconds)
            
            this.processor.onaudioprocess = (event) => {
                if (!this.isRecording) return;

                const inputData = event.inputBuffer.getChannelData(0);
                
                // Convert float32 to int16
                const int16Data = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    int16Data[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
                }
                
                audioBuffer.push(...int16Data);
                chunkCount++;
                
                // Show visual feedback while recording
                const dots = ".".repeat((chunkCount % 3) + 1);
                updateInterimText(`Listening${dots}`);
                
                if (chunkCount >= SEND_EVERY) {
                    console.log('📤 Sending audio chunk to Google Speech...');
                    this.sendAudioToGoogle(new Int16Array(audioBuffer));
                    audioBuffer = [];
                    chunkCount = 0;
                }
            };
            
            source.connect(this.processor);
            this.processor.connect(this.audioContext.destination);
            
            console.log('🎤 Google Cloud Speech recording started successfully');
            
        } catch (error) {
            console.error('❌ Google Speech setup failed:', error);
            throw error;
        }
    }

    startBrowserRecognition() {
        try {
            this.browserRecognition.start();
            console.log('🎤 Browser speech recognition started');
        } catch (error) {
            if (error.name === 'InvalidStateError') {
                this.browserRecognition.stop();
                setTimeout(() => this.browserRecognition.start(), 100);
            } else {
                throw error;
            }
        }
    }

    async sendAudioToGoogle(audioData) {
        try {
            if (!this.isOnline) {
                console.log('📵 Lost connection during recording');
                this.switchToBrowserSpeech();
                return;
            }
            
            // Convert to base64
            const buffer = new Uint8Array(audioData.buffer);
            let binary = '';
            for (let i = 0; i < buffer.length; i++) {
                binary += String.fromCharCode(buffer[i]);
            }
            const base64Audio = btoa(binary);
            
            console.log('📡 Sending to Google Cloud Speech API...');
            this.pendingChunks++;
            
            // Show visual feedback while processing
            updateInterimText(`Processing audio chunk ${this.pendingChunks}...`);
            
            const response = await fetch('https://api-54wbzdzd5a-uc.a.run.app/speech-recognize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    audioData: base64Audio,
                    config: {
                        encoding: 'LINEAR16',
                        sampleRateHertz: 16000,
                        languageCode: 'en-US'
                    }
                }),
                signal: AbortSignal.timeout(15000)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('📡 Google Speech response:', data);
            this.pendingChunks--;
            
            if (data.success && data.transcript && data.transcript.trim()) {
                console.log('✅ Google Speech transcript:', data.transcript);
                
                // IMPORTANT: Clear interim text FIRST, then add real text
                updateInterimText(""); 
                appendToEditor(data.transcript.trim()); // THIS is what adds the actual text!
                
                // Update status
                if (data.confidence) {
                    elements.statusText.textContent = `Google Speech (${Math.round(data.confidence * 100)}% confidence)`;
                }
            } else if (data.fallbackToBrowser) {
                console.log('🔄 Google Speech suggests browser fallback');
                this.switchToBrowserSpeech();
            } else {
                console.log('❌ No transcript in response:', data);
            }
            
            // Clear interim text if no more pending chunks
            if (this.pendingChunks === 0) {
                updateInterimText("");
            }
            
        } catch (error) {
            console.error('❌ Google Speech API error:', error);
            this.pendingChunks--;
            updateInterimText(""); // Clear interim text on error
            
            // Auto-fallback on network errors
            if (error.name === 'AbortError' || error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                console.log('🔄 Network error - switching to browser speech');
                this.switchToBrowserSpeech();
            }
        }
    }

    switchToBrowserSpeech() {
        console.log('🔄 Switching to browser speech recognition');
        
        this.cleanupGoogleSpeech();
        this.useGoogleSpeech = false;
        showToast('Switched to browser speech', 'warning');
        elements.statusText.textContent = 'Recording with browser speech...';
        
        if (this.isRecording && this.browserRecognition) {
            this.startBrowserRecognition();
        }
    }

    stopRecording() {
        console.log('🛑 Stopping recording');
        
        this.isRecording = false;
        appState.isRecording = false;
        elements.recordBtn.classList.remove('recording');
        elements.statusIndicator.classList.remove('active');
        elements.statusText.textContent = 'Click to start recording';
        
        if (this.browserRecognition) {
            try { 
                this.browserRecognition.stop(); 
                console.log('🛑 Browser speech stopped');
            } catch (e) {
                console.log('Browser speech already stopped');
            }
        }
        
        this.cleanupGoogleSpeech();
        showToast('Recording stopped', 'info');
    }

    cleanupGoogleSpeech() {
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
            console.log('🧹 Audio processor cleaned up');
        }
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = null;
            console.log('🧹 Audio context closed');
        }
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
            console.log('🧹 Media stream stopped');
        }
    }

    async initialize() {
        console.log('🚀 Initializing Smart Speech Recognition...');
        
        const browserSpeechAvailable = this.setupBrowserSpeech();
        
        if (!browserSpeechAvailable) {
            console.log('❌ Browser speech not available');
            showToast('Speech recognition not supported', 'error');
            return false;
        }
        
        if (this.isOnline) {
            console.log('Online - checking Google Cloud Speech...');
            await this.checkGoogleSpeechAvailability();
        } else {
            console.log('Offline - browser speech only');
            showToast('Offline mode - browser speech available', 'info');
        }
        
        console.log('Smart Speech Recognition ready');
        console.log('Status: Online =', this.isOnline, '| Google Available =', this.googleSpeechAvailable, '| Use Google =', this.useGoogleSpeech);
        
        return true;
    }
}