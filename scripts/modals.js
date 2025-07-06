import elements from './dom.js';
import appState from './state.js';
import { showToast } from './utils.js';

// Modal dialog functions
export function showModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}
export function hideModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

export function showExportModal() {
    if (!appState.currentNote) {
        showToast('No note selected to export', 'error');
        return;
    }
    
    elements.exportFileName.value = appState.currentNote.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    showModal(elements.exportModal);
}

export function exportNote() {
    if (!appState.currentNote) return;
    
    const format = appState.selectedFormat;
    const fileName = elements.exportFileName.value || 'lecture_note';
    const includeTranscript = document.getElementById('includeTranscript').checked;
    const includeSummary = document.getElementById('includeSummary').checked;
    const includeMetadata = document.getElementById('includeMetadata').checked;
    
    // In a real app, this would generate the actual file
    // For this demo, we'll just show a success message
    hideModal(elements.exportModal);
    showToast(`Exported as ${format.toUpperCase()} (simulated)`, 'success');
    
    console.log('Exporting:', {
        format,
        fileName,
        includeTranscript,
        includeSummary,
        includeMetadata,
        note: appState.currentNote
    });
}