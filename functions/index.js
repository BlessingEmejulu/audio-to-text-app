require('dotenv').config();

const { setGlobalOptions } = require("firebase-functions/v2");
const { onRequest } = require("firebase-functions/v2/https");
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const speech = require('@google-cloud/speech');

setGlobalOptions({ maxInstances: 10 });

const app = express();

// Fix CORS configuration - allow all origins for now
app.use(cors({
    origin: true, // Allow all origins
    credentials: false,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json({ limit: '50mb' }));

// Rate limiting
const aiSummaryLimit = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 20, // Max 20 AI summaries per 10 minutes
    message: { error: 'Too many AI summary requests, please wait before requesting more.' }
});

// Add a simple GET handler for testing
app.get('/ai-summary', (req, res) => {
    res.json({
        message: 'AI Summary endpoint is working! Use POST method with transcript data.',
        method: 'POST',
        url: 'https://api-54wbzdzd5a-uc.a.run.app/ai-summary',
        bodyExample: {
            transcript: 'Your transcript text here'
        },
        status: 'Ready'
    });
});

// AI Summary endpoint
app.post('/ai-summary', aiSummaryLimit, async (req, res) => {
    try {
        console.log('Received request:', req.body);
        
        const { transcript } = req.body;
        
        if (!transcript || typeof transcript !== 'string') {
            return res.status(400).json({
                success: false, 
                message: 'Transcript is required.' 
            });
        }

        // Get API key from environment variables
        const apiKey = process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
            console.error('Gemini API key not found in environment variables');
            return res.status(500).json({
                success: false,
                message: 'API configuration error'
            });
        }

        console.log('Using Gemini API to generate summary...');

        // Use Gemini API
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
        
        const prompt = `Please provide a comprehensive summary of the following transcript. Include key points, main topics, and important details. Format the response in clear, readable paragraphs:

${transcript}`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const summary = response.text();
        
        console.log('Summary generated successfully');
        
        // Format the summary with proper HTML formatting
        const formattedSummary = summary
            .split('\n\n')
            .filter(paragraph => paragraph.trim())
            .map(paragraph => `<p>${paragraph.trim().replace(/\n/g, '<br>')}</p>`)
            .join('');
        
        res.json({
            success: true, 
            summary: formattedSummary 
        });
        
    } catch (error) {
        console.error('AI Summary Error:', error);
        res.status(500).json({
            success: false, 
            message: 'Failed to generate summary: ' + error.message 
        });
    }
});

app.post('/speech-recognize', async (req, res) => {
    try {
        const speechClient = new speech.SpeechClient();
        const { audioData, config } = req.body;

        if (!audioData || !config) {
            return res.status(400).json({ success: false, message: 'Invalid request body' });
        }

        const request = {
            audio: {
                content: audioData,
            },
            config: {
                encoding: config.encoding || 'LINEAR16',
                sampleRateHertz: config.sampleRateHertz || 16000,
                languageCode: config.languageCode || 'en-US',
            },
        };

        const [response] = await speechClient.recognize(request);
        const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');
        const confidence = response.results.length > 0 ? response.results[0].alternatives[0].confidence : 0;

        res.json({
            success: true,
            transcript: transcription,
            confidence: confidence,
        });

    } catch (error) {
        console.error('Speech-to-Text Error:', error);
        res.status(500).json({ success: false, message: 'Failed to process audio.', fallbackToBrowser: true });
    }
});

app.get('/ping', (req, res) => {
    res.json({ success: true, message: 'pong' });
});

app.get('/speech-test', (req, res) => {
    res.json({ success: true, available: true });
});


// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Firebase Functions',
        hasApiKey: !!(process.env.GEMINI_API_KEY)
    });
});

// Export the Express app as Firebase Functions
exports.api = onRequest(app);