import appState from './state.js';
import { checkSpeechRecognitionSupport } from './recorder.js';
import { loadNotes } from './notes.js';
import { setupEventListeners } from './events.js';
import { setupMobileView } from './utils.js';
import { registerServiceWorker, setupInstallPrompt, isPWA } from './pwa.js';
import { initializeSupport, updateBankDetails } from './support.js';
import { SmartSpeechRecognition } from './smart-speech.js';
import { appendToEditor, updateInterimText } from './editor.js';

// Main application initialization
function init() {
    loadNotes();
    setupEventListeners();
    checkSpeechRecognitionSupport();
    setupMobileView();
}

// Initialize all modules
function initializeApp() {
    init();
    
    // Initialize PWA
    registerServiceWorker();
    setupInstallPrompt();
    
    // Check if running as PWA
    if (isPWA()) {
        console.log('Running as PWA');
        // Hide address bar on mobile
        document.body.classList.add('pwa-mode');
    }
    
    // Initialize support functionality
    initializeSupport();
}

// Call initialization when DOM is loaded
import appState from './state.js';
document.addEventListener('DOMContentLoaded', initializeApp);


function runTests() {
    const testResultsDiv = document.getElementById('test-results');
    testResultsDiv.style.display = 'block';
    testResultsDiv.innerHTML = '<h2>Test Results</h2>';

    function assert(condition, message) {
        const p = document.createElement('p');
        p.textContent = (condition ? '✅' : '❌') + ' ' + message;
        p.style.color = condition ? 'green' : 'red';
        testResultsDiv.appendChild(p);
    }

    // Mock SpeechRecognition
    let mockRestartCalled = 0;
    const mockRecognition = {
        start: () => mockRecognition.onstart(),
        stop: () => mockRecognition.onend(),
        onerror: () => {},
        onend: () => {},
        onstart: () => {},
    };
    window.SpeechRecognition = function() {
        return mockRecognition;
    };
    window.webkitSpeechRecognition = window.SpeechRecognition;

    const recorder = import('./recorder.js');
    recorder.then(module => {
        const originalRestart = module.__testonly__.restartBrowserRecognition;
        module.__testonly__.restartBrowserRecognition = () => {
            mockRestartCalled++;
        }

        // Test 1: 'no-speech' error should only call restart once
        async function testNoSpeechError() {
            mockRestartCalled = 0;
            appState.isRecording = true;
            appState.recognitionActive = false; // It's false when onend is called
            mockRecognition.onerror({ error: 'no-speech' });
            mockRecognition.onend(); // onend is triggered after error
            await new Promise(resolve => setTimeout(resolve, 1100)); // wait for restart timeout
            assert(mockRestartCalled === 1, "'no-speech' error should call restart once.");
            appState.isRecording = false;
        }

        // Test 2: Duplicate final transcripts should not be appended
        function testDuplicateTranscripts() {
            const editor = document.getElementById('transcriptEditor');
            editor.innerHTML = '';
            appState.lastFinalTranscript = '';

            const data1 = { type: 'transcript', transcript: 'hello world', isFinal: true };
            const data2 = { type: 'transcript', transcript: 'hello world', isFinal: true };

            module.__testonly__.handleGoogleSpeechMessage(data1);
            module.__testonly__.handleGoogleSpeechMessage(data2);

            assert(editor.children.length === 1, "Duplicate final transcripts should not be appended.");
            assert(editor.children[0].textContent === 'hello world', "The correct transcript should be appended.");
        }

        // Run tests
        async function runAllTests() {
            await testNoSpeechError();
            testDuplicateTranscripts();
        }

        runAllTests();
    });
}

document.getElementById('runTestsBtn').addEventListener('click', runTests);