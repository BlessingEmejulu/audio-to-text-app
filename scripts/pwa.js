// PWA functionality
export function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    console.log('ServiceWorker registration successful:', registration.scope);
                })
                .catch((error) => {
                    console.log('ServiceWorker registration failed:', error);
                });
        });
    }
}

// Install prompt
let deferredPrompt;

export function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later
        deferredPrompt = e;
        
        // Show install button
        showInstallButton();
    });

    window.addEventListener('appinstalled', (evt) => {
        console.log('App was installed');
        hideInstallButton();
    });
}

function showInstallButton() {
    const installButton = document.getElementById('installButton');
    if (installButton) {
        installButton.style.display = 'block';
        installButton.addEventListener('click', installApp);
    }
}

function hideInstallButton() {
    const installButton = document.getElementById('installButton');
    if (installButton) {
        installButton.style.display = 'none';
    }
}

function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            deferredPrompt = null;
        });
    }
}

// Check if app is running as PWA
export function isPWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
}