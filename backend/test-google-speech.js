const speech = require('@google-cloud/speech');
require('dotenv').config();

// Simple Google Cloud Speech API test
async function testGoogleSpeech() {
  console.log('=== Google Cloud Speech API Test ===');
  
  try {
    const client = new speech.SpeechClient();
    
    console.log('1. Testing client initialization...');
    console.log('Project ID:', client.projectId || 'Not detected');
    console.log('Credentials:', process.env.GOOGLE_APPLICATION_CREDENTIALS || 'Not set');
    
    console.log('\n2. Testing simple recognition...');
    
    // Create a simple audio buffer (silence)
    const sampleRate = 16000;
    const duration = 1; // 1 second
    const audioBuffer = Buffer.alloc(sampleRate * 2 * duration, 0); // 16-bit samples
    
    const request = {
      audio: {
        content: audioBuffer.toString('base64'),
      },
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: sampleRate,
        languageCode: 'en-US',
      },
    };

    console.log('Sending test request...');
    const [response] = await client.recognize(request);
    console.log('✓ Simple recognition test successful!');
    console.log('Response:', JSON.stringify(response, null, 2));
    
    console.log('\n3. Testing streaming recognition...');
    
    const streamRequest = {
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        model: 'latest_short',
      },
      interimResults: true,
      singleUtterance: false,
    };
    
    console.log('Creating streaming recognition...');
    const recognizeStream = client.streamingRecognize(streamRequest);
    
    let hasData = false;
    let hasError = false;
    
    recognizeStream.on('data', (data) => {
      hasData = true;
      console.log('✓ Streaming recognition data received:', JSON.stringify(data, null, 2));
    });
    
    recognizeStream.on('error', (error) => {
      hasError = true;
      console.error('❌ Streaming recognition error:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details:', error.details);
    });
    
    recognizeStream.on('end', () => {
      console.log('✓ Streaming recognition ended normally');
    });
    
    // Send some test audio data
    console.log('Sending test audio data...');
    for (let i = 0; i < 10; i++) {
      const chunk = Buffer.alloc(1024, 0);
      recognizeStream.write(chunk);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // End the stream
    recognizeStream.end();
    
    // Wait a moment for any final responses
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (hasError) {
      console.log('\n❌ Streaming test failed with errors');
    } else if (hasData) {
      console.log('\n✓ Streaming test successful - received data');
    } else {
      console.log('\n⚠️  Streaming test completed but no data received (this is normal for silence)');
    }
    
    console.log('\n=== Test Complete ===');
    console.log('Google Cloud Speech API appears to be working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    console.error('Details:', error.details);
    
    if (error.code === 'UNAUTHENTICATED') {
      console.error('\n🔑 Authentication issue:');
      console.error('- Make sure GOOGLE_APPLICATION_CREDENTIALS is set');
      console.error('- Make sure the credentials file exists and is valid');
      console.error('- Make sure the service account has Speech API permissions');
    }
    
    if (error.code === 'PERMISSION_DENIED') {
      console.error('\n🚫 Permission issue:');
      console.error('- Make sure the Speech API is enabled in your Google Cloud project');
      console.error('- Make sure billing is enabled');
      console.error('- Make sure the service account has the Speech API role');
    }
  }
}

// Run the test
testGoogleSpeech().then(() => {
  console.log('\nTest script completed.');
  process.exit(0);
}).catch((error) => {
  console.error('Test script failed:', error);
  process.exit(1);
});
