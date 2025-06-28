## 🔑 Google Cloud Setup (Required for Google Speech API)

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Speech-to-Text API

### Step 2: Create Service Account
1. Go to IAM & Admin > Service Accounts
2. Create a new service account
3. Grant it "Speech-to-Text API User" role
4. Download the JSON key file

### Step 3: Setup Credentials
1. Copy the downloaded JSON file to `backend/google-credentials.json`
2. Or rename `backend/google-credentials.json.example` and fill in your values
3. Make sure this file is in `.gitignore` (already configured)

### Step 4: Environment Variables
Create `backend/.env` file:
```
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
PORT=3000
WS_PORT=8081
```

**⚠️ NEVER commit your actual credentials to Git!**
