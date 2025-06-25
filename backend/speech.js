const express = require('express');
const WebSocket = require('ws');
const speech = require('@google-cloud/speech');

const app = express();
const wss = new WebSocket.Server({ port: 8081 });

const client = new speech.SpeechClient();

wss.on('connection', ws => {
  let recognizeStream = null;

  ws.on('message', async (message) => {
    if (message === 'START') {
      recognizeStream = client
        .streamingRecognize({
          config: {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            languageCode: 'en-US',
          },
          interimResults: true,
        })
        .on('data', data => {
          ws.send(JSON.stringify({ transcript: data.results[0]?.alternatives[0]?.transcript || '' }));
        });
    } else if (message === 'STOP') {
      recognizeStream && recognizeStream.end();
    } else {
      recognizeStream && recognizeStream.write(message);
    }
  });

  ws.on('close', () => {
    recognizeStream && recognizeStream.end();
  });
});

app.listen(3000, () => console.log('HTTP server running on port 3000'));