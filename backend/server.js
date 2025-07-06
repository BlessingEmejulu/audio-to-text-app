import express from 'express';
import WebSocket, { WebSocketServer } from 'ws';
import speech from '@google-cloud/speech';
import cors from 'cors';
import dotenv from 'dotenv';
import { getGeminiSummary } from './aiSummary.js';

dotenv.config();

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

const wss = new WebSocketServer({ port: WS_PORT });

// Initialize Google Cloud Speech client
const client = new speech.SpeechClient();

console.log(`WebSocket server running on port ${WS_PORT}`);
console.log('Make sure you have Google Cloud credentials configured');

wss.on('connection', (ws, req) => {
  console.log('Client connected to WebSocket');
  let recognizeStream = null;
  let isStreamActive = false;
  let audioDataCounter = 0;
  let totalAudioBytes = 0;
  let streamStartTime = 0;
  let streamKeepAlive = null;

  ws.on('message', async (message) => {
    try {
      if (message.toString() === 'START') {
        console.log('=== Starting Speech Recognition Stream ===');
        console.log('Client project ID:', client.projectId || 'Not detected');
        console.log('Environment GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS || 'Not set');
        
        if (recognizeStream) {
          console.log('Ending existing stream...');
          recognizeStream.end();
        }

        const request = {
          config: {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            languageCode: 'en-US',
            enableAutomaticPunctuation: true,
            enableWordTimeOffsets: false,
            model: 'latest_short',
            audioChannelCount: 1,
          },
          interimResults: true,
          singleUtterance: false,
        };
          console.log('Speech recognition request config:', JSON.stringify(request.config, null, 2));
        streamStartTime = Date.now();
        
        // Clear any existing keepalive
        if (streamKeepAlive) {
          clearInterval(streamKeepAlive);
        }
        
        // Add a keepalive mechanism to prevent stream from closing too early
        streamKeepAlive = setInterval(() => {
          if (recognizeStream && isStreamActive) {
            console.log('Stream keepalive check - still active');
          } else {
            clearInterval(streamKeepAlive);
            streamKeepAlive = null;
          }
        }, 10000); // Check every 10 seconds
        
        // Enhanced error handling for the stream
        recognizeStream = client
          .streamingRecognize(request)
          .on('data', (data) => {
            try {
              console.log('=== Google Speech API Response ===');
              console.log('Full response:', JSON.stringify(data, null, 2));
              console.log('Results array length:', data.results ? data.results.length : 0);
              
              if (data.results && data.results.length > 0) {
                console.log('First result:', JSON.stringify(data.results[0], null, 2));
                
                if (data.results[0].alternatives && data.results[0].alternatives.length > 0) {
                  const transcript = data.results[0].alternatives[0].transcript;
                  const isFinal = data.results[0].isFinal;
                  const confidence = data.results[0].alternatives[0].confidence;
                  
                  console.log(`✓ Transcript: "${transcript}" (Final: ${isFinal}, Confidence: ${confidence})`);
                  
                  ws.send(JSON.stringify({
                    type: 'transcript',
                    transcript: transcript,
                    isFinal: isFinal,
                    confidence: confidence || 0
                  }));
                } else {
                  console.log('❌ No alternatives in result');
                }
              } else {
                console.log('❌ No results in response from Google Speech API');
                
                // Check if there are any other properties we should be aware of
                if (data.speechEventType) {
                  console.log('Speech event type:', data.speechEventType);
                }
                if (data.error) {
                  console.log('Error in response:', data.error);
                }
              }
              console.log('=== End Response ===');
            } catch (error) {
              console.error('Error processing speech data:', error);
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Error processing speech data: ' + error.message
              }));
            }
          })
          .on('error', (error) => {
            console.error('=== Speech Recognition Error ===');
            console.error('Error details:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            console.error('================================');
            
            ws.send(JSON.stringify({
              type: 'error',
              message: `Speech recognition error: ${error.message}`
            }));
            isStreamActive = false;
            if (streamKeepAlive) {
              clearInterval(streamKeepAlive);
              streamKeepAlive = null;
            }
          })
          .on('end', () => {
            console.log('=== Speech Recognition Stream Ended ===');
            console.log('Audio chunks processed:', audioDataCounter);
            console.log('Total audio bytes:', totalAudioBytes);
            console.log('Stream was active for:', Date.now() - streamStartTime, 'ms');
            console.log('=====================================');
            
            isStreamActive = false;
            if (streamKeepAlive) {
              clearInterval(streamKeepAlive);
              streamKeepAlive = null;
            }
            
            // Send status that stream ended
            ws.send(JSON.stringify({
              type: 'status',
              message: 'Speech recognition stopped'
            }));
          });

        isStreamActive = true;
        audioDataCounter = 0;
        totalAudioBytes = 0;
        
        ws.send(JSON.stringify({
          type: 'status',
          message: 'Speech recognition started'
        }));
        console.log('=== Speech Recognition Stream Started ===');

      } else if (message.toString() === 'STOP') {
        console.log('Stopping speech recognition stream...');
        if (streamKeepAlive) {
          clearInterval(streamKeepAlive);
          streamKeepAlive = null;
        }
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
        audioDataCounter++;
        totalAudioBytes += message.length;
        
        console.log(`📊 Audio chunk ${audioDataCounter}: ${message.length} bytes (Total: ${totalAudioBytes} bytes)`);
        
        if (recognizeStream && isStreamActive) {
          try {
            recognizeStream.write(message);
            console.log(`✅ Sent chunk ${audioDataCounter} to Google Speech API`);
          } catch (writeError) {
            console.error('Error writing to speech stream:', writeError);
          }
        } else {
          console.log('Cannot send audio: stream not active or not available');
          console.log('  - recognizeStream exists:', !!recognizeStream);
          console.log('  - isStreamActive:', isStreamActive);
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
    if (streamKeepAlive) {
      clearInterval(streamKeepAlive);
      streamKeepAlive = null;
    }
    if (recognizeStream) {
      recognizeStream.end();
      recognizeStream = null;
    }
    isStreamActive = false;
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    if (streamKeepAlive) {
      clearInterval(streamKeepAlive);
      streamKeepAlive = null;
    }
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

// Test endpoint to verify Google Cloud Speech API configuration
app.post('/test-speech', async (req, res) => {
  try {
    console.log('Testing Google Cloud Speech API configuration...');
    
    // Test a simple recognize request with dummy audio
    const testAudio = Buffer.alloc(1024, 0); // Silent audio buffer
    
    const request = {
      audio: { content: testAudio },
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
      },
    };

    const [response] = await client.recognize(request);
    console.log('Google Speech API test successful');
    
    res.json({
      success: true,
      message: 'Google Cloud Speech API is properly configured',
      projectId: client.projectId || 'Project ID not detected'
    });
  } catch (error) {
    console.error('Google Speech API test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Google Cloud Speech API configuration error',
      error: error.message,
      details: error.code || 'Unknown error code'
    });
  }
});

// Test Google Cloud Speech API connection and credentials
async function testGoogleCloudConnection() {
  try {
    console.log('=== Testing Google Cloud Speech API Connection ===');
    console.log('Project ID:', client.projectId || 'Not detected');
    console.log('Credentials file:', process.env.GOOGLE_APPLICATION_CREDENTIALS || 'Not set');
    
    // Test with a simple recognize call
    const testAudio = Buffer.alloc(1024, 0); // Silent audio for testing
    const testRequest = {
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
      },
      audio: {
        content: testAudio.toString('base64')
      }
    };
    
    const [response] = await client.recognize(testRequest);
    console.log('✓ Google Cloud Speech API connection successful');
    console.log('Test response:', response);
    return true;
  } catch (error) {
    console.error('❌ Google Cloud Speech API connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
    return false;
  }
}

// Test connection on startup
testGoogleCloudConnection();

// AI Summary endpoint using Gemini
app.post('/ai-summary', async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ success: false, message: 'Transcript is required.' });
    }
    const summary = await getGeminiSummary(transcript);
    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Unknown error' });
  }
});

app.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
  console.log(`Frontend available at http://localhost:${PORT}`);
});