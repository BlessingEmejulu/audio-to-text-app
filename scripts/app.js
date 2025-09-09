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
document.addEventListener('DOMContentLoaded', initializeApp);