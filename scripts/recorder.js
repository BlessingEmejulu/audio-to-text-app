import elements from './dom.js';
import appState from './state.js';
import { showToast } from './utils.js';

// Audio recording functionality
export function checkSpeechRecognitionSupport() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        showToast('Speech recognition not supported in your browser', 'error');
        elements.recordBtn.disabled = true;
        return;
    }
    
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
}

export function toggleRecording() {
    if (appState.isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

function startRecording() {
    if (!appState.recognition) return;
    
    try {
        appState.recognition.start();
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

function stopRecording() {
    if (!appState.recognition) return;
    
    appState.recognition.stop();
    appState.isRecording = false;
    elements.recordBtn.classList.remove('recording');
    elements.statusIndicator.classList.remove('active');
    elements.statusText.textContent = 'Ready to record';
    showToast('Recording stopped', 'info');
}