import express from 'express';
import WebSocket, { WebSocketServer } from 'ws';
import speech from '@google-cloud/speech';
import cors from 'cors';
import dotenv from 'dotenv';
import { getGeminiSummary } from './aiSummary.js';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 8081;

function safeSend(ws, data) {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  } catch (error) {
    console.error('Error sending WebSocket message:', error);
  }
}

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500','https://audio-to-text-app.onrender.com/'],
  credentials: true
}));

app.use(express.json());

// RATE LIMITING - MOVE THIS BEFORE ROUTES
const createRateLimit = (windowMs, max, message) => 
  rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  });

// Different rate limits for different endpoints
const generalLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100,            // Max 100 requests per 15 minutes
  'Too many requests, please try again later.'
);

const speechTestLimit = createRateLimit(
  5 * 60 * 1000,  // 5 minutes
  10,             // Max 10 speech tests per 5 minutes
  'Too many speech API tests, please wait before testing again.'
);

const aiSummaryLimit = createRateLimit(
  10 * 60 * 1000, // 10 minutes
  20,             // Max 20 AI summaries per 10 minutes
  'Too many AI summary requests, please wait before requesting more.'
);

// Apply general rate limiting
app.use(generalLimit);

// Serve frontend files
app.use(express.static('../'));

let wss;
if (process.env.NODE_ENV === 'production') {
 
  const server = app.listen(PORT, () => {
    console.log(`HTTP/WebSocket server running on port ${PORT}`);
  });
  wss = new WebSocketServer({ server });
} else {
  
  app.listen(PORT, () => {
    console.log(`HTTP server running on port ${PORT}`);
  });
  wss = new WebSocketServer({ port: WS_PORT });
  console.log(`WebSocket server running on port ${WS_PORT}`);
}

// Initialize Google Cloud Speech client
const client = new speech.SpeechClient();

console.log('Make sure you have Google Cloud credentials configured');

// Connection tracking
const connectionTracker = new Map();
const usageStats = {
  connections: 0,
  speechRequests: 0,
  aiSummaries: 0,
  totalAudioBytes: 0,
  startTime: Date.now()
};

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const clientIP = req.socket.remoteAddress;
  const now = Date.now();
  
  // Check connection rate (max 1 connection per 12 seconds per IP)
  if (connectionTracker.has(clientIP)) {
    const lastConnection = connectionTracker.get(clientIP);
    if (now - lastConnection < 12000) { // 12 seconds between connections
      console.log(`Rate limit exceeded for IP: ${clientIP}`);
      ws.close(1008, 'Connection rate limit exceeded');
      return;
    }
  }
  
  connectionTracker.set(clientIP, now);
  usageStats.connections++;
  
  // Clean old entries every 5 minutes
  setTimeout(() => {
    connectionTracker.delete(clientIP);
  }, 5 * 60 * 1000);
  
  console.log('Client connected to WebSocket');
  let recognizeStream = null;
  let isStreamActive = false;
  let audioDataCounter = 0;
  let totalAudioBytes = 0;
  let streamStartTime = 0;
  let streamKeepAlive = null;
  
  // AUDIO THROTTLING VARIABLES
  let audioChunkCount = 0;
  let audioStartTime = Date.now();
  const MAX_CHUNKS_PER_MINUTE = 600; // Limit audio chunks

  ws.on('message', async (message) => {
    try {
      if (message.toString() === 'START') {
        console.log('=== Starting Speech Recognition Stream ===');
        console.log('Client project ID:', client.projectId || 'Not detected');
        console.log('Environment GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS || 'Not set');
        
        usageStats.speechRequests++;
        
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
        
        // Add a keepalive mechanism
        streamKeepAlive = setInterval(() => {
          if (recognizeStream && isStreamActive) {
            console.log('Stream keepalive check - still active');
          } else {
            clearInterval(streamKeepAlive);
            streamKeepAlive = null;
          }
        }, 10000);
        
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
                  
                  safeSend(ws, {
                    type: 'transcript',
                    transcript: transcript,
                    isFinal: isFinal,
                    confidence: confidence || 0
                  });
                } else {
                  console.log('❌ No alternatives in result');
                }
              } else {
                console.log('❌ No results in response from Google Speech API');
                
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
              safeSend(ws, {
                type: 'error',
                message: 'Error processing speech data: ' + error.message
              });
            }
          })
          .on('error', (error) => {
            console.error('=== Speech Recognition Error ===');
            console.error('Error details:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            console.error('================================');
            
            safeSend(ws, {
              type: 'error',
              message: `Speech recognition error: ${error.message}`
            });
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
            
            safeSend(ws, {
              type: 'status',
              message: 'Speech recognition stopped'
            });
          });

        isStreamActive = true;
        audioDataCounter = 0;
        totalAudioBytes = 0;
        audioChunkCount = 0; // Reset audio throttling
        audioStartTime = Date.now();
        
        safeSend(ws, {
          type: 'status',
          message: 'Speech recognition started'
        });
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
        
        safeSend(ws, {
          type: 'status',
          message: 'Speech recognition stopped'
        });

      } else {
        // ⚡ AUDIO DATA WITH THROTTLING
        audioChunkCount++;
        const elapsed = Date.now() - audioStartTime;
        
        // Check audio rate limit
        if (elapsed < 60000 && audioChunkCount > MAX_CHUNKS_PER_MINUTE) {
          console.log('Audio rate limit exceeded');
          safeSend(ws, {
            type: 'error',
            message: 'Audio processing rate limit exceeded. Please slow down.'
          });
          return;
        }
        
        // Reset counter every minute
        if (elapsed > 60000) {
          audioChunkCount = 0;
          audioStartTime = Date.now();
        }
        
        audioDataCounter++;
        totalAudioBytes += message.length;
        usageStats.totalAudioBytes += message.length;
        
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
      safeSend(ws, {
        type: 'error',
        message: `WebSocket error: ${error.message}`
      });
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
  safeSend(ws, {
    type: 'connection',
    message: 'Connected to speech recognition service'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Usage stats endpoint
app.get('/usage-stats', (req, res) => {
  const uptime = Date.now() - usageStats.startTime;
  const memoryUsage = process.memoryUsage();
  
  res.json({
    ...usageStats,
    uptimeMs: uptime,
    uptimeHours: Math.round(uptime / 3600000 * 100) / 100,
    activeConnections: connectionTracker.size,
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB'
    },
    server: {
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid
    }
  });
});

// Test endpoint with specific rate limit
app.post('/test-speech', speechTestLimit, async (req, res) => {
  try {
    console.log('Testing Google Cloud Speech API configuration...');
    
    const testAudio = Buffer.alloc(1024, 0);
    
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

// AI Summary endpoint with specific rate limit
app.post('/ai-summary', aiSummaryLimit, async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ success: false, message: 'Transcript is required.' });
    }
    
    usageStats.aiSummaries++;
    const summary = await getGeminiSummary(transcript);
    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Unknown error' });
  }
});

// Test Google Cloud Speech API connection
async function testGoogleCloudConnection() {
  try {
    console.log('=== Testing Google Cloud Speech API Connection ===');
    console.log('Project ID:', client.projectId || 'Not detected');
    console.log('Credentials file:', process.env.GOOGLE_APPLICATION_CREDENTIALS || 'Not set');
    
    const testAudio = Buffer.alloc(1024, 0);
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

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  
  // Close WebSocket server
  wss.close(() => {
    console.log('✅ WebSocket server closed');
  });
  
  // Close HTTP server
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  
  wss.close(() => {
    console.log('✅ WebSocket server closed');
  });
  
  process.exit(0);
});