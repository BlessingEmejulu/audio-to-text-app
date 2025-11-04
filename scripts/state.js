// Application state management
const appState = {
    currentNote: null,
    notes: [],
    isRecording: false,
    recognition: null,
    recognitionActive: false,
    selectedFormat: 'pdf',
    isEditingTitle: false,
    // Google Speech API properties
    useGoogleSpeech: false,
    googleSpeechWS: null,
    mediaStream: null,
    mediaRecorder: null,
    googleSpeechTimeout: null,
    // Audio processing properties
    audioContext: null,
    processor: null,
    source: null,
    lastFinalTranscript: ''
};

export default appState;