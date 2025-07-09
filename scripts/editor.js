import elements from './dom.js';
import appState from './state.js';
import { formatDate, showToast } from './utils.js';
import { saveNotes } from './notes.js';

// Transcript editor functions
export function appendToEditor(text) {
    if (!text || !text.trim()) return;
    if (!elements.transcriptEditor) return;

    const p = document.createElement('p');
    p.textContent = text.trim();
    elements.transcriptEditor.appendChild(p);

    // Scroll to bottom if you want
    elements.transcriptEditor.scrollTop = elements.transcriptEditor.scrollHeight;
}

// Test function to verify editor works
export function testEditor() {
    console.log('Testing editor...');
    appendToEditor('Test message: ' + new Date().toLocaleTimeString());
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

export async function generateSummary() {
    if (!appState.currentNote) {
        showToast('No note selected to summarize', 'error');
        return;
    }
    const content = elements.transcriptEditor.innerText || elements.transcriptEditor.textContent;
    if (!content.trim()) {
        showToast('No content to summarize', 'error');
        return;
    }
    showToast('Generating AI summary...', 'info');
    elements.aiSummaryContent.innerHTML = '<em>Generating summary...</em>';
    elements.aiSummary.style.display = 'block';
    try {
        const response = await fetch('http://localhost:3000/ai-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: content })
        });
        const data = await response.json();
        if (data.success && data.summary) {
            elements.aiSummaryContent.innerHTML = data.summary;
            // Save summary to note
            const note = appState.notes.find(n => n.id === appState.currentNote.id);
            if (note) {
                note.summary = data.summary;
                saveNotes();
            }
            showToast('Summary generated', 'success');
        } else {
            throw new Error(data.message || 'Failed to generate summary');
        }
    } catch (error) {
        elements.aiSummaryContent.innerHTML = '<span style="color:red">Error: ' + error.message + '</span>';
        showToast('AI summary failed: ' + error.message, 'error');
    }
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