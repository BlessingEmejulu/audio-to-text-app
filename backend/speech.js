const express = require('express');
const WebSocket = require('ws');
const speech = require('@google-cloud/speech');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 8081;

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500'],
  credentials: true
}));

app.use(express.json());
app.use(express.static('../')); // Serve frontend files

const wss = new WebSocket.Server({ port: WS_PORT });

// Initialize Google Cloud Speech client
const client = new speech.SpeechClient();

console.log(`WebSocket server running on port ${WS_PORT}`);
console.log('Make sure you have Google Cloud credentials configured');

wss.on('connection', (ws, req) => {
  console.log('Client connected to WebSocket');
  let recognizeStream = null;
  let isStreamActive = false;

  ws.on('message', async (message) => {
    try {
      if (message.toString() === 'START') {
        console.log('Starting speech recognition stream...');
        
        if (recognizeStream) {
          recognizeStream.end();
        }

        const request = {
          config: {
            encoding: 'WEBM_OPUS', // Changed to support web audio
            sampleRateHertz: 48000, // Updated sample rate
            languageCode: 'en-US',
            enableAutomaticPunctuation: true,
            enableWordTimeOffsets: false,
            model: 'latest_long', // Better for longer audio
          },
          interimResults: true,
          singleUtterance: false,
        };

        recognizeStream = client
          .streamingRecognize(request)
          .on('data', (data) => {
            try {
              if (data.results[0] && data.results[0].alternatives[0]) {
                const transcript = data.results[0].alternatives[0].transcript;
                const isFinal = data.results[0].isFinal;
                
                ws.send(JSON.stringify({
                  type: 'transcript',
                  transcript: transcript,
                  isFinal: isFinal,
                  confidence: data.results[0].alternatives[0].confidence || 0
                }));
                
                console.log(`Transcript: ${transcript} (Final: ${isFinal})`);
              }
            } catch (error) {
              console.error('Error processing speech data:', error);
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Error processing speech data'
              }));
            }
          })
          .on('error', (error) => {
            console.error('Speech recognition error:', error);
            ws.send(JSON.stringify({
              type: 'error',
              message: `Speech recognition error: ${error.message}`
            }));
            isStreamActive = false;
          })
          .on('end', () => {
            console.log('Speech recognition stream ended');
            isStreamActive = false;
          });

        isStreamActive = true;
        ws.send(JSON.stringify({
          type: 'status',
          message: 'Speech recognition started'
        }));

      } else if (message.toString() === 'STOP') {
        console.log('Stopping speech recognition stream...');
        if (recognizeStream) {
          recognizeStream.end();
          recognizeStream = null;
        }
        isStreamActive = false;
        
        ws.send(JSON.stringify({
          type: 'status',
          message: 'Speech recognition stopped'
        }));

      } else {
        // Audio data
        if (recognizeStream && isStreamActive) {
          recognizeStream.write(message);
        }
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: `WebSocket error: ${error.message}`
      }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
    if (recognizeStream) {
      recognizeStream.end();
      recognizeStream = null;
    }
    isStreamActive = false;
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    if (recognizeStream) {
      recognizeStream.end();
      recognizeStream = null;
    }
    isStreamActive = false;
  });

  // Send initial connection confirmation
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to speech recognition service'
  }));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
  console.log(`Frontend available at http://localhost:${PORT}`);
});