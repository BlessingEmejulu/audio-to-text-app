const config = {
  development: {
    speechApiUrl: 'ws://localhost:8081',
    geminiApiUrl: 'http://localhost:8081'
  },
  production: {
    speechApiUrl: 'wss://audio-to-text-app.onrender.com',
    geminiApiUrl: 'https://audio-to-text-app.onrender.com'
  }
};

function detectEnvironment() {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'development';
  }
  return 'production';
}

const environment = detectEnvironment();
export const API_CONFIG = config[environment];