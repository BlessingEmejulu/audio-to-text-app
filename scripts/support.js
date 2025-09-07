import elements from './dom.js';
import { showModal, hideModal } from './modals.js';
import { showToast } from './utils.js';

// Bank details configuration
const bankDetails = {
    accountName: " ",
    accountNumber: " ",
    bankName: " ",
};

// Initialize support functionality
export function initializeSupport() {
    // Set bank details
    elements.accountName.textContent = bankDetails.accountName;
    elements.accountNumber.textContent = bankDetails.accountNumber;
    elements.bankName.textContent = bankDetails.bankName;

    // Add click to copy functionality
    addCopyToClipboard();

    // Event listeners
    elements.supportBtn.addEventListener('click', () => {
        showModal(elements.supportModal);
    });

    elements.closeSupportModal.addEventListener('click', () => {
        hideModal(elements.supportModal);
    });
}

// Add copy to clipboard functionality
function addCopyToClipboard() {
    const bankValues = document.querySelectorAll('.bank-value');
    
    bankValues.forEach(element => {
        element.addEventListener('click', () => {
            copyToClipboard(element.textContent, element);
        });
    });
}

// Copy text to clipboard
async function copyToClipboard(text, element) {
    try {
        await navigator.clipboard.writeText(text);
        
        // Visual feedback
        element.classList.add('copied');
        element.textContent = 'Copied!';
        
        // Reset after 2 seconds
        setTimeout(() => {
            element.classList.remove('copied');
            element.textContent = text;
        }, 2000);
        
        showToast('Copied to clipboard!', 'success');
    } catch (err) {
        console.error('Failed to copy: ', err);
        showToast('Failed to copy. Please select and copy manually.', 'error');
    }
}

// Update bank details (for easy configuration)
export function updateBankDetails(newDetails) {
    Object.assign(bankDetails, newDetails);
    
    elements.accountName.textContent = bankDetails.accountName;
    elements.accountNumber.textContent = bankDetails.accountNumber;
    elements.bankName.textContent = bankDetails.bankName;
}