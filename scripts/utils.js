import elements from './dom.js';
import appState from './state.js';

// Utility functions
export function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

export function showToast(message, type = 'info') {
    elements.toast.textContent = message;
    elements.toast.style.backgroundColor = type === 'error' ? '#ff6b6b' :
        type === 'success' ? '#4caf50' :
            type === 'info' ? '#4361ee' : '#333';

    elements.toast.classList.add('show');

    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

export function setupMobileView() {
    if (window.innerWidth <= 768) {
        document.querySelectorAll('.hide-on-mobile').forEach(el => {
            el.style.display = 'none';
        });
    }
}

export function toggleMobileMenu() {
    elements.sidebar.classList.toggle('active');
}