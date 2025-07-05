// aiSummary.js
// Handles AI summary generation using Gemini API

const axios = require('axios');

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function getGeminiSummary(transcript) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is not set in environment variables.');
  }
  const prompt = `Summarize the following lecture transcript in clear, concise bullet points.\n\nTranscript:\n${transcript}`;
  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    const summary = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return summary;
  } catch (error) {
    console.error('Gemini API error:', error.response?.data || error.message);
    throw new Error('Failed to generate summary with Gemini API.');
  }
}

module.exports = { getGeminiSummary };
