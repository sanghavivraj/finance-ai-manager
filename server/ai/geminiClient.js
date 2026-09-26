/**
 * geminiClient.js — High-Availability Gemini AI Service
 *
 * Fast multi-model fallback chain:
 * ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite-preview', 'gemini-3.5-flash', 'gemini-3.6-flash']
 * Ultra-fast responses with resilient error recovery.
 */

import { GoogleGenAI } from '@google/genai';

const SUPPORTED_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite-preview',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.8-flash',
];

let _aiInstance = null;

function getAI() {
  if (!_aiInstance && process.env.GEMINI_API_KEY) {
    _aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return _aiInstance;
}

export const isAIConfigured = () => Boolean(process.env.GEMINI_API_KEY);

// ─── Multi-model resilient caller ───────────────────────────────────────────
/**
 * Call Gemini with automatic model failover and fast Google Search Grounding.
 *
 * @param {string}  prompt
 * @param {object}  [opts]
 * @param {number}  [opts.timeoutMs]      default: 5000
 * @param {boolean} [opts.useSearch]      default: false
 * @returns {Promise<string>}
 */
export const callGemini = async (prompt, opts = {}) => {
  const ai = getAI();
  if (!ai) throw new Error('GEMINI_NOT_CONFIGURED');

  const timeoutMs = opts.timeoutMs ?? 5000;
  const useSearch = opts.useSearch ?? false;
  let lastError = null;

  // 1. Fast search grounding attempt (single model, 3s max)
  if (useSearch) {
    try {
      const searchCall = ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }],
      });

      const aiRes = await Promise.race([
        searchCall,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI_SEARCH_TIMEOUT')), 3000)
        ),
      ]);

      const text = aiRes?.text || aiRes?.response?.text() || '';
      if (text && text.trim()) {
        return text;
      }
    } catch (err) {
      console.warn(
        `⚠️ Fast search skipped (${err.message || err}). Falling back to instant direct generation...`
      );
      lastError = err;
    }
  }

  // 2. Direct generation across working models (3.5s timeout each)
  for (const model of SUPPORTED_MODELS) {
    try {
      const directCall = ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const aiRes = await Promise.race([
        directCall,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI_TIMEOUT')), Math.min(timeoutMs, 3500))
        ),
      ]);

      const text = aiRes?.text || aiRes?.response?.text() || '';
      if (text && text.trim()) {
        return text;
      }
    } catch (err) {
      console.warn(
        `⚠️ Model ${model} direct generation skipped (${err.message || err}). Trying next model...`
      );
      lastError = err;
    }
  }

  throw lastError || new Error('ALL_GEMINI_MODELS_FAILED');
};

// ─── JSON extraction ─────────────────────────────────────────────────────────
/**
 * Strip markdown code-fences and extract the first complete JSON object.
 */
export const extractJSON = (rawText) => {
  if (!rawText) return null;
  try {
    const cleaned = String(rawText)
      .replace(/```(?:json)?/gi, '')
      .replace(/```/g, '')
      .trim();

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }

    return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
};

/**
 * Convenience: call Gemini and immediately extract JSON.
 * Returns `null` on error.
 */
export const callGeminiJSON = async (prompt, opts = {}) => {
  try {
    const raw = await callGemini(prompt, opts);
    return extractJSON(raw);
  } catch (err) {
    console.error('callGeminiJSON error:', err.message);
    return null;
  }
};

export default { callGemini, callGeminiJSON, extractJSON, isAIConfigured };
