'strict mode'

const day = new Date();
const year = day.getFullYear();
const copyrightSymbol = "\u00A9";
const footerYear = `${copyrightSymbol} ${year} ForWord. All rights reserved.`;

document.getElementById('year').textContent = footerYear;

document.addEventListener('DOMContentLoaded', function() {
    const supportDevBtn = document.getElementById('supportDevBtn');
    const supportModal = document.getElementById('supportModal');
    const closeSupportModal = document.getElementById('closeSupportModal');

    if (supportDevBtn && supportModal && closeSupportModal) {
        supportDevBtn.addEventListener('click', function() {
            supportModal.style.display = 'block';
        });

        closeSupportModal.addEventListener('click', function() {
            supportModal.style.display = 'none';
        });

        window.addEventListener('click', function(event) {
            if (event.target == supportModal) {
                supportModal.style.display = 'none';
            }
        });
    } else {
        console.error('One or more modal elements not found.');
    }
});




