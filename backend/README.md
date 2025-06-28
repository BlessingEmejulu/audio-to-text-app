# Google Cloud Speech API Backend Setup

This backend server provides real-time speech-to-text transcription using Google Cloud Speech API.

## Prerequisites

1. **Node.js** (version 14 or higher)
2. **Google Cloud Project** with Speech API enabled
3. **Google Cloud Service Account** with Speech API permissions

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Google Cloud Setup

#### Option A: Service Account Key File (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Speech-to-Text API
4. Create a service account:
   - Go to IAM & Admin > Service Accounts
   - Click "Create Service Account"
   - Give it a name (e.g., "speech-api-service")
   - Grant "Speech Client" role
5. Create and download the JSON key file
6. Place the JSON file in the `backend` directory
7. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

8. Edit `.env` and set the path to your JSON file:

```
GOOGLE_APPLICATION_CREDENTIALS=./your-service-account-key.json
```

#### Option B: Application Default Credentials

If you have gcloud CLI installed:

```bash
gcloud auth application-default login
```

### 3. Start the Server

```bash
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

The server will start on:
- HTTP Server: `http://localhost:3000`
- WebSocket Server: `ws://localhost:8081`

## Features

- **Real-time transcription**: Streams audio to Google Cloud Speech API
- **WebSocket communication**: Low-latency connection with frontend
- **Error handling**: Graceful fallback and error reporting
- **CORS enabled**: Works with frontend development servers
- **Health check**: `/health` endpoint for monitoring

## API Endpoints

- `GET /health` - Health check endpoint
- `WS localhost:8081` - WebSocket for audio streaming

## WebSocket Protocol

### Client to Server Messages:
- `"START"` - Begin speech recognition
- `"STOP"` - End speech recognition
- `Binary audio data` - Audio chunks for processing

### Server to Client Messages:
```json
{
  "type": "transcript",
  "transcript": "recognized text",
  "isFinal": true,
  "confidence": 0.95
}
```

```json
{
  "type": "error",
  "message": "Error description"
}
```

```json
{
  "type": "status",
  "message": "Status message"
}
```

## Troubleshooting

### Common Issues:

1. **"Could not load the default credentials"**
   - Make sure your service account JSON file path is correct
   - Check that the file has proper permissions
   - Verify the GOOGLE_APPLICATION_CREDENTIALS environment variable

2. **"Permission denied"**
   - Ensure your service account has "Speech Client" role
   - Check that Speech-to-Text API is enabled in your project

3. **"WebSocket connection failed"**
   - Make sure the server is running on port 8081
   - Check firewall settings
   - Verify the frontend is connecting to the correct URL

4. **"Audio format not supported"**
   - The server expects WEBM_OPUS format at 48kHz
   - Check browser compatibility for MediaRecorder API

## Performance Tips

- Use a stable internet connection for best results
- Speak clearly and at moderate pace
- Minimize background noise
- Consider using a quality microphone

## Security Notes

- Keep your service account JSON file secure
- Never commit credentials to version control
- Use environment variables for production deployment
- Consider implementing authentication for production use
