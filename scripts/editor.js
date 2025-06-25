import elements from './dom.js';
import appState from './state.js';
import { formatDate, showToast } from './utils.js';
import { saveNotes } from './notes.js';

// Transcript editor functions
export function appendToEditor(text) {
    const selection = window.getSelection();
    const range = document.createRange();
    
    // Save cursor position
    const cursorPosition = saveCursorPosition();
    
    // Append text
    elements.transcriptEditor.innerHTML += `<p>${text}</p>`;
    
    // Restore cursor position
    if (cursorPosition) {
        restoreCursorPosition(cursorPosition);
    }
}

function saveCursorPosition() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;
    
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(elements.transcriptEditor);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
}

function restoreCursorPosition(position) {
    const selection = window.getSelection();
    const range = document.createRange();
    
    let charCount = 0;
    let nodeStack = [elements.transcriptEditor];
    let node;
    let foundStart = false;
    let stop = false;
    
    while (!stop && (node = nodeStack.pop())) {
        if (node.nodeType === 3) {
            const nextCharCount = charCount + node.length;
            if (!foundStart && position >= charCount && position <= nextCharCount) {
                range.setStart(node, position - charCount);
                foundStart = true;
            }
            if (foundStart && position <= nextCharCount) {
                range.setEnd(node, position - charCount);
                stop = true;
            }
            charCount = nextCharCount;
        } else {
            let i = node.childNodes.length;
            while (i--) {
                nodeStack.push(node.childNodes[i]);
            }
        }
    }
    
    selection.removeAllRanges();
    selection.addRange(range);
}

export function formatText(command, value = null) {
    document.execCommand(command, false, value);
    elements.transcriptEditor.focus();
}

export function insertImage(file) {
    if (!file.type.match('image.*')) {
        showToast('Please select an image file', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        
        // Insert at cursor position
        const selection = window.getSelection();
        if (selection.rangeCount) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(img);
            
            // Add a paragraph after the image
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            range.insertNode(p);
            
            // Move cursor to the new paragraph
            range.setStartAfter(p);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            // If no selection, just append to the end
            elements.transcriptEditor.appendChild(img);
            elements.transcriptEditor.appendChild(document.createElement('p'));
        }
        
        elements.transcriptEditor.focus();
        showToast('Image inserted', 'success');
    };
    reader.readAsDataURL(file);
}

export function updateCurrentNoteHeader() {
    if (!appState.currentNote) {
        elements.currentNoteHeader.style.display = 'none';
        return;
    }
    
    elements.currentNoteHeader.style.display = 'flex';
    elements.currentNoteTitle.textContent = appState.currentNote.title;
    elements.currentNoteCourse.textContent = appState.currentNote.course;
    elements.currentNoteDate.textContent = formatDate(appState.currentNote.date);
}

export function saveCurrentNote() {
    if (!appState.currentNote) {
        showToast('No note selected to save', 'error');
        return;
    }
    
    const note = appState.notes.find(n => n.id === appState.currentNote.id);
    if (!note) return;
    
    note.content = elements.transcriptEditor.innerHTML;
    note.updatedAt = new Date().toISOString();
    saveNotes();
    showToast('Note saved successfully', 'success');
}

export function generateSummary() {
    if (!appState.currentNote) {
        showToast('No note selected to summarize', 'error');
        return;
    }
    
    const content = elements.transcriptEditor.innerText || elements.transcriptEditor.textContent;
    if (!content.trim()) {
        showToast('No content to summarize', 'error');
        return;
    }
    
    // Mock AI summary - in a real app, this would call an API
    showToast('Generating AI summary...', 'info');
    
    // Simulate API delay
    setTimeout(() => {
        // Simple summarization logic for demo purposes
        const sentences = content.match(/[^\.!\?]+[\.!\?]+/g) || [];
        const importantSentences = sentences.filter((_, i) => i % 3 === 0).slice(0, 5);
        const summary = importantSentences.join(' ') || "Summary couldn't be generated.";
        
        elements.aiSummaryContent.innerHTML = summary;
        elements.aiSummary.style.display = 'block';
        
        // Save summary to note
        const note = appState.notes.find(n => n.id === appState.currentNote.id);
        if (note) {
            note.summary = summary;
            saveNotes();
        }
        
        showToast('Summary generated', 'success');
    }, 2000);
}

export function copySummary() {
    const summaryText = elements.aiSummaryContent.innerText;
    if (!summaryText.trim()) {
        showToast('No summary to copy', 'error');
        return;
    }
    
    navigator.clipboard.writeText(summaryText)
        .then(() => showToast('Summary copied to clipboard', 'success'))
        .catch(() => showToast('Failed to copy summary', 'error'));
}