import elements from './dom.js';
import appState from './state.js';
import { showToast } from './utils.js';
import { appendToEditor } from './editor.js';

// Audio recording functionality with multiple transcription options
export function checkSpeechRecognitionSupport() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        showToast('Browser speech recognition not supported. Using Google Cloud Speech API.', 'info');
        elements.recordBtn.disabled = false;
        appState.useGoogleSpeech = true;
        setupGoogleSpeechAPI();
        return;
    }
    
    console.log('✓ Browser speech recognition is available');
    
    // Setup browser speech recognition as fallback
    appState.recognition = new SpeechRecognition();
    appState.recognition.continuous = true;
    appState.recognition.interimResults = true;
    appState.recognition.maxAlternatives = 1;
    appState.recognition.lang = 'en-US';
    
    appState.recognition.onresult = (event) => {
        console.log('Speech recognition result received');
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            console.log(`Result ${i}: "${transcript}" (Final: ${event.results[i].isFinal})`);
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }
        
        // Append to editor
        if (finalTranscript) {
            console.log('Adding final transcript to editor:', finalTranscript);
            appendToEditor(finalTranscript);
        }
        
        // Show interim results
        showInterimResults(interimTranscript);
    };
    
    appState.recognition.onerror = (event) => {
        console.error('Recognition error:', event.error);
        if (event.error === 'no-speech') {
            console.log('No speech detected, will restart recognition...');
            appState.recognitionActive = false;
            // For no-speech errors, restart after a brief delay
            if (appState.isRecording) {
                restartBrowserRecognition();
            }
        } else {
            console.log('Stopping recognition due to error:', event.error);
            appState.recognitionActive = false;
            stopRecording();
            showToast(`Recognition error: ${event.error}`, 'error');
        }
    };
    
    appState.recognition.onend = () => {
        console.log('Recognition ended, active state:', appState.recognitionActive);
        appState.recognitionActive = false;
        if (appState.isRecording) {
            console.log('Recognition ended, will restart...');
            restartBrowserRecognition();
        }
    };
    
    appState.recognition.onstart = () => {
        console.log('Speech recognition started');
        appState.recognitionActive = true;
    };
    
    // Setup Google Cloud Speech API as primary option
    setupGoogleSpeechAPI();
}

function setupGoogleSpeechAPI() {
    try {
        const wsUrl = 'ws://localhost:8081';
        console.log('Attempting to connect to Google Speech API WebSocket:', wsUrl);
        
        appState.googleSpeechWS = new WebSocket(wsUrl);
        
        appState.googleSpeechWS.onopen = () => {
            console.log('Connected to Google Speech API');
            appState.useGoogleSpeech = true;
            showToast('Connected to Google Speech API', 'success');
        };
        
        appState.googleSpeechWS.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleGoogleSpeechMessage(data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
        
        appState.googleSpeechWS.onerror = (error) => {
            console.error('Google Speech WebSocket error:', error);
            appState.useGoogleSpeech = false;
            showToast('Google Speech API connection failed. Using browser speech recognition.', 'warning');
            
            // Automatically fallback to browser speech recognition
            if (appState.recognition) {
                console.log('Falling back to browser speech recognition');
                setTimeout(() => {
                    if (!appState.isRecording) {
                        showToast('Click record again to use browser speech recognition', 'info');
                    }
                }, 1000);
            }
        };
        
        appState.googleSpeechWS.onclose = () => {
            console.log('Google Speech WebSocket closed');
            appState.useGoogleSpeech = false;
            if (appState.isRecording) {
                showToast('Connection lost. Stopping recording.', 'error');
                stopRecording();
            }
        };
        
    } catch (error) {
        console.error('Failed to setup Google Speech API:', error);
        appState.useGoogleSpeech = false;
    }
}

function handleGoogleSpeechMessage(data) {
    console.log('handleGoogleSpeechMessage called with:', data);
    
    // Clear timeout since we got a response
    if (appState.googleSpeechTimeout) {
        clearTimeout(appState.googleSpeechTimeout);
        appState.googleSpeechTimeout = null;
    }
    
    switch (data.type) {
        case 'transcript':
            console.log('Processing transcript:', data.transcript, 'isFinal:', data.isFinal);
            if (data.isFinal && data.transcript.trim()) {
                console.log('Appending final transcript to editor:', data.transcript.trim());
                appendToEditor(data.transcript.trim());
                console.log('Final transcript:', data.transcript);
            } else if (data.transcript.trim()) {
                console.log('Showing interim results:', data.transcript);
                showInterimResults(data.transcript);
                console.log('Interim transcript:', data.transcript);
            }
            break;
            
        case 'error':
            console.error('Google Speech API error:', data.message);
            showToast(data.message, 'error');
            stopRecording();
            break;
            
        case 'status':
            console.log('Status:', data.message);
            // If Google Speech keeps stopping, switch to browser recognition
            if (data.message.includes('stopped') && appState.isRecording) {
                console.log('Google Speech stopped unexpectedly, switching to browser recognition');
                showToast('Google Speech interrupted, switching to browser recognition', 'warning');
                
                // Cleanup Google Speech resources
                if (appState.processor) {
                    appState.processor.disconnect();
                    appState.processor = null;
                }
                if (appState.source) {
                    appState.source.disconnect();
                    appState.source = null;
                }
                if (appState.audioContext) {
                    appState.audioContext.close();
                    appState.audioContext = null;
                }
                if (appState.mediaStream) {
                    appState.mediaStream.getTracks().forEach(track => track.stop());
                    appState.mediaStream = null;
                }
                
                // Switch to browser speech recognition
                appState.useGoogleSpeech = false;
                if (appState.recognition && appState.isRecording) {
                    startBrowserSpeechRecording();
                }
            }
            break;
            
        case 'connection':
            console.log('Connection message:', data.message);
            break;
            
        default:
            console.log('Unknown message type:', data.type);
    }
}

function showInterimResults(interimText) {
    // You can implement interim results display here
    // For now, we'll just update the status
    if (interimText.trim()) {
        elements.statusText.textContent = `Listening: "${interimText.substring(0, 30)}..."`;
    }
}

export function toggleRecording() {
    if (appState.isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

// Add a function to manually switch to browser speech recognition for testing
export function useBrowserSpeechRecognition() {
    console.log('Manually switching to browser speech recognition');
    appState.useGoogleSpeech = false;
    if (appState.googleSpeechWS) {
        appState.googleSpeechWS.close();
    }
    showToast('Switched to browser speech recognition', 'info');
}

// Force Google Cloud Speech API
export function forceGoogleSpeech() {
    console.log('Forcing Google Cloud Speech API');
    appState.useGoogleSpeech = true;
    setupGoogleSpeechAPI();
    showToast('Forcing Google Cloud Speech API', 'info');
}

// Test function to simulate receiving a transcript
export function testTranscript() {
    console.log('Testing transcript simulation...');
    const testData = {
        type: 'transcript',
        transcript: 'This is a test transcript from Google Speech API',
        isFinal: true,
        confidence: 0.95
    };
    handleGoogleSpeechMessage(testData);
}

// Test function for browser speech recognition stability
function testBrowserSpeechStability() {
    console.log('Testing browser speech recognition stability...');
    if (!appState.recognition) {
        console.log('Browser speech recognition not available');
        return;
    }
    
    // Force browser speech mode
    appState.useGoogleSpeech = false;
    
    // Start recording
    startRecording();
    
    // Log state every second for 10 seconds
    let testInterval = setInterval(() => {
        console.log('Test - Recording:', appState.isRecording, 'Recognition Active:', appState.recognitionActive);
    }, 1000);
    
    // Stop after 10 seconds
    setTimeout(() => {
        clearInterval(testInterval);
        stopRecording();
        console.log('Browser speech stability test completed');
    }, 10000);
}

// Make test function available globally for debugging
window.testBrowserSpeechStability = testBrowserSpeechStability;

async function startRecording() {
    try {
        console.log('Starting recording...');
        console.log('useGoogleSpeech:', appState.useGoogleSpeech);
        console.log('googleSpeechWS state:', appState.googleSpeechWS?.readyState);
        console.log('recognition available:', !!appState.recognition);
        
        // Check if we should use Google Speech API
        if (appState.useGoogleSpeech && appState.googleSpeechWS && appState.googleSpeechWS.readyState === WebSocket.OPEN) {
            console.log('Using Google Speech API');
            await startGoogleSpeechRecording();
        } else if (appState.recognition) {
            console.log('Using browser speech recognition');
            startBrowserSpeechRecording();
        } else {
            console.log('No speech recognition service available');
            showToast('No speech recognition service available', 'error');
            return;
        }
        
        appState.isRecording = true;
        elements.recordBtn.classList.add('recording');
        elements.statusIndicator.classList.add('active');
        elements.statusText.textContent = 'Recording...';
        showToast('Recording started', 'success');
        
    } catch (error) {
        console.error('Error starting recording:', error);
        showToast('Error starting recording', 'error');
    }
}

async function startGoogleSpeechRecording() {
    try {
        console.log('🎤 Requesting microphone access for Google Speech...');
        
        // Get microphone access with specific constraints
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: false,  // Disable to get raw audio
                noiseSuppression: false,  // Disable to get raw audio
                autoGainControl: false,   // Disable to get raw audio
                sampleRate: 16000,
                channelCount: 1
            } 
        });
        
        console.log('✅ Microphone access granted');
        appState.mediaStream = stream;
        
        // Log audio track info
        const audioTrack = stream.getAudioTracks()[0];
        console.log('📊 Audio track settings:', audioTrack.getSettings());
        console.log('📊 Audio track constraints:', audioTrack.getConstraints());
        
        // Create AudioContext for audio processing
        const audioContext = new (window.AudioContext || window.webkitAudioContext)({ 
            sampleRate: 16000 
        });
        console.log('🔊 Audio context sample rate:', audioContext.sampleRate);
        
        const source = audioContext.createMediaStreamSource(stream);
        
        // Create ScriptProcessorNode for audio data processing
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        
        let chunkCount = 0;
        processor.onaudioprocess = (event) => {
            if (appState.googleSpeechWS && appState.googleSpeechWS.readyState === WebSocket.OPEN) {
                const inputData = event.inputBuffer.getChannelData(0);
                
                // Check for actual audio activity with lower threshold
                let hasAudio = false;
                let maxAmplitude = 0;
                let rmsAmplitude = 0;
                
                for (let i = 0; i < inputData.length; i++) {
                    const amplitude = Math.abs(inputData[i]);
                    if (amplitude > 0.001) { // Lower threshold for detecting audio
                        hasAudio = true;
                    }
                    maxAmplitude = Math.max(maxAmplitude, amplitude);
                    rmsAmplitude += amplitude * amplitude;
                }
                
                rmsAmplitude = Math.sqrt(rmsAmplitude / inputData.length);
                
                // Convert float32 to int16 (LINEAR16)
                const int16Data = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    // Apply gain to boost quiet audio
                    const gainedSample = inputData[i] * 5.0; // 5x gain
                    int16Data[i] = Math.max(-32768, Math.min(32767, gainedSample * 32768));
                }
                
                chunkCount++;
                if (chunkCount % 10 === 0 || hasAudio) { // Log every 10th chunk or when audio detected
                    console.log(`🎤 Chunk ${chunkCount}: ${hasAudio ? 'AUDIO' : 'silent'} (Max: ${maxAmplitude.toFixed(4)}, RMS: ${rmsAmplitude.toFixed(4)}) - ${int16Data.byteLength} bytes`);
                }
                
                appState.googleSpeechWS.send(int16Data.buffer);
            }
        };
        
        // Connect the audio processing chain
        source.connect(processor);
        processor.connect(audioContext.destination);
        
        // Store references for cleanup
        appState.audioContext = audioContext;
        appState.processor = processor;
        appState.source = source;
        
        // Start recording
        appState.googleSpeechWS.send('START');
        
        // Set a timeout to fallback to browser speech recognition if no response
        appState.googleSpeechTimeout = setTimeout(() => {
            console.log('Google Speech API not responding, falling back to browser speech recognition');
            showToast('Google Speech API not responding, switching to browser recognition', 'warning');
            
            // Cleanup audio processing
            if (appState.processor) {
                appState.processor.disconnect();
            }
            if (appState.source) {
                appState.source.disconnect();
            }
            if (appState.audioContext) {
                appState.audioContext.close();
            }
            if (appState.mediaStream) {
                appState.mediaStream.getTracks().forEach(track => track.stop());
                appState.mediaStream = null;
            }
            
            // Switch to browser speech recognition
            appState.useGoogleSpeech = false;
            if (appState.recognition && appState.isRecording) {
                startBrowserSpeechRecording();
            }
        }, 5000); // 5 second timeout
        
        console.log('Started Google Speech recording with LINEAR16 format');
        
    } catch (error) {
        console.error('Error accessing microphone:', error);
        showToast('Microphone access denied', 'error');
        throw error;
    }
}

function startBrowserSpeechRecording() {
    if (!appState.recognition) return;
    
    try {
        if (!appState.recognitionActive) {
            appState.recognitionActive = true;
            appState.recognition.start();
            console.log('Started browser speech recognition');
        } else {
            console.log('Speech recognition already active');
        }
    } catch (error) {
        console.error('Error starting browser speech recognition:', error);
        appState.recognitionActive = false;
        throw error;
    }
}

// Helper function to safely restart browser recognition
function restartBrowserRecognition() {
    // Add a delay to ensure the previous recognition session has fully ended
    setTimeout(() => {
        if (appState.isRecording && !appState.recognitionActive) {
            try {
                console.log('Attempting to restart browser recognition...');
                appState.recognitionActive = true;
                appState.recognition.start();
                console.log('Browser recognition restarted successfully');
            } catch (e) {
                console.log('Browser recognition restart failed:', e.message);
                appState.recognitionActive = false;
                
                // If this is an "already started" error, wait longer and try again
                if (e.message.includes('already started') || e.message.includes('InvalidStateError')) {
                    console.log('Recognition still active, waiting longer before retry...');
                    setTimeout(() => {
                        if (appState.isRecording && !appState.recognitionActive) {
                            try {
                                console.log('Second attempt to restart recognition...');
                                appState.recognitionActive = true;
                                appState.recognition.start();
                                console.log('Recognition restarted on second attempt');
                            } catch (secondError) {
                                console.log('Second restart attempt also failed:', secondError.message);
                                appState.recognitionActive = false;
                                stopRecording();
                                showToast('Speech recognition stopped working', 'error');
                            }
                        }
                    }, 2000);
                } else {
                    // For other errors, stop recording
                    stopRecording();
                    showToast('Speech recognition stopped working', 'error');
                }
            }
        }
    }, 1000);
}

function stopRecording() {
    appState.isRecording = false;
    elements.recordBtn.classList.remove('recording');
    elements.statusIndicator.classList.remove('active');
    elements.statusText.textContent = 'Ready to record';
    
    // Clear timeout
    if (appState.googleSpeechTimeout) {
        clearTimeout(appState.googleSpeechTimeout);
        appState.googleSpeechTimeout = null;
    }
    
    // Stop Google Speech API recording and cleanup audio processing
    if (appState.processor) {
        appState.processor.disconnect();
        appState.processor = null;
    }
    if (appState.source) {
        appState.source.disconnect();
        appState.source = null;
    }
    if (appState.audioContext) {
        appState.audioContext.close();
        appState.audioContext = null;
    }
    if (appState.mediaRecorder && appState.mediaRecorder.state !== 'inactive') {
        appState.mediaRecorder.stop();
        appState.mediaRecorder = null;
    }
    
    if (appState.mediaStream) {
        appState.mediaStream.getTracks().forEach(track => track.stop());
        appState.mediaStream = null;
    }
    
    if (appState.googleSpeechWS && appState.googleSpeechWS.readyState === WebSocket.OPEN) {
        appState.googleSpeechWS.send('STOP');
    }
    
    // Stop browser speech recognition
    if (appState.recognition && appState.recognitionActive) {
        appState.recognition.stop();
        appState.recognitionActive = false;
    }
    
    showToast('Recording stopped', 'info');
}

// Emergency fallback function to force browser speech recognition
export function emergencyFallbackToBrowser() {
    console.log('🚨 Emergency fallback to browser speech recognition');
    
    // Stop Google Speech completely
    appState.useGoogleSpeech = false;
    if (appState.googleSpeechWS) {
        appState.googleSpeechWS.close();
    }
    
    // Clean up audio processing
    if (appState.processor) {
        appState.processor.disconnect();
        appState.processor = null;
    }
    if (appState.source) {
        appState.source.disconnect();
        appState.source = null;
    }
    if (appState.audioContext) {
        appState.audioContext.close();
        appState.audioContext = null;
    }
    if (appState.mediaStream) {
        appState.mediaStream.getTracks().forEach(track => track.stop());
        appState.mediaStream = null;
    }
    
    // Force browser speech recognition
    if (appState.recognition) {
        if (appState.isRecording) {
            // Restart with browser speech
            startBrowserSpeechRecording();
            showToast('Switched to browser speech recognition', 'success');
        } else {
            showToast('Ready to use browser speech recognition. Click record to start.', 'info');
        }
    } else {
        showToast('Browser speech recognition not available', 'error');
    }
}

// Add browser-only mode function
export function enableBrowserOnlyMode() {
    console.log('🔧 Enabling browser-only mode');
    
    // Disable Google Speech completely
    appState.useGoogleSpeech = false;
    
    // Close any existing WebSocket connection
    if (appState.googleSpeechWS) {
        appState.googleSpeechWS.close();
        appState.googleSpeechWS = null;
    }
    
    // Show user feedback
    showToast('Browser-only speech recognition enabled', 'info');
    console.log('Browser speech recognition is ready. Click record to start.');
    
    // Update UI to show we're in browser mode
    if (elements.statusText) {
        elements.statusText.textContent = 'Ready - Browser speech recognition';
    }
}

// Comprehensive diagnostic function
export function runFullDiagnostics() {
    console.log('🔍 Running Full Speech Recognition Diagnostics');
    console.log('='.repeat(50));
    
    // 1. Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    console.log('1. Browser Speech Recognition:', SpeechRecognition ? '✅ Available' : '❌ Not available');
    
    // 2. Check WebSocket connection
    console.log('2. Google Speech WebSocket:', 
        appState.googleSpeechWS ? 
        `${appState.googleSpeechWS.readyState === WebSocket.OPEN ? '✅' : '❌'} ${appState.googleSpeechWS.readyState}` : 
        '❌ Not connected'
    );
    
    // 3. Check current mode
    console.log('3. Current mode:', appState.useGoogleSpeech ? 'Google Speech API' : 'Browser Speech');
    
    // 4. Check states
    console.log('4. Recording state:', appState.isRecording ? '🔴 Recording' : '⚪ Stopped');
    console.log('5. Recognition active:', appState.recognitionActive ? '✅ Active' : '❌ Inactive');
    
    // 5. Test microphone access
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
            console.log('6. Microphone access: ✅ Granted');
            
            // 6. Test audio context
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log('7. Audio context: ✅ Available, Sample rate:', audioContext.sampleRate);
                audioContext.close();
            } catch (e) {
                console.log('7. Audio context: ❌ Error:', e.message);
            }
        })
        .catch(error => {
            console.log('6. Microphone access: ❌ Denied or error:', error.message);
        });
    
    // 7. Recommendations
    console.log('\n📋 Recommendations:');
    if (!SpeechRecognition) {
        console.log('- Browser speech recognition not available, Google Speech API required');
    }
    if (!appState.googleSpeechWS || appState.googleSpeechWS.readyState !== WebSocket.OPEN) {
        console.log('- Start the backend server: cd backend && node speech.js');
        console.log('- Check Google Cloud credentials are properly configured');
    }
    if (SpeechRecognition && (!appState.googleSpeechWS || appState.googleSpeechWS.readyState !== WebSocket.OPEN)) {
        console.log('- Use browser speech as fallback: enableBrowserOnlyMode()');
    }
    
    console.log('='.repeat(50));
}

// Microphone test function
export function testMicrophone() {
    console.log('🎤 Testing microphone...');
    
    navigator.mediaDevices.getUserMedia({ 
        audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
        } 
    })
    .then(stream => {
        console.log('✅ Microphone access granted');
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        
        source.connect(analyser);
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        let testDuration = 5000; // 5 seconds
        let startTime = Date.now();
        let maxLevel = 0;
        let avgLevel = 0;
        let samples = 0;
        
        function checkAudio() {
            analyser.getByteFrequencyData(dataArray);
            
            let level = 0;
            for (let i = 0; i < dataArray.length; i++) {
                level += dataArray[i];
            }
            level = level / dataArray.length / 255; // Normalize to 0-1
            
            maxLevel = Math.max(maxLevel, level);
            avgLevel = (avgLevel * samples + level) / (samples + 1);
            samples++;
            
            console.log(`🔊 Audio level: ${level.toFixed(3)} (Max: ${maxLevel.toFixed(3)}, Avg: ${avgLevel.toFixed(3)})`);
            
            if (Date.now() - startTime < testDuration) {
                setTimeout(checkAudio, 100); // Check every 100ms
            } else {
                console.log('🎤 Microphone test completed');
                console.log(`📊 Results: Max level: ${maxLevel.toFixed(3)}, Average: ${avgLevel.toFixed(3)}`);
                
                if (maxLevel < 0.01) {
                    console.log('⚠️  Very low audio levels detected. Try:');
                    console.log('   - Speaking louder');
                    console.log('   - Checking microphone permissions');
                    console.log('   - Adjusting system microphone volume');
                } else if (maxLevel > 0.1) {
                    console.log('✅ Good audio levels detected');
                } else {
                    console.log('🔸 Low but detectable audio levels');
                }
                
                // Cleanup
                stream.getTracks().forEach(track => track.stop());
                audioContext.close();
            }
        }
        
        console.log('🎤 Speak now for 5 seconds...');
        checkAudio();
        
    })
    .catch(error => {
        console.error('❌ Microphone test failed:', error);
        console.log('💡 Possible solutions:');
        console.log('   - Grant microphone permissions');
        console.log('   - Check if another app is using the microphone');
        console.log('   - Try refreshing the page');
    });
}

// Quick fix: Auto-switch to browser speech if microphone is silent
export function enableAutoFallback() {
    console.log('🔄 Enabling auto-fallback from silent microphone to browser speech');
    
    // Monitor for silent audio and auto-switch
    let silentChunkCount = 0;
    const originalProcessor = appState.processor;
    
    if (originalProcessor && originalProcessor.onaudioprocess) {
        const originalHandler = originalProcessor.onaudioprocess;
        
        originalProcessor.onaudioprocess = (event) => {
            // Call the original handler
            originalHandler.call(originalProcessor, event);
            
            // Check for silence
            const inputData = event.inputBuffer.getChannelData(0);
            let maxAmplitude = 0;
            for (let i = 0; i < inputData.length; i++) {
                maxAmplitude = Math.max(maxAmplitude, Math.abs(inputData[i]));
            }
            
            if (maxAmplitude < 0.001) {
                silentChunkCount++;
                if (silentChunkCount > 20) { // After 20 silent chunks (~2 seconds)
                    console.log('🔄 Auto-switching to browser speech due to silent microphone');
                    showToast('Microphone silent, switching to browser speech', 'info');
                    emergencyFallbackToBrowser();
                    silentChunkCount = 0; // Reset counter
                }
            } else {
                silentChunkCount = 0; // Reset if audio detected
            }
        };
    }
}

// Comprehensive microphone troubleshooting
export async function troubleshootMicrophone() {
    console.log('🔧 Troubleshooting microphone...');
    showToast('Running microphone diagnostics...', 'info');
    
    try {
        // Step 1: Check if getUserMedia is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error('❌ getUserMedia not supported');
            showToast('Your browser doesn\'t support microphone access', 'error');
            return;
        }
        
        // Step 2: Get list of audio input devices
        console.log('📋 Checking available audio devices...');
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        
        console.log(`Found ${audioInputs.length} audio input device(s):`);
        audioInputs.forEach((device, index) => {
            console.log(`  ${index + 1}. ${device.label || `Microphone ${index + 1}`} (${device.deviceId})`);
        });
        
        if (audioInputs.length === 0) {
            console.error('❌ No audio input devices found');
            showToast('No microphones detected', 'error');
            return;
        }
        
        // Step 3: Try different audio constraints
        const constraints = [
            { audio: true }, // Simple
            { audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }, // Raw
            { audio: { deviceId: audioInputs[0].deviceId } }, // Specific device
            { audio: { sampleRate: 44100 } }, // Different sample rate
        ];
        
        for (let i = 0; i < constraints.length; i++) {
            console.log(`🎤 Testing constraint ${i + 1}:`, constraints[i]);
            
            try {
                const stream = await navigator.mediaDevices.getUserMedia(constraints[i]);
                
                // Test audio levels
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const source = audioContext.createMediaStreamSource(stream);
                const analyser = audioContext.createAnalyser();
                source.connect(analyser);
                
                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                
                // Check for 2 seconds
                let maxLevel = 0;
                let checks = 0;
                const checkInterval = setInterval(() => {
                    analyser.getByteFrequencyData(dataArray);
                    let level = 0;
                    for (let j = 0; j < dataArray.length; j++) {
                        level += dataArray[j];
                    }
                    level = level / dataArray.length / 255;
                    maxLevel = Math.max(maxLevel, level);
                    
                    checks++;
                    if (checks >= 20) { // 2 seconds
                        clearInterval(checkInterval);
                        
                        console.log(`  Result: Max level ${maxLevel.toFixed(4)}`);
                        
                        if (maxLevel > 0.01) {
                            console.log(`✅ Working microphone found with constraint ${i + 1}!`);
                            showToast(`Working microphone found! Max level: ${maxLevel.toFixed(3)}`, 'success');
                            
                            // Clean up and use this constraint
                            stream.getTracks().forEach(track => track.stop());
                            audioContext.close();
                            
                            // Store the working constraint
                            appState.workingAudioConstraint = constraints[i];
                            return;
                        } else {
                            console.log(`  ⚠️ Silent with constraint ${i + 1}`);
                        }
                        
                        // Clean up
                        stream.getTracks().forEach(track => track.stop());
                        audioContext.close();
                    }
                }, 100);
                
                await new Promise(resolve => setTimeout(resolve, 2100)); // Wait for test to complete
                
            } catch (error) {
                console.log(`  ❌ Failed with constraint ${i + 1}:`, error.message);
            }
        }
        
        // If we get here, no working microphone was found
        console.log('❌ No working microphone configuration found');
        showToast('Microphone troubleshooting complete. Check console for details.', 'warning');
        
        // Suggest browser speech recognition
        console.log('💡 Recommendation: Use browser speech recognition instead');
        showToast('Switching to browser speech recognition...', 'info');
        setTimeout(() => {
            enableBrowserOnlyMode();
        }, 2000);
        
    } catch (error) {
        console.error('❌ Microphone troubleshooting failed:', error);
        showToast('Microphone troubleshooting failed. Using browser speech.', 'error');
        setTimeout(() => {
            enableBrowserOnlyMode();
        }, 2000);
    }
}

// Make available globally
window.troubleshootMicrophone = troubleshootMicrophone;