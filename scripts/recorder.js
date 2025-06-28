import elements from './dom.js';
import appState from './state.js';
import { showToast } from './utils.js';
import { appendToEditor } from './editor.js';

// Audio recording functionality with multiple transcription options
export function checkSpeechRecognitionSupport() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        showToast('Browser speech recognition not supported. Using Google Cloud Speech API.', 'info');
        elements.recordBtn.disabled = false;
        appState.useGoogleSpeech = true;
        setupGoogleSpeechAPI();
        return;
    }
    
    // Setup browser speech recognition as fallback
    appState.recognition = new SpeechRecognition();
    appState.recognition.continuous = true;
    appState.recognition.interimResults = true;
    appState.recognition.maxAlternatives = 1;
    
    appState.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }
        
        // Append to editor
        if (finalTranscript) {
            appendToEditor(finalTranscript);
        }
        
        // Show interim results
        showInterimResults(interimTranscript);
    };
    
    appState.recognition.onerror = (event) => {
        console.error('Recognition error:', event.error);
        stopRecording();
        showToast(`Recognition error: ${event.error}`, 'error');
    };
    
    appState.recognition.onend = () => {
        if (appState.isRecording) {
            appState.recognition.start();
        }
    };
    
    // Try to setup Google Cloud Speech API as primary option
    setupGoogleSpeechAPI();
}

function setupGoogleSpeechAPI() {
    try {
        const wsUrl = 'ws://localhost:8081';
        console.log('Attempting to connect to Google Speech API WebSocket:', wsUrl);
        
        appState.googleSpeechWS = new WebSocket(wsUrl);
        
        appState.googleSpeechWS.onopen = () => {
            console.log('Connected to Google Speech API');
            appState.useGoogleSpeech = true;
            showToast('Connected to Google Speech API', 'success');
        };
        
        appState.googleSpeechWS.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleGoogleSpeechMessage(data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
        
        appState.googleSpeechWS.onerror = (error) => {
            console.error('Google Speech WebSocket error:', error);
            appState.useGoogleSpeech = false;
            showToast('Google Speech API connection failed. Using browser speech recognition.', 'warning');
        };
        
        appState.googleSpeechWS.onclose = () => {
            console.log('Google Speech WebSocket closed');
            appState.useGoogleSpeech = false;
            if (appState.isRecording) {
                showToast('Connection lost. Stopping recording.', 'error');
                stopRecording();
            }
        };
        
    } catch (error) {
        console.error('Failed to setup Google Speech API:', error);
        appState.useGoogleSpeech = false;
    }
}

function handleGoogleSpeechMessage(data) {
    switch (data.type) {
        case 'transcript':
            if (data.isFinal && data.transcript.trim()) {
                appendToEditor(data.transcript.trim());
                console.log('Final transcript:', data.transcript);
            } else if (data.transcript.trim()) {
                showInterimResults(data.transcript);
                console.log('Interim transcript:', data.transcript);
            }
            break;
            
        case 'error':
            console.error('Google Speech API error:', data.message);
            showToast(data.message, 'error');
            stopRecording();
            break;
            
        case 'status':
            console.log('Status:', data.message);
            break;
            
        case 'connection':
            console.log('Connection message:', data.message);
            break;
    }
}

function showInterimResults(interimText) {
    // You can implement interim results display here
    // For now, we'll just update the status
    if (interimText.trim()) {
        elements.statusText.textContent = `Listening: "${interimText.substring(0, 30)}..."`;
    }
}

export function toggleRecording() {
    if (appState.isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

async function startRecording() {
    try {
        // Check if we should use Google Speech API
        if (appState.useGoogleSpeech && appState.googleSpeechWS && appState.googleSpeechWS.readyState === WebSocket.OPEN) {
            await startGoogleSpeechRecording();
        } else if (appState.recognition) {
            startBrowserSpeechRecording();
        } else {
            showToast('No speech recognition service available', 'error');
            return;
        }
        
        appState.isRecording = true;
        elements.recordBtn.classList.add('recording');
        elements.statusIndicator.classList.add('active');
        elements.statusText.textContent = 'Recording...';
        showToast('Recording started', 'success');
        
    } catch (error) {
        console.error('Error starting recording:', error);
        showToast('Error starting recording', 'error');
    }
}

async function startGoogleSpeechRecording() {
    try {
        // Get microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 48000
            } 
        });
        
        appState.mediaStream = stream;
        
        // Set up MediaRecorder for WebSocket streaming
        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
        });
        
        appState.mediaRecorder = mediaRecorder;
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && appState.googleSpeechWS.readyState === WebSocket.OPEN) {
                appState.googleSpeechWS.send(event.data);
            }
        };
        
        mediaRecorder.onerror = (error) => {
            console.error('MediaRecorder error:', error);
            showToast('Recording error occurred', 'error');
            stopRecording();
        };
        
        // Start recording
        appState.googleSpeechWS.send('START');
        mediaRecorder.start(100); // Send data every 100ms
        
        console.log('Started Google Speech recording');
        
    } catch (error) {
        console.error('Error accessing microphone:', error);
        showToast('Microphone access denied', 'error');
        throw error;
    }
}

function startBrowserSpeechRecording() {
    if (!appState.recognition) return;
    
    try {
        appState.recognition.start();
        console.log('Started browser speech recognition');
    } catch (error) {
        console.error('Error starting browser speech recognition:', error);
        throw error;
    }
}

function stopRecording() {
    appState.isRecording = false;
    elements.recordBtn.classList.remove('recording');
    elements.statusIndicator.classList.remove('active');
    elements.statusText.textContent = 'Ready to record';
    
    // Stop Google Speech API recording
    if (appState.mediaRecorder && appState.mediaRecorder.state !== 'inactive') {
        appState.mediaRecorder.stop();
    }
    
    if (appState.mediaStream) {
        appState.mediaStream.getTracks().forEach(track => track.stop());
        appState.mediaStream = null;
    }
    
    if (appState.googleSpeechWS && appState.googleSpeechWS.readyState === WebSocket.OPEN) {
        appState.googleSpeechWS.send('STOP');
    }
    
    // Stop browser speech recognition
    if (appState.recognition) {
        appState.recognition.stop();
    }
    
    showToast('Recording stopped', 'info');
}