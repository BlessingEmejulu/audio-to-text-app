import elements from './dom.js';
import appState from './state.js';
import { formatDate, showToast } from './utils.js';
import { updateCurrentNoteHeader } from './editor.js';
import { showModal, hideModal } from './modals.js';

// Note management functions
export function loadNotes() {
    const savedNotes = localStorage.getItem('lectoNotes');
    if (savedNotes) {
        appState.notes = JSON.parse(savedNotes);
        renderNotesList();
        
        // Load the first note if available
        if (appState.notes.length > 0) {
            loadNote(appState.notes[0].id);
        }
    }
}

export function renderNotesList() {
    elements.notesList.innerHTML = '';
    
    if (appState.notes.length === 0) {
        elements.notesList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-light);">No notes yet</div>';
        return;
    }
    
    const searchTerm = elements.notesSearch.value.toLowerCase();
    const filteredNotes = searchTerm 
        ? appState.notes.filter(note => 
            note.title.toLowerCase().includes(searchTerm) || 
            note.course.toLowerCase().includes(searchTerm))
        : appState.notes;
    
    filteredNotes.forEach(note => {
        const noteElement = document.createElement('div');
        noteElement.className = `note-item ${appState.currentNote?.id === note.id ? 'active' : ''}`;
        noteElement.dataset.id = note.id;
        noteElement.innerHTML = `
            <div class="note-item-content">
                <div class="note-item-name">
                    <i class="fas fa-file-alt"></i>
                    <span class="note-title-text">${note.title}</span>
                </div>
                <div class="note-item-meta">
                    <span class="note-item-date">${formatDate(note.date)}</span>
                    <span class="note-item-course">${note.course}</span>
                </div>
            </div>
            <div class="note-item-actions">
                <button class="note-item-btn edit" data-id="${note.id}" title="Edit title">
                    <i class="fas fa-pencil-alt"></i>
                </button>
                <button class="note-item-btn delete" data-id="${note.id}" title="Delete note">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        elements.notesList.appendChild(noteElement);
    });

    // Attach event listeners to edit and delete buttons
    elements.notesList.querySelectorAll('.note-item-btn.edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const noteId = btn.dataset.id;
            editNoteTitle(noteId);
            e.stopPropagation();
        });
    });

    elements.notesList.querySelectorAll('.note-item-btn.delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const noteId = btn.dataset.id;
            deleteNote(noteId);
            e.stopPropagation();
        });
    });
}

export function editNoteTitle(noteId) {
    const note = appState.notes.find(n => n.id === noteId);
    if (!note) return;
    
    const noteItem = document.querySelector(`.note-item[data-id="${noteId}"]`);
    if (!noteItem) return;
    
    const titleText = noteItem.querySelector('.note-title-text');
    const currentTitle = titleText.textContent;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'note-item-name-input';
    input.value = currentTitle;
    
    titleText.replaceWith(input);
    input.focus();
    
    const saveTitle = () => {
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== currentTitle) {
            note.title = newTitle;
            note.updatedAt = new Date().toISOString();
            saveNotes();
            
            if (appState.currentNote?.id === noteId) {
                updateCurrentNoteHeader();
            }
        }
        
        const span = document.createElement('span');
        span.className = 'note-title-text';
        span.textContent = note.title;
        input.replaceWith(span);
    };
    
    input.addEventListener('blur', saveTitle);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveTitle();
        }
    });
}

export function loadNote(noteId) {
    const note = appState.notes.find(n => n.id === noteId);
    if (!note) return;
    
    appState.currentNote = note;
    elements.transcriptEditor.innerHTML = note.content || '';
    elements.aiSummaryContent.innerHTML = note.summary || '';
    elements.aiSummary.style.display = note.summary ? 'block' : 'none';
    
    updateCurrentNoteHeader();
    renderNotesList();
}

export function saveNotes() {
    localStorage.setItem('lectoNotes', JSON.stringify(appState.notes));
    renderNotesList();
}

export function deleteNote(noteId) {
    if (confirm('Are you sure you want to delete this note?')) {
        appState.notes = appState.notes.filter(n => n.id !== noteId);
        
        if (appState.currentNote?.id === noteId) {
            appState.currentNote = null;
            elements.transcriptEditor.innerHTML = '';
            elements.aiSummary.style.display = 'none';
            updateCurrentNoteHeader();
        }
        
        saveNotes();
        showToast('Note deleted', 'info');
    }
}

export function createNewNote() {
    showModal(elements.newNoteModal);
}

export function confirmNewNote() {
    const title = elements.noteTitle.value.trim();
    const course = elements.noteCourse.value.trim();
    const date = elements.noteDate.value || new Date().toISOString().split('T')[0];
    
    if (!title) {
        showToast('Please enter a lecture title', 'error');
        return;
    }
    
    const newNote = {
        id: Date.now().toString(),
        title,
        course,
        date,
        content: '',
        summary: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    appState.notes.unshift(newNote);
    saveNotes();
    loadNote(newNote.id);
    hideModal(elements.newNoteModal);
    showToast('New note created', 'success');
    
    // Reset form
    elements.noteTitle.value = '';
    elements.noteCourse.value = '';
    elements.noteDate.value = '';
}