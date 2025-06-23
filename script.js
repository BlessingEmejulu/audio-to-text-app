document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const startRecordingBtn = document.getElementById('startRecording');
    const pauseRecordingBtn = document.getElementById('pauseRecording');
    const stopRecordingBtn = document.getElementById('stopRecording');
    const soundWave = document.getElementById('soundWave');
    const recordingTime = document.getElementById('recordingTime');
    const recordingStatus = document.getElementById('recordingStatus');
    const transcriptionEditor = document.getElementById('transcriptionEditor');
    const summarizeBtn = document.getElementById('summarizeBtn');
    const formatBtn = document.getElementById('formatBtn');
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const shareNoteBtn = document.getElementById('shareNoteBtn');
    const noteTitle = document.getElementById('noteTitle');
    const newNoteBtn = document.getElementById('newNoteBtn');
    const savedNotesBtn = document.getElementById('savedNotesBtn');
    const savedNotesModal = document.querySelector('.saved-notes-modal');
    const closeNotesModal = document.getElementById('closeNotesModal');
    const notesList = document.getElementById('notesList');
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notificationMessage');
    const aiSummaryContainer = document.querySelector('.ai-summary-container');
    const aiSummary = document.getElementById('aiSummary');
    const copySummaryBtn = document.getElementById('copySummaryBtn');
    const formatBtns = document.querySelectorAll('.format-btn');
    const headingSelect = document.querySelector('.heading-select');

    // App State
    let mediaRecorder;
    let audioChunks = [];
    let recordingInterval;
    let recordingStartTime;
    let isRecording = false;
    let isPaused = false;
    let savedNotes = JSON.parse(localStorage.getItem('lectogen-notes')) || [];
    let currentNoteId = null;

    // Initialize
    setupFormatButtons();
    loadSavedNotesList();
    setupEventListeners();

    function setupEventListeners() {
        // Recording controls
        startRecordingBtn.addEventListener('click', startRecording);
        pauseRecordingBtn.addEventListener('click', togglePauseRecording);
        stopRecordingBtn.addEventListener('click', stopRecording);

        // Note actions
        saveNoteBtn.addEventListener('click', saveNote);
        exportPdfBtn.addEventListener('click', exportToPdf);
        shareNoteBtn.addEventListener('click', shareNote);
        newNoteBtn.addEventListener('click', createNewNote);

        // AI actions
        summarizeBtn.addEventListener('click', generateSummary);
        formatBtn.addEventListener('click', formatNotes);
        copySummaryBtn.addEventListener('click', copySummary);

        // Navigation
        savedNotesBtn.addEventListener('click', () => {
            savedNotesModal.classList.add('active');
        });

        closeNotesModal.addEventListener('click', () => {
            savedNotesModal.classList.remove('active');
        });

        // Title and content changes
        noteTitle.addEventListener('input', () => {
            updateSaveButtonState();
        });

        transcriptionEditor.addEventListener('input', () => {
            updateSaveButtonState();
        });

        // Heading select
        headingSelect.addEventListener('change', applyHeading);
    }

    function setupFormatButtons() {
        formatBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const command = btn.getAttribute('data-command');
                document.execCommand(command, false, null);
                transcriptionEditor.focus();
            });
        });
    }

    function applyHeading() {
        const headingType = headingSelect.value;
        document.execCommand('formatBlock', false, headingType);
        transcriptionEditor.focus();
    }

    // Recording functions
    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            
            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };
            
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                // In a real app, you would send this to a speech-to-text API
                simulateTranscription(audioBlob);
                audioChunks = [];
            };
            
            mediaRecorder.start();
            isRecording = true;
            isPaused = false;
            recordingStartTime = Date.now();
            
            startRecordingBtn.disabled = true;
            pauseRecordingBtn.disabled = false;
            stopRecordingBtn.disabled = false;
            
            recordingStatus.textContent = 'Recording...';
            updateRecordingTime();
            recordingInterval = setInterval(updateRecordingTime, 1000);
            animateSoundWave();
            
            showNotification('Recording started. Speak clearly into your microphone.');
        } catch (error) {
            console.error('Error accessing microphone:', error);
            showNotification('Error accessing microphone. Please check permissions.', 'error');
        }
    }

    function togglePauseRecording() {
        if (isPaused) {
            mediaRecorder.resume();
            isPaused = false;
            pauseRecordingBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
            recordingStatus.textContent = 'Recording...';
            animateSoundWave();
            showNotification('Recording resumed');
        } else {
            mediaRecorder.pause();
            isPaused = true;
            pauseRecordingBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
            recordingStatus.textContent = 'Paused';
            clearSoundWaveAnimation();
            showNotification('Recording paused');
        }
    }

    function stopRecording() {
        if (!mediaRecorder) return;
        
        mediaRecorder.stop();
        clearInterval(recordingInterval);
        clearSoundWaveAnimation();
        
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        
        isRecording = false;
        startRecordingBtn.disabled = false;
        pauseRecordingBtn.disabled = true;
        stopRecordingBtn.disabled = true;
        
        recordingStatus.textContent = 'Recording saved';
        showNotification('Recording stopped. Processing transcription...');
    }

    function updateRecordingTime() {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        const hours = Math.floor(elapsed / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        recordingTime.textContent = `${hours}:${minutes}:${seconds}`;
    }

    function animateSoundWave() {
        clearSoundWaveAnimation();
        
        for (let i = 0; i < 100; i++) {
            const bar = document.createElement('div');
            bar.className = 'sound-wave-bar';
            bar.style.height = `${Math.random() * 40 + 10}px`;
            bar.style.animationDelay = `${i * 0.05}s`;
            soundWave.appendChild(bar);
        }
    }

    function clearSoundWaveAnimation() {
        soundWave.innerHTML = '';
    }

    // Transcription simulation (in a real app, this would call a speech-to-text API)
    function simulateTranscription(audioBlob) {
        // Simulate API call delay
        setTimeout(() => {
            const mockTranscription = `Lecture transcription generated on ${new Date().toLocaleString()}:\n\n` +
                "Today we're discussing the fundamental principles of the subject. " +
                "The key points to remember are: first, the concept is foundational to understanding; " +
                "second, it relates directly to the practical applications we've examined; " +
                "and third, it will be covered extensively on the upcoming examination.\n\n" +
                "For the exam, you should be able to explain this concept in your own words " +
                "and provide examples of how it applies in different contexts. " +
                "Remember that definitions should be precise and examples should be relevant.\n\n" +
                "Any questions about this material should be addressed before the next lecture.";
            
            transcriptionEditor.innerHTML = mockTranscription;
            updateSaveButtonState();
            summarizeBtn.disabled = false;
            formatBtn.disabled = false;
            
            showNotification('Transcription complete!');
        }, 2000);
    }

    // Note management functions
    function updateSaveButtonState() {
        const hasContent = transcriptionEditor.textContent.trim().length > 0;
        const hasTitle = noteTitle.value.trim().length > 0;
        saveNoteBtn.disabled = !(hasContent && hasTitle);
        exportPdfBtn.disabled = !hasContent;
        shareNoteBtn.disabled = !hasContent;
    }

    function saveNote() {
        const title = noteTitle.value.trim();
        const content = transcriptionEditor.innerHTML;
        const summary = aiSummary.innerHTML;
        const now = new Date();
        
        const note = {
            id: currentNoteId || Date.now().toString(),
            title,
            content,
            summary,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
        };
        
        if (currentNoteId) {
            // Update existing note
            const index = savedNotes.findIndex(n => n.id === currentNoteId);
            if (index !== -1) {
                savedNotes[index] = note;
            }
        } else {
            // Add new note
            savedNotes.unshift(note);
            currentNoteId = note.id;
        }
        
        localStorage.setItem('lectogen-notes', JSON.stringify(savedNotes));
        loadSavedNotesList();
        updateSaveButtonState();
        
        showNotification(`Note "${title}" saved successfully!`);
    }

    function loadSavedNotesList() {
        notesList.innerHTML = '';
        
        if (savedNotes.length === 0) {
            notesList.innerHTML = '<p class="no-notes">No saved notes yet. Start recording to create one!</p>';
            return;
        }
        
        savedNotes.forEach(note => {
            const noteEl = document.createElement('div');
            noteEl.className = 'note-item';
            noteEl.innerHTML = `
                <h3>${note.title}</h3>
                <p>${stripHtml(note.content).substring(0, 150)}...</p>
                <div class="note-date">Last updated: ${new Date(note.updatedAt).toLocaleString()}</div>
            `;
            
            noteEl.addEventListener('click', () => {
                loadNote(note.id);
                savedNotesModal.classList.remove('active');
            });
            
            notesList.appendChild(noteEl);
        });
    }

    function loadNote(noteId) {
        const note = savedNotes.find(n => n.id === noteId);
        if (!note) return;
        
        currentNoteId = note.id;
        noteTitle.value = note.title;
        transcriptionEditor.innerHTML = note.content;
        
        if (note.summary) {
            aiSummary.innerHTML = note.summary;
            aiSummaryContainer.classList.remove('hidden');
        } else {
            aiSummaryContainer.classList.add('hidden');
        }
        
        updateSaveButtonState();
        summarizeBtn.disabled = false;
        formatBtn.disabled = false;
        
        showNotification(`Note "${note.title}" loaded`);
    }

    function createNewNote() {
        currentNoteId = null;
        noteTitle.value = '';
        transcriptionEditor.innerHTML = '';
        aiSummary.innerHTML = '';
        aiSummaryContainer.classList.add('hidden');
        
        startRecordingBtn.disabled = false;
        pauseRecordingBtn.disabled = true;
        stopRecordingBtn.disabled = true;
        summarizeBtn.disabled = true;
        formatBtn.disabled = true;
        
        recordingTime.textContent = '00:00:00';
        recordingStatus.textContent = 'Ready to record';
        
        updateSaveButtonState();
        clearSoundWaveAnimation();
        
        showNotification('New note created');
    }

    // AI Functions (simulated)
    function generateSummary() {
        const content = stripHtml(transcriptionEditor.textContent);
        if (!content.trim()) {
            showNotification('No content to summarize', 'error');
            return;
        }
        
        // Simulate AI API call
        showNotification('Generating summary with AI...');
        summarizeBtn.disabled = true;
        
        setTimeout(() => {
            const mockSummary = `**AI Summary**\n\n` +
                `- The lecture covers fundamental principles that are foundational to understanding the subject.\n` +
                `- Key points include the concept's relation to practical applications and its importance for the exam.\n` +
                `- Students should focus on precise definitions and relevant examples.\n` +
                `- Questions should be addressed before the next lecture session.\n\n` +
                `**Exam Tips**\n` +
                `- Be prepared to explain concepts in your own words with examples.\n` +
                `- Pay attention to definitions as they may be required verbatim.`;
            
            aiSummary.innerHTML = mockSummary;
            aiSummaryContainer.classList.remove('hidden');
            summarizeBtn.disabled = false;
            
            showNotification('AI summary generated!');
        }, 1500);
    }

    function formatNotes() {
        // Simulate formatting with AI
        showNotification('Formatting notes with AI...');
        formatBtn.disabled = true;
        
        setTimeout(() => {
            const content = transcriptionEditor.innerHTML;
            
            // Simple formatting simulation
            let formattedContent = content
                .replace(/(\n\n)/g, '</p><p>')
                .replace(/(\n)/g, '<br>')
                .replace(/Today we're discussing/g, '<strong>Lecture Topic:</strong>')
                .replace(/The key points to remember are:/g, '<h3>Key Points:</h3><ul><li>')
                .replace(/; first,/g, '</li><li>')
                .replace(/; second,/g, '</li><li>')
                .replace(/; and third,/g, '</li><li>')
                .replace(/For the exam,/g, '</ul><h3>Exam Focus:</h3><p>')
                .replace(/Remember that/g, '<br><strong>Important:</strong>')
                .replace(/Any questions/g, '<h3>Follow-up:</h3><p>');
            
            transcriptionEditor.innerHTML = `<p>${formattedContent}</p>`;
            formatBtn.disabled = false;
            
            showNotification('Notes formatted!');
        }, 1200);
    }

    function copySummary() {
        navigator.clipboard.writeText(aiSummary.textContent)
            .then(() => {
                showNotification('Summary copied to clipboard!');
            })
            .catch(err => {
                console.error('Failed to copy:', err);
                showNotification('Failed to copy summary', 'error');
            });
    }

    // Export and Share functions
    function exportToPdf() {
        // In a real app, this would use a library like jsPDF or call a backend service
        showNotification('Preparing PDF export... (simulated)');
        
        setTimeout(() => {
            showNotification('PDF ready for download! (simulated)');
            // Actual implementation would create and download a PDF here
        }, 1000);
    }

    function shareNote() {
        const title = noteTitle.value.trim() || 'Untitled Lecture Note';
        const content = stripHtml(transcriptionEditor.textContent).substring(0, 1000) + '...';
        
        if (navigator.share) {
            navigator.share({
                title: title,
                text: content,
                url: window.location.href
            }).catch(err => {
                console.error('Error sharing:', err);
                showNotification('Error sharing note', 'error');
            });
        } else {
            // Fallback for browsers that don't support Web Share API
            navigator.clipboard.writeText(`${title}\n\n${content}`)
                .then(() => {
                    showNotification('Note content copied to clipboard. Paste to share!');
                })
                .catch(err => {
                    console.error('Failed to copy:', err);
                    showNotification('Failed to share note', 'error');
                });
        }
    }

    // Utility functions
    function showNotification(message, type = 'success') {
        notification.className = 'notification';
        notification.classList.add('show');
        notificationMessage.textContent = message;
        
        // Set color based on type
        if (type === 'error') {
            notification.style.backgroundColor = 'var(--error)';
        } else if (type === 'warning') {
            notification.style.backgroundColor = 'var(--warning)';
        } else {
            notification.style.backgroundColor = 'var(--primary-blue)';
        }
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    function stripHtml(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || '';
    }
});