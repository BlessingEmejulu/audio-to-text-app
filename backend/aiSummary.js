import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;



export async function getGeminiSummary(transcript) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not set in environment variables');
  }

  const requestBody = {
    contents: [
      {
        // role: "user", // Optional, can be added if needed
        parts: [
          { text: `Summarize the following transcript:\n${transcript}` }
        ]
      }
    ]
  };

  const response = await axios.post(
    GEMINI_API_URL,
    requestBody,
    { headers: { 'Content-Type': 'application/json' } }
  );

  let summary = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No summary generated';
  summary = summary.replace(/\*/g, '');
  return summary;
}