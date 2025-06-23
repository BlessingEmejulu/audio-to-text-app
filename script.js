
        // Main application state
        const appState = {
            currentNote: null,
            notes: [],
            isRecording: false,
            recognition: null,
            selectedFormat: 'pdf',
            isEditingTitle: false
        };

        // DOM Elements
        const elements = {
            notesList: document.getElementById('notesList'),
            transcriptEditor: document.getElementById('transcriptEditor'),
            recordBtn: document.getElementById('recordBtn'),
            statusIndicator: document.getElementById('statusIndicator'),
            statusText: document.getElementById('statusText'),
            newNoteBtn: document.getElementById('newNoteBtn'),
            saveNoteBtn: document.getElementById('saveNoteBtn'),
            summarizeBtn: document.getElementById('summarizeBtn'),
            copySummaryBtn: document.getElementById('copySummaryBtn'),
            aiSummary: document.getElementById('aiSummary'),
            aiSummaryContent: document.getElementById('aiSummaryContent'),
            exportBtn: document.getElementById('exportBtn'),
            refreshNotesBtn: document.getElementById('refreshNotesBtn'),
            newNoteModal: document.getElementById('newNoteModal'),
            closeNewNoteModal: document.getElementById('closeNewNoteModal'),
            cancelNewNote: document.getElementById('cancelNewNote'),
            confirmNewNote: document.getElementById('confirmNewNote'),
            noteTitle: document.getElementById('noteTitle'),
            noteCourse: document.getElementById('noteCourse'),
            noteDate: document.getElementById('noteDate'),
            exportModal: document.getElementById('exportModal'),
            closeExportModal: document.getElementById('closeExportModal'),
            cancelExport: document.getElementById('cancelExport'),
            confirmExport: document.getElementById('confirmExport'),
            exportFileName: document.getElementById('exportFileName'),
            toast: document.getElementById('toast'),
            formatButtons: document.querySelectorAll('.format-btn'),
            exportFormatButtons: document.querySelectorAll('.export-format-btn'),
            mobileMenuToggle: document.getElementById('mobileMenuToggle'),
            sidebar: document.getElementById('sidebar'),
            notesSearch: document.getElementById('notesSearch'),
            currentNoteHeader: document.getElementById('currentNoteHeader'),
            currentNoteTitle: document.getElementById('currentNoteTitle'),
            currentNoteCourse: document.getElementById('currentNoteCourse'),
            currentNoteDate: document.getElementById('currentNoteDate'),
            imageUpload: document.getElementById('imageUpload')
        };

        // Initialize the app
        function init() {
            loadNotes();
            setupEventListeners();
            checkSpeechRecognitionSupport();
            setupMobileView();
        }

        // Setup mobile-specific view
        function setupMobileView() {
            if (window.innerWidth <= 768) {
                document.querySelectorAll('.hide-on-mobile').forEach(el => {
                    el.style.display = 'none';
                });
            }
        }

        // Check if browser supports speech recognition
        function checkSpeechRecognitionSupport() {
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

        // Append text to the editor
        function appendToEditor(text) {
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

        // Save cursor position
        function saveCursorPosition() {
            const selection = window.getSelection();
            if (!selection.rangeCount) return null;
            
            const range = selection.getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(elements.transcriptEditor);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            return preCaretRange.toString().length;
        }

        // Restore cursor position
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

        // Toggle recording
        function toggleRecording() {
            if (appState.isRecording) {
                stopRecording();
            } else {
                startRecording();
            }
        }

        // Start recording
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

        // Stop recording
        function stopRecording() {
            if (!appState.recognition) return;
            
            appState.recognition.stop();
            appState.isRecording = false;
            elements.recordBtn.classList.remove('recording');
            elements.statusIndicator.classList.remove('active');
            elements.statusText.textContent = 'Ready to record';
            showToast('Recording stopped', 'info');
        }

        // Load notes from localStorage
        function loadNotes() {
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

        // Render notes list
        function renderNotesList() {
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
                
                noteElement.addEventListener('click', (e) => {
                    // Don't load note if clicking on action buttons
                    if (!e.target.closest('.note-item-btn')) {
                        loadNote(note.id);
                        if (window.innerWidth <= 768) {
                            elements.sidebar.classList.remove('active');
                        }
                    }
                });
                
                elements.notesList.appendChild(noteElement);
            });
            
            // Add delete event listeners
            document.querySelectorAll('.note-item-btn.delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteNote(btn.dataset.id);
                });
            });
            
            // Add edit title event listeners
            document.querySelectorAll('.note-item-btn.edit').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    editNoteTitle(btn.dataset.id);
                });
            });
        }

        // Edit note title
        function editNoteTitle(noteId) {
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
                    note.updatedAt = newDate().toISOString();
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

        // Format date
        function formatDate(dateString) {
            const options = { year: 'numeric', month: 'short', day: 'numeric' };
            return new Date(dateString).toLocaleDateString(undefined, options);
        }

        // Update current note header
        function updateCurrentNoteHeader() {
            if (!appState.currentNote) {
                elements.currentNoteHeader.style.display = 'none';
                return;
            }
            
            elements.currentNoteHeader.style.display = 'flex';
            elements.currentNoteTitle.textContent = appState.currentNote.title;
            elements.currentNoteCourse.textContent = appState.currentNote.course;
            elements.currentNoteDate.textContent = formatDate(appState.currentNote.date);
        }

        // Create a new note
        function createNewNote() {
            showModal(elements.newNoteModal);
        }

        // Confirm new note creation
        function confirmNewNote() {
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

        // Load a note
        function loadNote(noteId) {
            const note = appState.notes.find(n => n.id === noteId);
            if (!note) return;
            
            appState.currentNote = note;
            elements.transcriptEditor.innerHTML = note.content || '';
            elements.aiSummaryContent.innerHTML = note.summary || '';
            elements.aiSummary.style.display = note.summary ? 'block' : 'none';
            
            updateCurrentNoteHeader();
            renderNotesList();
        }

        // Save current note
        function saveCurrentNote() {
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

        // Delete a note
        function deleteNote(noteId) {
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

        // Save all notes to localStorage
        function saveNotes() {
            localStorage.setItem('lectoNotes', JSON.stringify(appState.notes));
            renderNotesList();
        }

        // Generate AI summary (mock implementation)
        function generateSummary() {
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

        // Copy summary to clipboard
        function copySummary() {
            const summaryText = elements.aiSummaryContent.innerText;
            if (!summaryText.trim()) {
                showToast('No summary to copy', 'error');
                return;
            }
            
            navigator.clipboard.writeText(summaryText)
                .then(() => showToast('Summary copied to clipboard', 'success'))
                .catch(() => showToast('Failed to copy summary', 'error'));
        }

        // Show export modal
        function showExportModal() {
            if (!appState.currentNote) {
                showToast('No note selected to export', 'error');
                return;
            }
            
            elements.exportFileName.value = appState.currentNote.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            showModal(elements.exportModal);
        }

        // Export note
        function exportNote() {
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

        // Format text in editor
        function formatText(command, value = null) {
            document.execCommand(command, false, value);
            elements.transcriptEditor.focus();
        }

        // Insert image into editor
        function insertImage(file) {
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

        // Show modal
        function showModal(modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        // Hide modal
        function hideModal(modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }

        // Show toast notification
        function showToast(message, type = 'info') {
            elements.toast.textContent = message;
            elements.toast.style.backgroundColor = type === 'error' ? '#ff6b6b' : 
                                               type === 'success' ? '#4caf50' : 
                                               type === 'info' ? '#4361ee' : '#333';
            
            elements.toast.classList.add('show');
            
            setTimeout(() => {
                elements.toast.classList.remove('show');
            }, 3000);
        }

        // Toggle mobile menu
        function toggleMobileMenu() {
            elements.sidebar.classList.toggle('active');
        }

        // Set up event listeners
        function setupEventListeners() {
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

        // Initialize the app when DOM is loaded
        document.addEventListener('DOMContentLoaded', init);