import AskYourMoney from '../ai/askYourMoney.js';
import ProactiveInsight from '../ai/proactiveInsight.js';
import GoalIntelligence from '../ai/goalIntelligence.js';
import WhatChanged from '../ai/whatChanged.js';
import { cached } from '../ai/cache.js';

const TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_QUESTION_LENGTH = 500;

// Surface real failures (503) instead of faking a success response
const fail = (res, label, e) => {
  console.error(`${label} error:`, e);
  return res.status(503).json({ error: 'AI service is temporarily unavailable. Please try again shortly.' });
};

export const askMoney = async (req, res) => {
  try {
    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
    if (!question) return res.status(400).json({ error: 'Question is required' });
    if (question.length > MAX_QUESTION_LENGTH) {
      return res.status(400).json({ error: `Question must be under ${MAX_QUESTION_LENGTH} characters` });
    }
    const rawAnswer = await new AskYourMoney(req.user.id).ask(question);
    const textAnswer = typeof rawAnswer === 'string' ? rawAnswer : (rawAnswer?.explanation || JSON.stringify(rawAnswer));
    const cleanAnswer = textAnswer.replace(/\$([0-9,.]+)/g, '₹$1').replace(/\$/g, '₹');
    res.json({ answer: cleanAnswer });
  } catch (e) {
    fail(res, 'AskYourMoney', e);
  }
};

export const proactiveInsights = async (req, res) => {
  try {
    const result = await cached(`proactive:${req.user.id}`, TTL_MS, () =>
      new ProactiveInsight(req.user.id).detectInsights());
    res.json(result);
  } catch (e) {
    fail(res, 'ProactiveInsight', e);
  }
};

export const goalIntelligence = async (req, res) => {
  try {
    const result = await cached(`goals:${req.user.id}`, TTL_MS, () =>
      new GoalIntelligence(req.user.id).analyzeGoals());
    res.json(result);
  } catch (e) {
    fail(res, 'GoalIntelligence', e);
  }
};

export const whatChanged = async (req, res) => {
  try {
    const result = await cached(`changed:${req.user.id}`, TTL_MS, () =>
      new WhatChanged(req.user.id).detectChanges());
    res.json(result);
  } catch (e) {
    fail(res, 'WhatChanged', e);
  }
};
