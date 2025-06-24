import elements from './dom.js';
import appState from './state.js';
import { toggleMobileMenu, setupMobileView } from './utils.js';
import { toggleRecording } from './recorder.js';
import { 
    createNewNote, confirmNewNote, loadNotes, 
    deleteNote, editNoteTitle, saveNotes, 
    renderNotesList 
} from './notes.js';
import { 
    formatText, saveCurrentNote, generateSummary, 
    copySummary, insertImage 
} from './editor.js';
import { 
    showModal, hideModal, showExportModal, 
    exportNote 
} from './modals.js';

// Event listeners setup
export function setupEventListeners() {
    // Recording controls
    elements.recordBtn.addEventListener('click', toggleRecording);
    
    // Note actions
    elements.newNoteBtn.addEventListener('click', createNewNote);
    elements.saveNoteBtn.addEventListener('click', saveCurrentNote);
    elements.summarizeBtn.addEventListener('click', generateSummary);
    elements.copySummaryBtn.addEventListener('click', copySummary);
    elements.exportBtn.addEventListener('click', showExportModal);
    elements.refreshNotesBtn.addEventListener('click', loadNotes);
    
    // Modal controls
    elements.closeNewNoteModal.addEventListener('click', () => hideModal(elements.newNoteModal));
    elements.cancelNewNote.addEventListener('click', () => hideModal(elements.newNoteModal));
    elements.confirmNewNote.addEventListener('click', confirmNewNote);
    
    elements.closeExportModal.addEventListener('click', () => hideModal(elements.exportModal));
    elements.cancelExport.addEventListener('click', () => hideModal(elements.exportModal));
    elements.confirmExport.addEventListener('click', exportNote);
    
    // Formatting buttons
    elements.formatButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            formatText(btn.dataset.command, btn.dataset.value);
        });
    });
    
    // Export format buttons
    elements.exportFormatButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.exportFormatButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.selectedFormat = btn.dataset.format;
        });
    });
    
    // Image upload
    elements.imageUpload.addEventListener('change', (e) => {
        if (e.target.files.length) {
            insertImage(e.target.files[0]);
            e.target.value = ''; // Reset input
        }
    });
    
    // Notes search
    elements.notesSearch.addEventListener('input', renderNotesList);
    
    // Mobile menu toggle
    elements.mobileMenuToggle.addEventListener('click', toggleMobileMenu);
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && 
            !elements.sidebar.contains(e.target) && 
            !elements.mobileMenuToggle.contains(e.target)) {
            elements.sidebar.classList.remove('active');
        }
    });
    
    // Set current date as default
    elements.noteDate.value = new Date().toISOString().split('T')[0];
    
    // Handle window resize
    window.addEventListener('resize', setupMobileView);
}