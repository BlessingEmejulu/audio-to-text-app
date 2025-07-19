import elements from './scripts/dom.js';
import { showModal, hideModal } from './scripts/modals.js';
import { showToast } from './scripts/utils.js';

// Bank details configuration
const bankDetails = {
    accountName: "Your Full Name",
    accountNumber: "1234567890",
    bankName: "Your Bank Name",
    routingNumber: "123456789"
};

// Simple support modal functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get elements
    const supportBtn = document.getElementById('supportDevBtn');
    const supportModal = document.getElementById('supportModal');
    const closeSupportModal = document.getElementById('closeSupportModal');
    
    // Bank details
    const bankDetails = {
        accountName: "Blessing Emejulu",
        accountNumber: "1234567890",
        bankName: "First Bank of Nigeria",
        routingNumber: "987654321"
    };
    
    // Set bank details
    document.getElementById('accountName').textContent = bankDetails.accountName;
    document.getElementById('accountNumber').textContent = bankDetails.accountNumber;
    document.getElementById('bankName').textContent = bankDetails.bankName;
    document.getElementById('routingNumber').textContent = bankDetails.routingNumber;
    
    // Show modal
    if (supportBtn && supportModal) {
        supportBtn.addEventListener('click', function(e) {
            e.preventDefault();
            supportModal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        });
    }
    
    // Hide modal
    if (closeSupportModal) {
        closeSupportModal.addEventListener('click', function() {
            supportModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });
    }
    
    // Click outside to close
    if (supportModal) {
        supportModal.addEventListener('click', function(e) {
            if (e.target === supportModal) {
                supportModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    }
    
    // Copy bank details
    document.querySelectorAll('.bank-value').forEach(field => {
        field.addEventListener('click', function() {
            navigator.clipboard.writeText(this.textContent).then(() => {
                const original = this.textContent;
                this.textContent = '✅ Copied!';
                this.style.background = '#4caf50';
                this.style.color = 'white';
                
                setTimeout(() => {
                    this.textContent = original;
                    this.style.background = '';
                    this.style.color = '';
                }, 2000);
            });
        });
    });
});

// Initialize support functionality
export function initializeSupport() {
    // Set bank details
    elements.accountName.textContent = bankDetails.accountName;
    elements.accountNumber.textContent = bankDetails.accountNumber;
    elements.bankName.textContent = bankDetails.bankName;
    elements.routingNumber.textContent = bankDetails.routingNumber;

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
    elements.routingNumber.textContent = bankDetails.routingNumber;
}