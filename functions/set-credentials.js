const fs = require('fs');
const { execSync } = require('child_process');

// Read the JSON file
const credentials = JSON.parse(fs.readFileSync('./google-credentials.json', 'utf8'));

// Escape the JSON for command line
const escapedJson = JSON.stringify(JSON.stringify(credentials));

// Set the Firebase config
try {
    execSync(`firebase functions:config:set google.credentials=${escapedJson}`, { stdio: 'inherit' });
    console.log('Credentials set successfully');
} catch (error) {
    console.error('Error setting credentials:', error.message);
}