// Application state management
const appState = {
    currentNote: null,
    notes: [],
    isRecording: false,
    recognition: null,
    selectedFormat: 'pdf',
    isEditingTitle: false,
    // Google Speech API properties
    useGoogleSpeech: false,
    googleSpeechWS: null,
    mediaStream: null,
    mediaRecorder: null
};

export default appState;