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
    const includeTranscript = document.getElementById('includeTranscript')?.checked ?? true;
    const includeSummary = document.getElementById('includeSummary')?.checked ?? true;
    const includeMetadata = document.getElementById('includeMetadata')?.checked ?? true;
    
    try {
        switch (format) {
            case 'txt':
                exportAsTxt(appState.currentNote, fileName, includeTranscript, includeSummary, includeMetadata);
                break;
            case 'pdf':
                exportAsPdf(appState.currentNote, fileName, includeTranscript, includeSummary, includeMetadata);
                break;
            case 'docx':
                exportAsDocx(appState.currentNote, fileName, includeTranscript, includeSummary, includeMetadata);
                break;
            case 'html':
                exportAsHtml(appState.currentNote, fileName, includeTranscript, includeSummary, includeMetadata);
                break;
            default:
                showToast('Invalid format selected', 'error');
                return;
        }
        
        hideModal(elements.exportModal);
        showToast(`Successfully exported as ${format.toUpperCase()}!`, 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Export failed. Please try again.', 'error');
    }
}

// Export as TXT
function exportAsTxt(note, fileName, includeTranscript, includeSummary, includeMetadata) {
    let content = '';
    
    // Add metadata
    if (includeMetadata) {
        content += `${note.title}\n`;
        content += `Course: ${note.course || 'N/A'}\n`;
        content += `Date: ${new Date(note.date).toLocaleDateString()}\n`;
        content += `Created: ${new Date(note.createdAt).toLocaleString()}\n`;
        content += `\n${'='.repeat(60)}\n\n`;
    }
    
    // Add transcript content
    if (includeTranscript && note.content) {
        content += 'TRANSCRIPT:\n';
        content += `${'-'.repeat(20)}\n\n`;
        
        // Strip HTML tags from content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.content;
        const textContent = tempDiv.textContent || tempDiv.innerText || '';
        content += textContent;
        content += '\n\n';
    }
    
    // Add summary
    if (includeSummary && note.summary) {
        content += `${'='.repeat(60)}\n`;
        content += `AI SUMMARY:\n`;
        content += `${'='.repeat(60)}\n\n`;
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.summary;
        const summaryText = tempDiv.textContent || tempDiv.innerText || '';
        content += summaryText;
    }
    
    downloadFile(content, `${fileName}.txt`, 'text/plain');
}

// Export as HTML
function exportAsHtml(note, fileName, includeTranscript, includeSummary, includeMetadata) {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${note.title}</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 40px 20px; 
            line-height: 1.6;
            color: #333;
        }
        .header { 
            border-bottom: 3px solid #4361ee; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
        }
        .title { 
            color: #4361ee; 
            font-size: 32px; 
            margin-bottom: 10px; 
            font-weight: 700;
        }
        .meta { 
            color: #666; 
            font-size: 14px; 
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-top: 15px;
        }
        .section { 
            margin-bottom: 40px; 
        }
        .section-title {
            color: #4361ee;
            font-size: 24px;
            margin-bottom: 20px;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 10px;
        }
        .content { 
            background: white;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .summary { 
            background: linear-gradient(135deg, #e3f2fd 0%, #f0f7ff 100%);
            padding: 25px; 
            border-radius: 8px; 
            border-left: 5px solid #4cc9f0;
            margin-top: 30px;
        }
        .summary-title { 
            color: #4361ee; 
            font-size: 20px; 
            margin-bottom: 15px;
            font-weight: 600;
        }
        .export-info {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>`;
    
    if (includeMetadata) {
        html += `
    <div class="header">
        <h1 class="title">${note.title}</h1>
        <div class="meta">
            <strong>Course:</strong> ${note.course || 'N/A'} | 
            <strong>Date:</strong> ${new Date(note.date).toLocaleDateString()} | 
            <strong>Created:</strong> ${new Date(note.createdAt).toLocaleString()}
        </div>
    </div>`;
    }
    
    if (includeTranscript && note.content) {
        html += `
    <div class="section">
        <h2 class="section-title">📝 Transcript</h2>
        <div class="content">
            ${note.content}
        </div>
    </div>`;
    }
    
    if (includeSummary && note.summary) {
        html += `
    <div class="section">
        <div class="summary">
            <h2 class="summary-title">🤖 AI Summary</h2>
            ${note.summary}
        </div>
    </div>`;
    }
    
    html += `
    <div class="export-info">
        <p>Exported from Forword - Audio to Text Transcriber</p>
        <p>Generated on ${new Date().toLocaleString()}</p>
    </div>
</body>
</html>`;
    
    downloadFile(html, `${fileName}.html`, 'text/html');
}

// Export as PDF (using jsPDF)
function exportAsPdf(note, fileName, includeTranscript, includeSummary, includeMetadata) {
    // Check if jsPDF is available
    if (typeof window.jsPDF === 'undefined') {
        // Fallback to HTML export
        showToast('PDF export requires jsPDF library. Exporting as HTML instead.', 'warning');
        exportAsHtml(note, fileName, includeTranscript, includeSummary, includeMetadata);
        return;
    }
    
    const { jsPDF } = window.jsPDF;
    const doc = new jsPDF();
    
    let yPosition = 30;
    const pageWidth = doc.internal.pageSize.width;
    const maxWidth = pageWidth - 40;
    
    // Add metadata
    if (includeMetadata) {
        doc.setFontSize(24);
        doc.setFont(undefined, 'bold');
        doc.text(note.title, 20, yPosition);
        yPosition += 20;
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(`Course: ${note.course || 'N/A'}`, 20, yPosition);
        yPosition += 10;
        doc.text(`Date: ${new Date(note.date).toLocaleDateString()}`, 20, yPosition);
        yPosition += 10;
        doc.text(`Created: ${new Date(note.createdAt).toLocaleString()}`, 20, yPosition);
        yPosition += 20;
        
        // Add separator line
        doc.setDrawColor(67, 97, 238);
        doc.setLineWidth(0.5);
        doc.line(20, yPosition, pageWidth - 20, yPosition);
        yPosition += 15;
    }
    
    // Add transcript
    if (includeTranscript && note.content) {
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('Transcript:', 20, yPosition);
        yPosition += 15;
        
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        
        // Strip HTML and split text
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.content;
        const textContent = tempDiv.textContent || tempDiv.innerText || '';
        
        const splitText = doc.splitTextToSize(textContent, maxWidth);
        
        splitText.forEach(line => {
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 30;
            }
            doc.text(line, 20, yPosition);
            yPosition += 6;
        });
        
        yPosition += 10;
    }
    
    // Add summary
    if (includeSummary && note.summary) {
        if (yPosition > 200) {
            doc.addPage();
            yPosition = 30;
        }
        
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('AI Summary:', 20, yPosition);
        yPosition += 15;
        
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.summary;
        const summaryText = tempDiv.textContent || tempDiv.innerText || '';
        
        const splitSummary = doc.splitTextToSize(summaryText, maxWidth);
        
        splitSummary.forEach(line => {
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 30;
            }
            doc.text(line, 20, yPosition);
            yPosition += 6;
        });
    }
    
    // Add footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 30, 285);
        doc.text('Generated by Forword', 20, 285);
    }
    
    doc.save(`${fileName}.pdf`);
}

// Export as DOCX (basic implementation)
function exportAsDocx(note, fileName, includeTranscript, includeSummary, includeMetadata) {
    // For now, we'll create a rich text format that can be opened in Word
    let content = '';
    
    if (includeMetadata) {
        content += `${note.title}\n`;
        content += `Course: ${note.course || 'N/A'}\n`;
        content += `Date: ${new Date(note.date).toLocaleDateString()}\n`;
        content += `Created: ${new Date(note.createdAt).toLocaleString()}\n\n`;
        content += '========================================\n\n';
    }
    
    if (includeTranscript && note.content) {
        content += 'TRANSCRIPT:\n';
        content += '----------------------------------------\n\n';
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.content;
        const textContent = tempDiv.textContent || tempDiv.innerText || '';
        content += textContent;
        content += '\n\n';
    }
    
    if (includeSummary && note.summary) {
        content += '========================================\n';
        content += 'AI SUMMARY:\n';
        content += '========================================\n\n';
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.summary;
        const summaryText = tempDiv.textContent || tempDiv.innerText || '';
        content += summaryText;
    }
    
    // Create RTF format (can be opened in Word)
    const rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}} \\f0\\fs24 ${content.replace(/\n/g, '\\par ')}}`;
    
    downloadFile(rtfContent, `${fileName}.rtf`, 'application/rtf');
    showToast('Exported as RTF format (opens in Word)', 'info');
}

// Download file helper
function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
}