import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import OpenAI from 'openai';
import { getSubtitles } from 'youtube-caption-extractor';
import axios from 'axios';
import * as cheerio from 'cheerio';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import admin from 'firebase-admin';
import pptxgen from 'pptxgenjs';
import youtubedl from 'youtube-dl-exec';
import ffmpegPath from 'ffmpeg-static';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ limit: '60mb', extended: true }));

app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return res.status(413).json({
      error: 'Request body is too large for PPT export. The PPT contains large AI images. Try regenerating fewer images or export again after reducing image count.'
    });
  }

  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON request body.'
    });
  }

  return next(err);
});


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIREBASE_SERVICE_FILE = path.join(__dirname, 'firebase-service-account.json');
const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || 'AIzaSyB5tAzp8N_QactPSsXZkLBSD8tqErzm5jE';

function nowISO() {
  return new Date().toISOString();
}

function loadFirebaseServiceAccount() {
  const envJson =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    '';

  if (envJson.trim()) {
    try {
      const parsed = JSON.parse(envJson);
      if (parsed.private_key) {
        parsed.private_key = String(parsed.private_key).replace(/\\n/g, '\n');
      }
      return parsed;
    } catch (error) {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON: ${error.message}`);
    }
  }

  if (!fs.existsSync(FIREBASE_SERVICE_FILE)) {
    throw new Error('Firebase service account is missing. On Render, add FIREBASE_SERVICE_ACCOUNT_JSON. Locally, keep firebase-service-account.json inside the server folder.');
  }

  return JSON.parse(fs.readFileSync(FIREBASE_SERVICE_FILE, 'utf8'));
}

if (!admin.apps.length) {
  const serviceAccount = loadFirebaseServiceAccount();
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const firebaseAuth = admin.auth();
const firestoreDb = admin.firestore();
const usersCollection = firestoreDb.collection('users');
const activitiesCollection = firestoreDb.collection('activities');
const assessmentsCollection = firestoreDb.collection('assessments');


function createHistoryDescription(summaryText, url = '') {
  const text = String(summaryText || '');
  if (!text.trim()) return 'Saved summary';

  const cleanedLines = text
    .split('\n')
    .map((line) => line
      .replace(/[#*•]/g, '')
      .replace(/⏱\s*\d{1,2}:\d{2}(?::\d{2})?/g, '')
      .replace(/\d{1,2}:\d{2}(?::\d{2})?/g, '')
      .replace(/\s+/g, ' ')
      .trim())
    .filter((line) =>
      line.length > 25 &&
      !line.toLowerCase().includes('the video opens') &&
      !line.toLowerCase().includes('this video') &&
      !line.toLowerCase().includes('in this video') &&
      !line.toLowerCase().includes('summary')
    );

  const bestLine = cleanedLines[0];
  if (bestLine) return bestLine.length > 90 ? `${bestLine.slice(0, 90)}...` : bestLine;

  try {
    const parsedUrl = new URL(url);
    return `Saved from ${parsedUrl.hostname.replace('www.', '')}`;
  } catch {
    return 'Saved summary';
  }
}

function makeHistoryTitle(url = '') {
  const value = String(url || '').trim();
  if (!value) return 'Untitled summary';
  return value.length > 70 ? `${value.slice(0, 70)}...` : value;
}

function safeHistoryItem(doc) {
  const data = doc.data ? doc.data() : doc;
  return {
    id: doc.id || data.id,
    url: data.url || '',
    title: data.title || makeHistoryTitle(data.url),
    summary: data.summary || '',
    description: data.description || createHistoryDescription(data.summary, data.url),
    language: data.language || 'English',
    summaryType: data.summaryType || 'brief',
    savedAt: data.savedAt || data.createdAt || null,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null
  };
}

async function saveSummaryHistoryToFirebase({ userId, url, summary, language, summaryType, title, description }) {
  const cleanUserId = String(userId || '').trim();
  const cleanUrl = String(url || '').trim();
  const cleanSummary = String(summary || '').trim();

  if (!cleanUserId) throw new Error('userId is required to save summary history.');
  if (!cleanUrl) throw new Error('URL is required to save summary history.');
  if (!cleanSummary) throw new Error('Summary is required to save summary history.');

  const userDoc = await usersCollection.doc(cleanUserId).get();
  if (!userDoc.exists) throw new Error('User not found. Please login again.');

  const historyRef = usersCollection.doc(cleanUserId).collection('summaryHistory');
  const duplicateSnapshot = await historyRef
    .where('url', '==', cleanUrl)
    .where('summaryType', '==', summaryType || 'brief')
    .where('language', '==', language || 'English')
    .limit(1)
    .get();

  const payload = {
    userId: cleanUserId,
    url: cleanUrl,
    title: title || makeHistoryTitle(cleanUrl),
    summary: cleanSummary,
    description: description || createHistoryDescription(cleanSummary, cleanUrl),
    language: language || 'English',
    summaryType: summaryType || 'brief',
    savedAt: new Date().toLocaleString(),
    updatedAt: nowISO()
  };

  let docRef;
  if (!duplicateSnapshot.empty) {
    docRef = duplicateSnapshot.docs[0].ref;
    await docRef.set(payload, { merge: true });
  } else {
    docRef = historyRef.doc();
    await docRef.set({ ...payload, createdAt: nowISO() });
  }

  // Keep Firestore history compact for demo/project usage: last 20 summaries per user.
  const allHistory = await historyRef.orderBy('updatedAt', 'desc').get();
  const oldDocs = allHistory.docs.slice(20);
  for (let i = 0; i < oldDocs.length; i += 400) {
    const batch = firestoreDb.batch();
    oldDocs.slice(i, i + 400).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  await addActivity({ userId: cleanUserId, type: 'summary_history_saved', meta: { url: cleanUrl, summaryType: payload.summaryType, language: payload.language } });
  const savedDoc = await docRef.get();
  return safeHistoryItem(savedDoc);
}


function safePptItem(doc) {
  const data = doc?.data ? doc.data() : (doc || {});
  return {
    id: doc?.id || data.id || `ppt-${Date.now()}`,
    userId: data.userId || '',
    title: data.title || 'Brief Bot PPT',
    subtitle: data.subtitle || '',
    actionType: data.actionType || 'generated',
    slideCount: Number(data.slideCount || 0),
    template: data.template || 'floral',
    fileName: data.fileName || '',
    savedAt: data.savedAt || data.createdAt || null,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null
  };
}

function safeUser(profile = {}) {
  return {
    id: profile.id || profile.uid,
    uid: profile.uid || profile.id,
    name: profile.name || '',
    email: profile.email || '',
    role: profile.role || 'user',
    provider: profile.provider || 'password',
    photoURL: profile.photoURL || '',
    emailVerified: Boolean(profile.emailVerified),
    isLoggedIn: Boolean(profile.isLoggedIn),
    loginCount: Number(profile.loginCount || 0),
    summariesGenerated: Number(profile.summariesGenerated || 0),
    questionsGenerated: Number(profile.questionsGenerated || 0),
    answersGenerated: Number(profile.answersGenerated || 0),
    chatsSent: Number(profile.chatsSent || 0),
    assessmentsAttempted: Number(profile.assessmentsAttempted || 0),
    pptsGenerated: Number(profile.pptsGenerated || 0),
    lastAssessmentScore: Number(profile.lastAssessmentScore || 0),
    createdAt: profile.createdAt || null,
    lastLoginAt: profile.lastLoginAt || null
  };
}

function isRecentlyActiveUser(profile = {}) {
  if (!profile.isLoggedIn) return false;

  const lastLoginMs = profile.lastLoginAt ? new Date(profile.lastLoginAt).getTime() : 0;
  if (!lastLoginMs || Number.isNaN(lastLoginMs)) return false;

  // Treat users as active only for a recent live session window.
  // This prevents stale Firebase isLoggedIn=true values from showing as active forever.
  const ACTIVE_WINDOW_MS = 30 * 60 * 1000;
  return Date.now() - lastLoginMs <= ACTIVE_WINDOW_MS;
}


async function getUserProfile(userId) {
  if (!userId) return null;
  const doc = await usersCollection.doc(String(userId)).get();
  if (!doc.exists) return null;
  return safeUser({ id: doc.id, ...doc.data() });
}

async function signInWithFirebasePassword(email, password) {
  if (!FIREBASE_WEB_API_KEY) {
    throw new Error('FIREBASE_WEB_API_KEY is missing. Add it in server/.env or keep the backend fallback key.');
  }

  try {
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_WEB_API_KEY}`,
      {
        email: String(email || '').trim().toLowerCase(),
        password: String(password || ''),
        returnSecureToken: true
      },
      { timeout: 12000 }
    );

    return response.data;
  } catch (error) {
    const firebaseMessage = error.response?.data?.error?.message || error.message;
    throw new Error(firebaseMessage === 'INVALID_LOGIN_CREDENTIALS' ? 'Invalid email or password.' : firebaseMessage);
  }
}

async function addActivity({ userId, type, meta = {} }) {
  if (!userId || !type) return;
  await activitiesCollection.add({
    userId: String(userId),
    type,
    meta,
    createdAt: nowISO()
  });
}

async function incrementUserActivityCount(userId, fieldName) {
  if (!userId || !fieldName) return null;
  const ref = usersCollection.doc(String(userId));
  const doc = await ref.get();
  if (!doc.exists) return null;

  const currentValue = Number(doc.data()?.[fieldName] || 0);
  await ref.update({ [fieldName]: currentValue + 1, updatedAt: nowISO() });
  const updated = await ref.get();
  return safeUser({ id: updated.id, ...updated.data() });
}

async function ensureDefaultAdmin() {
  const adminEmail = 'admin@briefbot.com';
  const adminPassword = 'admin123';

  // Do NOT recreate the default demo admin if another real admin already exists.
  // This prevents deleted Firebase Authentication accounts from reappearing in the Admin Dashboard.
  const adminSnapshot = await usersCollection.where('role', '==', 'admin').get();
  for (const doc of adminSnapshot.docs) {
    try {
      await firebaseAuth.getUser(doc.id);
      console.log('[Firebase Admin] Existing active admin found. Skipping default admin creation.');
      return;
    } catch (error) {
      // Firestore admin doc is stale because the Auth user was deleted. Remove it.
      await doc.ref.delete();
      console.log('[Firebase Admin] Removed stale admin Firestore document:', doc.id);
    }
  }

  // Only create the demo admin when no active admin account exists at all.
  let adminUser;
  try {
    adminUser = await firebaseAuth.getUserByEmail(adminEmail);
  } catch (error) {
    adminUser = await firebaseAuth.createUser({
      email: adminEmail,
      password: adminPassword,
      displayName: 'Admin'
    });
  }

  const ref = usersCollection.doc(adminUser.uid);
  const doc = await ref.get();

  const adminProfile = {
    uid: adminUser.uid,
    name: 'Admin',
    email: adminEmail,
    role: 'admin',
    isLoggedIn: false,
    loginCount: Number(doc.data()?.loginCount || 0),
    summariesGenerated: Number(doc.data()?.summariesGenerated || 0),
    questionsGenerated: Number(doc.data()?.questionsGenerated || 0),
    answersGenerated: Number(doc.data()?.answersGenerated || 0),
    chatsSent: Number(doc.data()?.chatsSent || 0),
    pptsGenerated: Number(doc.data()?.pptsGenerated || 0),
    createdAt: doc.data()?.createdAt || nowISO(),
    lastLoginAt: doc.data()?.lastLoginAt || null,
    updatedAt: nowISO()
  };

  await ref.set(adminProfile, { merge: true });
  console.log('[Firebase Admin] Default admin ensured because no other active admin exists.');
}

await ensureDefaultAdmin();
console.log('FIREBASE ADMIN LOADED: YES');
const cerebras = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: 'https://api.cerebras.ai/v1'
});

// Separate Cerebras client for assessment question generation.
// Put your friend's key in server/.env as CEREBRAS_ASSESSMENT_API_KEY.
// If that key is missing, it safely falls back to CEREBRAS_API_KEY.
const cerebrasAssessment = new OpenAI({
  apiKey: process.env.CEREBRAS_ASSESSMENT_API_KEY || process.env.CEREBRAS_API_KEY,
  baseURL: 'https://api.cerebras.ai/v1'
});

// Separate Cerebras client for Smart Compare.
// Add this in server/.env: CEREBRAS_SMART_COMPARE_API_KEY=your_new_key
// Fallback order: CEREBRAS_SMART_COMPARE_API_KEY -> SMART_COMPARE_API_KEY -> CEREBRAS_ASSESSMENT_API_KEY -> CEREBRAS_API_KEY
const cerebrasSmartCompare = new OpenAI({
  apiKey: process.env.CEREBRAS_SMART_COMPARE_API_KEY || process.env.SMART_COMPARE_API_KEY || process.env.CEREBRAS_ASSESSMENT_API_KEY || process.env.CEREBRAS_API_KEY,
  baseURL: 'https://api.cerebras.ai/v1'
});

function getModelList() {
  return (
    process.env.CEREBRAS_MODELS ||
    process.env.CEREBRAS_MODEL ||
    'gpt-oss-120b'
  )
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
}
const MIN_TRANSCRIPT_WORDS = 60;
const MAX_TRANSCRIPT_CHARS = 30000;
const SUMMARY_INPUT_CHARS = 7000; // Safe input budget for Cerebras summary calls
const TIMELINE_SAMPLE_CHARS = 14000; // More transcript coverage for reliable full-video summary points
const SUMMARY_MAX_TOKENS = 3200;
const CHAT_MAX_TOKENS = 250;
const QUESTION_MAX_TOKENS = 350;
const ANSWER_MAX_TOKENS = 300;
const TIMESTAMP_GROUP_SECONDS = 45;
const LONG_VIDEO_SECONDS = 6 * 60; // Videos above 6 minutes use compressed transcript sampling

const transcriptCache = new Map();
const TRANSCRIPT_CACHE_TTL_MS = 15 * 60 * 1000;

console.log('CEREBRAS KEY LOADED:', process.env.CEREBRAS_API_KEY ? 'YES' : 'NO');
console.log('CEREBRAS ASSESSMENT KEY LOADED:', process.env.CEREBRAS_ASSESSMENT_API_KEY ? 'YES' : 'NO - using main key fallback');
console.log('CEREBRAS SMART COMPARE KEY LOADED:', (process.env.CEREBRAS_SMART_COMPARE_API_KEY || process.env.SMART_COMPARE_API_KEY) ? 'YES' : 'NO - using fallback key');
console.log('CEREBRAS MODELS:', getModelList().join(', '));


function normalizeAssessmentHistoryRecord(raw = {}) {
  const mode = raw.mode || raw.assessmentMode || (raw.roomCode ? 'battle' : 'solo');
  const result = raw.result || {};

  const score = Number(
    raw.score ??
    raw.marks ??
    result.score ??
    result.marks ??
    0
  );

  const totalMarks = Number(
    raw.totalMarks ??
    raw.total ??
    result.totalMarks ??
    result.total ??
    20
  );

  const percentage = Number(
    raw.percentage ??
    raw.accuracy ??
    result.percentage ??
    result.accuracy ??
    (totalMarks ? Math.round((score / totalMarks) * 100) : 0)
  );

  const submittedAt = raw.submittedAt || raw.createdAt || nowISO();

  return {
    id: raw.id || `${mode}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    mode,
    title: raw.title || (mode === 'battle' ? 'Battle Room Assessment' : 'Solo Practice Assessment'),
    roomCode: raw.roomCode || result.roomCode || '',
    hostName: raw.hostName || result.hostName || '',
    rank: raw.rank || result.rank || '',
    achievement: raw.achievement || result.achievement || '',
    remarks: raw.remarks || result.remarks || calculateBattleRemarks(percentage),
    score,
    totalMarks,
    percentage,
    accuracy: percentage,
    timeTakenSeconds: Number(raw.timeTakenSeconds ?? result.timeTakenSeconds ?? 0),
    submittedAt,
    questions: Array.isArray(raw.questions) ? raw.questions : [],
    review: Array.isArray(raw.review) ? raw.review : (Array.isArray(result.review) ? result.review : [])
  };
}


async function saveAssessmentHistory(userId, record) {
  if (!userId) return null;
  const safeRecord = normalizeAssessmentHistoryRecord(record);
  const ref = firestoreDb.collection('users').doc(String(userId)).collection('testHistory').doc(safeRecord.id);
  await ref.set({ ...safeRecord, userId: String(userId), updatedAt: nowISO() }, { merge: true });
  return { id: ref.id, ...safeRecord };
}


app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    version: 'brief-bot-audio-transcription-v6-debug-2026-06-18',
    provider: 'Cerebras',
    keyLoaded: process.env.CEREBRAS_API_KEY ? 'YES' : 'NO',
    assessmentKeyLoaded: process.env.CEREBRAS_ASSESSMENT_API_KEY ? 'YES' : 'NO - fallback to main key',
    transcriptionKeyLoaded: (process.env.GROQ_TRANSCRIPTION_API_KEY || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY) ? 'YES' : 'NO',
    models: getModelList(),
    port
  });
});


app.get('/api/social-login-test', (req, res) => {
  res.json({ ok: true, route: '/api/social-login', message: 'Google social login backend route is available.' });
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableAIError(error) {
  const status = error.status || error.response?.status || error.code;
  const message = String(error.message || '').toLowerCase();
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    message.includes('rate') ||
    message.includes('timeout') ||
    message.includes('temporarily') ||
    message.includes('unavailable')
  );
}




async function generateText({ messages, temperature = 0.15, maxTokens = SUMMARY_MAX_TOKENS }) {
  if (!process.env.CEREBRAS_API_KEY) {
    const missingKeyError = new Error('Cerebras API key is missing. Add CEREBRAS_API_KEY in server/.env.');
    missingKeyError.statusCode = 500;
    throw missingKeyError;
  }

  const smartTrim = (value, limit) => {
    const text = String(value || '');
    if (text.length <= limit) return text;
    const head = Math.floor(limit * 0.62);
    const tail = limit - head - 40;
    return `${text.slice(0, head)}

...[middle compressed for token safety]...

${text.slice(-tail)}`;
  };

  const guardedMessages = messages.map((msg) => ({
    ...msg,
    content: smartTrim(msg.content, msg.role === 'user' ? 7000 : 900)
  }));

  const totalChars = guardedMessages.reduce((sum, msg) => sum + String(msg.content || '').length, 0);
  console.log(`[Cerebras Guard] sendingChars=${totalChars}, maxTokens=${maxTokens}`);

  const models = getModelList();
  const errors = [];

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Cerebras] model=${model}, attempt=${attempt}, maxTokens=${maxTokens}`);

        const completion = await cerebras.chat.completions.create({
          model,
          messages: guardedMessages,
          temperature,
          max_tokens: maxTokens
        });

        const text = completion.choices?.[0]?.message?.content || '';
        if (text.trim()) return text.trim();

        throw new Error('Empty response from Cerebras.');
      } catch (error) {
        const status = error.status || error.response?.status || error.code || 'unknown';
        const message = error.message || 'No error.message';
        console.error(`[Cerebras Error] model=${model}, attempt=${attempt}, status=${status}, message=${message}`);

        errors.push({ model, attempt, status, message });

        if (!isRetryableAIError(error)) break;
        await sleep(700 * attempt);
      }
    }
  }

  const finalStatus = errors.find((e) => typeof e.status === 'number')?.status || 500;
  const friendly = new Error(
    `Cerebras request failed. Details: ${errors
      .map((e) => `${e.model} attempt ${e.attempt} -> status ${e.status}: ${e.message}`)
      .join(' | ')}`
  );
  friendly.statusCode = finalStatus;
  throw friendly;
}


function withTimeout(promise, ms, label = 'operation') {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out. Please try again.`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

async function generateAssessmentText({ messages, temperature = 0.08, maxTokens = 1200, timeoutMs = 22000 }) {
  const assessmentKey = process.env.CEREBRAS_ASSESSMENT_API_KEY || process.env.CEREBRAS_API_KEY;
  if (!assessmentKey) {
    const missingKeyError = new Error('Cerebras assessment API key is missing. Add CEREBRAS_ASSESSMENT_API_KEY or CEREBRAS_API_KEY in server/.env.');
    missingKeyError.statusCode = 500;
    throw missingKeyError;
  }

  const smartTrim = (value, limit) => {
    const text = String(value || '');
    if (text.length <= limit) return text;
    const head = Math.floor(limit * 0.7);
    const tail = limit - head - 35;
    return `${text.slice(0, head)}\n...[middle compressed]...\n${text.slice(-tail)}`;
  };

  const guardedMessages = messages.map((msg) => ({
    ...msg,
    content: smartTrim(msg.content, msg.role === 'user' ? 4800 : 700)
  }));

  const models = getModelList();
  const errors = [];
  const totalChars = guardedMessages.reduce((sum, msg) => sum + String(msg.content || '').length, 0);
  console.log(`[Assessment Cerebras Guard] usingSeparateKey=${process.env.CEREBRAS_ASSESSMENT_API_KEY ? 'YES' : 'NO'}, sendingChars=${totalChars}, maxTokens=${maxTokens}`);

  for (const model of models) {
    try {
      console.log(`[Assessment Cerebras] model=${model}, timeoutMs=${timeoutMs}`);
      const completion = await withTimeout(
        cerebrasAssessment.chat.completions.create({
          model,
          messages: guardedMessages,
          temperature,
          max_tokens: maxTokens
        }),
        timeoutMs,
        `Assessment generation with ${model}`
      );

      const text = completion.choices?.[0]?.message?.content || '';
      if (text.trim()) return text.trim();
      throw new Error('Empty assessment response from Cerebras.');
    } catch (error) {
      const status = error.status || error.response?.status || error.code || 'unknown';
      const message = error.message || 'No error.message';
      console.error(`[Assessment Cerebras Error] model=${model}, status=${status}, message=${message}`);
      errors.push({ model, status, message });
      if (!isRetryableAIError(error) && !String(message).toLowerCase().includes('timed out')) break;
    }
  }

  const friendly = new Error(
    `Assessment AI request failed. Details: ${errors.map((e) => `${e.model} -> status ${e.status}: ${e.message}`).join(' | ')}`
  );
  friendly.statusCode = 500;
  throw friendly;
}


async function generateSmartCompareText({ messages, temperature = 0.12, maxTokens = 2600, timeoutMs = 35000 }) {
  const smartCompareKey = process.env.CEREBRAS_SMART_COMPARE_API_KEY || process.env.SMART_COMPARE_API_KEY || process.env.CEREBRAS_ASSESSMENT_API_KEY || process.env.CEREBRAS_API_KEY;
  if (!smartCompareKey) {
    const missingKeyError = new Error('Smart Compare API key is missing. Add CEREBRAS_SMART_COMPARE_API_KEY or SMART_COMPARE_API_KEY in server/.env.');
    missingKeyError.statusCode = 500;
    throw missingKeyError;
  }

  const smartTrim = (value, limit) => {
    const text = String(value || '');
    if (text.length <= limit) return text;
    const head = Math.floor(limit * 0.62);
    const tail = limit - head - 45;
    return `${text.slice(0, head)}\n...[middle compressed for Smart Compare]...\n${text.slice(-tail)}`;
  };

  const guardedMessages = messages.map((msg) => ({
    ...msg,
    content: smartTrim(msg.content, msg.role === 'user' ? 7800 : 900)
  }));

  const models = getModelList();
  const errors = [];
  const totalChars = guardedMessages.reduce((sum, msg) => sum + String(msg.content || '').length, 0);
  console.log(`[Smart Compare Cerebras Guard] usingSeparateKey=${(process.env.CEREBRAS_SMART_COMPARE_API_KEY || process.env.SMART_COMPARE_API_KEY) ? 'YES' : 'NO'}, sendingChars=${totalChars}, maxTokens=${maxTokens}`);

  for (const model of models) {
    try {
      console.log(`[Smart Compare Cerebras] model=${model}, timeoutMs=${timeoutMs}`);
      const completion = await withTimeout(
        cerebrasSmartCompare.chat.completions.create({
          model,
          messages: guardedMessages,
          temperature,
          max_tokens: maxTokens
        }),
        timeoutMs,
        `Smart Compare with ${model}`
      );

      const text = completion.choices?.[0]?.message?.content || '';
      if (text.trim()) return text.trim();
      throw new Error('Empty Smart Compare response from Cerebras.');
    } catch (error) {
      const status = error.status || error.response?.status || error.code || 'unknown';
      const message = error.message || 'No error.message';
      console.error(`[Smart Compare Cerebras Error] model=${model}, status=${status}, message=${message}`);
      errors.push({ model, status, message });
      if (!isRetryableAIError(error) && !String(message).toLowerCase().includes('timed out')) break;
    }
  }

  const friendly = new Error(
    `Smart Compare AI request failed. Details: ${errors.map((e) => `${e.model} -> status ${e.status}: ${e.message}`).join(' | ')}`
  );
  friendly.statusCode = 500;
  throw friendly;
}


function extractYouTubeId(url) {
  if (!url) return null;
  const match = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function secondsToTimestamp(totalSeconds) {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function timestampToSeconds(timestamp) {
  const parts = String(timestamp).split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function cleanText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/\[Music\]/gi, '')
    .replace(/\[Applause\]/gi, '')
    .trim();
}

function countWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

function languageToCaptionCodes(language) {
  const map = {
    English: ['en'],
    Hindi: ['hi', 'en'],
    Telugu: ['te', 'en'],
    Tamil: ['ta', 'en'],
    Spanish: ['es', 'en'],
    French: ['fr', 'en'],
    German: ['de', 'en'],
    Mandarin: ['zh-Hans', 'zh-CN', 'zh', 'en'],
    Arabic: ['ar', 'en'],
    Japanese: ['ja', 'en'],
    Russian: ['ru', 'en'],
    Portuguese: ['pt', 'pt-BR', 'en']
  };
  return map[language] || ['en'];
}

function languageDisplayName(language) {
  const map = {
    English: 'English',
    Hindi: 'Hindi',
    Telugu: 'Telugu',
    Tamil: 'Tamil',
    Spanish: 'Spanish',
    French: 'French',
    German: 'German',
    Mandarin: 'Mandarin Chinese',
    Arabic: 'Arabic',
    Japanese: 'Japanese',
    Russian: 'Russian',
    Portuguese: 'Portuguese'
  };
  return map[language] || language || 'English';
}

function cacheKey(videoId, language) {
  return `${videoId}::${language || 'English'}`;
}

function setCachedTranscript(videoId, language, transcript) {
  transcriptCache.set(cacheKey(videoId, language), { transcript, savedAt: Date.now() });
}

function getCachedTranscript(videoId, language) {
  const item = transcriptCache.get(cacheKey(videoId, language));
  if (!item) return null;
  if (Date.now() - item.savedAt > TRANSCRIPT_CACHE_TTL_MS) {
    transcriptCache.delete(cacheKey(videoId, language));
    return null;
  }
  return item.transcript;
}

function buildGroupedTranscript(lines) {
  const groups = [];

  for (const line of lines) {
    if (!line || !line.text) continue;
    const start = Number(line.start || 0);
    const groupStart = Math.floor(start / TIMESTAMP_GROUP_SECONDS) * TIMESTAMP_GROUP_SECONDS;
    const lastGroup = groups[groups.length - 1];

    if (!lastGroup || lastGroup.start !== groupStart) {
      groups.push({ start: groupStart, texts: [cleanText(line.text)] });
    } else {
      lastGroup.texts.push(cleanText(line.text));
    }
  }

  return groups
    .map((group) => `⏱ ${secondsToTimestamp(group.start)} ${group.texts.join(' ')}`)
    .join('\n')
    .slice(0, MAX_TRANSCRIPT_CHARS);
}

function decodeCaptionText(value = '') {
  return cleanText(String(value || '')
    .replace(/\n/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>'));
}

function parseYouTubePlayerResponse(html = '') {
  const text = String(html || '');
  const patterns = [
    /ytInitialPlayerResponse\s*=\s*(\{[\s\S]+?\});/,
    /window\["ytInitialPlayerResponse"\]\s*=\s*(\{[\s\S]+?\});/,
    /var\s+ytInitialPlayerResponse\s*=\s*(\{[\s\S]+?\});/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (error) {
        console.log('[TimedText] Player response JSON parse failed:', error.message);
      }
    }
  }

  return null;
}

function pickBestCaptionTrack(captionTracks = [], selectedLanguage = 'English') {
  if (!Array.isArray(captionTracks) || !captionTracks.length) return null;

  const preferredCodes = Array.from(new Set([
    ...languageToCaptionCodes(selectedLanguage),
    'en', 'te', 'hi', 'ta', 'kn', 'ml'
  ].filter(Boolean).map((item) => String(item).toLowerCase())));

  for (const code of preferredCodes) {
    const exact = captionTracks.find((track) => String(track.languageCode || '').toLowerCase() === code);
    if (exact) return exact;

    const startsWith = captionTracks.find((track) => String(track.languageCode || '').toLowerCase().startsWith(code.split('-')[0]));
    if (startsWith) return startsWith;
  }

  const autoTrack = captionTracks.find((track) => track.kind === 'asr');
  if (autoTrack) return autoTrack;

  return captionTracks[0];
}

function parseJson3CaptionLines(payload) {
  const lines = [];
  const events = Array.isArray(payload?.events) ? payload.events : [];

  for (const event of events) {
    const segs = Array.isArray(event.segs) ? event.segs : [];
    const text = decodeCaptionText(segs.map((seg) => seg.utf8 || '').join(''));
    if (!text || /^\s*$/.test(text)) continue;

    lines.push({
      start: Number(event.tStartMs || 0) / 1000,
      text
    });
  }

  return lines;
}

function parseXmlCaptionLines(xml = '') {
  const lines = [];
  const matches = [...String(xml || '').matchAll(/<text[^>]+start=["']([^"']+)["'][^>]*>([\s\S]*?)<\/text>/g)];

  for (const match of matches) {
    const start = Number(match[1] || 0);
    const text = decodeCaptionText(match[2] || '');
    if (!text) continue;
    lines.push({ start, text });
  }

  return lines;
}

async function fetchYouTubeTranscriptFromTimedText(videoId, selectedLanguage) {
  try {
    const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=en`;
    const { data: html } = await axios.get(watchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 12000
    });

    const playerResponse = parseYouTubePlayerResponse(html);
    const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    const track = pickBestCaptionTrack(captionTracks, selectedLanguage);

    if (!track?.baseUrl) {
      console.log('[TimedText] No captionTracks found for video:', videoId);
      return { ok: false, tooShort: false, text: '', captionCount: 0, langUsed: null };
    }

    const baseUrl = String(track.baseUrl).replace(/\\u0026/g, '&');
    const jsonUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}fmt=json3`;

    try {
      const { data: jsonPayload } = await axios.get(jsonUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        timeout: 12000
      });

      const lines = parseJson3CaptionLines(jsonPayload);
      if (lines.length) {
        const groupedTranscript = buildGroupedTranscript(lines);
        const words = countWords(groupedTranscript);
        console.log(`[TimedText] lang=${track.languageCode || 'auto'}, captionLines=${lines.length}, groupedWords=${words}`);
        return {
          ok: words >= MIN_TRANSCRIPT_WORDS,
          tooShort: words < MIN_TRANSCRIPT_WORDS,
          text: groupedTranscript,
          captionCount: lines.length,
          langUsed: track.languageCode || 'timedtext',
          sourceType: 'timedtext-captions'
        };
      }
    } catch (jsonError) {
      console.log('[TimedText] json3 failed, trying XML:', jsonError.message);
    }

    const { data: xmlPayload } = await axios.get(baseUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 12000
    });

    const xmlLines = parseXmlCaptionLines(xmlPayload);
    const groupedTranscript = buildGroupedTranscript(xmlLines);
    const words = countWords(groupedTranscript);
    console.log(`[TimedText XML] lang=${track.languageCode || 'auto'}, captionLines=${xmlLines.length}, groupedWords=${words}`);

    return {
      ok: words >= MIN_TRANSCRIPT_WORDS,
      tooShort: words < MIN_TRANSCRIPT_WORDS,
      text: groupedTranscript,
      captionCount: xmlLines.length,
      langUsed: track.languageCode || 'timedtext-xml',
      sourceType: 'timedtext-captions'
    };
  } catch (error) {
    console.log('[TimedText] fallback failed:', error.message);
    return { ok: false, tooShort: false, text: '', captionCount: 0, langUsed: null };
  }
}

async function fetchYouTubeTranscript(videoId, selectedLanguage) {
  if (!videoId || typeof videoId !== 'string' || videoId.trim().length !== 11) {
    return { ok: false, tooShort: false, text: '', captionCount: 0, langUsed: null };
  }

  const langs = Array.from(new Set([...languageToCaptionCodes(selectedLanguage), 'en', 'te', 'hi', 'ta', 'kn', 'ml']));

  for (const lang of langs) {
    try {
      console.log('[Transcript] Fetching:', { videoID: videoId.trim(), lang });
      const lines = await getSubtitles({ videoID: videoId.trim(), lang: lang || 'en' });

      if (Array.isArray(lines) && lines.length > 0) {
        const groupedTranscript = buildGroupedTranscript(lines);
        const words = countWords(groupedTranscript);
        console.log(`[Transcript] lang=${lang}, captionLines=${lines.length}, groupedWords=${words}`);

        if (words >= MIN_TRANSCRIPT_WORDS) {
          return { ok: true, text: groupedTranscript, captionCount: lines.length, langUsed: lang };
        }

        return { ok: false, tooShort: true, text: groupedTranscript, captionCount: lines.length, langUsed: lang };
      }
    } catch (err) {
      console.log(`[Transcript] Failed lang=${lang}: ${err.message}`);
    }
  }

  const timedTextTranscript = await fetchYouTubeTranscriptFromTimedText(videoId.trim(), selectedLanguage);
  if (timedTextTranscript?.ok && timedTextTranscript?.text) {
    return timedTextTranscript;
  }

  if (timedTextTranscript?.tooShort && timedTextTranscript?.text) {
    return timedTextTranscript;
  }

  return { ok: false, tooShort: false, text: '', captionCount: 0, langUsed: null };
}

function extractMetaTag(html = '', property = '') {
  const propEscaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${propEscaped}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${propEscaped}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${propEscaped}["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${propEscaped}["']`, 'i')
  ];
  for (const pattern of patterns) {
    const match = String(html || '').match(pattern);
    if (match?.[1]) return cleanText(match[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'));
  }
  return '';
}

function stripHtmlForMetadataText(html = '') {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchYouTubeMetadataFallback(videoId, originalUrl = '') {
  const watchUrl = originalUrl || `https://www.youtube.com/watch?v=${videoId}`;
  const meta = {
    title: '',
    author: '',
    description: '',
    thumbnail: '',
    source: 'metadata'
  };

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
    const { data } = await axios.get(oembedUrl, {
      timeout: 9000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    meta.title = cleanText(data?.title || '');
    meta.author = cleanText(data?.author_name || '');
    meta.thumbnail = cleanText(data?.thumbnail_url || '');
  } catch (error) {
    console.log('[YouTube Fallback] oEmbed skipped:', error.message);
  }

  try {
    const { data: html } = await axios.get(watchUrl, {
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    meta.title = meta.title || extractMetaTag(html, 'og:title') || extractMetaTag(html, 'title');
    meta.description = extractMetaTag(html, 'og:description') || extractMetaTag(html, 'description');
    meta.thumbnail = meta.thumbnail || extractMetaTag(html, 'og:image');

    if (!meta.description) {
      const shortText = stripHtmlForMetadataText(html).slice(0, 1400);
      meta.description = shortText;
    }
  } catch (error) {
    console.log('[YouTube Fallback] watch metadata skipped:', error.message);
  }

  return meta;
}

function buildFallbackTranscriptFromMetadata(meta = {}, videoId = '') {
  const title = cleanText(meta.title || 'YouTube video');
  const author = cleanText(meta.author || 'the creator');
  const description = cleanText(meta.description || '');

  const chunks = [
    `⏱ 0:00 The video is titled "${title}" and is published by ${author}.`,
    description
      ? `⏱ 0:45 The available video description says: ${description.slice(0, 900)}.`
      : `⏱ 0:45 YouTube did not provide captions for this video, so Brief Bot uses the title and available metadata to create a fallback learning summary.`,
    `⏱ 1:30 The fallback summary focuses on the topic indicated by the title and available metadata instead of transcript captions.`,
    `⏱ 2:15 If the video has private, deleted, age-restricted, or region-blocked content, only limited fallback information may be available.`,
    `⏱ 3:00 Video reference ID: ${videoId}.`
  ];

  return chunks.join('\n').slice(0, MAX_TRANSCRIPT_CHARS);
}

function getTranscriptionProviderConfig() {
  const groqKey = process.env.GROQ_TRANSCRIPTION_API_KEY || process.env.GROQ_API_KEY || '';
  if (groqKey) {
    return {
      provider: 'groq',
      apiKey: groqKey,
      endpoint: 'https://api.groq.com/openai/v1/audio/transcriptions',
      model: process.env.GROQ_TRANSCRIPTION_MODEL || process.env.TRANSCRIPTION_MODEL || 'whisper-large-v3-turbo'
    };
  }

  const openAiKey = process.env.OPENAI_API_KEY || '';
  if (openAiKey) {
    return {
      provider: 'openai',
      apiKey: openAiKey,
      endpoint: 'https://api.openai.com/v1/audio/transcriptions',
      model: process.env.OPENAI_TRANSCRIPTION_MODEL || process.env.TRANSCRIPTION_MODEL || 'whisper-1'
    };
  }

  return null;
}

async function cleanupFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) await fs.promises.unlink(filePath);
  } catch (error) {
    console.log('[Audio Transcription] cleanup skipped:', error.message);
  }
}

async function downloadYouTubeAudioForTranscription(videoId) {
  const safeVideoId = String(videoId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16);
  const prefix = `briefbot-${safeVideoId}-${Date.now()}`;
  const outputTemplate = path.join(os.tmpdir(), `${prefix}.%(ext)s`);
  const videoUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;

  await youtubedl(videoUrl, {
    extractAudio: true,
    audioFormat: 'mp3',
    audioQuality: '5',
    output: outputTemplate,
    noPlaylist: true,
    noWarnings: true,
    preferFreeFormats: true,
    ffmpegLocation: ffmpegPath || undefined,
    maxFilesize: '35m'
  });

  const tempFiles = await fs.promises.readdir(os.tmpdir());
  const matchedFiles = tempFiles
    .filter((name) => name.startsWith(prefix))
    .map((name) => path.join(os.tmpdir(), name))
    .filter((filePath) => fs.existsSync(filePath));

  const mp3File = matchedFiles.find((filePath) => filePath.toLowerCase().endsWith('.mp3')) || matchedFiles[0];
  if (!mp3File) {
    throw new Error('Audio download finished but no audio file was created in temp folder.');
  }

  const stats = await fs.promises.stat(mp3File);
  if (!stats.size || stats.size < 1024) {
    throw new Error('Audio file was created but it is empty or too small.');
  }

  console.log(`[Audio Transcription] audioFile=${path.basename(mp3File)}, sizeMB=${(stats.size / (1024 * 1024)).toFixed(2)}`);
  return mp3File;
}

function buildTranscriptFromTranscriptionResponse(payload) {
  const segments = Array.isArray(payload?.segments) ? payload.segments : [];

  if (segments.length) {
    const lines = segments
      .map((segment) => ({
        start: Number(segment.start || 0),
        text: cleanText(segment.text || '')
      }))
      .filter((line) => line.text);

    return buildGroupedTranscript(lines);
  }

  const fullText = cleanText(payload?.text || '');
  if (!fullText) return '';

  const words = fullText.split(/\s+/).filter(Boolean);
  const lines = [];
  const wordsPerGroup = 45;

  for (let index = 0; index < words.length; index += wordsPerGroup) {
    lines.push({
      start: Math.floor(index / wordsPerGroup) * TIMESTAMP_GROUP_SECONDS,
      text: words.slice(index, index + wordsPerGroup).join(' ')
    });
  }

  return buildGroupedTranscript(lines);
}

async function transcribeYouTubeAudioFallback(videoId, selectedLanguage) {
  const config = getTranscriptionProviderConfig();
  if (!config) {
    console.log('[Audio Transcription] No transcription key found. Add GROQ_TRANSCRIPTION_API_KEY or OPENAI_API_KEY.');
    return { ok: false, tooShort: false, text: '', captionCount: 0, langUsed: null };
  }

  let audioPath = '';

  try {
    console.log(`[Audio Transcription] Downloading audio for video=${videoId}, provider=${config.provider}, model=${config.model}`);
    audioPath = await downloadYouTubeAudioForTranscription(videoId);

    const audioBuffer = await fs.promises.readFile(audioPath);
    const form = new FormData();
    form.append('file', new Blob([audioBuffer], { type: 'audio/mpeg' }), `${videoId}.mp3`);
    form.append('model', config.model);
    form.append('response_format', 'verbose_json');
    form.append('temperature', '0');

    if (selectedLanguage && selectedLanguage !== 'English') {
      const languageCode = languageToCaptionCodes(selectedLanguage)?.[0];
      if (languageCode && /^[a-z]{2}/i.test(languageCode)) {
        form.append('language', languageCode.slice(0, 2).toLowerCase());
      }
    }

    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}` },
      body: form
    });

    const rawText = await response.text();
    let data = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      throw new Error(`Transcription returned non-JSON response: ${rawText.slice(0, 160)}`);
    }

    if (!response.ok) {
      throw new Error(data.error?.message || data.error || `Transcription failed with status ${response.status}`);
    }

    const transcriptText = buildTranscriptFromTranscriptionResponse(data);
    const words = countWords(transcriptText);
    console.log(`[Audio Transcription] words=${words}, chars=${transcriptText.length}`);

    return {
      ok: words >= MIN_TRANSCRIPT_WORDS,
      tooShort: words < MIN_TRANSCRIPT_WORDS,
      text: transcriptText,
      captionCount: Array.isArray(data.segments) ? data.segments.length : 0,
      langUsed: data.language || selectedLanguage || 'audio',
      sourceType: 'audio-transcription',
      fallbackUsed: false
    };
  } catch (error) {
    console.log('[Audio Transcription] failed:', error.message);
    return { ok: false, tooShort: false, text: '', captionCount: 0, langUsed: null, errorMessage: error.message || 'Audio transcription failed.' };
  } finally {
    await cleanupFile(audioPath);
  }
}

async function getYouTubeContentWithFallback(videoId, selectedLanguage, originalUrl = '') {
  let transcript = getCachedTranscript(videoId, selectedLanguage);
  if (!transcript) {
    transcript = await fetchYouTubeTranscript(videoId, selectedLanguage);
  }

  if (transcript?.ok && transcript?.text) {
    setCachedTranscript(videoId, selectedLanguage, transcript);
    return { ...transcript, sourceType: transcript.sourceType || 'captions', fallbackUsed: false };
  }

  const audioTranscript = await transcribeYouTubeAudioFallback(videoId, selectedLanguage);
  if (audioTranscript?.ok && audioTranscript?.text) {
    setCachedTranscript(videoId, selectedLanguage, audioTranscript);
    return { ...audioTranscript, sourceType: 'audio-transcription', fallbackUsed: false };
  }

  // When a transcription key is configured, do not silently show a fake metadata-only summary.
  // A clear error is better than a wrong project demo summary.
  if (getTranscriptionProviderConfig() && process.env.ALLOW_METADATA_FALLBACK !== 'true') {
    return {
      ok: false,
      text: '',
      captionCount: 0,
      langUsed: selectedLanguage || 'audio',
      sourceType: 'audio-transcription-failed',
      fallbackUsed: false,
      errorMessage: audioTranscript?.errorMessage || 'Captions were unavailable and audio transcription also failed. Check Render logs for [Audio Transcription] failed.'
    };
  }

  const metadata = await fetchYouTubeMetadataFallback(videoId, originalUrl);
  const fallbackText = buildFallbackTranscriptFromMetadata(metadata, videoId);
  const fallbackWords = countWords(fallbackText);

  if (fallbackWords >= 35) {
    const fallbackTranscript = {
      ok: true,
      tooShort: false,
      text: fallbackText,
      captionCount: 0,
      langUsed: selectedLanguage || 'metadata',
      sourceType: 'metadata-fallback',
      fallbackUsed: true,
      metadata
    };
    setCachedTranscript(videoId, selectedLanguage, fallbackTranscript);
    return fallbackTranscript;
  }

  return {
    ...(transcript || {}),
    ok: false,
    text: transcript?.text || '',
    sourceType: 'failed',
    fallbackUsed: false,
    metadata
  };
}


async function scrapeGeneralWebpage(url) {
  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 10000
    });

    const $ = cheerio.load(data);
    $('script, style, nav, footer, header, iframe, noscript, head, svg').remove();

    const blocks = [];
    $('h1, h2, h3, p, li').each((i, el) => {
      const txt = cleanText($(el).text());
      if (txt.length > 40) blocks.push(txt);
    });

    return blocks.join(' ').slice(0, MAX_TRANSCRIPT_CHARS);
  } catch (err) {
    throw new Error('Scraper fail: ' + err.message);
  }
}

function removeSummaryMarkers(text) {
  return String(text || '')
    .replace(/\[\[END_SUMMARY\]\]/g, '')
    .replace(/\[\[END_PART\]\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}


function cleanDuplicateTimestampsInSummary(text) {
  return String(text || '')
    .replace(
      /(⏱\s*)?(\d{1,2}:\d{2}(?::\d{2})?)\s+([^\n]{0,80}?)(?:⏱\s*)\2\\b/g,
      (match, clock, timestamp, middleText) => {
        const middle = String(middleText || '').trim();
        if (!middle || /^(by|at|around|near|from|after|before)$/i.test(middle)) {
          return `⏱ ${timestamp} `;
        }
        return match;
      }
    )
    .replace(/⏱\s*(\d{1,2}:\d{2}(?::\d{2})?)\s+⏱\s*\1/g, '⏱ $1')
    .replace(/\b(\d{1,2}:\d{2}(?::\d{2})?)\s+⏱\s*\1/g, '⏱ $1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const BROKEN_SUMMARY_ENDING_RE = /\b(and|or|but|because|while|when|where|which|who|that|with|for|from|into|about|using|including|like|as|to|of|by|a|an|the|this|these|those|is|are|was|were|will|can|could|should|would)\.?$/i;

function stripBrokenEnding(value) {
  let text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';

  text = text.replace(/\.\.\.$/, '').trim();

  if (BROKEN_SUMMARY_ENDING_RE.test(text)) {
    const safeCut = Math.max(
      text.lastIndexOf(','),
      text.lastIndexOf(';'),
      text.lastIndexOf(':'),
      text.lastIndexOf(' and '),
      text.lastIndexOf(' or '),
      text.lastIndexOf(' because '),
      text.lastIndexOf(' where '),
      text.lastIndexOf(' which '),
      text.lastIndexOf(' that '),
      text.lastIndexOf(' including '),
      text.lastIndexOf(' using '),
      text.lastIndexOf(' like ')
    );

    if (safeCut >= 35) {
      text = text.slice(0, safeCut).trim();
    } else {
      text = text.replace(/\s+\S+\.?$/, '').trim();
    }
  }

  if (text && !/[.!?]$/.test(text)) text += '.';
  return text;
}

function splitPrefixAndBody(line) {
  const raw = String(line || '').trim();
  const match = raw.match(/^(\s*(?:[-*•]\s*)?(?:\d+[).]\s*)?(?:⏱\s*)?(?:\d{1,2}:\d{2}(?::\d{2})?\s*)?)(.*)$/);
  return {
    prefix: match ? match[1] : '',
    body: match ? match[2] : raw
  };
}

function isBrokenSummaryLine(line) {
  const { body } = splitPrefixAndBody(line);
  const clean = String(body || '').replace(/\*\*/g, '').trim();
  if (!clean) return true;
  if (clean.length < 12) return true;
  if (BROKEN_SUMMARY_ENDING_RE.test(clean.replace(/[.!?]$/, ''))) return true;
  if (BROKEN_SUMMARY_ENDING_RE.test(clean)) return true;
  if (!/[.!?]$/.test(clean)) return true;
  return false;
}

function fixSummaryLine(line) {
  const raw = String(line || '').trim();
  if (!raw) return '';

  const { prefix, body } = splitPrefixAndBody(raw);
  let cleanBody = String(body || '').trim();

  const sentenceParts = cleanBody
    .split(/(?<=[.!?])\s+/)
    .map((part) => stripBrokenEnding(part))
    .filter((part) => part.length >= 12 && !BROKEN_SUMMARY_ENDING_RE.test(part.replace(/[.!?]$/, '')));

  if (sentenceParts.length) {
    cleanBody = sentenceParts.join(' ');
  } else {
    cleanBody = stripBrokenEnding(cleanBody);
  }

  if (!cleanBody || cleanBody.length < 12) return '';
  return `${prefix}${cleanBody}`.trim();
}

function finalizeSummarySentences(summaryText) {
  const lines = String(summaryText || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const fixed = lines
    .map(fixSummaryLine)
    .filter(Boolean)
    .filter((line) => !isBrokenSummaryLine(line));

  return fixed.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function hasBrokenSummarySentences(summaryText) {
  const lines = String(summaryText || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return true;
  return lines.some(isBrokenSummaryLine);
}

function clipTranscriptToCompleteSentence(text, maxChars) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (value.length <= maxChars) return value;

  const clipped = value.slice(0, maxChars);
  const lastStop = Math.max(clipped.lastIndexOf('.'), clipped.lastIndexOf('?'), clipped.lastIndexOf('!'));

  if (lastStop >= Math.min(80, maxChars * 0.45)) {
    return clipped.slice(0, lastStop + 1).trim();
  }

  const lastComma = clipped.lastIndexOf(',');
  if (lastComma >= Math.min(90, maxChars * 0.55)) {
    return `${clipped.slice(0, lastComma).trim()}.`;
  }

  return `${clipped.split(/\s+/).slice(0, -1).join(' ').trim()}.`;
}


function estimateVideoDurationFromTranscript(transcript) {
  const matches = [...String(transcript || '').matchAll(/⏱\s*(\d{1,2}:\d{2}(?::\d{2})?)/g)];
  if (!matches.length) return 0;
  return timestampToSeconds(matches[matches.length - 1][1]);
}

function splitTranscriptLines(transcript) {
  return String(transcript || '').split('\n').map((line) => line.trim()).filter(Boolean);
}

function compactTranscriptLine(line, maxTextChars) {
  const value = String(line || '').trim();
  const match = value.match(/^(⏱\s*\d{1,2}:\d{2}(?::\d{2})?)\s*(.*)$/);

  if (!match) {
    return value.length > maxTextChars ? clipTranscriptToCompleteSentence(value, maxTextChars) : value;
  }

  const timestamp = match[1];
  const text = match[2].replace(/\s+/g, ' ').trim();
  const clipped = text.length > maxTextChars ? clipTranscriptToCompleteSentence(text, maxTextChars) : text;
  return `${timestamp} ${clipped}`.trim();
}

function getTimelinePointCount(durationSeconds, lineCount, summaryType = 'brief') {
  if (lineCount <= 4) return lineCount;

  // More points = better full-video coverage for PPT and assessment quality.
  // Keep it controlled so free-tier APIs do not fail.
  if (summaryType === 'bullets') {
    if (!durationSeconds || durationSeconds <= 5 * 60) return Math.min(6, lineCount);
    if (durationSeconds <= 12 * 60) return Math.min(9, lineCount);
    if (durationSeconds <= 25 * 60) return Math.min(12, lineCount);
    if (durationSeconds <= 45 * 60) return Math.min(14, lineCount);
    return Math.min(16, lineCount);
  }

  if (!durationSeconds || durationSeconds <= 5 * 60) return Math.min(9, lineCount);
  if (durationSeconds <= 12 * 60) return Math.min(14, lineCount);
  if (durationSeconds <= 25 * 60) return Math.min(18, lineCount);
  if (durationSeconds <= 45 * 60) return Math.min(22, lineCount);
  return Math.min(24, lineCount);
}

function sampleTranscriptForFullCoverage(transcript, durationSeconds, summaryType = 'brief') {
  const lines = splitTranscriptLines(transcript);
  const budget = TIMELINE_SAMPLE_CHARS;

  if (!lines.length) return String(transcript || '').slice(0, budget);

  const targetPoints = getTimelinePointCount(durationSeconds, lines.length, summaryType);
  const selectedIndexes = new Set();

  // Pick evenly distributed timeline points across the full transcript.
  // This guarantees coverage from start to end for every video length.
  for (let i = 0; i < targetPoints; i++) {
    const ratio = targetPoints === 1 ? 0 : i / (targetPoints - 1);
    selectedIndexes.add(Math.min(lines.length - 1, Math.max(0, Math.round((lines.length - 1) * ratio))));
  }

  // Always protect first and final timestamp.
  selectedIndexes.add(0);
  selectedIndexes.add(lines.length - 1);

  const selected = [...selectedIndexes]
    .sort((a, b) => a - b)
    .map((idx) => lines[idx]);

  let perLineChars = Math.max(120, Math.floor((budget - 250) / selected.length));
  perLineChars = Math.min(perLineChars, summaryType === 'brief' ? 340 : 260);

  let sample = selected
    .map((line, index) => `Point ${index + 1}: ${compactTranscriptLine(line, perLineChars)}`)
    .join('\n');

  while (sample.length > budget && perLineChars > 90) {
    perLineChars -= 20;
    sample = selected
      .map((line, index) => `Point ${index + 1}: ${compactTranscriptLine(line, perLineChars)}`)
      .join('\n');
  }

  if (sample.length <= budget) return sample;
  const clippedSample = sample.slice(0, budget);
  const lastLineBreak = clippedSample.lastIndexOf('\n');
  return lastLineBreak > 0 ? clippedSample.slice(0, lastLineBreak).trim() : clippedSample.trim();
}

function getTranscriptTimeRange(transcript) {
  const matches = [...String(transcript || '').matchAll(/⏱\s*(\d{1,2}:\d{2}(?::\d{2})?)/g)].map((m) => m[1]);
  if (!matches.length) return { start: '0:00', end: 'unknown' };
  return { start: matches[0], end: matches[matches.length - 1] };
}

function hasEndSummaryMarker(text) {
  return String(text || '').includes('[[END_SUMMARY]]');
}

function extractSelectedTimelinePoints(selectedTranscript) {
  const lines = String(selectedTranscript || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const points = [];
  const seenSeconds = new Set();

  for (const line of lines) {
    const match = line.match(/^Point\s+\d+:\s*(?:⏱\s*)?(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)$/i);
    if (!match) continue;

    const seconds = timestampToSeconds(match[1]);
    if (seenSeconds.has(seconds)) continue;
    seenSeconds.add(seconds);

    points.push({
      timestamp: match[1],
      seconds,
      text: cleanText(match[2])
    });
  }

  return points.sort((a, b) => a.seconds - b.seconds);
}

function stripBadLeadingTimestampAndNumbering(line) {
  return String(line || '')
    .replace(/^\s*(?:[-*•]\s*)?\d+[.)]\s*/g, '')
    .replace(/^\s*(?:⏱\s*)?\d{1,2}[.:]\d{1,2}(?:(?:[.:])\d{1,2})?\s*/g, '')
    .replace(/^\s*(?:⏱\s*)?\d{1,2}:\d{2}(?::\d{2})?\s*/g, '')
    .replace(/^\s*ID\s*\d+\s*[:.)-]\s*/i, '')
    .replace(/^\s*[-–—:]+\s*/g, '')
    .trim();
}

function extractStrictSummaryTimestamps(summaryText) {
  const matches = [...String(summaryText || '').matchAll(/(?:^|\n)\s*(?:[-*]\s*)?(?:⏱\s*)?(\d{1,2}:\d{2}(?::\d{2})?)\b/g)];
  return matches.map((match) => ({ timestamp: match[1], seconds: timestampToSeconds(match[1]) }));
}

function validateSummaryTimelineCoverage(summaryText, durationSeconds = 0) {
  const points = extractStrictSummaryTimestamps(summaryText);

  if (points.length < 3) {
    return { ok: false, reason: 'Too few valid timestamped points.' };
  }

  for (let index = 1; index < points.length; index += 1) {
    if (points[index].seconds < points[index - 1].seconds) {
      return { ok: false, reason: 'Timestamps are not in chronological order.' };
    }
  }

  if (durationSeconds >= 6 * 60) {
    const lastSecond = points[points.length - 1].seconds;
    const requiredCoverage = Math.max(60, Math.floor(durationSeconds * 0.72));
    if (lastSecond < requiredCoverage) {
      return { ok: false, reason: `Summary stopped too early at ${secondsToTimestamp(lastSecond)} instead of covering near ${secondsToTimestamp(durationSeconds)}.` };
    }
  }

  return { ok: true, reason: 'Timeline coverage is valid.' };
}

function createDeterministicFullCoverageSummary(selectedTranscript, summaryType = 'brief') {
  const points = extractSelectedTimelinePoints(selectedTranscript);

  if (!points.length) {
    return '⏱ 0:00 Summary could not be generated with valid timeline coverage. Please try again.';
  }

  if (summaryType === 'bullets') {
    return points
      .map((point) => `⏱ ${point.timestamp} ${clipTranscriptToCompleteSentence(point.text, 170)}`)
      .join('\n');
  }

  return points
    .map((point) => `⏱ ${point.timestamp} ${clipTranscriptToCompleteSentence(point.text, 260)} This part is included in correct video order to preserve full timeline coverage.`)
    .join('\n\n');
}

function parseAiIdSummaries(aiText) {
  const idSummaryMap = new Map();
  const lines = String(aiText || '')
    .replace(/\[\[END_SUMMARY\]\]/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  lines.forEach((line) => {
    const match = line.match(/^ID\s*(\d+)\s*[:.)-]\s*(.+)$/i);
    if (!match) return;

    const id = Number(match[1]);
    const cleaned = stripBadLeadingTimestampAndNumbering(match[2]);
    if (id && cleaned.length > 10) {
      idSummaryMap.set(id, cleaned);
    }
  });

  return idSummaryMap;
}

async function generateCompleteSummaryWithRetry(basePrompt, targetLanguage, isBullets, pointCount) {
  const systemMessage = isBullets
    ? 'You are a reliable video summarizer. Create only the most important timestamped points. Paraphrase clearly. Never copy transcript wording directly. Never stop mid-sentence.'
    : 'You are a reliable video summarizer. Create timestamped paragraph-style summary points only. Give more useful information from the video, paraphrase clearly, never copy transcript wording directly, and never stop mid-sentence.';

  const firstRaw = await generateText({
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: basePrompt }
    ],
    temperature: 0.08,
    maxTokens: isBullets ? 950 : SUMMARY_MAX_TOKENS
  });

  if (hasEndSummaryMarker(firstRaw)) {
    const firstCleaned = finalizeSummarySentences(cleanDuplicateTimestampsInSummary(removeSummaryMarkers(firstRaw)));
    if (firstCleaned && !hasBrokenSummarySentences(firstCleaned)) return firstCleaned;
    console.log('[Summary] First output had incomplete lines. Retrying with stricter complete-sentence format.');
  }

  console.log('[Summary] First output missed END marker or sentence validation. Retrying with shorter complete format.');

  const compactPrompt = `${basePrompt}\n\nRETRY FORMAT:\n- Return a shorter COMPLETE summary.\n- Use exactly ${Math.min(pointCount, isBullets ? 6 : 10)} timestamped ${isBullets ? 'bullets' : 'paragraph-style summary points'}.\n- Include the final/end timestamp.\n- Do not copy transcript wording.\n- Do not stop mid-sentence.\n- End with [[END_SUMMARY]].`;

  const secondRaw = await generateText({
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: compactPrompt }
    ],
    temperature: 0.05,
    maxTokens: isBullets ? 550 : 900
  });

  if (hasEndSummaryMarker(secondRaw)) {
    const secondCleaned = finalizeSummarySentences(cleanDuplicateTimestampsInSummary(removeSummaryMarkers(secondRaw)));
    if (secondCleaned && secondCleaned.length > 40) return secondCleaned;
  }

  const cleanedSecond = finalizeSummarySentences(cleanDuplicateTimestampsInSummary(removeSummaryMarkers(secondRaw)));
  if (cleanedSecond && cleanedSecond.length > 40) {
    return cleanedSecond;
  }

  const cleanedFirst = finalizeSummarySentences(cleanDuplicateTimestampsInSummary(removeSummaryMarkers(firstRaw)));
  if (cleanedFirst && cleanedFirst.length > 40) {
    return cleanedFirst;
  }

  throw new Error('Summary generation returned empty output. Please try again.');
}

async function summarizeWithTimestamps(transcript, language, summaryType) {
  const targetLanguage = languageDisplayName(language);
  const durationSeconds = estimateVideoDurationFromTranscript(transcript);
  const timeRange = getTranscriptTimeRange(transcript);
  const selectedTranscript = sampleTranscriptForFullCoverage(transcript, durationSeconds, summaryType);
  const timelinePoints = extractSelectedTimelinePoints(selectedTranscript);
  const isBullets = summaryType === 'bullets';

  console.log(`[Summary Stable V3] duration=${durationSeconds}s, range=${timeRange.start}-${timeRange.end}, timelinePoints=${timelinePoints.length}, inputChars=${selectedTranscript.length}`);

  if (!timelinePoints.length) {
    return createDeterministicFullCoverageSummary(selectedTranscript, summaryType);
  }

  const pointInput = timelinePoints
    .map((point, index) => `ID ${index + 1}: ${clipTranscriptToCompleteSentence(point.text, isBullets ? 260 : 380)}`)
    .join('\n');

  const prompt = `Output language: ${targetLanguage}

You are creating the text part of a full-video summary for a learning website.
The backend will add the timestamps later, so you must NOT write timestamps.

STRICT OUTPUT RULES:
- Return exactly ${timelinePoints.length} lines.
- Use this exact format only: ID 1: summary text
- Keep ID order from 1 to ${timelinePoints.length}.
- Do NOT write timestamps.
- Do NOT write bullet symbols, headings, tables, or numbering other than the ID label.
- Do NOT stop in the middle of a sentence.
- Do NOT copy transcript wording directly; explain the meaning clearly.
- Write clear student-friendly English.
${isBullets
  ? '- Each ID line should be one short but useful sentence.'
  : '- Each ID line should be 1 to 2 complete sentences with useful details for PPT and assessment generation.'}

Transcript timeline points from full video:
${pointInput}`;

  let aiText = '';

  try {
    aiText = await generateText({
      messages: [
        {
          role: 'system',
          content: 'You summarize transcript points for a learning platform. You never create timestamps. You strictly return ID lines only.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.04,
      maxTokens: isBullets ? 1200 : 2400
    });
  } catch (error) {
    console.warn('[Summary Stable V3] AI failed; using deterministic transcript timeline fallback:', error.message);
    return createDeterministicFullCoverageSummary(selectedTranscript, summaryType);
  }

  const idSummaryMap = parseAiIdSummaries(aiText);

  const finalLines = timelinePoints.map((point, index) => {
    const id = index + 1;
    const aiSummary = idSummaryMap.get(id);
    const fallbackSummary = clipTranscriptToCompleteSentence(point.text, isBullets ? 170 : 260);
    const cleanSummary = clipTranscriptToCompleteSentence(stripBadLeadingTimestampAndNumbering(aiSummary || fallbackSummary), isBullets ? 220 : 380);
    return `⏱ ${point.timestamp} ${cleanSummary}`;
  });

  const finalSummary = finalLines.join(isBullets ? '\n' : '\n\n');
  const timelineCheck = validateSummaryTimelineCoverage(finalSummary, durationSeconds);

  if (!timelineCheck.ok) {
    console.warn('[Summary Stable V3] Timeline validation failed:', timelineCheck.reason);
    return createDeterministicFullCoverageSummary(selectedTranscript, summaryType);
  }

  return finalSummary;
}

async function summarizePlainTextSafely(text, language) {
  const targetLanguage = languageDisplayName(language);
  const safeText = String(text || '').slice(0, SUMMARY_INPUT_CHARS);

  const raw = await generateText({
    messages: [
      {
        role: 'user',
        content: `Summarize this webpage in ${targetLanguage}. Keep it neat, detailed, brief, and student-friendly. Use **bold** only for important terms. End with [[END_SUMMARY]].\n\n${safeText}`
      }
    ],
    temperature: 0.1,
    maxTokens: SUMMARY_MAX_TOKENS
  });

  return finalizeSummarySentences(cleanDuplicateTimestampsInSummary(removeSummaryMarkers(raw)));
}

function getUrlFromRequest(req) {
  const body = req.body || {};
  const query = req.query || {};
  const headers = req.headers || {};

  const value =
    body.url ||
    body.content ||
    body.inputUrl ||
    body.link ||
    body.videoUrl ||
    body.websiteUrl ||
    query.url ||
    query.inputUrl ||
    headers['x-url'] ||
    '';

  return String(value).trim();
}


app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '');

    if (!cleanName || !cleanEmail || !cleanPassword) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const strongPassword = cleanPassword.length >= 8 && /[A-Z]/.test(cleanPassword) && /[0-9]/.test(cleanPassword) && /[^A-Za-z0-9]/.test(cleanPassword);
    if (!strongPassword) {
      return res.status(400).json({ error: 'Password must contain 8+ characters, one capital letter, one number, and one special symbol.' });
    }

    let createdUser;
    try {
      createdUser = await firebaseAuth.createUser({
        email: cleanEmail,
        password: cleanPassword,
        displayName: cleanName
      });
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        return res.status(409).json({ error: 'This email is already registered. Please login.' });
      }
      throw error;
    }

    const profile = {
      uid: createdUser.uid,
      name: cleanName,
      email: cleanEmail,
      role: 'user',
      provider: 'password',
      emailVerified: Boolean(createdUser.emailVerified),
      isLoggedIn: false,
      loginCount: 0,
      summariesGenerated: 0,
      questionsGenerated: 0,
      answersGenerated: 0,
      chatsSent: 0,
      createdAt: nowISO(),
      lastLoginAt: null
    };

    await usersCollection.doc(createdUser.uid).set(profile);
    await addActivity({ userId: createdUser.uid, type: 'register' });

    return res.json({
      ok: true,
      message: 'Account created successfully. Please login now.'
    });
  } catch (error) {
    console.error('[Firebase Register Error]', error);
    return res.status(500).json({ error: error.message });
  }
});


async function sendFirebasePasswordResetEmail(cleanEmail) {
  if (!FIREBASE_WEB_API_KEY) {
    throw new Error('Firebase web API key is missing. Add FIREBASE_WEB_API_KEY in server/.env.');
  }

  const authUser = await firebaseAuth.getUserByEmail(cleanEmail).catch(() => null);
  if (!authUser) {
    const notFound = new Error('No account found with this email.');
    notFound.statusCode = 404;
    throw notFound;
  }

  const providerIds = (authUser.providerData || []).map((provider) => provider.providerId);
  const hasPasswordProvider = providerIds.includes('password');

  if (!hasPasswordProvider) {
    const providerNames = providerIds.length ? providerIds.join(', ') : 'social login';
    const socialError = new Error(`This account uses ${providerNames}. Please sign in with that provider instead of resetting password.`);
    socialError.statusCode = 400;
    throw socialError;
  }

  await axios.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_WEB_API_KEY}`,
    {
      requestType: 'PASSWORD_RESET',
      email: cleanEmail
    },
    { timeout: 12000 }
  );

  return {
    ok: true,
    message: 'Password reset email sent. Please check Inbox, Spam, Promotions, or Updates.'
  };
}

app.post('/api/password-reset', async (req, res) => {
  try {
    const cleanEmail = String(req.body?.email || '').trim().toLowerCase();
    if (!cleanEmail) return res.status(400).json({ error: 'Email is required.' });

    const result = await sendFirebasePasswordResetEmail(cleanEmail);
    return res.json(result);
  } catch (error) {
    const firebaseMessage = error.response?.data?.error?.message || error.message;
    console.error('[Password Reset Error]', firebaseMessage);

    const cleanMessage =
      firebaseMessage === 'EMAIL_NOT_FOUND'
        ? 'No account found with this email.'
        : firebaseMessage === 'INVALID_EMAIL'
          ? 'Invalid email address.'
          : firebaseMessage === 'PASSWORD_LOGIN_DISABLED'
            ? 'Email/Password login is disabled in Firebase Authentication.'
            : firebaseMessage;

    return res.status(error.statusCode || 400).json({ error: cleanMessage });
  }
});

// Alias route: both names work from frontend/testing.
app.post('/api/forgot-password', async (req, res) => {
  try {
    const cleanEmail = String(req.body?.email || '').trim().toLowerCase();
    if (!cleanEmail) return res.status(400).json({ error: 'Email is required.' });

    const result = await sendFirebasePasswordResetEmail(cleanEmail);
    return res.json(result);
  } catch (error) {
    const firebaseMessage = error.response?.data?.error?.message || error.message;
    console.error('[Forgot Password Error]', firebaseMessage);
    return res.status(error.statusCode || 400).json({ error: firebaseMessage });
  }
});

app.post('/api/profile/update', async (req, res) => {
  try {
    const userId = String(req.body?.userId || '').trim();
    const cleanName = String(req.body?.name || '').trim();
    const photoURL = String(req.body?.photoURL || '').trim();

    if (!userId || !cleanName) return res.status(400).json({ error: 'User ID and name are required.' });

    // Keep photo payload small because it is stored in Firestore for local project/demo usage.
    if (photoURL && photoURL.length > 700000) {
      return res.status(413).json({ error: 'Profile photo is too large. Choose a smaller image.' });
    }

    const userDoc = await usersCollection.doc(userId).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found.' });

    // Firebase Auth photoURL expects a public URL, so uploaded local images are stored in Firestore instead.
    await firebaseAuth.updateUser(userId, { displayName: cleanName });

    const updatePayload = { name: cleanName, updatedAt: nowISO() };
    if (photoURL) updatePayload.photoURL = photoURL;

    await usersCollection.doc(userId).set(updatePayload, { merge: true });
    await addActivity({ userId, type: 'profile_updated' });

    const updatedDoc = await usersCollection.doc(userId).get();
    return res.json({ ok: true, user: safeUser({ id: updatedDoc.id, ...updatedDoc.data() }) });
  } catch (error) {
    console.error('[Profile Update Error]', error);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/account/delete', async (req, res) => {
  try {
    const userId = String(req.body?.userId || '').trim();
    if (!userId) return res.status(400).json({ error: 'User ID is required.' });

    const userDoc = await usersCollection.doc(userId).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found.' });

    const userData = userDoc.data() || {};
    if (userData.role === 'admin') {
      return res.status(403).json({ error: 'Admin accounts cannot be deleted from the user profile page.' });
    }

    const historySnapshot = await usersCollection.doc(userId).collection('summaryHistory').get();
    for (let i = 0; i < historySnapshot.docs.length; i += 400) {
      const batch = firestoreDb.batch();
      historySnapshot.docs.slice(i, i + 400).forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    await usersCollection.doc(userId).delete();
    await firebaseAuth.deleteUser(userId);
    await addActivity({ userId, type: 'account_deleted' });

    return res.json({ ok: true, message: 'Account deleted successfully.' });
  } catch (error) {
    console.error('[Account Delete Error]', error);
    return res.status(500).json({ error: error.message });
  }
});

async function handleFirebaseLogin(req, res, expectedRole) {
  try {
    const { email, password } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '');

    if (!cleanEmail || !cleanPassword) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const loginData = await signInWithFirebasePassword(cleanEmail, cleanPassword);
    const uid = loginData.localId;
    const userRecord = await firebaseAuth.getUser(uid);
    const ref = usersCollection.doc(uid);
    const doc = await ref.get();

    if (!doc.exists) {
      await ref.set({
        uid,
        name: userRecord.displayName || cleanEmail.split('@')[0],
        email: cleanEmail,
        role: 'user',
        provider: 'password',
        emailVerified: Boolean(userRecord.emailVerified),
        isLoggedIn: false,
        loginCount: 0,
        summariesGenerated: 0,
        questionsGenerated: 0,
        answersGenerated: 0,
        chatsSent: 0,
        createdAt: nowISO(),
        lastLoginAt: null
      });
    }

    const freshDoc = await ref.get();
    const profile = { id: freshDoc.id, ...freshDoc.data() };

    if (expectedRole === 'admin' && profile.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin accounts can login here.' });
    }

    if (expectedRole === 'user' && profile.role === 'admin') {
      return res.status(403).json({ error: 'Admin accounts must use the separate Admin Login page.' });
    }

    const loginCount = Number(profile.loginCount || 0) + 1;
    await ref.update({
      isLoggedIn: true,
      loginCount,
      lastLoginAt: nowISO(),
      emailVerified: Boolean(userRecord.emailVerified),
      updatedAt: nowISO()
    });

    await addActivity({ userId: uid, type: expectedRole === 'admin' ? 'admin_login' : 'login' });

    const updatedDoc = await ref.get();
    return res.json({ ok: true, user: safeUser({ id: updatedDoc.id, ...updatedDoc.data() }) });
  } catch (error) {
    console.error('[Firebase Login Error]', error.message);
    return res.status(401).json({ error: error.message || 'Invalid email or password.' });
  }
}


app.post('/api/social-login', async (req, res) => {
  try {
    const { idToken, provider, expectedRole, roleMode, authIntent } = req.body || {};
    const cleanToken = String(idToken || '').trim();
    const roleToCheck = expectedRole === 'admin' || roleMode === 'admin' ? 'admin' : 'user';
    const intent = ['signup', 'register'].includes(String(authIntent || '').toLowerCase()) ? 'signup' : 'signin';

    if (!cleanToken) {
      return res.status(400).json({ error: 'Firebase ID token is required.' });
    }

    const decoded = await firebaseAuth.verifyIdToken(cleanToken);
    const uid = decoded.uid;
    const userRecord = await firebaseAuth.getUser(uid);
    const email = String(userRecord.email || decoded.email || '').toLowerCase();
    const name = userRecord.displayName || decoded.name || email.split('@')[0] || 'Brief Bot User';
    const providerName = provider || decoded.firebase?.sign_in_provider || 'google';

    if (!email) {
      return res.status(400).json({ error: 'Your Google account did not provide an email address.' });
    }

    const ref = usersCollection.doc(uid);
    let docRef = ref;
    let doc = await docRef.get();

    if (!doc.exists) {
      const existingEmailSnapshot = await usersCollection.where('email', '==', email).limit(1).get();
      if (!existingEmailSnapshot.empty) {
        doc = existingEmailSnapshot.docs[0];
        docRef = doc.ref;
      }
    }

    if (!doc.exists && intent !== 'signup') {
      return res.status(404).json({
        error: '⚠️ This Google account is not registered. Please sign up first, then use Google Sign In.',
        requiresSignup: true
      });
    }

    if (doc.exists && intent === 'signup') {
      return res.status(409).json({
        error: '✅ This Google account is already registered. Please use Sign In with Google.',
        alreadyRegistered: true
      });
    }

    if (!doc.exists && intent === 'signup') {
      await docRef.set({
        uid,
        name,
        email,
        role: 'user',
        provider: providerName,
        authProvider: providerName,
        emailVerified: Boolean(userRecord.emailVerified || decoded.email_verified),
        photoURL: userRecord.photoURL || decoded.picture || '',
        isLoggedIn: false,
        loginCount: 0,
        summariesGenerated: 0,
        questionsGenerated: 0,
        answersGenerated: 0,
        chatsSent: 0,
        assessmentsAttempted: 0,
        pptsGenerated: 0,
        createdAt: nowISO(),
        lastLoginAt: null,
        updatedAt: nowISO()
      });
    } else {
      await docRef.set({
        googleUid: uid,
        name: doc.data()?.name || name,
        email,
        provider: providerName,
        authProvider: providerName,
        emailVerified: Boolean(userRecord.emailVerified || decoded.email_verified),
        photoURL: doc.data()?.photoURL || userRecord.photoURL || decoded.picture || '',
        updatedAt: nowISO()
      }, { merge: true });
    }

    const freshDoc = await docRef.get();
    const profile = { id: freshDoc.id, ...freshDoc.data() };

    if (roleToCheck === 'admin' && profile.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin accounts can login here.' });
    }

    if (roleToCheck === 'user' && profile.role === 'admin') {
      return res.status(403).json({ error: 'Admin accounts must use the separate Admin Login page.' });
    }

    const loginCount = Number(profile.loginCount || 0) + 1;
    await docRef.update({
      isLoggedIn: true,
      loginCount,
      lastLoginAt: nowISO(),
      updatedAt: nowISO()
    });

    await addActivity({
      userId: freshDoc.id,
      type: roleToCheck === 'admin' ? 'admin_social_login' : intent === 'signup' ? 'social_signup' : 'social_login',
      meta: { provider: providerName }
    });

    const updatedDoc = await docRef.get();
    return res.json({
      ok: true,
      accountCreated: intent === 'signup',
      user: safeUser({ id: updatedDoc.id, ...updatedDoc.data() })
    });
  } catch (error) {
    console.error('[Firebase Social Login Error]', error.message);
    return res.status(401).json({ error: error.message || 'Google sign in failed.' });
  }
});

app.post('/api/login', async (req, res) => {
  return handleFirebaseLogin(req, res, 'user');
});

app.post('/api/admin/login', async (req, res) => {
  return handleFirebaseLogin(req, res, 'admin');
});

app.post('/api/logout', async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (userId) {
      await usersCollection.doc(String(userId)).update({ isLoggedIn: false, loggedOutAt: nowISO(), updatedAt: nowISO() });
      await addActivity({ userId, type: 'logout' });
    }
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/user/activity', async (req, res) => {
  try {
    const { userId, activityType, ...meta } = req.body || {};
    if (!userId || !activityType) {
      return res.status(400).json({ error: 'userId and activityType are required.' });
    }

    let updatedUser = null;
    if (activityType === 'summary_generated') updatedUser = await incrementUserActivityCount(userId, 'summariesGenerated');
    if (activityType === 'questions_generated') updatedUser = await incrementUserActivityCount(userId, 'questionsGenerated');
    if (activityType === 'answers_generated') updatedUser = await incrementUserActivityCount(userId, 'answersGenerated');
    if (activityType === 'chat_message') updatedUser = await incrementUserActivityCount(userId, 'chatsSent');

    await addActivity({ userId, type: activityType, meta });
    return res.json({ ok: true, user: updatedUser });
  } catch (error) {
    console.error('[Activity Error]', error);
    return res.status(500).json({ error: error.message });
  }
});

async function listAllFirebaseAuthUsers() {
  const allUsers = [];
  let nextPageToken;

  do {
    const result = await firebaseAuth.listUsers(1000, nextPageToken);
    allUsers.push(...result.users);
    nextPageToken = result.pageToken;
  } while (nextPageToken);

  return allUsers;
}


app.post('/api/history/save', async (req, res) => {
  try {
    const { userId, url, summary, language, summaryType, title, description } = req.body || {};
    const savedItem = await saveSummaryHistoryToFirebase({
      userId,
      url,
      summary,
      language,
      summaryType,
      title,
      description
    });

    return res.json({ ok: true, historyItem: savedItem });
  } catch (error) {
    console.error('[Summary History Save Error]', error);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/history/:userId', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    const userId = String(req.params.userId || '').trim();
    if (!userId) return res.status(400).json({ error: 'userId is required.' });

    const userDoc = await usersCollection.doc(userId).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found. Please login again.' });

    const snapshot = await usersCollection
      .doc(userId)
      .collection('summaryHistory')
      .orderBy('updatedAt', 'desc')
      .limit(20)
      .get();

    const history = snapshot.docs.map((doc) => safeHistoryItem(doc));
    return res.json({ ok: true, history });
  } catch (error) {
    console.error('[Summary History Fetch Error]', error);
    return res.status(500).json({ error: error.message });
  }
});

app.delete('/api/history/:userId/:historyId', async (req, res) => {
  try {
    const userId = String(req.params.userId || '').trim();
    const historyId = String(req.params.historyId || '').trim();
    if (!userId || !historyId) return res.status(400).json({ error: 'userId and historyId are required.' });

    await usersCollection.doc(userId).collection('summaryHistory').doc(historyId).delete();
    await addActivity({ userId, type: 'summary_history_deleted', meta: { historyId } });
    return res.json({ ok: true });
  } catch (error) {
    console.error('[Summary History Delete Error]', error);
    return res.status(500).json({ error: error.message });
  }
});

app.delete('/api/history/:userId', async (req, res) => {
  try {
    const userId = String(req.params.userId || '').trim();
    if (!userId) return res.status(400).json({ error: 'userId is required.' });

    const snapshot = await usersCollection.doc(userId).collection('summaryHistory').get();
    for (let i = 0; i < snapshot.docs.length; i += 400) {
      const batch = firestoreDb.batch();
      snapshot.docs.slice(i, i + 400).forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    await addActivity({ userId, type: 'summary_history_cleared' });
    return res.json({ ok: true });
  } catch (error) {
    console.error('[Summary History Clear Error]', error);
    return res.status(500).json({ error: error.message });
  }
});


function getQuestionTypeLabel(questionType) {
  if (questionType === 'fill_blank') return 'Fill in the Blanks';
  if (questionType === 'descriptive') return 'Descriptive';
  if (questionType === 'sjt') return 'Situational Judgment Test';
  if (questionType === 'mixed') return 'Mixed Questions';
  return 'MCQs';
}

function cleanJsonText(text) {
  return String(text || '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
}

function extractJsonArray(text) {
  const cleaned = cleanJsonText(text);
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.questions)) return parsed.questions;
  } catch {}

  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start !== -1 && end !== -1 && end > start) {
    const sliced = cleaned.slice(start, end + 1);
    const parsed = JSON.parse(sliced);
    if (Array.isArray(parsed)) return parsed;
  }
  throw new Error('AI did not return valid JSON questions. Please try again.');
}

function normalizeAnswer(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateRemarks(percentage) {
  if (percentage >= 90) return 'Excellent performance';
  if (percentage >= 75) return 'Great job';
  if (percentage >= 60) return 'Good understanding';
  if (percentage >= 40) return 'Needs more practice';
  return 'Revise the summary and try again';
}

function getAchievementBadge(percentage, timeTakenSeconds) {
  if (percentage === 100) return 'Perfect Score';
  if (percentage >= 90 && timeTakenSeconds <= 15 * 60) return 'Fast Finisher';
  if (percentage >= 80) return 'Smart Scorer';
  if (percentage >= 60) return 'Quick Learner';
  return 'Assessment Starter';
}

function ensureSentence(value, fallback = '') {
  let text = String(value || fallback || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/^[A-D][).]\s*/i, '')
    .trim();

  if (!text) text = String(fallback || '').trim();
  if (!text) text = 'Choose the most accurate answer based on the summary.';

  const lastChar = text[text.length - 1];
  if (!/[.!?]$/.test(lastChar)) text += '.';

  return text;
}

function limitToCompleteSentence(value, maxChars = 260, fallback = '') {
  let text = ensureSentence(value, fallback);

  if (text.length <= maxChars) return text;

  const clipped = text.slice(0, maxChars);
  const sentenceEnd = Math.max(clipped.lastIndexOf('.'), clipped.lastIndexOf('?'), clipped.lastIndexOf('!'));

  if (sentenceEnd >= 70) {
    return clipped.slice(0, sentenceEnd + 1).trim();
  }

  const commaEnd = clipped.lastIndexOf(',');
  if (commaEnd >= 90) {
    return ensureSentence(clipped.slice(0, commaEnd));
  }

  const safeWords = clipped.split(/\s+/).slice(0, -1).join(' ').trim();
  return ensureSentence(safeWords);
}

function makeShortOption(value, fallback = '') {
  let text = String(value || fallback || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/^[A-D][).]\s*/i, '')
    .trim();

  if (!text) text = String(fallback || 'Correct concept').trim();

  // Convert long explanations into short answer-style options.
  text = text
    .replace(/^the\s+/i, '')
    .replace(/^it\s+means\s+/i, '')
    .replace(/^this\s+means\s+/i, '')
    .replace(/^because\s+/i, '')
    .trim();

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length > 9) {
    text = words.slice(0, 9).join(' ');
  }

  text = text.replace(/[,:;]$/, '').trim();
  if (!/[.!?]$/.test(text)) text += '.';
  return text;
}

function optionSimilarityKey(value) {
  return normalizeAnswer(value)
    .split(' ')
    .filter(Boolean)
    .slice(0, 6)
    .join(' ');
}

function buildDistinctShortOptions(rawOptions = [], correctAnswer = '', index = 0) {
  const fallbackOptions = [
    'Use the main concept correctly.',
    'Ignore the main evidence.',
    'Focus on a minor detail.',
    'Choose without proper checking.',
    'Delay the decision unnecessarily.',
    'Misunderstand the core point.'
  ];

  const candidates = [];
  if (correctAnswer) candidates.push(correctAnswer);
  rawOptions.forEach((option) => candidates.push(option));
  fallbackOptions.forEach((option) => candidates.push(option));

  const seen = new Set();
  const result = [];

  for (const candidate of candidates) {
    if (result.length >= 4) break;
    const cleaned = makeShortOption(candidate, fallbackOptions[result.length] || `Option ${result.length + 1}.`);
    if (isBrokenSentence(cleaned)) continue;
    const key = optionSimilarityKey(cleaned);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
  }

  while (result.length < 4) {
    const fallback = makeShortOption(fallbackOptions[result.length] || `Different option ${result.length + 1}.`);
    const key = optionSimilarityKey(fallback);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(fallback);
    } else {
      result.push(`Different option ${result.length + 1}.`);
    }
  }

  return result.slice(0, 4);
}

function seededHash(value) {
  let hash = 2166136261;
  const text = String(value || '');
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function shuffleOptionsKeepAnswer(options = [], correctAnswer = '', seedText = '') {
  const list = [...options].filter(Boolean);
  if (list.length <= 1) return list;

  let seed = seededHash(`${seedText}|${correctAnswer}|${list.join('|')}`);

  for (let i = list.length - 1; i > 0; i -= 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }

  // Avoid correct answer staying at A for most questions.
  const correctIndex = list.findIndex((option) => normalizeAnswer(option) === normalizeAnswer(correctAnswer));
  if (correctIndex === 0 && list.length > 1) {
    const swapIndex = (seed % (list.length - 1)) + 1;
    [list[0], list[swapIndex]] = [list[swapIndex], list[0]];
  }

  return list;
}

function shuffleQuestionOptions(question, index = 0) {
  if (!question || !Array.isArray(question.options) || !(question.type === 'mcq' || question.type === 'sjt')) {
    return question;
  }

  const shuffledOptions = shuffleOptionsKeepAnswer(question.options, question.correctAnswer, `${question.question || ''}|${index}`);
  return {
    ...question,
    options: shuffledOptions,
    correctAnswer: shuffledOptions.find((option) => normalizeAnswer(option) === normalizeAnswer(question.correctAnswer)) || question.correctAnswer
  };
}



function isBrokenSentence(value) {
  const text = String(value || '').trim();
  if (!text) return true;
  if (text.length < 12) return true;
  if (/\b(and|or|but|because|when|while|with|to|of|for|from|by|as)$/i.test(text)) return true;
  return !/[.!?]$/.test(text);
}

function buildQuestionFallback(index, type = 'mcq') {
  if (type === 'fill_blank') {
    return `Fill in the blank with the most important concept from the summary for question ${index + 1}: ____.`;
  }
  if (type === 'descriptive') {
    return `Explain the most important learning point from the summary for question ${index + 1}.`;
  }
  if (type === 'sjt') {
    return `Situation: You must apply one important idea from the summary in a real task. What is the best response?`;
  }
  return `Which option best represents an important learning point from the summary for question ${index + 1}?`;
}

function buildOptionFallback(index, optionIndex) {
  const fallbacks = [
    `Apply the main idea carefully using the evidence given in the summary.`,
    `Ignore the explanation and choose an answer without checking the summary.`,
    `Focus only on a small detail and miss the main concept explained in the content.`,
    `Delay the decision without connecting it to the learning point from the summary.`
  ];
  return fallbacks[optionIndex] || `Related option ${optionIndex + 1} for question ${index + 1}.`;
}

function sanitizeQuestion(raw, index, questionType) {
  const type = raw.type || questionType || 'mcq';
  const id = raw.id || `q${index + 1}`;

  const base = {
    id,
    type,
    question: limitToCompleteSentence(raw.question || raw.prompt, 280, buildQuestionFallback(index, type)),
    correctAnswer: limitToCompleteSentence(raw.correctAnswer || raw.answer, 220, ''),
    explanation: limitToCompleteSentence(raw.explanation || '', 260, ''),
    keyPoints: Array.isArray(raw.keyPoints) ? raw.keyPoints.map((point) => limitToCompleteSentence(point, 120)).filter(Boolean) : []
  };

  if (type === 'mcq' || type === 'sjt') {
    const rawOptions = Array.isArray(raw.options) ? raw.options : [];
    const shortCorrect = makeShortOption(base.correctAnswer || rawOptions[0] || buildOptionFallback(index, 0), buildOptionFallback(index, 0));

    base.options = buildDistinctShortOptions(rawOptions, shortCorrect, index);
    base.correctAnswer = base.options.find((option) => normalizeAnswer(option) === normalizeAnswer(shortCorrect)) || base.options[0];

    // Final safety: short, complete, distinct options only.
    base.options = buildDistinctShortOptions(base.options, base.correctAnswer, index);
    if (!base.options.some((option) => normalizeAnswer(option) === normalizeAnswer(base.correctAnswer))) {
      base.correctAnswer = base.options[0];
    }
  }

  if (type === 'fill_blank') {
    if (!base.question.includes('____')) {
      base.question = `${base.question.replace(/[.!?]$/, '')} ____.`;
    }
    base.correctAnswer = String(raw.correctAnswer || raw.answer || 'key concept').replace(/[.!?]$/, '').trim();
  }

  if (type === 'descriptive' && !base.keyPoints.length && base.correctAnswer) {
    base.keyPoints = base.correctAnswer.split(/[,.;]/).map((value) => limitToCompleteSentence(value.trim(), 120)).filter(Boolean).slice(0, 5);
  }

  return base;
}

function removeTimestampsFromText(value) {
  return String(value || '')
    .replace(/⏱\s*/g, '')
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasTimestampText(value) {
  return /⏱|\b\d{1,2}:\d{2}(?::\d{2})?\b/.test(String(value || ''));
}

function isMeaninglessOption(value) {
  const text = removeTimestampsFromText(value).replace(/[.!?]$/, '').trim();
  const normalized = normalizeAnswer(text);
  if (!normalized || normalized.length < 4) return true;
  if (/^(option|answer|choice)\s*\d*$/i.test(text)) return true;
  if (/^(yes|no|true|false|none|all|both)$/i.test(text)) return true;
  if (normalized.split(' ').length > 9) return true;
  if (/\b(and|or|but|because|when|while|with|to|of|for|from|by|as|including|like|where|which|that)$/i.test(text)) return true;
  return false;
}

function extractTopicPhrase(text, fallback = 'main concept') {
  let clean = removeTimestampsFromText(text)
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = clean
    .split(/\s+/)
    .filter((word) => word.length > 3 && !/^(this|that|with|from|into|about|what|when|where|which|their|there|these|those|using|based|summary|content|question|option|answer)$/i.test(word));

  return words.slice(0, 4).join(' ') || fallback;
}

function makeShortCleanOption(value, fallback = 'Main concept') {
  let text = removeTimestampsFromText(value || fallback)
    .replace(/^[A-D][).]\s*/i, '')
    .replace(/^(the|this|it)\s+(means|refers to|is)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) text = fallback;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length > 7) text = words.slice(0, 7).join(' ');
  text = text.replace(/[,:;]$/, '').trim();
  if (!/[.!?]$/.test(text)) text += '.';
  return text;
}

function buildSafeMcqFromSummary(summary, index, rawQuestion = {}) {
  const topics = typeof getAssessmentTopics === 'function' ? getAssessmentTopics(summary, 30) : [];
  const topicItem = topics[index % Math.max(1, topics.length)] || {};
  const topic = extractTopicPhrase(rawQuestion.question || topicItem.topic || topicItem.evidence || summary, `concept ${index + 1}`);

  const correct = makeShortCleanOption(topic, `Concept ${index + 1}`);
  const options = buildDistinctShortOptions(
    [correct, 'Unrelated minor detail.', 'Unsupported assumption.', 'Incorrect interpretation.', 'Missing key point.', 'Random example.'],
    correct,
    index
  );

  return {
    id: `q${index + 1}`,
    type: 'mcq',
    question: `Which option best matches the idea of ${topic}?`,
    options,
    correctAnswer: options.find((option) => normalizeAnswer(option) === normalizeAnswer(correct)) || options[0],
    explanation: `The correct option matches the main idea of ${topic}.`,
    keyPoints: []
  };
}

function validateAssessmentQuestionQuality(question, index, summary = '') {
  const type = question.type || 'mcq';
  const cleanQuestion = removeTimestampsFromText(question.question || '');

  if (!cleanQuestion || cleanQuestion.length < 20 || isBrokenSentence(cleanQuestion) || hasTimestampText(question.question)) {
    return { ok: false, reason: 'bad_question' };
  }

  if (type === 'mcq' || type === 'sjt') {
    const options = Array.isArray(question.options) ? question.options : [];
    if (options.length !== 4) return { ok: false, reason: 'option_count' };

    const normalizedOptions = options.map((option) => normalizeAnswer(removeTimestampsFromText(option)));
    const uniqueOptions = new Set(normalizedOptions);

    if (uniqueOptions.size < 4) return { ok: false, reason: 'duplicate_options' };
    if (options.some((option) => hasTimestampText(option) || isMeaninglessOption(option) || isBrokenSentence(option))) {
      return { ok: false, reason: 'bad_options' };
    }

    if (!question.correctAnswer || hasTimestampText(question.correctAnswer)) return { ok: false, reason: 'bad_answer' };
    const normalizedCorrect = normalizeAnswer(removeTimestampsFromText(question.correctAnswer));
    if (!normalizedOptions.includes(normalizedCorrect)) return { ok: false, reason: 'answer_not_in_options' };
  }

  return { ok: true };
}

function repairAssessmentQuestion(question, index, questionType, summary) {
  const type = questionType === 'mixed'
    ? (question.type || (index % 3 === 0 ? 'mcq' : index % 3 === 1 ? 'fill_blank' : 'descriptive'))
    : questionType;

  const cleaned = sanitizeQuestion({
    ...question,
    type,
    question: removeTimestampsFromText(question.question || ''),
    correctAnswer: removeTimestampsFromText(question.correctAnswer || ''),
    answer: removeTimestampsFromText(question.answer || ''),
    options: Array.isArray(question.options) ? question.options.map(removeTimestampsFromText) : []
  }, index, type);

  const validation = validateAssessmentQuestionQuality(cleaned, index, summary);
  if (validation.ok) return cleaned;

  if (type === 'mcq' || type === 'sjt') {
    return buildSafeMcqFromSummary(summary, index, cleaned);
  }

  return createFallbackAssessmentQuestion(summary, type, index);
}

function qualityGuardAssessmentQuestions(questions, summary, questionType, targetCount) {
  const guarded = [];
  const seenQuestionKeys = new Set();

  for (let index = 0; index < targetCount; index += 1) {
    const raw = questions[index] || {};
    let fixed = repairAssessmentQuestion(raw, index, questionType, summary);
    let questionKey = normalizeAnswer(removeTimestampsFromText(fixed.question || '')).slice(0, 90);

    if (!questionKey || seenQuestionKeys.has(questionKey)) {
      fixed = questionType === 'mcq' || questionType === 'sjt' || questionType === 'mixed'
        ? buildSafeMcqFromSummary(summary, index + guarded.length, raw)
        : createFallbackAssessmentQuestion(summary, questionType, index);
      questionKey = normalizeAnswer(removeTimestampsFromText(fixed.question || '')).slice(0, 90);
    }

    seenQuestionKeys.add(questionKey);
    guarded.push(shuffleQuestionOptions({ ...fixed, id: `q${index + 1}` }, index));
  }

  return guarded.slice(0, targetCount);
}



function cleanCompleteSentence(value, fallback = '') {
  let text = String(value || fallback || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();

  text = text.replace(/^[A-D][).]\s*/i, '').trim();

  if (text.length < 18) text = String(fallback || text).trim();
  if (!text) text = 'Review the summary carefully and choose the most accurate answer.';

  const last = text[text.length - 1];
  if (!/[.!?]$/.test(last)) text += '.';

  return text;
}

function trimToCompleteSentence(value, maxChars = 190) {
  let text = cleanCompleteSentence(value);
  if (text.length <= maxChars) return text;

  const clipped = text.slice(0, maxChars);
  const lastStop = Math.max(clipped.lastIndexOf('.'), clipped.lastIndexOf('?'), clipped.lastIndexOf('!'));
  if (lastStop >= 60) return clipped.slice(0, lastStop + 1).trim();

  const lastComma = clipped.lastIndexOf(',');
  if (lastComma >= 80) return `${clipped.slice(0, lastComma).trim()}.`;

  const words = clipped.split(/\s+/).slice(0, -1).join(' ').trim();
  return cleanCompleteSentence(words);
}

function makeBossQuestionFromTopic(topic, index) {
  const evidence = cleanCompleteSentence(topic?.evidence || topic?.topic || 'the main concept from the summary');
  const topicName = cleanCompleteSentence(topic?.topic || `concept ${index + 1}`).replace(/[.!?]$/, '');
  const answer = trimToCompleteSentence(`Apply the key idea correctly by focusing on ${topicName} and using the evidence from the summary.`, 150);
  const option2 = trimToCompleteSentence(`Ignore the main evidence and choose an action without checking the actual explanation.`, 150);
  const option3 = trimToCompleteSentence(`Focus only on a minor detail and avoid the main learning point described in the summary.`, 150);
  const option4 = trimToCompleteSentence(`Delay the decision without connecting the situation to the concept explained in the content.`, 150);

  const options = [answer, option2, option3, option4];
  const rotation = index % 4;
  const rotated = [...options.slice(rotation), ...options.slice(0, rotation)];

  return {
    id: `boss_q${index + 1}`,
    type: 'mcq',
    question: trimToCompleteSentence(`Boss Challenge ${index + 1}: Based on the summary, which option best explains how to handle the concept of ${topicName}?`, 190),
    options: rotated,
    correctAnswer: answer,
    explanation: trimToCompleteSentence(evidence, 220)
  };
}

function strengthenBossQuestions(rawQuestions = [], summary = '') {
  const topics = getAssessmentTopics(summary, 5);
  const fixed = [];

  for (let index = 0; index < 5; index += 1) {
    const fallback = makeBossQuestionFromTopic(topics[index] || topics[0] || {}, index);
    const raw = rawQuestions[index] || {};
    let question = cleanCompleteSentence(raw.question || fallback.question, fallback.question);
    question = trimToCompleteSentence(question, 220);

    let options = Array.isArray(raw.options)
      ? raw.options.map((option) => trimToCompleteSentence(option, 170)).filter((option) => option.length >= 18)
      : [];

    let correctAnswer = trimToCompleteSentence(raw.correctAnswer || raw.answer || fallback.correctAnswer, 170);

    if (!options.some((option) => normalizeAnswer(option) === normalizeAnswer(correctAnswer))) {
      options.unshift(correctAnswer);
    }

    for (const fallbackOption of fallback.options) {
      if (options.length >= 4) break;
      const cleaned = trimToCompleteSentence(fallbackOption, 170);
      if (!options.some((option) => normalizeAnswer(option) === normalizeAnswer(cleaned))) {
        options.push(cleaned);
      }
    }

    options = options.slice(0, 4);
    if (!options.some((option) => normalizeAnswer(option) === normalizeAnswer(correctAnswer))) {
      correctAnswer = options[0];
    }

    fixed.push({
      id: `boss_q${index + 1}`,
      type: 'mcq',
      question,
      options,
      correctAnswer,
      explanation: trimToCompleteSentence(raw.explanation || fallback.explanation || correctAnswer, 220)
    });
  }

  return fixed;
}




const ASSESSMENT_STOP_WORDS = new Set([
  'the','and','for','that','this','with','from','into','about','video','summary','explains','speaker','creator','viewer','viewers','subscribe','channel','like','share','comment','part','topic','important','because','their','there','which','what','when','where','while','using','used','uses','will','can','could','should','would','also','then','than','them','they','were','been','being','have','has','had','are','was','is','to','of','in','on','by','as','an','a'
]);

function splitSummaryIntoLearningSentences(summary) {
  const raw = String(summary || '')
    .replace(/⏱\s*\d{1,2}:\d{2}(?::\d{2})?/g, '. ')
    .replace(/[#*•]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const pieces = raw
    .split(/(?<=[.!?])\s+|\n+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 45)
    .filter((item) => {
      const lower = item.toLowerCase();
      return !lower.includes('subscribe') &&
        !lower.includes('like and share') &&
        !lower.includes('comment') &&
        !lower.includes('greeting') &&
        !lower.includes('welcome back') &&
        !lower.includes('this video is about') &&
        !lower.includes('the video opens');
    });

  const seen = new Set();
  const unique = [];
  for (const piece of pieces) {
    const key = normalizeAnswer(piece).slice(0, 100);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(piece);
  }

  return unique;
}

function extractKeywords(sentence, max = 5) {
  return String(sentence || '')
    .replace(/[^A-Za-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 4)
    .filter((word) => !ASSESSMENT_STOP_WORDS.has(word.toLowerCase()))
    .slice(0, max);
}

function makeShortAnswerFromSentence(sentence, maxWords = 13) {
  const clean = String(sentence || '').replace(/\s+/g, ' ').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return clean.replace(/[.!?]+$/, '');
  return `${words.slice(0, maxWords).join(' ')}`.replace(/[.!?]+$/, '');
}

function getAssessmentTopics(summary, count = 20) {
  const sentences = splitSummaryIntoLearningSentences(summary);
  const source = sentences.length ? sentences : [String(summary || '').slice(0, 300).trim() || 'the main concept explained in the summary'];

  const scored = source.map((sentence, idx) => {
    const keywords = extractKeywords(sentence, 8);
    const score = keywords.length * 2 + Math.min(sentence.length / 120, 3) + (idx < 3 ? 1 : 0);
    return { sentence, keywords, score, idx };
  }).sort((a, b) => b.score - a.score || a.idx - b.idx);

  const selected = [];
  const seen = new Set();
  for (const item of scored) {
    const key = item.keywords.slice(0, 3).join(' ').toLowerCase() || normalizeAnswer(item.sentence).slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push(item);
    if (selected.length >= count) break;
  }

  // If summary has fewer unique points, create subtopic cards from the best sentences without repeating exact questions.
  let cursor = 0;
  while (selected.length < count && source.length) {
    const sentence = source[cursor % source.length];
    const keywords = extractKeywords(sentence, 8);
    selected.push({ sentence, keywords, score: 0, idx: cursor, variant: selected.length });
    cursor += 1;
  }

  return selected.slice(0, count).map((item, idx) => {
    const keywords = item.keywords.length ? item.keywords : [`concept ${idx + 1}`];
    const topic = keywords.slice(0, 4).join(' ');
    return {
      number: idx + 1,
      topic,
      keywords,
      evidence: item.sentence,
      answer: makeShortAnswerFromSentence(item.sentence, 16)
    };
  });
}

function getSummarySeeds(summary, count = 20) {
  return getAssessmentTopics(summary, count).map((topic) => topic.evidence);
}

function createFallbackAssessmentQuestion(summary, questionType, index) {
  const effectiveType = questionType === 'mixed'
    ? (index % 3 === 0 ? 'mcq' : index % 3 === 1 ? 'fill_blank' : 'descriptive')
    : questionType;

  const topics = getAssessmentTopics(summary, 20);
  const topic = topics[index % topics.length] || { topic: `concept ${index + 1}`, evidence: 'main concept from the summary', answer: 'main concept' };
  const otherTopics = topics.filter((_, i) => i !== index).map((item) => item.answer).filter(Boolean);
  const cleanTopic = topic.topic || `concept ${index + 1}`;
  const cleanEvidence = String(topic.evidence || '').replace(/\s+/g, ' ').trim();
  const correct = makeShortAnswerFromSentence(topic.answer || cleanEvidence, 14);

  const templates = [
    `What is the key idea related to ${cleanTopic}?`,
    `Why is ${cleanTopic} important in the video?`,
    `Which statement best explains ${cleanTopic}?`,
    `What does the video mainly teach about ${cleanTopic}?`,
    `Which point correctly matches the explanation of ${cleanTopic}?`
  ];

  if (effectiveType === 'fill_blank') {
    const blankTerm = topic.keywords?.[0] || cleanTopic.split(' ')[0] || 'concept';
    return sanitizeQuestion({
      type: 'fill_blank',
      question: `Fill in the blank: The video highlights ____ as an important part of ${cleanTopic}.`,
      correctAnswer: blankTerm
    }, index, 'fill_blank');
  }

  if (effectiveType === 'descriptive') {
    return sanitizeQuestion({
      type: 'descriptive',
      question: `Explain the importance of ${cleanTopic} based on the video.`,
      correctAnswer: cleanEvidence,
      keyPoints: topic.keywords?.slice(0, 5) || []
    }, index, 'descriptive');
  }

  if (effectiveType === 'sjt') {
    const bestAction = `Use ${cleanTopic} carefully based on the main explanation and choose the responsible next step.`;
    return sanitizeQuestion({
      type: 'sjt',
      question: `Situation: You are applying the concept of ${cleanTopic} in a real task. Which response is the best judgment based on the summary?`,
      options: [
        bestAction,
        'Ignore the main concept and continue without checking the result.',
        'Choose a random action without understanding the situation.',
        'Delay the task and avoid taking any responsible decision.'
      ],
      correctAnswer: bestAction,
      explanation: cleanEvidence
    }, index, 'sjt');
  }

  const distractorPool = [
    ...otherTopics,
    'Only changing the visual design without addressing the concept',
    'Ignoring the main process explained in the video',
    'Repeating the introduction without applying the idea',
    'Treating the topic as unrelated to the lesson'
  ].filter((item) => normalizeAnswer(item) !== normalizeAnswer(correct));

  const options = [correct];
  for (const item of distractorPool) {
    if (options.length >= 4) break;
    const value = makeShortAnswerFromSentence(item, 14);
    if (value && !options.some((existing) => normalizeAnswer(existing) === normalizeAnswer(value))) options.push(value);
  }
  while (options.length < 4) options.push(`Related but incomplete idea ${options.length}`);

  // Deterministic rotation so the correct option is not always A.
  const rotation = index % 4;
  const rotated = [...options.slice(rotation), ...options.slice(0, rotation)].slice(0, 4);

  return sanitizeQuestion({
    type: 'mcq',
    question: templates[index % templates.length],
    options: rotated,
    correctAnswer: correct
  }, index, 'mcq');
}

async function generateAssessmentBatch({ summary, questionType, difficulty, language, batchNumber, batchSize, startIndex }) {
  const targetLanguage = languageDisplayName(language || 'English');
  const typeLabel = getQuestionTypeLabel(questionType);
  const topics = getAssessmentTopics(summary, 20).slice(startIndex, startIndex + batchSize);

  const topicBlueprint = topics.map((topic) =>
    `Q${topic.number}. Topic: ${topic.topic}\nEvidence: ${topic.evidence}`
  ).join('\n\n');

  const formatRules = questionType === 'mixed'
    ? `Create a balanced mix inside this batch. Use these object formats:
- MCQ: {"type":"mcq","question":"...","options":["...","...","...","..."],"correctAnswer":"..."}
- Fill blank: {"type":"fill_blank","question":"... ____ ...","correctAnswer":"short missing word or phrase"}
- Descriptive: {"type":"descriptive","question":"...","correctAnswer":"2-3 line model answer","keyPoints":["...","...","..."]}
Include at least one MCQ, one fill_blank, and one descriptive question when batch size allows.`
    : questionType === 'sjt'
      ? `For every object use: {"type":"sjt","question":"Situation: ... What is the best response?","options":["best response","reasonable but less effective","poor response","wrong response"],"correctAnswer":"best response","explanation":"why this is best"}. Questions must be practical real-life situations based on the summary. correctAnswer must exactly match one option.`
      : questionType === 'mcq'
        ? `For every object use: {"type":"mcq","question":"...","options":["...","...","...","..."],"correctAnswer":"..."}. Options must be short, meaningful, distinct, and max 9 words. correctAnswer must exactly match one option.`
        : questionType === 'fill_blank'
          ? `For every object use: {"type":"fill_blank","question":"... ____ ...","correctAnswer":"short missing word or phrase"}. The blank must test an important term, cause, step, tool, risk, benefit, or conclusion.`
          : `For every object use: {"type":"descriptive","question":"...","correctAnswer":"2-3 line model answer","keyPoints":["...","...","..."]}.`;

  const raw = await generateAssessmentText({
    messages: [
      {
        role: 'system',
        content: 'You are an expert exam-question setter. Create high-quality assessment questions from a video summary. Return only a valid JSON array. No markdown, no explanation, no numbering outside JSON.'
      },
      {
        role: 'user',
        content: `Output language: ${targetLanguage}
Question type: ${typeLabel}
Difficulty: ${difficulty || 'medium'}
Batch: ${batchNumber}

Create exactly ${batchSize} excellent learner-assessment questions using the topic blueprint below.

QUALITY RULES:
- Cover the important learning points, not greetings, subscribe requests, filler, or repeated intro/outro.
- Do NOT ask generic questions like "Which idea is mainly discussed?".
- Do NOT repeat the same question pattern.
- Every question must test understanding, cause-effect, application, risk, benefit, step, comparison, or conclusion.
- Questions must be answerable only from the given summary evidence.
- Make questions clear for students.
- ${formatRules}
- Return only a JSON array of exactly ${batchSize} objects.

TOPIC BLUEPRINT:
${topicBlueprint}`
      }
    ],
    temperature: 0.18,
    maxTokens: questionType === 'descriptive' ? 1400 : 1200,
    timeoutMs: 26000
  });

  const parsed = extractJsonArray(raw);
  return parsed.map((q, offset) => {
    const mixedFallbackType = ['mcq', 'fill_blank', 'descriptive'][(startIndex + offset) % 3];
    const effectiveType = questionType === 'mixed' ? (q.type || mixedFallbackType) : questionType;
    return sanitizeQuestion({ ...q, type: effectiveType }, startIndex + offset, effectiveType);
  });
}

function dedupeAssessmentQuestions(questions) {
  const seen = new Set();
  const result = [];
  for (const question of questions) {
    const qText = String(question.question || '').trim();
    const badGeneric = /which idea is mainly discussed|unrelated topic|random personal opinion|repeated greeting/i.test(qText + ' ' + (question.options || []).join(' '));
    if (badGeneric) continue;
    const key = normalizeAnswer(qText).split(' ').slice(0, 12).join(' ');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(question);
  }
  return result;
}

async function generateAssessmentQuestions({ summary, questionType, difficulty, language, questionCount = 20 }) {
  const cleanType = ['mcq', 'fill_blank', 'descriptive', 'sjt', 'mixed'].includes(questionType) ? questionType : 'mcq';
  const safeSummary = String(summary || '').trim();
  const requestedCount = Number(questionCount || 20);
  const targetCount = [5, 10, 15, 20].includes(requestedCount) ? requestedCount : 20;

  if (safeSummary.length < 120) {
    throw new Error('Assessment needs a better summary. Generate a proper summary first, then create assessment.');
  }

  const getTypeForIndex = (index) => {
    if (cleanType !== 'mixed') return cleanType;
    const pattern = ['mcq', 'fill_blank', 'descriptive'];
    return pattern[index % pattern.length];
  };

  const fallbackQuestions = Array.from({ length: targetCount }, (_, index) =>
    createFallbackAssessmentQuestion(safeSummary, getTypeForIndex(index), index)
  ).map((question, index) => ({ ...question, id: `q${index + 1}` }));

  const batchPlan = Array.from({ length: Math.ceil(targetCount / 5) }, (_, index) => ({
    batchSize: Math.min(5, targetCount - (index * 5)),
    startIndex: index * 5
  })).filter((batch) => batch.batchSize > 0);

  const batchPromises = batchPlan.map((batch, i) =>
    generateAssessmentBatch({
      summary: safeSummary,
      questionType: cleanType,
      difficulty,
      language,
      batchNumber: i + 1,
      batchSize: batch.batchSize,
      startIndex: batch.startIndex
    }).catch((error) => {
      console.error(`[Assessment Batch Warning] batch=${i + 1}, error=${error.message}`);
      return [];
    })
  );

  const batches = await withTimeout(
    Promise.all(batchPromises),
    42000,
    'Assessment question generation'
  ).catch((error) => {
    console.error('[Assessment Warning] AI batches timed out or failed:', error.message);
    return [];
  });

  const aiQuestions = Array.isArray(batches) ? batches.flat() : [];
  let finalQuestions = dedupeAssessmentQuestions(
    aiQuestions.map((question, index) => ({
      ...question,
      type: cleanType === 'mixed' ? (question.type || getTypeForIndex(index)) : cleanType
    }))
  ).slice(0, targetCount);

  for (const fallback of fallbackQuestions) {
    if (finalQuestions.length >= targetCount) break;
    finalQuestions.push(fallback);
    finalQuestions = dedupeAssessmentQuestions(finalQuestions).slice(0, targetCount);
  }

  if (finalQuestions.length < targetCount) {
    finalQuestions = fallbackQuestions;
  }

  const sanitizedQuestions = finalQuestions.map((question, index) => {
    const type = cleanType === 'mixed' ? (question.type || getTypeForIndex(index)) : cleanType;
    return sanitizeQuestion({ ...question, type }, index, type);
  }).map((question, index) => ({ ...question, id: `q${index + 1}` })).slice(0, targetCount);

  return qualityGuardAssessmentQuestions(sanitizedQuestions, safeSummary, cleanType, targetCount);
}

function generateRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'BB-';
  for (let i = 0; i < 5; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

async function createUniqueRoomCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateRoomCode();
    const snapshot = await assessmentsCollection.where('roomCode', '==', code).limit(1).get();
    if (snapshot.empty) return code;
  }
  return `BB-${Date.now().toString().slice(-6)}`;
}

function normalizeRoomCode(value) {
  const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!raw) return '';
  if (raw.startsWith('BB-')) return raw;
  if (raw.startsWith('BB')) return `BB-${raw.slice(2)}`;
  return raw.includes('-') ? raw : `BB-${raw}`;
}

function publicAssessment(assessmentDoc) {
  const data = assessmentDoc.data ? assessmentDoc.data() : assessmentDoc;
  return {
    id: assessmentDoc.id || data.id,
    title: data.title || 'Brief Bot Assessment',
    questionType: data.questionType || 'mcq',
    questionTypeLabel: getQuestionTypeLabel(data.questionType || 'mcq'),
    difficulty: data.difficulty || 'medium',
    timeLimitMinutes: Number(data.timeLimitMinutes || 20),
    createdBy: data.createdBy || '',
    createdByName: data.createdByName || '',
    assessmentMode: data.assessmentMode || 'solo',
    status: data.status || (data.assessmentMode === 'battle' ? 'waiting' : 'active'),
    roomCode: data.roomCode || '',
    players: data.players || {},
    startedAt: data.startedAt || null,
    endsAt: data.endsAt || null,
    videoUrl: data.videoUrl || '',
    summary: data.summary || '',
    createdAt: data.createdAt || null,
    completedAt: data.completedAt || null,
    bossGateUnlocked: Boolean(data.bossGateUnlocked),
    bossQualifiedUserIds: Array.isArray(data.bossQualifiedUserIds) ? data.bossQualifiedUserIds : [],
    bossBattle: data.bossBattle || null,
    questions: (data.questions || []).map((q, index) => {
      const type = q.type || data.questionType || 'mcq';
      const cleanedQuestion = sanitizeQuestion({
        ...q,
        type,
        question: removeTimestampsFromText(q.question || ''),
        options: Array.isArray(q.options) ? q.options.map(removeTimestampsFromText) : [],
        correctAnswer: removeTimestampsFromText(q.correctAnswer || '')
      }, index, type);
      const finalQuestion = shuffleQuestionOptions(cleanedQuestion, index);
      return {
        id: finalQuestion.id || q.id,
        type: finalQuestion.type,
        question: finalQuestion.question,
        options: finalQuestion.options || [],
        correctAnswer: finalQuestion.correctAnswer || '',
        explanation: finalQuestion.explanation || '',
        keyPoints: finalQuestion.keyPoints || []
      };
    })
  };
}

async function getLeaderboard(assessmentId) {
  // Avoid Firestore composite-index requirement by fetching attempt docs first
  // and sorting in Node.js. This prevents FAILED_PRECONDITION index errors
  // during assessment submission and leaderboard display.
  const snapshot = await assessmentsCollection.doc(assessmentId).collection('attempts').get();

  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => {
      const percentageDiff = Number(b.percentage || 0) - Number(a.percentage || 0);
      if (percentageDiff !== 0) return percentageDiff;

      const timeDiff = Number(a.timeTakenSeconds || 999999) - Number(b.timeTakenSeconds || 999999);
      if (timeDiff !== 0) return timeDiff;

      return String(a.userName || '').localeCompare(String(b.userName || ''));
    })
    .slice(0, 20)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
      remarks: item.remarks || calculateRemarks(Number(item.percentage || 0)),
      achievement: item.achievement || getAchievementBadge(Number(item.percentage || 0), Number(item.timeTakenSeconds || 0))
    }));
}


async function deleteQuerySnapshotInBatches(snapshot) {
  for (let i = 0; i < snapshot.docs.length; i += 400) {
    const batch = firestoreDb.batch();
    snapshot.docs.slice(i, i + 400).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

async function getUserProgressDetails(userId) {
  const cleanUserId = String(userId || '').trim();
  if (!cleanUserId) throw new Error('User ID is required.');

  const userDoc = await usersCollection.doc(cleanUserId).get();
  if (!userDoc.exists) throw new Error('User not found.');

  const user = safeUser({ id: userDoc.id, ...userDoc.data() });

  let allSummaries = [];
  try {
    let historySnapshot;
    try {
      historySnapshot = await usersCollection.doc(cleanUserId).collection('summaryHistory').orderBy('updatedAt', 'desc').get();
    } catch {
      historySnapshot = await usersCollection.doc(cleanUserId).collection('summaryHistory').get();
    }
    allSummaries = historySnapshot.docs.map((doc) => safeHistoryItem(doc));
  } catch (summaryError) {
    console.error('[Admin Summary Details Warning]', summaryError.message);
  }

  let allPpts = [];
  try {
    let pptSnapshot;
    try {
      pptSnapshot = await usersCollection.doc(cleanUserId).collection('savedPpts').orderBy('createdAt', 'desc').get();
    } catch {
      pptSnapshot = await usersCollection.doc(cleanUserId).collection('savedPpts').get();
    }
    allPpts = pptSnapshot.docs.map((doc) => safePptItem(doc));
  } catch (pptError) {
    console.error('[Admin PPT Details Warning]', pptError.message);
  }

  const attempts = [];
  let assessmentsCreated = 0;
  let battleRoomsGenerated = 0;
  const battleRooms = [];

  try {
    let assessmentSnapshot;
    try {
      assessmentSnapshot = await assessmentsCollection.orderBy('createdAt', 'desc').limit(250).get();
    } catch {
      assessmentSnapshot = await assessmentsCollection.limit(250).get();
    }

    for (const assessmentDoc of assessmentSnapshot.docs) {
      const assessmentData = assessmentDoc.data() || {};

      if (String(assessmentData.createdBy || '') === cleanUserId) {
        assessmentsCreated += 1;

        if (assessmentData.assessmentMode === 'battle') {
          battleRoomsGenerated += 1;
          const playersRaw = assessmentData.players || {};
          const players = Array.isArray(playersRaw)
            ? playersRaw
            : Object.keys(playersRaw).map((playerId) => ({ userId: playerId, ...playersRaw[playerId] }));

          battleRooms.push({
            id: assessmentDoc.id,
            roomCode: assessmentData.roomCode || '',
            title: assessmentData.title || 'Battle Room',
            status: assessmentData.status || 'waiting',
            source: 'assessments',
            playerCount: players.length,
            attemptedCount: players.filter((player) => player.submitted).length,
            createdAt: assessmentData.createdAt || null,
            startedAt: assessmentData.startedAt || null,
            completedAt: assessmentData.completedAt || null
          });
        }
      }

      try {
        const attemptSnapshot = await assessmentDoc.ref.collection('attempts').where('userId', '==', cleanUserId).get();
        attemptSnapshot.docs.forEach((attemptDoc) => {
          const attemptData = attemptDoc.data() || {};
          attempts.push({
            id: attemptDoc.id,
            assessmentId: assessmentDoc.id,
            assessmentTitle: assessmentData.title || 'Assessment',
            assessmentMode: assessmentData.assessmentMode || 'solo',
            questionType: assessmentData.questionType || 'mcq',
            difficulty: assessmentData.difficulty || 'medium',
            roomCode: assessmentData.roomCode || '',
            score: Number(attemptData.score || 0),
            totalMarks: Number(attemptData.totalMarks || assessmentData.questionCount || 20),
            percentage: Number(attemptData.percentage || 0),
            accuracy: Number(attemptData.accuracy || attemptData.percentage || 0),
            remarks: attemptData.remarks || '',
            achievement: attemptData.achievement || '',
            timeTakenSeconds: Number(attemptData.timeTakenSeconds || 0),
            submittedAt: attemptData.submittedAt || null,
            autoSubmit: Boolean(attemptData.autoSubmit)
          });
        });
      } catch (attemptError) {
        console.error('[Admin Attempt Details Warning]', attemptError.message);
      }
    }
  } catch (assessmentError) {
    console.error('[Admin Assessment Details Warning]', assessmentError.message);
  }

  try {
    const oldBattleRoomsSnapshot = await firestoreDb.collection('battleRooms').where('hostId', '==', cleanUserId).get();
    battleRoomsGenerated += oldBattleRoomsSnapshot.size;

    oldBattleRoomsSnapshot.docs.forEach((doc) => {
      const data = doc.data() || {};
      const playersRaw = data.players || {};
      const players = Array.isArray(playersRaw)
        ? playersRaw
        : Object.keys(playersRaw).map((playerId) => ({ userId: playerId, ...playersRaw[playerId] }));

      battleRooms.push({
        id: doc.id,
        roomCode: data.roomCode || '',
        title: data.title || 'Battle Room',
        status: data.status || 'waiting',
        source: 'battleRooms',
        playerCount: players.length,
        attemptedCount: players.filter((player) => player.submitted).length,
        createdAt: data.createdAt || null,
        startedAt: data.startedAt || null,
        completedAt: data.completedAt || null
      });
    });
  } catch (battleError) {
    console.error('[Admin Battle Details Warning]', battleError.message);
  }

  let smartCompareCount = 0;
  const smartCompares = [];

  try {
    const smartCompareReportsSnapshot = await firestoreDb.collection('smartCompareReports').where('userId', '==', cleanUserId).get();
    smartCompareCount += smartCompareReportsSnapshot.size;

    smartCompareReportsSnapshot.docs.forEach((doc) => {
      const data = doc.data() || {};
      smartCompares.push({
        id: doc.id,
        video1: data.video1 || '',
        video2: data.video2 || '',
        video1Topic: data.video1Topic || '',
        video2Topic: data.video2Topic || '',
        similarityScore: Number(data.similarityScore || 0),
        isSimilar: Boolean(data.isSimilar),
        bestOverall: data.bestOverall || '',
        generatedAt: data.generatedAt || null,
        source: 'smartCompareReports'
      });
    });
  } catch (smartReportError) {
    console.error('[Admin Smart Compare Details Warning]', smartReportError.message);
  }

  try {
    const smartCompareActivitySnapshot = await activitiesCollection.where('userId', '==', cleanUserId).where('type', '==', 'smart_compare_generated').get();
    smartCompareCount = Math.max(smartCompareCount, smartCompareActivitySnapshot.size);

    smartCompareActivitySnapshot.docs.forEach((doc) => {
      const data = doc.data() || {};
      smartCompares.push({
        id: doc.id,
        video1: data.meta?.video1 || '',
        video2: data.meta?.video2 || '',
        video1Topic: '',
        video2Topic: '',
        similarityScore: Number(data.meta?.similarityScore || 0),
        isSimilar: Boolean(data.meta?.isSimilar),
        bestOverall: '',
        generatedAt: data.createdAt || null,
        source: 'activities'
      });
    });
  } catch (smartActivityError) {
    console.error('[Admin Smart Compare Activity Warning]', smartActivityError.message);
  }

  attempts.sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')));
  battleRooms.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  smartCompares.sort((a, b) => String(b.generatedAt || '').localeCompare(String(a.generatedAt || '')));

  const percentages = attempts.map((item) => Number(item.percentage || 0)).filter((value) => Number.isFinite(value));
  const averageScore = percentages.length ? Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length) : 0;
  const highestScore = percentages.length ? Math.max(...percentages) : 0;
  const lowestScore = percentages.length ? Math.min(...percentages) : 0;
  const lastScore = percentages.length ? Number(attempts[0]?.percentage || 0) : 0;

  return {
    user,
    summaries: allSummaries,
    ppts: allPpts,
    attempts,
    battleRooms,
    smartCompares,
    stats: {
      summaryCount: Number(user.summariesGenerated || allSummaries.length || 0),
      pptCount: Number(user.pptsGenerated || allPpts.length || 0),
      assessmentCount: attempts.length,
      assessmentsCreated,
      battleRoomCount: battleRoomsGenerated,
      smartCompareCount,
      attemptCount: attempts.length,
      averageScore,
      highestScore,
      lowestScore,
      lastScore,
      lastAttemptAt: attempts[0]?.submittedAt || null,
      lastSummaryAt: allSummaries[0]?.updatedAt || allSummaries[0]?.savedAt || null,
      lastPptAt: allPpts[0]?.updatedAt || allPpts[0]?.savedAt || null
    }
  };
}

async function deleteUserCompletely(userId) {
  const cleanUserId = String(userId || '').trim();
  if (!cleanUserId) throw new Error('User ID is required.');

  const userDoc = await usersCollection.doc(cleanUserId).get();
  if (!userDoc.exists) throw new Error('User not found.');

  const userData = userDoc.data() || {};
  if (userData.role === 'admin') {
    throw new Error('Admin accounts cannot be deleted from dashboard user management.');
  }

  const historySnapshot = await usersCollection.doc(cleanUserId).collection('summaryHistory').get();
  await deleteQuerySnapshotInBatches(historySnapshot);

  const pptSnapshot = await usersCollection.doc(cleanUserId).collection('savedPpts').get();
  await deleteQuerySnapshotInBatches(pptSnapshot);

  const activitySnapshot = await activitiesCollection.where('userId', '==', cleanUserId).get();
  await deleteQuerySnapshotInBatches(activitySnapshot);

  const assessmentSnapshot = await assessmentsCollection.get();
  for (const assessmentDoc of assessmentSnapshot.docs) {
    const attemptsSnapshot = await assessmentDoc.ref.collection('attempts').where('userId', '==', cleanUserId).get();
    await deleteQuerySnapshotInBatches(attemptsSnapshot);
  }

  await usersCollection.doc(cleanUserId).delete();

  try {
    await firebaseAuth.deleteUser(cleanUserId);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
  }
}

app.get('/api/admin/stats', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    const { adminId } = req.query || {};
    const adminProfile = await getUserProfile(adminId);

    if (!adminProfile || adminProfile.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    const authUsers = await listAllFirebaseAuthUsers();
    const authUserMap = new Map(authUsers.map((user) => [user.uid, user]));

    const firestoreSnapshot = await usersCollection.get();
    const firestoreUserMap = new Map(
      firestoreSnapshot.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() }])
    );

    const staleDocs = firestoreSnapshot.docs.filter((doc) => !authUserMap.has(doc.id));
    await deleteQuerySnapshotInBatches({ docs: staleDocs });

    const assessmentSnapshot = await assessmentsCollection.orderBy('createdAt', 'desc').limit(80).get();
    const progressByUser = new Map();
    const recentAttempts = [];
    let totalAttempts = 0;
    let scoreSum = 0;

    for (const assessmentDoc of assessmentSnapshot.docs) {
      const assessmentData = assessmentDoc.data() || {};
      const attemptsSnapshot = await assessmentDoc.ref.collection('attempts').get();
      attemptsSnapshot.docs.forEach((attemptDoc) => {
        const attempt = { id: attemptDoc.id, assessmentId: assessmentDoc.id, assessmentTitle: assessmentData.title || 'Assessment', ...attemptDoc.data() };
        const userId = String(attempt.userId || '');
        if (!userId) return;

        totalAttempts += 1;
        scoreSum += Number(attempt.percentage || 0);
        recentAttempts.push(attempt);

        const current = progressByUser.get(userId) || { attemptCount: 0, scoreSum: 0, highestScore: 0, lastScore: 0, lastSubmittedAt: null };
        current.attemptCount += 1;
        current.scoreSum += Number(attempt.percentage || 0);
        current.highestScore = Math.max(current.highestScore, Number(attempt.percentage || 0));
        if (!current.lastSubmittedAt || String(attempt.submittedAt || '') > String(current.lastSubmittedAt || '')) {
          current.lastSubmittedAt = attempt.submittedAt || null;
          current.lastScore = Number(attempt.percentage || 0);
        }
        progressByUser.set(userId, current);
      });
    }

    let totalBattleRoomsGenerated = 0;
    const battleRoomsByUser = new Map();

    try {
      const battleAssessmentsSnapshot = await assessmentsCollection.where('assessmentMode', '==', 'battle').get();
      totalBattleRoomsGenerated += battleAssessmentsSnapshot.size;
      battleAssessmentsSnapshot.docs.forEach((doc) => {
        const data = doc.data() || {};
        const creatorId = String(data.createdBy || '');
        if (creatorId) battleRoomsByUser.set(creatorId, (battleRoomsByUser.get(creatorId) || 0) + 1);
      });
    } catch (battleAssessmentError) {
      console.log('[Admin Stats Battle Assessment Count Warning]', battleAssessmentError.message);
    }

    try {
      const oldBattleRoomsSnapshot = await firestoreDb.collection('battleRooms').get();
      totalBattleRoomsGenerated += oldBattleRoomsSnapshot.size;
      oldBattleRoomsSnapshot.docs.forEach((doc) => {
        const data = doc.data() || {};
        const hostId = String(data.hostId || data.createdBy || '');
        if (hostId) battleRoomsByUser.set(hostId, (battleRoomsByUser.get(hostId) || 0) + 1);
      });
    } catch (oldBattleError) {
      console.log('[Admin Stats Old Battle Room Count Warning]', oldBattleError.message);
    }

    let totalSmartCompares = 0;
    const smartComparesByUser = new Map();

    try {
      const smartCompareReportsSnapshot = await firestoreDb.collection('smartCompareReports').get();
      totalSmartCompares += smartCompareReportsSnapshot.size;
      smartCompareReportsSnapshot.docs.forEach((doc) => {
        const data = doc.data() || {};
        const compareUserId = String(data.userId || '');
        if (compareUserId) smartComparesByUser.set(compareUserId, (smartComparesByUser.get(compareUserId) || 0) + 1);
      });
    } catch (smartCompareReportError) {
      console.log('[Admin Stats Smart Compare Report Warning]', smartCompareReportError.message);
    }

    try {
      const smartCompareActivitySnapshot = await activitiesCollection.where('type', '==', 'smart_compare_generated').get();
      if (!totalSmartCompares) totalSmartCompares = smartCompareActivitySnapshot.size;
      smartCompareActivitySnapshot.docs.forEach((doc) => {
        const data = doc.data() || {};
        const compareUserId = String(data.userId || '');
        if (compareUserId) smartComparesByUser.set(compareUserId, (smartComparesByUser.get(compareUserId) || 0) + 1);
      });
    } catch (smartCompareActivityError) {
      console.log('[Admin Stats Smart Compare Activity Warning]', smartCompareActivityError.message);
    }

    const users = [];

    for (const authUser of authUsers) {
      const firestoreProfile = firestoreUserMap.get(authUser.uid) || {};
      const createdAt = firestoreProfile.createdAt || authUser.metadata?.creationTime || nowISO();
      const role = firestoreProfile.role || (authUser.email === 'admin@briefbot.com' ? 'admin' : 'user');
      const progress = progressByUser.get(authUser.uid) || { attemptCount: 0, scoreSum: 0, highestScore: 0, lastScore: 0 };
      const assessmentAverageScore = progress.attemptCount ? Math.round(progress.scoreSum / progress.attemptCount) : 0;

      const rawIsLoggedIn = Boolean(firestoreProfile.isLoggedIn);
      const activeNow = isRecentlyActiveUser({
        isLoggedIn: rawIsLoggedIn,
        lastLoginAt: firestoreProfile.lastLoginAt || authUser.metadata?.lastSignInTime || null
      });

      const profile = {
        uid: authUser.uid,
        id: authUser.uid,
        name: firestoreProfile.name || authUser.displayName || String(authUser.email || '').split('@')[0],
        email: authUser.email || firestoreProfile.email || '',
        role,
        provider: firestoreProfile.provider || authUser.providerData?.[0]?.providerId || 'password',
        photoURL: firestoreProfile.photoURL || '',
        emailVerified: Boolean(authUser.emailVerified),
        isLoggedIn: activeNow,
        rawIsLoggedIn,
        activeStatus: activeNow ? 'Active' : 'Offline',
        loginCount: Number(firestoreProfile.loginCount || 0),
        summariesGenerated: Number(firestoreProfile.summariesGenerated || 0),
        questionsGenerated: Number(firestoreProfile.questionsGenerated || 0),
        answersGenerated: Number(firestoreProfile.answersGenerated || 0),
        chatsSent: Number(firestoreProfile.chatsSent || 0),
        pptsGenerated: Number(firestoreProfile.pptsGenerated || 0),
        battleRoomsGenerated: Number(battleRoomsByUser.get(authUser.uid) || firestoreProfile.battleRoomsGenerated || 0),
        smartCompares: Number(smartComparesByUser.get(authUser.uid) || firestoreProfile.smartCompares || 0),
        assessmentsAttempted: progress.attemptCount || Number(firestoreProfile.assessmentsAttempted || 0),
        assessmentAverageScore,
        highestAssessmentScore: progress.highestScore || 0,
        lastAssessmentScore: progress.lastScore || Number(firestoreProfile.lastAssessmentScore || 0),
        createdAt,
        lastLoginAt: firestoreProfile.lastLoginAt || authUser.metadata?.lastSignInTime || null
      };

      if (!firestoreUserMap.has(authUser.uid)) {
        await usersCollection.doc(authUser.uid).set({ ...profile, createdAt, updatedAt: nowISO() });
      } else {
        const updates = {};
        if (firestoreProfile.email !== profile.email) updates.email = profile.email;
        if (!firestoreProfile.name && profile.name) updates.name = profile.name;
        if (!firestoreProfile.uid) updates.uid = authUser.uid;
        if (Object.keys(updates).length) {
          updates.updatedAt = nowISO();
          await usersCollection.doc(authUser.uid).update(updates);
        }
      }

      users.push(profile);
    }

    users.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    // Admin dashboard should show only normal users in user analytics.
    // Admin accounts are hidden from the table and excluded from Active Users / totals.
    const regularUsers = users.filter((user) => String(user.role || '').toLowerCase() !== 'admin');
    const regularUserIds = new Set(regularUsers.map((user) => String(user.id || user.uid || '')));
    const userOnlyAttempts = recentAttempts.filter((attempt) => regularUserIds.has(String(attempt.userId || '')));
    const userOnlyScoreSum = userOnlyAttempts.reduce((sum, attempt) => sum + Number(attempt.percentage || 0), 0);

        const topUser = regularUsers
      .filter((user) => Number(user.assessmentAverageScore || user.lastAssessmentScore || 0) > 0)
      .sort((a, b) => Number(b.assessmentAverageScore || b.lastAssessmentScore || 0) - Number(a.assessmentAverageScore || a.lastAssessmentScore || 0))[0];

    const totals = regularUsers.reduce((acc, user) => {
      acc.totalUsers += 1;
      acc.loggedInUsers += isRecentlyActiveUser(user) ? 1 : 0;
      acc.totalSummaries += Number(user.summariesGenerated || 0);
      acc.totalQuestions += Number(user.questionsGenerated || 0);
      acc.totalAnswers += Number(user.answersGenerated || 0);
      acc.totalChats += Number(user.chatsSent || 0);
      acc.totalPpts += Number(user.pptsGenerated || 0);
      return acc;
    }, {
      totalUsers: 0,
      totalAdmins: users.length - regularUsers.length,
      loggedInUsers: 0,
      totalSummaries: 0,
      totalQuestions: 0,
      totalAnswers: 0,
      totalChats: 0,
      totalPpts: 0
    });

    totals.totalAssessments = assessmentSnapshot.size;
    totals.totalAssessmentAttempts = userOnlyAttempts.length;
    totals.totalBattleRooms = totalBattleRoomsGenerated;
    totals.totalSmartCompares = totalSmartCompares;
    totals.averageAssessmentScore = userOnlyAttempts.length ? Math.round(userOnlyScoreSum / userOnlyAttempts.length) : 0;
    totals.topPerformer = topUser ? `${topUser.name} (${topUser.assessmentAverageScore || topUser.lastAssessmentScore}%)` : '-';

    userOnlyAttempts.sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')));

    return res.json({ ok: true, totals, users: regularUsers, recentAttempts: userOnlyAttempts.slice(0, 10), removedStaleUsers: staleDocs.length });
  } catch (error) {
    console.error('[Admin Stats Error]', error);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/users/:userId/progress', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

  const fallbackResponse = {
    ok: true,
    user: {
      id: String(req.params.userId || ''),
      name: 'User',
      email: '',
      role: 'user'
    },
    summaries: [],
    ppts: [],
    attempts: [],
    battleRooms: [],
    smartCompares: [],
    stats: {
      summaryCount: 0,
      pptCount: 0,
      assessmentCount: 0,
      assessmentsCreated: 0,
      battleRoomCount: 0,
      smartCompareCount: 0,
      attemptCount: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      lastScore: 0,
      lastAttemptAt: null,
      lastSummaryAt: null,
      lastPptAt: null
    }
  };

  try {
    const { adminId } = req.query || {};

    try {
      const adminProfile = await getUserProfile(adminId);
      if (!adminProfile || adminProfile.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
      }
    } catch (adminCheckError) {
      console.error('[Admin Check Warning]', adminCheckError.message);
    }

    try {
      const progress = await getUserProgressDetails(req.params.userId);
      return res.json({ ...fallbackResponse, ...progress, ok: true });
    } catch (progressError) {
      console.error('[Admin User Progress Details Warning]', progressError.message);

      try {
        const userDoc = await usersCollection.doc(String(req.params.userId || '').trim()).get();
        if (userDoc.exists) {
          const rawUser = { id: userDoc.id, ...userDoc.data() };
          const userData = typeof safeUser === 'function' ? safeUser(rawUser) : rawUser;

          fallbackResponse.user = userData;
          fallbackResponse.stats.summaryCount = Number(userData.summariesGenerated || 0);
          fallbackResponse.stats.pptCount = Number(userData.pptsGenerated || 0);
          fallbackResponse.stats.battleRoomCount = Number(userData.battleRoomsGenerated || 0);
          fallbackResponse.stats.smartCompareCount = Number(userData.smartCompares || 0);
        }
      } catch (fallbackError) {
        console.error('[Admin User Fallback Warning]', fallbackError.message);
      }

      return res.json({
        ...fallbackResponse,
        warning: progressError.message || 'Partial user details loaded.'
      });
    }
  } catch (error) {
    console.error('[Admin User Progress Safe Fallback]', error.message);
    return res.json({
      ...fallbackResponse,
      warning: error.message || 'Safe fallback loaded.'
    });
  }
});

app.post('/api/admin/users/delete', async (req, res) => {
  try {
    const adminId = String(req.body?.adminId || '').trim();
    const userId = String(req.body?.userId || '').trim();
    const adminProfile = await getUserProfile(adminId);

    if (!adminProfile || adminProfile.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    if (!userId) return res.status(400).json({ error: 'User ID is required.' });
    if (userId === adminId) return res.status(403).json({ error: 'You cannot delete your own admin account.' });

    await deleteUserCompletely(userId);
    await addActivity({ userId: adminId, type: 'admin_deleted_user', meta: { deletedUserId: userId } });

    return res.json({ ok: true, message: 'User deleted successfully.' });
  } catch (error) {
    console.error('[Admin Delete User Error]', error);
    return res.status(500).json({ error: error.message });
  }
});




app.get('/api/change-password-test', (req, res) => {
  res.json({
    ok: true,
    route: '/api/change-password',
    message: 'Direct change password backend route is available.'
  });
});

app.post('/api/change-password', async (req, res) => {
  try {
    const { userId, email, currentPassword, newPassword } = req.body || {};
    const cleanUserId = String(userId || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanCurrentPassword = String(currentPassword || '');
    const cleanNewPassword = String(newPassword || '');

    if (!cleanUserId || !cleanEmail || !cleanCurrentPassword || !cleanNewPassword) {
      return res.status(400).json({ error: 'User ID, email, current password, and new password are required.' });
    }

    const strongPassword =
      cleanNewPassword.length >= 8 &&
      /[A-Z]/.test(cleanNewPassword) &&
      /[0-9]/.test(cleanNewPassword) &&
      /[^A-Za-z0-9]/.test(cleanNewPassword);

    if (!strongPassword) {
      return res.status(400).json({ error: 'New password must contain 8+ chars, A-Z, 0-9 & special symbol.' });
    }

    if (cleanCurrentPassword === cleanNewPassword) {
      return res.status(400).json({ error: 'New password must be different from current password.' });
    }

    const profile = await getUserProfile(cleanUserId);
    if (!profile) {
      return res.status(404).json({ error: 'User not found. Please login again.' });
    }

    if (String(profile.email || '').toLowerCase() !== cleanEmail) {
      return res.status(403).json({ error: 'Email does not match the logged-in account.' });
    }

    const authUser = await firebaseAuth.getUser(cleanUserId);
    const providerIds = (authUser.providerData || []).map((provider) => provider.providerId);
    const hasPasswordProvider = providerIds.includes('password') || String(profile.provider || '').toLowerCase().includes('password');

    if (!hasPasswordProvider) {
      const providerNames = providerIds.length ? providerIds.join(', ') : (profile.provider || 'social provider');
      return res.status(400).json({ error: `This account uses ${providerNames}. Change password from that provider account settings.` });
    }

    // Re-authenticate with current password before changing it.
    await signInWithFirebasePassword(cleanEmail, cleanCurrentPassword);

    await firebaseAuth.updateUser(cleanUserId, { password: cleanNewPassword });
    await usersCollection.doc(cleanUserId).set({ updatedAt: nowISO() }, { merge: true });
    await addActivity({ userId: cleanUserId, type: 'password_changed' });

    return res.json({ ok: true, message: 'Password changed successfully.' });
  } catch (error) {
    console.error('[Change Password Error]', error);
    const message = String(error.message || 'Password change failed.');
    if (message.includes('Invalid email or password') || message.includes('INVALID_LOGIN_CREDENTIALS')) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    return res.status(500).json({ error: message });
  }
});

app.post('/api/admin/change-credentials', async (req, res) => {
  try {
    const { adminId, currentPassword, newName, newEmail, newPassword } = req.body || {};
    const adminProfile = await getUserProfile(adminId);

    if (!adminProfile || adminProfile.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required.' });
    }

    await signInWithFirebasePassword(adminProfile.email, currentPassword);

    const cleanName = String(newName || adminProfile.name || 'Admin').trim();
    const cleanEmail = String(newEmail || adminProfile.email).trim().toLowerCase();
    const cleanNewPassword = String(newPassword || '').trim();

    const updatePayload = {
      displayName: cleanName,
      email: cleanEmail
    };

    if (cleanNewPassword) {
      if (cleanNewPassword.length < 4) {
        return res.status(400).json({ error: 'New password must be at least 4 characters.' });
      }
      updatePayload.password = cleanNewPassword;
    }

    await firebaseAuth.updateUser(adminProfile.uid || adminProfile.id, updatePayload);
    await usersCollection.doc(adminProfile.uid || adminProfile.id).update({
      name: cleanName,
      email: cleanEmail,
      updatedAt: nowISO()
    });

    await addActivity({ userId: adminProfile.uid || adminProfile.id, type: 'admin_credentials_changed' });

    const updatedUser = await getUserProfile(adminProfile.uid || adminProfile.id);
    return res.json({ ok: true, user: updatedUser });
  } catch (error) {
    console.error('[Admin Change Credentials Error]', error);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/check-video-support', async (req, res) => {
  const { language } = req.body || {};
  const finalUrl = getUrlFromRequest(req);

  if (!finalUrl) return res.json({ isYouTube: false, supported: true, message: '' });

  const videoId = extractYouTubeId(finalUrl);
  if (!videoId) {
    return res.json({
      isYouTube: false,
      supported: true,
      message: 'This is not a YouTube video link. Normal webpage analysis can continue.'
    });
  }

  try {
    const targetLanguage = language || 'English';
    const transcript = await getYouTubeContentWithFallback(videoId, targetLanguage, finalUrl);

    if (transcript.ok) {
      return res.json({
        isYouTube: true,
        supported: true,
        message: transcript.fallbackUsed
          ? '✅ Captions were not available, but Brief Bot can continue using YouTube metadata fallback.'
          : '✅ This video has enough transcript data. Summary can be generated.',
        meta: { captionCount: transcript.captionCount, transcriptLanguageUsed: transcript.langUsed, sourceType: transcript.sourceType, fallbackUsed: transcript.fallbackUsed }
      });
    }

    return res.json({
      isYouTube: true,
      supported: false,
      message: '⚠️ This YouTube link is not accessible enough to process. It may be private, deleted, age-restricted, live-only, or region-blocked.'
    });
  } catch (error) {
    console.error('[Video Check Error]', error.message);
    return res.json({ isYouTube: true, supported: true, message: 'Video check skipped. You can continue analysis.' });
  }
});

app.post('/api/analyze', async (req, res) => {
  const { type, language, summaryType, userId } = req.body || {};
  const finalContent = getUrlFromRequest(req);

  console.log('[ANALYZE FINAL URL]', finalContent);

  if (!finalContent) {
    return res.status(400).json({ error: 'Input URL cannot be empty. Backend received empty URL/content.' });
  }

  const targetLanguage = language || 'English';

  try {
    if (!type || type === 'url') {
      const videoId = extractYouTubeId(finalContent);

      if (videoId) {
        let transcript = getCachedTranscript(videoId, targetLanguage);

        if (!transcript) {
          transcript = await getYouTubeContentWithFallback(videoId, targetLanguage, finalContent);
        } else {
          console.log('[Analyze] Using cached transcript.');
        }

        if (!transcript.ok) {
          return res.status(422).json({
            error: transcript.errorMessage || '⚠️ This YouTube link is not accessible enough to process. It may be private, deleted, age-restricted, live-only, region-blocked, or captions/audio transcription are unavailable.'
          });
        }

        const summary = await summarizeWithTimestamps(transcript.text, targetLanguage, summaryType);
        let historyItem = null;
        if (userId && summary) {
          try {
            historyItem = await saveSummaryHistoryToFirebase({
              userId,
              url: finalContent,
              summary,
              language: targetLanguage,
              summaryType
            });
          } catch (historyError) {
            console.error('[Analyze History Save Warning]', historyError.message);
          }
        }
        return res.json({ data: summary || 'No analysis generated.', historyItem });
      }

      const webpageText = await scrapeGeneralWebpage(finalContent);
      if (!webpageText || webpageText.trim().length < 40) {
        return res.status(400).json({ error: 'No readable text content found.' });
      }

      const textSummary = await summarizePlainTextSafely(webpageText, targetLanguage);
      let historyItem = null;
      if (userId && textSummary) {
        try {
          historyItem = await saveSummaryHistoryToFirebase({
            userId,
            url: finalContent,
            summary: textSummary,
            language: targetLanguage,
            summaryType
          });
        } catch (historyError) {
          console.error('[Analyze History Save Warning]', historyError.message);
        }
      }
      return res.json({ data: textSummary || 'No analysis generated.', historyItem });
    }

    return res.status(400).json({ error: 'Unsupported input type.' });
  } catch (error) {
    console.error('[Analyze Error]', error);
    const status = error.statusCode || 500;
    return res.status(status).json({ error: 'Server processing issue: ' + error.message });
  }
});



function extractTitleFromSummary(summary = '') {
  const firstTextLine = String(summary || '')
    .split('\n')
    .map((line) => line.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim())
    .find((line) => line && !line.startsWith('⏱') && line.length > 8);
  return firstTextLine ? firstTextLine.slice(0, 120) : 'Video';
}

async function getVideoCompareSource(videoUrl, language = 'English') {
  const cleanUrl = String(videoUrl || '').trim();
  if (!cleanUrl) throw new Error('Both video links are required.');

  const videoId = extractYouTubeId(cleanUrl);
  if (!videoId) throw new Error('Smart Compare currently supports YouTube video links only.');

  let transcript = await getYouTubeContentWithFallback(videoId, language, cleanUrl);

  if (!transcript?.ok || !transcript?.text) {
    throw new Error('One of the videos is private, deleted, age-restricted, live-only, region-blocked, or inaccessible.');
  }

  const summary = await summarizeWithTimestamps(transcript.text, language, 'brief');
  return {
    url: cleanUrl,
    videoId,
    title: extractTitleFromSummary(summary),
    summary: String(summary || '').slice(0, 4500),
    transcriptPreview: String(transcript.text || '').slice(0, 3000),
    durationRange: getTranscriptTimeRange(transcript.text),
    sourceType: transcript.sourceType || 'captions',
    fallbackUsed: Boolean(transcript.fallbackUsed)
  };
}

app.post('/api/compare-videos', async (req, res) => {
  try {
    const { videoUrl1, videoUrl2, language = 'English', userId } = req.body || {};
    const cleanUrl1 = String(videoUrl1 || '').trim();
    const cleanUrl2 = String(videoUrl2 || '').trim();

    if (!cleanUrl1 || !cleanUrl2) {
      return res.status(400).json({ error: 'Both video links are required.' });
    }

    if (cleanUrl1 === cleanUrl2) {
      return res.status(400).json({ error: 'Please add two different video links to compare.' });
    }

    const [video1, video2] = await Promise.all([
      getVideoCompareSource(cleanUrl1, language),
      getVideoCompareSource(cleanUrl2, language)
    ]);

    const prompt = `You are Smart Video Compare for an AI learning website.

Compare these two YouTube videos ONLY using the summaries/transcript previews provided.
First check whether both videos are about the same or similar topic.

Important:
- Do NOT invent YouTube views, likes, subscribers, upload date, or channel metadata.
- If metadata is unavailable, say "Unavailable".
- Communication skill should be judged only from explanation clarity, structure, and transcript style.
- If similarityScore is below 60, do not force a full winner. Give mismatch warning.
- Return ONLY valid JSON.

JSON format:
{
  "similarityScore": 0,
  "isSimilar": false,
  "video1Topic": "",
  "video2Topic": "",
  "quickVerdict": "",
  "bestOverall": "Video 1 / Video 2 / Tie / Not comparable",
  "bestForBeginners": "Video 1 / Video 2 / Tie / Not comparable",
  "moreDetailed": "Video 1 / Video 2 / Tie / Not comparable",
  "betterCommunication": "Video 1 / Video 2 / Tie / Not comparable",
  "betterForRevision": "Video 1 / Video 2 / Tie / Not comparable",
  "comparisonTable": [
    { "category": "Easy to understand", "video1": "", "video2": "", "winner": "" },
    { "category": "Depth", "video1": "", "video2": "", "winner": "" },
    { "category": "Examples", "video1": "", "video2": "", "winner": "" },
    { "category": "Structure", "video1": "", "video2": "", "winner": "" },
    { "category": "Communication", "video1": "", "video2": "", "winner": "" }
  ],
  "commonTopics": [],
  "onlyInVideo1": [],
  "onlyInVideo2": [],
  "recommendation": "",
  "combinedNotes": ""
}

Video 1 URL: ${video1.url}
Video 1 title guess: ${video1.title}
Video 1 available transcript range: ${video1.durationRange?.start || '0:00'} to ${video1.durationRange?.end || 'unknown'}
Video 1 summary:
${video1.summary}

Video 2 URL: ${video2.url}
Video 2 title guess: ${video2.title}
Video 2 available transcript range: ${video2.durationRange?.start || '0:00'} to ${video2.durationRange?.end || 'unknown'}
Video 2 summary:
${video2.summary}`;

    const raw = await generateSmartCompareText({
      messages: [
        { role: 'system', content: 'Return only valid JSON for video comparison. Never invent unavailable metadata.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.12,
      maxTokens: 2600
    });

    let comparison;
    try {
      const match = String(raw || '').match(/\{[\s\S]*\}/);
      comparison = JSON.parse(match ? match[0] : raw);
    } catch (parseError) {
      return res.status(500).json({ error: 'AI comparison response was not valid. Please try again.' });
    }

    const similarityScore = Math.max(0, Math.min(100, Number(comparison.similarityScore || 0)));
    const isSimilar = Boolean(comparison.isSimilar) && similarityScore >= 60;

    const result = {
      ...comparison,
      similarityScore,
      isSimilar,
      video1: {
        url: video1.url,
        title: video1.title,
        views: 'Unavailable',
        durationRange: video1.durationRange
      },
      video2: {
        url: video2.url,
        title: video2.title,
        views: 'Unavailable',
        durationRange: video2.durationRange
      },
      generatedAt: nowISO()
    };

    if (userId) {
      await addActivity({
        userId,
        type: 'smart_compare_generated',
        meta: {
          similarityScore,
          isSimilar,
          video1: video1.url,
          video2: video2.url
        }
      }).catch((activityError) => console.log('[Smart Compare Activity Warning]', activityError.message));

      await firestoreDb.collection('smartCompareReports').add({
        userId: String(userId),
        video1: video1.url,
        video2: video2.url,
        video1Topic: result.video1Topic || '',
        video2Topic: result.video2Topic || '',
        similarityScore,
        isSimilar,
        bestOverall: result.bestOverall || '',
        generatedAt: nowISO()
      }).catch((reportError) => console.log('[Smart Compare Report Save Warning]', reportError.message));
    }

    return res.json({ ok: true, result });
  } catch (error) {
    console.error('[Smart Compare Error]', error);
    return res.status(error.statusCode || 500).json({ error: 'Smart Compare failed: ' + error.message });
  }
});


app.post('/api/assessments/create', async (req, res) => {
  try {
    const { userId, title, summary, questionType, difficulty, language, videoUrl, assessmentMode } = req.body || {};
    const creator = await getUserProfile(userId);
    if (!creator) return res.status(401).json({ error: 'Please login before creating an assessment.' });
    if (!summary || String(summary).trim().length < 80) return res.status(400).json({ error: 'A valid summary is required to create assessment.' });

    const cleanType = ['mcq', 'fill_blank', 'descriptive', 'sjt', 'mixed'].includes(questionType) ? questionType : 'mcq';
    const cleanQuestionCount = 20;
    const cleanMode = assessmentMode === 'battle' || assessmentMode === 'challenge' ? 'battle' : 'solo';
    const roomCode = cleanMode === 'battle' ? await createUniqueRoomCode() : null;
    const questions = await generateAssessmentQuestions({ summary, questionType: cleanType, difficulty, language, questionCount: cleanQuestionCount });

    const ref = assessmentsCollection.doc();
    const now = nowISO();
    const payload = {
      title: String(title || (cleanMode === 'battle' ? 'Brief Bot Battle Room' : 'Brief Bot Assessment')).trim().slice(0, 120),
      createdBy: creator.id,
      createdByName: creator.name || 'Creator',
      createdByEmail: creator.email || '',
      assessmentMode: cleanMode,
      status: cleanMode === 'battle' ? 'waiting' : 'active',
      roomCode,
      players: cleanMode === 'battle' ? {
        [creator.id]: {
          userId: creator.id,
          name: creator.name || 'Host',
          email: creator.email || '',
          joinedAt: now,
          submitted: false,
          isHost: true,
          role: 'host'
        }
      } : {},
      questionType: cleanType,
      difficulty: difficulty || 'medium',
      language: language || 'English',
      videoUrl: String(videoUrl || ''),
      summary: String(summary || ''),
      timeLimitMinutes: 20,
      totalQuestions: questions.length,
      questions,
      createdAt: now,
      updatedAt: now,
      startedAt: cleanMode === 'solo' ? now : null,
      endsAt: cleanMode === 'solo' ? new Date(Date.now() + 20 * 60 * 1000).toISOString() : null
    };

    await ref.set(payload);
    await addActivity({ userId: creator.id, type: cleanMode === 'battle' ? 'battle_room_created' : 'assessment_created', meta: { assessmentId: ref.id, roomCode, questionType: cleanType, totalQuestions: 20, timerMinutes: 20 } });
    await incrementUserActivityCount(creator.id, 'questionsGenerated');

    const saved = await ref.get();
    return res.json({ ok: true, assessment: publicAssessment(saved) });
  } catch (error) {
    console.error('[Assessment Create Error]', error);
    const status = error.statusCode || 500;
    return res.status(status).json({ error: 'Assessment generation issue: ' + error.message });
  }
});



app.post('/api/battle-room/join', async (req, res) => {
  try {
    const { roomCode, userId } = req.body || {};
    const code = normalizeRoomCode(roomCode || '');
    const user = await getUserProfile(userId);
    if (!user) return res.status(401).json({ error: 'Please login before joining Battle Room.' });
    if (!code) return res.status(400).json({ error: 'Battle Room code is required.' });

    const snapshot = await assessmentsCollection.where('roomCode', '==', code).limit(1).get();
    if (snapshot.empty) return res.status(404).json({ error: 'Battle Room not found. Check the code and try again.' });

    const doc = snapshot.docs[0];
    const data = doc.data() || {};
    if (data.assessmentMode !== 'battle') return res.status(400).json({ error: 'This is not a Battle Room.' });
    if (data.status === 'completed') return res.status(400).json({ error: 'This Battle Room is already completed.' });

    const cleanUserId = String(user.id);
    const players = { ...(data.players || {}) };
    const existingPlayer = players[cleanUserId] || {};

    const isJoiningHost = String(data.createdBy || '') === cleanUserId;

    players[cleanUserId] = {
      ...existingPlayer,
      userId: cleanUserId,
      name: user.name || existingPlayer.name || 'Player',
      email: user.email || existingPlayer.email || '',
      joinedAt: existingPlayer.joinedAt || nowISO(),
      submitted: Boolean(existingPlayer.submitted),
      score: Number(existingPlayer.score || 0),
      percentage: Number(existingPlayer.percentage || 0),
      timeTakenSeconds: Number(existingPlayer.timeTakenSeconds || 0),
      isHost: isJoiningHost,
      role: isJoiningHost ? 'host' : 'player'
    };

    await doc.ref.set({
      players,
      updatedAt: nowISO()
    }, { merge: true });

    await addActivity({ userId: user.id, type: 'battle_room_joined', meta: { assessmentId: doc.id, roomCode: code } });
    const saved = await doc.ref.get();
    return res.json({ ok: true, assessment: publicAssessment(saved) });
  } catch (error) {
    console.error('[Battle Join Error]', error);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/battle-room/:assessmentId/start', async (req, res) => {
  try {
    const assessmentId = String(req.params.assessmentId || '').trim();
    const { userId } = req.body || {};
    const user = await getUserProfile(userId);
    if (!user) return res.status(401).json({ error: 'Please login before starting Battle Room.' });

    const ref = assessmentsCollection.doc(assessmentId);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Battle Room not found.' });
    const data = doc.data();
    if (data.assessmentMode !== 'battle') return res.status(400).json({ error: 'This is not a Battle Room.' });

    const cleanUserId = String(user.id);
    const currentPlayer = (data.players || {})[cleanUserId] || {};
    const isRealHost = String(data.createdBy || '') === cleanUserId && (currentPlayer.isHost === true || currentPlayer.role === 'host');
    if (!isRealHost) return res.status(403).json({ error: 'Only the host can start this Battle Room.' });

    const playerCount = Object.keys(data.players || {}).length;
    if (playerCount < 2) return res.status(400).json({ error: 'At least 2 players are required to start the Battle Room.' });
    if (data.status === 'active') return res.status(400).json({ error: 'Battle Room has already started.' });

    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + 20 * 60 * 1000);
    await ref.set({ status: 'active', startedAt: startedAt.toISOString(), endsAt: endsAt.toISOString(), updatedAt: nowISO() }, { merge: true });
    await addActivity({ userId: user.id, type: 'battle_room_started', meta: { assessmentId, roomCode: data.roomCode } });

    const saved = await ref.get();
    return res.json({ ok: true, assessment: publicAssessment(saved) });
  } catch (error) {
    console.error('[Battle Start Error]', error);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/assessments/code/:roomCode', async (req, res) => {
  try {
    const roomCode = normalizeRoomCode(req.params.roomCode || '');
    if (!roomCode) return res.status(400).json({ error: 'Room code is required.' });
    const snapshot = await assessmentsCollection.where('roomCode', '==', roomCode).limit(1).get();
    if (snapshot.empty) return res.status(404).json({ error: 'Assessment room not found. Check the code and try again.' });
    return res.json({ ok: true, assessment: publicAssessment(snapshot.docs[0]) });
  } catch (error) {
    console.error('[Assessment Code Load Error]', error);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/assessments/:assessmentId', async (req, res) => {
  try {
    const assessmentId = String(req.params.assessmentId || '').trim();
    if (!assessmentId) return res.status(400).json({ error: 'Assessment ID is required.' });
    const doc = await assessmentsCollection.doc(assessmentId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Assessment not found.' });
    return res.json({ ok: true, assessment: publicAssessment(doc) });
  } catch (error) {
    console.error('[Assessment Load Error]', error);
    return res.status(500).json({ error: error.message });
  }
});


function getBossQualifiersFromLeaderboard(leaderboard = []) {
  const submitted = (leaderboard || []).filter((player) => player && player.userId);
  if (submitted.length < 2) return [];
  return submitted.slice(0, Math.min(3, submitted.length));
}

async function getBossLeaderboard(assessmentId, finalCompleted = false) {
  const snapshot = await assessmentsCollection.doc(assessmentId).collection('bossAttempts').get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => {
      const scoreDiff = Number(b.score || 0) - Number(a.score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return Number(a.timeTakenSeconds || 999999) - Number(b.timeTakenSeconds || 999999);
    })
    .map((item, index) => ({
      ...item,
      rank: index + 1,
      badge: finalCompleted
        ? (index === 0 ? 'Brief Boss Champion' : index === 1 ? 'Boss Runner' : 'Boss Finalist')
        : 'Waiting for final reveal'
    }));
}


function normalizeBattlePlayersMap(players = {}) {
  if (Array.isArray(players)) {
    return players.reduce((acc, player) => {
      const id = String(player?.userId || player?.id || '').trim();
      if (id) acc[id] = { ...player, userId: id };
      return acc;
    }, {});
  }

  return Object.keys(players || {}).reduce((acc, id) => {
    const cleanId = String(id || '').trim();
    if (cleanId) acc[cleanId] = { ...(players[id] || {}), userId: cleanId };
    return acc;
  }, {});
}

async function finalizeBattleCompletionIfReady(ref, assessmentId, assessmentData = {}) {
  const players = normalizeBattlePlayersMap(assessmentData.players || {});
  const leaderboard = await getLeaderboard(assessmentId);
  const submittedIds = new Set((leaderboard || []).map((player) => String(player.userId || player.id || '')).filter(Boolean));

  (leaderboard || []).forEach((player) => {
    const id = String(player.userId || player.id || '').trim();
    if (!id) return;
    players[id] = {
      ...(players[id] || {}),
      userId: id,
      name: player.userName || player.name || players[id]?.name || 'Player',
      email: player.userEmail || players[id]?.email || '',
      submitted: true,
      score: Number(player.score || 0),
      totalMarks: Number(player.totalMarks || 20),
      percentage: Number(player.percentage || player.accuracy || 0),
      accuracy: Number(player.accuracy || player.percentage || 0),
      rank: player.rank,
      remarks: player.remarks,
      achievement: player.achievement,
      submittedAt: player.submittedAt || players[id]?.submittedAt || nowISO(),
      timeTakenSeconds: Number(player.timeTakenSeconds || players[id]?.timeTakenSeconds || 0),
      isHost: Boolean(players[id]?.isHost),
      role: players[id]?.role || (String(assessmentData.createdBy || '') === id ? 'host' : 'player')
    };
  });

  const playerList = Object.values(players);
  const allSubmitted = playerList.length >= 2 &&
    playerList.every((player) => {
      const id = String(player.userId || player.id || '').trim();
      return Boolean(player.submitted) || submittedIds.has(id);
    });

  const baseUpdate = {
    players,
    leaderboard,
    updatedAt: nowISO()
  };

  if (allSubmitted) {
    const qualifiers = getBossQualifiersFromLeaderboard(leaderboard);
    await ref.set({
      ...baseUpdate,
      status: 'completed',
      completedAt: assessmentData.completedAt || nowISO(),
      bossGateUnlocked: true,
      bossQualifiedUserIds: qualifiers.map((player) => String(player.userId || player.id || '')).filter(Boolean)
    }, { merge: true });

    const updatedDoc = await ref.get();
    return {
      allSubmitted: true,
      leaderboard,
      players,
      assessment: updatedDoc.data() || { ...assessmentData, ...baseUpdate, status: 'completed' }
    };
  }

  await ref.set(baseUpdate, { merge: true });
  const updatedDoc = await ref.get();
  return {
    allSubmitted: false,
    leaderboard,
    players,
    assessment: updatedDoc.data() || { ...assessmentData, ...baseUpdate }
  };
}


function scoreBossQuestions(questionList = [], cleanAnswers = {}) {
  let score = 0;
  const review = [];

  (questionList || []).forEach((question) => {
    const userAnswer = cleanAnswers[question.id];
    const normalizedUser = normalizeAnswer(userAnswer || '');
    const normalizedCorrect = normalizeAnswer(question.correctAnswer || '');
    const isCorrect = Boolean(userAnswer) && (
      question.type === 'fill_blank'
        ? (normalizedUser === normalizedCorrect || normalizedUser.includes(normalizedCorrect) || normalizedCorrect.includes(normalizedUser))
        : normalizedUser === normalizedCorrect
    );

    if (isCorrect) score += 1;
    review.push({
      questionId: question.id,
      question: question.question,
      userAnswer: userAnswer || '',
      correctAnswer: question.correctAnswer || '',
      isCorrect
    });
  });

  return { score, review };
}

app.post('/api/assessments/:assessmentId/submit', async (req, res) => {
  try {
    const assessmentId = String(req.params.assessmentId || '').trim();
    const { userId, answers, timeTakenSeconds, autoSubmit } = req.body || {};
    const user = await getUserProfile(userId);
    if (!user) return res.status(401).json({ error: 'Please login before submitting assessment.' });

    const ref = assessmentsCollection.doc(assessmentId);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Assessment not found.' });

    const assessment = doc.data() || {};
    if (assessment.assessmentMode === 'battle' && assessment.status === 'waiting') {
      return res.status(400).json({ error: 'Battle Room has not started yet.' });
    }

    const questionList = assessment.questions || [];
    const cleanAnswers = answers || {};
    let score = 0;
    const review = [];

    questionList.forEach((question) => {
      const userAnswer = cleanAnswers[question.id];
      const normalizedUser = normalizeAnswer(userAnswer || '');
      const normalizedCorrect = normalizeAnswer(question.correctAnswer || '');
      let isCorrect = false;

      if (!userAnswer) {
        isCorrect = false;
      } else if (question.type === 'mcq' || question.type === 'sjt') {
        isCorrect = normalizedUser === normalizedCorrect;
      } else if (question.type === 'fill_blank') {
        isCorrect = normalizedUser === normalizedCorrect || normalizedUser.includes(normalizedCorrect) || normalizedCorrect.includes(normalizedUser);
      } else {
        const keyPoints = (question.keyPoints || []).map(normalizeAnswer).filter(Boolean);
        const matched = keyPoints.filter((point) => normalizedUser.includes(point) || point.split(' ').some((word) => word.length > 4 && normalizedUser.includes(word))).length;
        isCorrect = normalizedUser.length > 20 && (matched >= 1 || normalizedUser.includes(normalizedCorrect.slice(0, 18)));
      }

      if (isCorrect) score += 1;

      review.push({
        questionId: question.id,
        question: question.question,
        userAnswer: userAnswer || '',
        correctAnswer: question.correctAnswer || '',
        isCorrect,
        explanation: question.explanation || ''
      });
    });

    const totalMarks = questionList.length || 20;
    const percentage = totalMarks ? Math.round((score / totalMarks) * 100) : 0;
    const result = {
      assessmentId,
      userId: user.id,
      userName: user.name || 'Learner',
      userEmail: user.email || '',
      score,
      totalMarks,
      percentage,
      accuracy: percentage,
      remarks: calculateRemarks(percentage),
      achievement: getAchievementBadge(percentage, Number(timeTakenSeconds || 0)),
      timeTakenSeconds: Number(timeTakenSeconds || 0),
      autoSubmit: Boolean(autoSubmit),
      submittedAt: nowISO(),
      review
    };

    await ref.collection('attempts').doc(user.id).set({ ...result, answers: cleanAnswers }, { merge: true });

    let updatedPlayers = { ...(assessment.players || {}) };

    if (assessment.assessmentMode === 'battle') {
      const cleanUserId = String(user.id);
      const existingPlayer = updatedPlayers[cleanUserId] || {};
      updatedPlayers[cleanUserId] = {
        ...existingPlayer,
        userId: cleanUserId,
        name: user.name || existingPlayer.name || 'Player',
        email: user.email || existingPlayer.email || '',
        joinedAt: existingPlayer.joinedAt || nowISO(),
        isHost: assessment.createdBy === cleanUserId,
        submitted: true,
        score,
        totalMarks,
        percentage,
        accuracy: percentage,
        submittedAt: nowISO(),
        timeTakenSeconds: Number(timeTakenSeconds || 0)
      };
    }

    await usersCollection.doc(user.id).set({ assessmentsAttempted: admin.firestore.FieldValue.increment(1), lastAssessmentScore: percentage, updatedAt: nowISO() }, { merge: true });
    await addActivity({ userId: user.id, type: assessment.assessmentMode === 'battle' ? 'battle_assessment_submitted' : 'assessment_submitted', meta: { assessmentId, score, percentage } });

    const leaderboard = await getLeaderboard(assessmentId);
    const rankIndex = leaderboard.findIndex((item) => item.userId === user.id);
    const rankedResult = { ...result, rank: rankIndex >= 0 ? rankIndex + 1 : null };

    await ref.collection('attempts').doc(user.id).set({ rank: rankedResult.rank }, { merge: true });

    if (assessment.assessmentMode === 'battle') {
      leaderboard.forEach((player) => {
        if (updatedPlayers[player.userId]) {
          updatedPlayers[player.userId] = {
            ...updatedPlayers[player.userId],
            rank: player.rank,
            remarks: player.remarks,
            achievement: player.achievement,
            submitted: true
          };
        }
      });

      await ref.set({
        players: updatedPlayers,
        leaderboard,
        updatedAt: nowISO()
      }, { merge: true });

      await finalizeBattleCompletionIfReady(ref, assessmentId, { ...assessment, players: updatedPlayers, leaderboard });
    }

    const updatedDoc = await ref.get();

    return res.json({
      ok: true,
      result: rankedResult,
      leaderboard,
      assessment: publicAssessment(updatedDoc)
    });
  } catch (error) {
    console.error('[Assessment Submit Error]', error);
    return res.status(500).json({ error: error.message });
  }
});


app.post('/api/assessments/:assessmentId/boss/start', async (req, res) => {
  try {
    const assessmentId = String(req.params.assessmentId || '').trim();
    const { userId } = req.body || {};
    const user = await getUserProfile(userId);
    if (!user) return res.status(401).json({ error: 'Please login before entering Boss Battle.' });

    const ref = assessmentsCollection.doc(assessmentId);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Assessment not found.' });

    let assessment = doc.data() || {};
    if (assessment.assessmentMode !== 'battle') return res.status(400).json({ error: 'Boss Battle is available only for Battle Room.' });

    const finalization = await finalizeBattleCompletionIfReady(ref, assessmentId, assessment);
    assessment = finalization.assessment || assessment;

    const playersForBoss = Object.values(normalizeBattlePlayersMap(assessment.players || {}));
    const allBattlePlayersSubmitted = Boolean(finalization.allSubmitted) ||
      (playersForBoss.length >= 2 && playersForBoss.every((player) => player.submitted));

    if (!allBattlePlayersSubmitted && assessment.status !== 'completed') {
      return res.status(400).json({ error: 'Boss Battle unlocks after all players submit.' });
    }

    let leaderboard = Array.isArray(finalization.leaderboard) && finalization.leaderboard.length
      ? finalization.leaderboard
      : await getLeaderboard(assessmentId);
    if (!leaderboard.length && Object.keys(assessment.players || {}).length) {
      leaderboard = Object.values(assessment.players || {})
        .filter((player) => player.submitted)
        .sort((a, b) => {
          const scoreDiff = Number(b.percentage || 0) - Number(a.percentage || 0);
          if (scoreDiff !== 0) return scoreDiff;
          return Number(a.timeTakenSeconds || 999999) - Number(b.timeTakenSeconds || 999999);
        })
        .map((player, index) => ({ ...player, userName: player.name || 'Player', rank: index + 1 }));
    }

    const qualifiers = getBossQualifiersFromLeaderboard(leaderboard);
    if (qualifiers.length < 2) return res.status(403).json({ error: 'Boss Battle locked. At least 2 players must complete the Battle Room.' });

    const qualifiedUserIds = qualifiers.map((player) => String(player.userId));
    if (!qualifiedUserIds.includes(String(user.id))) return res.status(403).json({ error: 'Only Top performers can enter Boss Battle.' });

    let bossBattle = assessment.bossBattle || null;
    if (bossBattle?.status === 'completed') {
      const finalLeaderboard = await getBossLeaderboard(assessmentId, true);
      return res.json({
        ok: true,
        bossBattle: { ...bossBattle, leaderboard: finalLeaderboard, questions: [] },
        result: null,
        bossLeaderboard: finalLeaderboard
      });
    }

    if (!bossBattle?.questions?.length) {
      const bossSourceSummary = assessment.summary || (assessment.questions || []).map((q) => {
        const optionsText = Array.isArray(q.options) ? q.options.join(' ') : '';
        return `${q.question || ''} ${q.correctAnswer || ''} ${optionsText}`;
      }).join('\n');

      const generated = await generateAssessmentQuestions({
        summary: `Create Boss Challenge questions from this content. All questions and all four options must be complete, meaningful sentences. Do not cut sentences in the middle. Use short complete options, max 9 words each. Do not repeat options.\n\n${bossSourceSummary}`,
        questionType: 'mcq',
        difficulty: 'hard',
        language: assessment.language || 'English',
        questionCount: 5
      });

      const questions = strengthenBossQuestions(generated, bossSourceSummary);

      bossBattle = {
        status: 'unlocked',
        title: 'Brief Boss Battle',
        timerSeconds: 180,
        qualifiedUserIds,
        qualifiers,
        questions,
        leaderboard: [],
        champion: null,
        createdAt: nowISO(),
        updatedAt: nowISO()
      };

      await ref.set({ bossBattle, updatedAt: nowISO() }, { merge: true });
    }

    const oldAttempt = await ref.collection('bossAttempts').doc(user.id).get();
    if (oldAttempt.exists) {
      const finalCompleted = bossBattle?.status === 'completed';
      const bossLeaderboard = await getBossLeaderboard(assessmentId, finalCompleted);
      return res.json({ ok: true, alreadySubmitted: true, bossBattle: { ...bossBattle, questions: [] }, result: { ...oldAttempt.data(), badge: finalCompleted && bossLeaderboard[0]?.userId === user.id ? 'Brief Boss Champion' : 'Waiting for final reveal' }, bossLeaderboard });
    }

    return res.json({ ok: true, bossBattle });
  } catch (error) {
    console.error('[Boss Battle Start Error]', error);
    return res.status(error.statusCode || 500).json({ error: 'Boss Battle start failed: ' + error.message });
  }
});

app.post('/api/assessments/:assessmentId/boss/submit', async (req, res) => {
  try {
    const assessmentId = String(req.params.assessmentId || '').trim();
    const { userId, answers, timeTakenSeconds, autoSubmit } = req.body || {};
    const user = await getUserProfile(userId);
    if (!user) return res.status(401).json({ error: 'Please login before submitting Boss Battle.' });

    const ref = assessmentsCollection.doc(assessmentId);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Assessment not found.' });

    const assessment = doc.data() || {};
    const bossBattle = assessment.bossBattle || {};
    const qualifiedUserIds = (bossBattle.qualifiedUserIds || []).map(String);

    if (!qualifiedUserIds.includes(String(user.id))) return res.status(403).json({ error: 'Only qualified Top performers can submit Boss Battle.' });

    const oldAttempt = await ref.collection('bossAttempts').doc(user.id).get();
    if (oldAttempt.exists) {
      const finalCompleted = bossBattle?.status === 'completed';
      const bossLeaderboard = await getBossLeaderboard(assessmentId, finalCompleted);
      return res.json({ ok: true, result: { ...oldAttempt.data(), badge: finalCompleted && bossLeaderboard[0]?.userId === user.id ? 'Brief Boss Champion' : 'Waiting for final reveal' }, bossLeaderboard, bossBattle });
    }

    const questionList = bossBattle.questions || [];
    if (!questionList.length) return res.status(400).json({ error: 'Boss Battle questions are not ready.' });

    const cleanAnswers = answers || {};
    const { score, review } = scoreBossQuestions(questionList, cleanAnswers);
    const totalMarks = questionList.length || 5;
    const percentage = totalMarks ? Math.round((score / totalMarks) * 100) : 0;

    const result = {
      assessmentId,
      userId: user.id,
      userName: user.name || 'Player',
      userEmail: user.email || '',
      score,
      totalMarks,
      percentage,
      timeTakenSeconds: Number(timeTakenSeconds || 0),
      autoSubmit: Boolean(autoSubmit),
      submittedAt: nowISO(),
      review,
      badge: 'Boss Finalist'
    };

    await ref.collection('bossAttempts').doc(user.id).set({ ...result, answers: cleanAnswers }, { merge: true });

    const interimLeaderboard = await getBossLeaderboard(assessmentId, false);
    const allSubmitted = qualifiedUserIds.length > 0 && qualifiedUserIds.every((id) => interimLeaderboard.some((item) => String(item.userId) === String(id)));
    const bossLeaderboard = await getBossLeaderboard(assessmentId, allSubmitted);
    const champion = allSubmitted ? (bossLeaderboard[0] || null) : null;
    const updatedBossBattle = {
      ...bossBattle,
      status: allSubmitted ? 'completed' : 'active',
      leaderboard: bossLeaderboard,
      champion: allSubmitted ? champion : (bossBattle.champion || null),
      completedAt: allSubmitted ? nowISO() : (bossBattle.completedAt || null),
      updatedAt: nowISO()
    };

    await ref.set({ bossBattle: updatedBossBattle, updatedAt: nowISO() }, { merge: true });
    await addActivity({ userId: user.id, type: 'boss_battle_submitted', meta: { assessmentId, score, percentage } });

    const rank = bossLeaderboard.findIndex((item) => item.userId === user.id) + 1;
    const currentPlayerBoard = bossLeaderboard.find((item) => item.userId === user.id);
    const finalBadge = allSubmitted ? (currentPlayerBoard?.badge || result.badge) : 'Waiting for final reveal';
    return res.json({ ok: true, result: { ...result, rank, badge: finalBadge, waitingForOthers: !allSubmitted }, bossLeaderboard, bossBattle: updatedBossBattle });
  } catch (error) {
    console.error('[Boss Battle Submit Error]', error);
    return res.status(error.statusCode || 500).json({ error: 'Boss Battle submit failed: ' + error.message });
  }
});

app.get('/api/assessments/:assessmentId/leaderboard', async (req, res) => {
  try {
    const assessmentId = String(req.params.assessmentId || '').trim();
    const docRef = assessmentsCollection.doc(assessmentId);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Assessment not found.' });

    let leaderboard = await getLeaderboard(assessmentId);
    const data = doc.data() || {};

    if (data.assessmentMode === 'battle') {
      const finalization = await finalizeBattleCompletionIfReady(docRef, assessmentId, data);
      leaderboard = finalization.leaderboard || leaderboard;
    }

    return res.json({ ok: true, leaderboard });
  } catch (error) {
    console.error('[Leaderboard Error]', error);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate-questions', async (req, res) => {
  const { contextSummary, language, summaryType } = req.body || {};
  const summaryText = String(contextSummary || '').trim().slice(0, 1600);

  if (!summaryText) return res.status(400).json({ error: 'Summary is required before generating questions.' });

  const targetLanguage = languageDisplayName(language || 'English');

  try {
    const questions = await generateText({
      messages: [
        { role: 'system', content: 'Generate only important direct questions from a video summary. No categories, no answers.' },
        {
          role: 'user',
          content: `Output language: ${targetLanguage}\nSummary format: ${summaryType || 'summary'}\n\nGenerate important direct questions from this video summary.\nRules:\n- Questions must be useful for students.\n- Do not create unnecessary questions.\n- Do not include answers.\n- Each answer should be possible in one word or one short line.\n- Choose the number of questions based on content depth.\n- Use clear numbering only.\n\nSummary:\n${summaryText}`
        }
      ],
      temperature: 0.18,
      maxTokens: QUESTION_MAX_TOKENS
    });

    return res.json({ questions: questions || 'No questions generated.' });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ error: 'Question generation issue: ' + error.message });
  }
});

app.post('/api/generate-answers', async (req, res) => {
  const { contextSummary, questions, language } = req.body || {};
  const summaryText = String(contextSummary || '').trim().slice(0, 1600);
  const questionText = String(questions || '').trim().slice(0, 1600);

  if (!summaryText || !questionText) {
    return res.status(400).json({ error: 'Questions and summary are required before generating answers.' });
  }

  const targetLanguage = languageDisplayName(language || 'English');

  try {
    const answers = await generateText({
      messages: [
        { role: 'system', content: 'Answer using the summary only. Answers must be one word or one short line.' },
        {
          role: 'user',
          content: `Output language: ${targetLanguage}\n\nCreate short answers for these questions using the summary only.\nRules:\n- Keep the same numbering as questions.\n- Each answer must be one word or one short line.\n- Do not explain.\n- If the answer is missing, write "Not mentioned".\n\nQuestions:\n${questionText}\n\nSummary:\n${summaryText}`
        }
      ],
      temperature: 0.1,
      maxTokens: ANSWER_MAX_TOKENS
    });

    return res.json({ answers: answers || 'No answers generated.' });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ error: 'Answer generation issue: ' + error.message });
  }
});

app.post('/api/chat', async (req, res) => {
  const { message, contextSummary, chatHistory } = req.body || {};

  if (!message) return res.status(400).json({ error: 'Message is required.' });

  try {
    const compactHistory = (chatHistory || []).slice(-6);
    const messages = [
      {
        role: 'system',
        content: `Answer using the given summary context. Be concise.\n\nSummary Context:\n${String(contextSummary || '').slice(0, 3000)}`
      }
    ];

    compactHistory.forEach((msg) => {
      messages.push({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text });
    });

    messages.push({ role: 'user', content: message });

    const reply = await generateText({ messages, temperature: 0.5, maxTokens: CHAT_MAX_TOKENS });
    return res.json({ reply: reply || "I couldn't process that response." });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ error: 'Chat processing issue: ' + error.message });
  }
});


// ===================== PPT STUDIO HELPERS =====================
function extractJsonObject(text) {
  const raw = String(text || '').trim();
  const match = raw.match(/\{[\s\S]*\}/);
  return match ? match[0] : raw;
}

function escapeSvgText(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .slice(0, 80);
}

function makeAiSlideSvgDataUri(slide = {}, index = 0) {
  const source = `${slide.title || ''} ${slide.imagePrompt || ''} ${(slide.points || []).join(' ')}`.toLowerCase();
  const has = (words = []) => words.some((word) => source.includes(word));
  const cleanTitle = escapeSvgText(String(slide.title || `Slide ${index + 1}`).replace(/[^a-zA-Z0-9+.#\s-]/g, ' ').replace(/\s+/g, ' ').trim() || `Slide ${index + 1}`);

  let palette = ['0F172A', '2563EB', '38BDF8', 'E0F2FE'];
  let visual = '';
  let label1 = 'KEY IDEA';
  let label2 = 'PROCESS';
  let label3 = 'RESULT';

  if (has(['for loop', 'for-loop', 'while loop', 'loops', 'looping', 'iteration', 'iterate', 'iterative', 'programming', 'coding', 'code', 'javascript', 'python', 'java', 'c++', 'algorithm', 'array', 'arrays', 'variable', 'control flow', 'compiler'])) {
    palette = ['020617', '0EA5E9', 'A855F7', 'E0F2FE'];
    label1 = 'START';
    label2 = 'LOOP';
    label3 = 'REPEAT';
    visual = `
      <rect x="725" y="158" width="410" height="315" rx="34" fill="#E0F2FE" opacity="0.98"/>
      <rect x="775" y="205" width="310" height="170" rx="22" fill="#0F172A"/>
      <rect x="808" y="240" width="86" height="36" rx="18" fill="#22D3EE" opacity="0.96"/>
      <rect x="918" y="240" width="132" height="36" rx="18" fill="#A855F7" opacity="0.96"/>
      <rect x="842" y="304" width="168" height="38" rx="19" fill="#34D399" opacity="0.96"/>
      <path d="M815 402 C895 470 1036 434 1048 336" fill="none" stroke="#38BDF8" stroke-width="17" stroke-linecap="round"/>
      <path d="M1039 334 L1072 356 L1028 378" fill="none" stroke="#38BDF8" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="845" y="392" width="176" height="44" rx="22" fill="#FFFFFF" opacity="0.94"/>
    `;
  } else if (has(['database', 'sql', 'server', 'data structure', 'data structures', 'data analytics', 'machine learning', 'artificial intelligence', 'ai', 'technology', 'software', 'computer', 'system'])) {
    palette = ['020617', '0EA5E9', 'A855F7', 'E0F2FE'];
    label1 = 'DATA';
    label2 = 'SYSTEM';
    label3 = 'INSIGHT';
    visual = `
      <rect x="735" y="170" width="395" height="292" rx="34" fill="#E0F2FE" opacity="0.97"/>
      <circle cx="930" cy="260" r="68" fill="#0F172A"/>
      <circle cx="930" cy="260" r="31" fill="#38BDF8"/>
      <circle cx="810" cy="378" r="32" fill="#A855F7"/>
      <circle cx="1052" cy="378" r="32" fill="#22C55E"/>
      <path d="M884 303 L830 356 M976 303 L1032 356" fill="none" stroke="#0F172A" stroke-width="12" stroke-linecap="round" opacity="0.85"/>
      <rect x="845" y="405" width="170" height="44" rx="22" fill="#FFFFFF" opacity="0.94"/>
    `;
  } else if (has(['mobile', 'phone', 'smartphone', 'android', 'iphone', 'app', 'camera', 'device'])) {
    palette = ['0F172A', '06B6D4', '6366F1', 'ECFEFF'];
    label1 = 'MOBILE';
    label2 = 'APP';
    label3 = 'DEVICE';
    visual = `
      <rect x="835" y="154" width="190" height="332" rx="34" fill="#E0F2FE" opacity="0.98"/>
      <rect x="864" y="198" width="132" height="232" rx="20" fill="#0F172A"/>
      <circle cx="930" cy="455" r="13" fill="#94A3B8"/>
      <circle cx="930" cy="315" r="58" fill="#06B6D4" opacity="0.86"/>
      <rect x="798" y="505" width="265" height="44" rx="22" fill="#FFFFFF" opacity="0.94"/>
    `;
  } else if (has(['study', 'education', 'student', 'learning', 'book', 'books', 'lecture', 'class', 'school', 'college', 'exam', 'notes'])) {
    palette = ['0B1120', '7C3AED', '38BDF8', 'E0E7FF'];
    label1 = 'LEARN';
    label2 = 'PRACTICE';
    label3 = 'REVISE';
    visual = `
      <rect x="740" y="188" width="390" height="245" rx="34" fill="#F8FAFC" opacity="0.97"/>
      <rect x="795" y="240" width="116" height="142" rx="16" fill="#C4B5FD"/>
      <rect x="948" y="240" width="116" height="142" rx="16" fill="#7DD3FC"/>
      <rect x="924" y="240" width="18" height="142" rx="9" fill="#E2E8F0"/>
      <circle cx="930" cy="188" r="34" fill="#F59E0B"/>
      <rect x="815" y="455" width="230" height="44" rx="22" fill="#FFFFFF" opacity="0.94"/>
    `;
  } else if (has(['budget', 'expense', 'money', 'cost', 'price', 'finance', 'business', 'income', 'saving', 'savings'])) {
    palette = ['111827', '8B5CF6', '22D3EE', 'EDE9FE'];
    label1 = 'PLAN';
    label2 = 'SAVE';
    label3 = 'GROW';
    visual = `
      <rect x="748" y="184" width="374" height="260" rx="34" fill="#ffffff" opacity="0.96"/>
      <rect x="802" y="338" width="42" height="58" rx="12" fill="#A78BFA"/>
      <rect x="878" y="298" width="42" height="98" rx="12" fill="#22D3EE"/>
      <rect x="954" y="250" width="42" height="146" rx="12" fill="#34D399"/>
      <path d="M804 280 C858 238 914 236 982 204" fill="none" stroke="#8B5CF6" stroke-width="13" stroke-linecap="round"/>
      <rect x="835" y="464" width="200" height="44" rx="22" fill="#FFFFFF" opacity="0.94"/>
    `;
  } else if (has(['travel', 'city', 'bangalore', 'journey', 'location', 'map', 'route'])) {
    palette = ['0F172A', '06B6D4', 'F472B6', 'ECFEFF'];
    label1 = 'TRAVEL';
    label2 = 'ROUTE';
    label3 = 'PLACE';
    visual = `
      <rect x="748" y="196" width="374" height="226" rx="34" fill="#ffffff" opacity="0.96"/>
      <path d="M800 362 C858 298 913 352 970 292 C1002 258 1030 246 1080 232" fill="none" stroke="#06B6D4" stroke-width="18" stroke-linecap="round"/>
      <circle cx="800" cy="362" r="19" fill="#F472B6"/>
      <circle cx="1080" cy="232" r="19" fill="#22C55E"/>
      <rect x="840" y="452" width="190" height="44" rx="22" fill="#FFFFFF" opacity="0.94"/>
    `;
  } else if (has(['fitness', 'gym', 'workout', 'exercise', 'health'])) {
    palette = ['0B3B2E', '22C55E', '06B6D4', 'ECFDF5'];
    label1 = 'FITNESS';
    label2 = 'ENERGY';
    label3 = 'HEALTH';
    visual = `
      <rect x="748" y="200" width="374" height="215" rx="34" fill="#ffffff" opacity="0.96"/>
      <rect x="822" y="296" width="210" height="24" rx="12" fill="#0F172A"/>
      <circle cx="792" cy="308" r="34" fill="#22C55E"/>
      <circle cx="1062" cy="308" r="34" fill="#06B6D4"/>
      <rect x="842" y="445" width="186" height="44" rx="22" fill="#FFFFFF" opacity="0.94"/>
    `;
  } else if (has(['recipe', 'cooking', 'cook', 'food', 'meal', 'nutrition', 'diet', 'protein', 'vegetable', 'calorie', 'chicken', 'egg', 'rice', 'spice'])) {
    palette = ['0B3B2E', '22C55E', 'F97316', 'ECFDF5'];
    label1 = 'FOOD';
    label2 = 'NUTRITION';
    label3 = 'HEALTH';
    visual = `
      <ellipse cx="930" cy="322" rx="172" ry="124" fill="#ffffff" opacity="0.96"/>
      <ellipse cx="930" cy="322" rx="125" ry="86" fill="#DCFCE7"/>
      <circle cx="875" cy="300" r="28" fill="#F97316"/>
      <circle cx="925" cy="268" r="23" fill="#FACC15"/>
      <circle cx="990" cy="305" r="25" fill="#16A34A"/>
      <circle cx="950" cy="362" r="25" fill="#EF4444"/>
      <rect x="826" y="472" width="208" height="44" rx="22" fill="#FFFFFF" opacity="0.94"/>
    `;
  } else {
    palette = ['0F172A', 'EC4899', '22C55E', 'FDF2F8'];
    visual = `
      <circle cx="930" cy="304" r="112" fill="#ffffff" opacity="0.92"/>
      <circle cx="878" cy="288" r="34" fill="#EC4899" opacity="0.92"/>
      <circle cx="972" cy="274" r="29" fill="#22C55E" opacity="0.92"/>
      <circle cx="954" cy="354" r="41" fill="#38BDF8" opacity="0.92"/>
      <rect x="820" y="466" width="220" height="44" rx="22" fill="#FFFFFF" opacity="0.94"/>
    `;
  }

  const safeLabel1 = escapeSvgText(label1);
  const safeLabel2 = escapeSvgText(label2);
  const safeLabel3 = escapeSvgText(label3);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#${palette[0]}"/>
        <stop offset="55%" stop-color="#${palette[1]}"/>
        <stop offset="100%" stop-color="#${palette[2]}"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.46"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="#020617" flood-opacity="0.28"/>
      </filter>
    </defs>
    <rect width="1280" height="720" fill="url(#bg)"/>
    <circle cx="155" cy="130" r="190" fill="url(#glow)"/>
    <circle cx="1135" cy="625" r="230" fill="url(#glow)" opacity="0.62"/>
    <rect x="72" y="78" width="1136" height="565" rx="48" fill="#0B1220" opacity="0.16"/>
    <path d="M120 510 C255 418 338 548 486 428 C622 318 742 442 895 326 C984 258 1048 244 1160 210" fill="none" stroke="#ffffff" stroke-width="18" opacity="0.17" stroke-linecap="round"/>
    <g filter="url(#shadow)">
      <rect x="110" y="118" width="520" height="90" rx="28" fill="#ffffff" opacity="0.95"/>
      <text x="145" y="174" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="800" fill="#0F172A">${cleanTitle}</text>
      <rect x="132" y="262" width="145" height="56" rx="28" fill="#ffffff" opacity="0.92"/>
      <text x="165" y="299" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="800" fill="#0F172A">${safeLabel1}</text>
      <rect x="310" y="334" width="180" height="56" rx="28" fill="#ffffff" opacity="0.92"/>
      <text x="344" y="371" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="800" fill="#0F172A">${safeLabel2}</text>
      <rect x="165" y="438" width="172" height="56" rx="28" fill="#ffffff" opacity="0.92"/>
      <text x="199" y="475" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="800" fill="#0F172A">${safeLabel3}</text>
      <path d="M275 290 C346 290 350 356 310 362" fill="none" stroke="#ffffff" stroke-width="10" opacity="0.62" stroke-linecap="round"/>
      <path d="M490 362 C540 390 505 470 337 466" fill="none" stroke="#ffffff" stroke-width="10" opacity="0.62" stroke-linecap="round"/>
      <g>${visual}</g>
      <text x="872" y="424" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="800" fill="#0F172A" text-anchor="middle">${safeLabel1}</text>
      <text x="930" y="424" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="800" fill="#0F172A" text-anchor="middle">${safeLabel2}</text>
      <text x="988" y="424" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="800" fill="#0F172A" text-anchor="middle">${safeLabel3}</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}


function getPptImageApiKey() {
  return String(process.env.STABILITY_API_KEY || process.env.IMAGE_API_KEY || '').trim();
}

function buildPptImagePromptForSlides(slides = [], pairNumber = 1) {
  const joined = slides.map((slide) => {
    const title = slide?.title || '';
    const imagePrompt = slide?.imagePrompt || '';
    const points = Array.isArray(slide?.points) ? slide.points.join(' ') : '';
    return `${title} ${imagePrompt} ${points}`;
  }).join(' ');

  const raw = joined.toLowerCase();
  const has = (words = []) => words.some((word) => raw.includes(word));

  const topicText = joined
    .replace(/[^a-zA-Z0-9+.#\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 420);

  let scene = `a realistic professional presentation image that visually represents this exact learning topic: ${topicText}. Use symbolic objects connected to the topic, clean modern composition, no text anywhere`;
  let strictAvoid = 'random food, meals, plates, vegetables, restaurant items, unrelated objects';

  if (has(['for loop', 'for-loop', 'loops', 'looping', 'iteration', 'iterate', 'iterative', 'programming', 'coding', 'code', 'javascript', 'python', 'java', 'c++', 'algorithm', 'array', 'arrays', 'variable', 'control flow', 'compiler'])) {
    scene = 'a realistic technology learning scene for programming loops: laptop with a completely blank abstract blue screen, glowing circular loop arrows, small connected blocks, keyboard, notebook with blank pages, modern coding classroom desk, no code text and no letters';
    strictAvoid = 'food, meals, vegetables, fruits, plates, restaurant items, people eating, unrelated lifestyle objects';
  } else if (has(['database', 'sql', 'server', 'data structure', 'data structures', 'data analytics', 'machine learning', 'artificial intelligence', 'ai'])) {
    scene = 'a realistic technology education scene with server lights, laptop with blank abstract data visualization shapes, connected nodes, clean desk, blue neon lighting, no readable text';
    strictAvoid = 'food, meals, vegetables, fruits, plates, restaurant items, unrelated household objects';
  } else if (has(['mobile', 'phone', 'smartphone', 'android', 'iphone', 'app', 'camera', 'device'])) {
    scene = 'a realistic modern smartphone on a clean desk with a blank dark screen, wireless earbuds and soft technology lighting, premium product photography style, no screen text';
    strictAvoid = 'food, meals, vegetables, restaurant items, random books unrelated to mobile technology';
  } else if (has(['study', 'education', 'student', 'learning', 'book', 'books', 'lecture', 'class', 'school', 'college', 'exam', 'notes'])) {
    scene = 'a realistic study desk with closed books, laptop with a blank screen, pencils, coffee cup, warm lamp light, neat student workspace, no visible writing';
    strictAvoid = 'food plates, restaurant items, unrelated cooking items';
  } else if (has(['budget', 'expense', 'money', 'cost', 'price', 'finance', 'business', 'income', 'saving', 'savings'])) {
    scene = 'a realistic finance planning scene with coins, piggy bank, wallet, calculator with blank display, and clean desk objects, professional business lighting, no paper text and no numbers';
    strictAvoid = 'food, meals, vegetables, restaurant items, unrelated study objects';
  } else if (has(['travel', 'city', 'bangalore', 'journey', 'location', 'map', 'route'])) {
    scene = 'a realistic city travel scene with backpack, sunglasses, and a blurred city background, cinematic natural light, no map text and no signs';
    strictAvoid = 'food plates, restaurant menus, random cooking items';
  } else if (has(['fitness', 'gym', 'workout', 'exercise', 'health'])) {
    scene = 'a realistic fitness scene with gym equipment, water bottle, towel, bright natural light, no written text';
    strictAvoid = 'restaurant meals, random plates, unrelated food closeups';
  } else if (has(['recipe', 'cooking', 'cook', 'food', 'meal', 'nutrition', 'diet', 'protein', 'vegetable', 'calorie', 'chicken', 'egg', 'rice', 'spice'])) {
    scene = 'a realistic food or nutrition learning scene directly related to the slide topic, clean table setup, natural light, no packaging and no readable text';
    strictAvoid = 'unrelated technology objects, unrelated city travel objects';
  }

  return `Generate one realistic high-quality 16:9 PowerPoint image.

Exact slide topic:
${topicText || 'learning presentation topic'}

Scene to create:
${scene}

Strict relevance rules:
- The image must match the exact slide topic above.
- Do not create random food or lifestyle images unless the topic is clearly food, cooking, diet, or nutrition.
- If the topic is programming, loops, algorithms, data, software, or computer science, show technology/learning visuals only.
- Use objects and scenery only; no educational poster, no infographic, no chart.

Image style:
- realistic photography
- professional presentation image
- clean composition
- cinematic natural lighting
- high detail

Critical text rule:
The image must contain absolutely zero readable or unreadable text.

Do NOT include:
- ${strictAvoid}
- words, letters, numbers, symbols, captions, headings, labels, menus, signs
- text on paper, books, notebooks, worksheets, receipts, menus, packaging, boards, screens, phones, laptops, clothes, walls, or any object
- logos, brand names, watermarks
- bullet points or chart text`;
}

async function generateStabilityPptImageDataUri(promptText = '') {
  const apiKey = getPptImageApiKey();
  if (!apiKey) {
    const error = new Error('STABILITY_API_KEY is missing. Add it in server/.env.');
    error.statusCode = 400;
    throw error;
  }

  const formData = new FormData();
  formData.append('prompt', String(promptText || '').slice(0, 1800));
  formData.append('negative_prompt', 'unrelated food, random meal, plate of food, vegetables when topic is not food, restaurant scene when topic is not food, text, words, letters, numbers, digits, symbols, typography, caption, captions, subtitle, subtitles, label, labels, sign, signage, handwriting, printed text, menu, receipt, paper writing, notebook writing, book text, board writing, screen text, phone screen text, laptop screen text, package label, brand name, logo, watermark, poster, infographic, bullet points, chart labels, fake language, gibberish text, unreadable text, random characters, blurry, low quality, distorted');
  formData.append('aspect_ratio', '16:9');
  formData.append('output_format', 'png');

  console.log('[PPT Image Prompt]', String(promptText || '').slice(0, 500));

  const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/core', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'image/*'
    },
    body: formData
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    const error = new Error(`Stability image generation failed. Status ${response.status}: ${details.slice(0, 500)}`);
    error.statusCode = response.status;
    throw error;
  }

  const contentType = response.headers.get('content-type') || 'image/png';
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return `data:${contentType};base64,${base64}`;
}

function normalizePptTable(table = {}) {
  const headers = Array.isArray(table.headers)
    ? table.headers.slice(0, 10).map((header) => String(header || '').slice(0, 40))
    : [];

  const rows = Array.isArray(table.rows)
    ? table.rows.slice(0, 10).map((row) =>
        Array.isArray(row)
          ? row.slice(0, 10).map((cell) => String(cell || '').slice(0, 80))
          : []
      )
    : [];

  if (!headers.length || !rows.length) return null;
  return { headers, rows, tableX: Number(table.tableX ?? 0.9), tableY: Number(table.tableY ?? 4.65), tableW: Number(table.tableW ?? 6.15), tableH: Number(table.tableH ?? 1.65) };
}

function normalizePptPlan(plan = {}) {
  const cleanSlides = Array.isArray(plan.slides) ? plan.slides : [];

  return {
    title: String(plan.title || 'Brief Bot Presentation').slice(0, 120),
    subtitle: String(plan.subtitle || 'AI-generated presentation from summary').slice(0, 180),
    fontFamily: String(plan.fontFamily || 'Aptos').slice(0, 40),
    fontStyle: String(plan.fontStyle || 'modern').slice(0, 40),
    slides: cleanSlides.slice(0, 14).map((slide, index) => {
      const cleanSlide = {
        id: slide.id || `slide-${Date.now()}-${index}`,
        title: String(slide.title || `Slide ${index + 1}`).slice(0, 120),
        points: Array.isArray(slide.points)
          ? slide.points.slice(0, 7).map((point) => String(point || '').slice(0, 220)).filter(Boolean)
          : [],
        speakerNote: String(slide.speakerNote || '').slice(0, 900),
        imagePrompt: String(slide.imagePrompt || `AI learning visual for slide ${index + 1}`).slice(0, 520),
        imageUrl: String(slide.imageUrl || '').trim(),
        aiImageData: String(slide.aiImageData || '').trim(),
        imageMode: String(slide.imageMode || 'ai').trim(),
        imageX: Number(slide.imageX ?? 7.25),
        imageY: Number(slide.imageY ?? 1.65),
        imageW: Number(slide.imageW ?? 4.65),
        imageH: Number(slide.imageH ?? 3.55),
        pointsX: Number(slide.pointsX ?? 0.95),
        pointsY: Number(slide.pointsY ?? 1.55),
        pointsW: Number(slide.pointsW ?? ((String(slide.imageMode || 'ai') !== 'none' && (slide.aiImageData || slide.imageUrl)) ? 5.95 : 11.0)),
        pointsH: Number(slide.pointsH ?? ((String(slide.imageMode || 'ai') !== 'none' && (slide.aiImageData || slide.imageUrl)) ? 3.75 : 4.75)),
        pointsFontSize: Math.max(10, Math.min(34, Number(slide.pointsFontSize ?? 18))),
        table: normalizePptTable(slide.table || {})
      };

      if (cleanSlide.aiImageData && !cleanSlide.aiImageData.startsWith('data:image/')) {
        cleanSlide.aiImageData = '';
      }

      return cleanSlide;
    }).filter((slide) => slide.title || slide.points.length)
  };
}

app.post('/api/ppt/plan', async (req, res) => {
  try {
    const { summary, title, language, userId } = req.body || {};
    const summaryText = String(summary || '').trim();

    if (!summaryText || summaryText.length < 80) {
      return res.status(400).json({ error: 'Generate a proper summary first, then create PPT.' });
    }

    const targetLanguage = languageDisplayName(language || 'English');

    const rawPlan = await generateText({
      messages: [
        {
          role: 'system',
          content: `You are a senior presentation designer and teacher.
Create detailed, student-friendly PPT slide content from a short video summary.
The PPT must be richer than the summary, but must stay connected to the given summary.
Return only valid JSON.`
        },
        {
          role: 'user',
          content: `Create an editable PPT plan in ${targetLanguage}.

Return ONLY JSON in this format:
{
  "title": "Clear presentation title",
  "subtitle": "Short subtitle",
  "slides": [
    {
      "title": "Slide title",
      "points": [
        "Detailed bullet point 1",
        "Detailed bullet point 2",
        "Detailed bullet point 3",
        "Detailed bullet point 4"
      ],
      "speakerNote": "Short explanation for presenting this slide",
      "imagePrompt": "Very specific visual idea directly matching this slide topic. For programming topics, mention laptop, loop arrows, flow blocks, or abstract technology visuals. Never suggest food unless the slide is about food."
    }
  ]
}

Important rules:
- Create 8 to 12 slides.
- Each slide must contain 4 to 7 useful points.
- Expand the summary into presentation points.
- Add definitions, examples, benefits, steps, comparisons, and key takeaways wherever suitable.
- Keep points clear and simple for students.
- Do not create fake facts unrelated to the summary.
- Do not use markdown.
- Do not include timestamps unless they are important. Never repeat the same timestamp twice in one sentence.
- Make the PPT useful even if the summary is short.
- Every imagePrompt must be directly related to the slide title and points.
- For programming, coding, algorithms, loops, data, or computer science topics, imagePrompt must clearly request technology/learning visuals, not food or lifestyle objects.
- Never suggest food images unless the actual summary is about food, cooking, diet, or nutrition.

Presentation topic/title hint:
${String(title || '').slice(0, 200)}

Summary:
${summaryText.slice(0, 7000)}`
        }
      ],
      temperature: 0.22,
      maxTokens: 3200
    });

    let parsedPlan;
    try {
      parsedPlan = JSON.parse(extractJsonObject(rawPlan));
    } catch (error) {
      console.error('[PPT JSON Parse Error]', rawPlan);
      return res.status(500).json({ error: 'AI generated invalid PPT format. Click Generate PPT again.' });
    }

    const pptPlan = normalizePptPlan(parsedPlan);

    if (!pptPlan.slides.length) {
      return res.status(500).json({ error: 'No slides were generated. Try again.' });
    }

    if (userId) {
      await addActivity({
        userId,
        type: 'ppt_plan_generated',
        meta: { slideCount: pptPlan.slides.length, title: pptPlan.title }
      });
    }

    return res.json({ ok: true, pptPlan });
  } catch (error) {
    console.error('[PPT Plan Error]', error);
    return res.status(error.statusCode || 500).json({
      error: 'PPT plan generation issue: ' + error.message
    });
  }
});


function addPptThemeDecorations(slide, pptx, style) {
  const accent = style.accent;
  const accent2 = style.accent2 || style.accent;

  if (style.layout === 'floral') {
    slide.addShape(pptx.ShapeType.ellipse, { x: 0.25, y: 0.25, w: 0.42, h: 0.42, fill: { color: accent, transparency: 18 }, line: { color: accent, transparency: 100 } });
    slide.addShape(pptx.ShapeType.ellipse, { x: 0.56, y: 0.43, w: 0.32, h: 0.32, fill: { color: accent2, transparency: 25 }, line: { color: accent2, transparency: 100 } });
    slide.addShape(pptx.ShapeType.arc, { x: 11.65, y: 5.85, w: 1.1, h: 0.7, line: { color: accent, transparency: 20, width: 2 } });
  } else if (style.layout === 'art') {
    slide.addShape(pptx.ShapeType.arc, { x: 0.55, y: 0.55, w: 2.6, h: 0.85, line: { color: accent, transparency: 10, width: 5 } });
    slide.addShape(pptx.ShapeType.arc, { x: 9.75, y: 5.8, w: 2.5, h: 0.9, line: { color: accent2, transparency: 15, width: 5 } });
    slide.addShape(pptx.ShapeType.rect, { x: 0.0, y: 6.95, w: 13.33, h: 0.08, fill: { color: accent2, transparency: 18 }, line: { color: accent2, transparency: 100 } });
  } else if (style.layout === 'corporate') {
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: accent }, line: { color: accent } });
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.12, fill: { color: accent2 }, line: { color: accent2 } });
  } else if (style.layout === 'chalkboard') {
    slide.addShape(pptx.ShapeType.line, { x: 0.7, y: 1.03, w: 11.95, h: 0, line: { color: accent2, transparency: 35, width: 1.2 } });
    slide.addShape(pptx.ShapeType.line, { x: 0.7, y: 6.85, w: 11.95, h: 0, line: { color: accent2, transparency: 48, width: 1 } });
  } else {
    slide.addShape(pptx.ShapeType.line, { x: 0.6, y: 1.05, w: 12.0, h: 0, line: { color: accent, transparency: 20, width: 1.4 } });
    slide.addShape(pptx.ShapeType.line, { x: 0.6, y: 1.16, w: 7.8, h: 0, line: { color: accent2, transparency: 35, width: 1.0 } });
  }
}



app.post('/api/ppt/images/generate', async (req, res) => {
  try {
    const { pptPlan, plan, every, startIndex, count } = req.body || {};
    const normalizedPlan = normalizePptPlan(pptPlan || plan || {});
    const slides = Array.isArray(normalizedPlan.slides) ? normalizedPlan.slides : [];

    if (!slides.length) {
      return res.status(400).json({ error: 'PPT slides are required to generate images.' });
    }

    const everyN = Math.max(1, Math.min(4, Number(every || process.env.PPT_IMAGE_EVERY_N_SLIDES || 2)));
    const hasSpecificStart = startIndex !== undefined && startIndex !== null && startIndex !== '';
    const firstIndex = hasSpecificStart ? Math.max(0, Math.min(slides.length - 1, Number(startIndex) || 0)) : 0;
    const lastIndex = hasSpecificStart ? Math.min(slides.length, firstIndex + Math.max(1, Number(count || everyN))) : slides.length;

    const errors = [];
    let generatedCount = 0;

    for (let i = firstIndex; i < lastIndex; i += everyN) {
      const group = slides.slice(i, Math.min(i + everyN, lastIndex));
      if (!group.length) continue;

      const prompt = buildPptImagePromptForSlides(group, Math.floor(i / everyN) + 1);
      const useSafeEnglishImages = String(process.env.PPT_SAFE_ENGLISH_IMAGES || 'true').toLowerCase() !== 'false';

      try {
        const imageDataUri = useSafeEnglishImages
          ? makeAiSlideSvgDataUri(group[0], i)
          : await generateStabilityPptImageDataUri(prompt);
        generatedCount += 1;

        for (let offset = 0; offset < group.length; offset++) {
          const slideIndex = i + offset;
          slides[slideIndex] = {
            ...slides[slideIndex],
            imageMode: 'ai',
            aiImageData: imageDataUri,
            imageUrl: '',
            imagePrompt: useSafeEnglishImages
              ? 'Safe English visual generated locally. Text is rendered by Brief Bot, not AI image text.'
              : prompt
          };
        }
      } catch (imageError) {
        console.error('[PPT Stability Image Error]', imageError.message);
        errors.push(`Slides ${i + 1}-${Math.min(i + everyN, slides.length)}: ${imageError.message}`);
      }
    }

    return res.json({
      ok: true,
      generatedCount,
      every: everyN,
      errors,
      pptPlan: {
        ...normalizedPlan,
        slides
      }
    });
  } catch (error) {
    console.error('[PPT Image API Error]', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to generate PPT images.'
    });
  }
});


async function imageUrlToDataUri(imageUrl = '') {
  const source = String(imageUrl || '').trim();
  if (!source) return '';
  if (source.startsWith('data:image/')) return source;

  try {
    const response = await axios.get(source, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });

    const contentType = response.headers?.['content-type'] || 'image/jpeg';
    const base64 = Buffer.from(response.data).toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.log('[PPT Image Fetch Skipped]', error.message);
    return '';
  }
}

function getPptTemplateStyle(template = 'floral') {
  const styles = {
    floral: {
      bg: 'FFF7FB',
      panel: 'FFFFFF',
      title: '9D174D',
      text: '3B2F2F',
      muted: '9CA3AF',
      accent: 'F472B6',
      accent2: 'BBF7D0'
    },
    art: {
      bg: 'FFF7ED',
      panel: 'FFFBEB',
      title: '7C2D12',
      text: '3B2F2F',
      muted: '9CA3AF',
      accent: 'F59E0B',
      accent2: 'FDBA74'
    },
    corporate: {
      bg: 'EFF6FF',
      panel: 'FFFFFF',
      title: '1D4ED8',
      text: '1F2937',
      muted: '64748B',
      accent: '2563EB',
      accent2: '38BDF8'
    },
    academic: {
      bg: 'ECFDF5',
      panel: 'FFFFFF',
      title: '047857',
      text: '1F2937',
      muted: '64748B',
      accent: '10B981',
      accent2: '6EE7B7'
    },
    modern: {
      bg: 'F5F3FF',
      panel: 'FFFFFF',
      title: '6D28D9',
      text: '1F2937',
      muted: '64748B',
      accent: '8B5CF6',
      accent2: '22D3EE'
    }
  };

  return styles[template] || styles.floral;
}





function getPptFontStyleMetaBackend(style = 'modern') {
  const map = {
    modern: { titleBold: true, titleSize: 27, bodyBold: false, bodySize: 15.5 },
    bold: { titleBold: true, titleSize: 28, bodyBold: true, bodySize: 16 },
    classic: { titleBold: true, titleSize: 26, bodyBold: false, bodySize: 15 },
    minimal: { titleBold: false, titleSize: 25, bodyBold: false, bodySize: 14.5 }
  };
  return map[style] || map.modern;
}

async function savePptRecordToFirebase({ userId = '', title = 'Brief Bot Presentation', subtitle = '', actionType = 'exported', slideCount = 0, template = 'floral', fileName = '', pptPlan = null } = {}) {
  try {
    const cleanUserId = String(userId || '').trim();
    if (!cleanUserId) return null;

    const finalTitle = String(title || pptPlan?.title || 'Brief Bot Presentation').slice(0, 160);
    const finalSubtitle = String(subtitle || pptPlan?.subtitle || '').slice(0, 220);
    const finalSlideCount = Number(slideCount || pptPlan?.slides?.length || 0);
    const finalTemplate = String(template || 'floral').slice(0, 40);
    const finalActionType = String(actionType || 'exported').slice(0, 40);
    const createdAt = nowISO();

    const record = {
      userId: cleanUserId,
      title: finalTitle,
      subtitle: finalSubtitle,
      actionType: finalActionType,
      slideCount: finalSlideCount,
      template: finalTemplate,
      fileName: String(fileName || `${finalTitle.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'briefbot-presentation'}.pptx`).slice(0, 180),
      savedAt: createdAt,
      createdAt,
      updatedAt: createdAt
    };

    const userPptRef = usersCollection.doc(cleanUserId).collection('savedPpts').doc();
    await userPptRef.set(record);

    await firestoreDb.collection('pptHistory').doc(userPptRef.id).set({
      ...record,
      pptId: userPptRef.id
    }, { merge: true });

    const userDoc = await usersCollection.doc(cleanUserId).get();
    if (userDoc.exists) {
      const currentCount = Number(userDoc.data()?.pptsGenerated || 0);
      await usersCollection.doc(cleanUserId).set({ pptsGenerated: currentCount + 1, updatedAt: createdAt }, { merge: true });
    }

    return safePptItem({ id: userPptRef.id, data: () => record });
  } catch (error) {
    console.error('[PPT Firebase Save Skipped]', error.message);
    return null;
  }
}

app.post('/api/ppt/export', async (req, res) => {
  try {
    const { pptPlan, template = 'neon', userId, saveRecord = true, actionType = 'exported' } = req.body || {};

    const plan = normalizePptPlan(pptPlan);
    if (!plan.slides.length) {
      return res.status(400).json({ error: 'No slides available to export.' });
    }

    const style = getPptTemplateStyle(template);
    const fontStyleMeta = getPptFontStyleMetaBackend(plan.fontStyle || 'modern');

    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.author = 'Brief Bot';
    pptx.subject = 'AI-generated PPT from Brief Bot';
    pptx.title = plan.title;

    pptx.theme = {
      headFontFace: plan.fontFamily || 'Aptos Display',
      bodyFontFace: plan.fontFamily || 'Aptos',
      lang: 'en-US'
    };

    const addFooter = (slide, slideNumber) => {
      slide.addText('Generated by Brief Bot', {
        x: 0.5,
        y: 7.05,
        w: 4.5,
        h: 0.22,
        fontSize: 8,
        color: style.muted
      });

      slide.addText(String(slideNumber), {
        x: 12.25,
        y: 7.05,
        w: 0.45,
        h: 0.22,
        fontSize: 8,
        color: style.muted,
        align: 'right'
      });
    };

    let slideNumber = 1;

    const cover = pptx.addSlide();
    cover.background = { color: style.bg };
    addPptThemeDecorations(cover, pptx, style);

    cover.addShape(pptx.ShapeType.rect, {
      x: 0.65,
      y: 0.55,
      w: 12.0,
      h: 6.3,
      fill: { color: style.panel, transparency: 2 },
      line: { color: style.accent, transparency: 45 }
    });

    cover.addText(plan.title, {
      x: 1.0,
      y: 2.25,
      w: 11.2,
      h: 0.85,
      fontSize: 36,
      bold: fontStyleMeta.titleBold,
      color: style.title,
      fit: 'shrink',
      align: 'center'
    });

    cover.addText(plan.subtitle, {
      x: 1.8,
      y: 3.2,
      w: 9.6,
      h: 0.45,
      fontSize: 17,
      color: style.accent,
      align: 'center',
      fit: 'shrink'
    });

    cover.addShape(pptx.ShapeType.rect, {
      x: 5.45,
      y: 3.95,
      w: 2.4,
      h: 0.07,
      fill: { color: style.accent2 || style.accent },
      line: { color: style.accent2 || style.accent }
    });

    addFooter(cover, slideNumber++);

    for (const slideData of plan.slides) {
      const slide = pptx.addSlide();
      slide.background = { color: style.bg };
      addPptThemeDecorations(slide, pptx, style);

      slide.addText(slideData.title, {
        x: 0.65,
        y: 0.42,
        w: 12.0,
        h: 0.5,
        fontSize: fontStyleMeta.titleSize,
        bold: fontStyleMeta.titleBold,
        color: style.title,
        fit: 'shrink'
      });

      slide.addShape(pptx.ShapeType.rect, {
        x: 0.7,
        y: 1.15,
        w: (slideData.imageMode !== 'none' && (slideData.aiImageData || slideData.imageUrl)) ? 7.6 : 11.95,
        h: 5.55,
        fill: { color: style.panel, transparency: 3 },
        line: { color: style.accent, transparency: 70 }
      });

      const points = Array.isArray(slideData.points) ? slideData.points.slice(0, 7) : [];
      const pointsX = Number(slideData.pointsX ?? 1.0);
      const pointsY = Number(slideData.pointsY ?? 1.45);
      const pointsW = Number(slideData.pointsW ?? ((slideData.imageMode !== 'none' && (slideData.aiImageData || slideData.imageUrl)) ? 6.15 : 10.9));
      const pointsH = Number(slideData.pointsH ?? ((slideData.imageMode !== 'none' && (slideData.aiImageData || slideData.imageUrl)) ? 3.8 : 4.8));
      const pointGap = Math.max(0.42, pointsH / Math.max(points.length, 4));
      const pointFontSize = Math.max(10, Math.min(34, Number(slideData.pointsFontSize ?? fontStyleMeta.bodySize)));

      points.forEach((point, index) => {
        const y = pointsY + 0.22 + index * pointGap;

        slide.addText('•', {
          x: pointsX + 0.18,
          y,
          w: 0.22,
          h: 0.26,
          fontSize: pointFontSize + 1.2,
          bold: true,
          color: style.accent
        });

        slide.addText(String(point), {
          x: pointsX + 0.5,
          y: y - 0.02,
          w: Math.max(1.5, pointsW - 0.72),
          h: Math.max(0.28, pointGap * 0.88),
          fontSize: pointFontSize,
          bold: fontStyleMeta.bodyBold,
          color: style.text,
          fit: 'shrink',
          breakLine: false,
          margin: 0.01,
          valign: 'mid'
        });
      });

      let selectedImageData = '';
      if (slideData.imageMode !== 'none') {
        selectedImageData = slideData.imageMode === 'manual'
          ? await imageUrlToDataUri(slideData.imageUrl)
          : (slideData.aiImageData || await imageUrlToDataUri(slideData.imageUrl));

        if (!selectedImageData) {
          selectedImageData = makeAiSlideSvgDataUri(slideData, slideNumber);
        }
      }

      if (selectedImageData) {
        slide.addImage({
          data: selectedImageData,
          x: Number(slideData.imageX || 7.25),
          y: Number(slideData.imageY || 1.65),
          w: Number(slideData.imageW || 4.65),
          h: Number(slideData.imageH || 3.55)
        });
      }

      if (slideData.table?.headers?.length && slideData.table?.rows?.length) {
        const tableRows = [slideData.table.headers, ...slideData.table.rows].map((row) =>
          row.map((cell) => ({ text: String(cell || ''), options: { fontSize: Math.max(6.5, 11 - Math.max((slideData.table?.headers?.length || 1), (slideData.table?.rows?.length || 0) + 1) * 0.35), color: style.text } }))
        );
        slide.addTable(tableRows, {
          x: Number(slideData.table.tableX || 0.9),
          y: Number(slideData.table.tableY || 4.65),
          w: Number(slideData.table.tableW || 6.15),
          h: Number(slideData.table.tableH || 1.65),
          border: { type: 'solid', color: style.accent, pt: 0.5 },
          fill: { color: style.panel, transparency: 5 },
          margin: 0.04
        });
      }

      if (slideData.speakerNote) {
        slide.addNotes(String(slideData.speakerNote));
      }

      addFooter(slide, slideNumber++);
    }

    const buffer = await pptx.write({ outputType: 'nodebuffer' });

    if (userId) {
      await addActivity({
        userId,
        type: 'ppt_exported',
        meta: { title: plan.title, slideCount: plan.slides.length, template }
      });
    }

    const safeFileName = String(plan.title || 'briefbot-presentation')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 70) || 'briefbot-presentation';

    if (userId && saveRecord) {
      await savePptRecordToFirebase({
        userId,
        title: plan.title,
        subtitle: plan.subtitle,
        slideCount: plan.slides.length,
        pptPlan: plan,
        template,
        fileName: `${safeFileName}.pptx`,
        actionType
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}.pptx"`);
    return res.send(buffer);
  } catch (error) {
    console.error('[PPT Export Error]', error);
    return res.status(error.statusCode || 500).json({
      error: 'PPT export issue: ' + error.message
    });
  }
});

app.get('/api/ppt/recent/:userId', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    const cleanUserId = String(req.params.userId || '').trim();
    if (!cleanUserId) return res.status(400).json({ error: 'User ID is required.' });

    const userDoc = await usersCollection.doc(cleanUserId).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found.' });

    const byId = new Map();
    const addPpt = (item) => {
      const safe = safePptItem(item);
      const key = safe.id || `${safe.title}-${safe.createdAt}`;
      if (key && !byId.has(key)) byId.set(key, safe);
    };

    try {
      const snapshot = await usersCollection
        .doc(cleanUserId)
        .collection('savedPpts')
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();
      snapshot.docs.forEach(addPpt);
    } catch (savedError) {
      console.error('[Recent PPTs savedPpts Warning]', savedError.message);
    }

    try {
      const historySnapshot = await firestoreDb
        .collection('pptHistory')
        .where('userId', '==', cleanUserId)
        .limit(20)
        .get();
      historySnapshot.docs.forEach(addPpt);
    } catch (historyError) {
      console.error('[Recent PPTs pptHistory Warning]', historyError.message);
    }

    if (byId.size === 0) {
      try {
        const activitySnapshot = await activitiesCollection
          .where('userId', '==', cleanUserId)
          .where('type', 'in', ['ppt_exported', 'ppt_saved', 'ppt_plan_generated'])
          .limit(30)
          .get();

        activitySnapshot.docs.forEach((doc) => {
          const data = doc.data() || {};
          addPpt({
            id: doc.id,
            userId: cleanUserId,
            title: data.meta?.title || 'Brief Bot PPT',
            subtitle: data.type === 'ppt_plan_generated' ? 'PPT plan generated' : '',
            actionType: data.type === 'ppt_saved' ? 'saved' : data.type === 'ppt_exported' ? 'exported' : 'generated',
            slideCount: Number(data.meta?.slideCount || 0),
            template: data.meta?.template || 'template',
            createdAt: data.createdAt || null,
            updatedAt: data.createdAt || null
          });
        });
      } catch (activityError) {
        console.error('[Recent PPTs Activity Warning]', activityError.message);
      }
    }

    const ppts = Array.from(byId.values())
      .sort((a, b) => String(b.createdAt || b.savedAt || '').localeCompare(String(a.createdAt || a.savedAt || '')))
      .slice(0, 12);

    return res.json({ ok: true, ppts });
  } catch (error) {
    console.error('[Recent PPTs Error]', error);
    return res.status(500).json({ error: error.message });
  }
});

// ===================== END PPT STUDIO =====================


// ---------------- BATTLE ROOM ENHANCEMENTS ----------------

function generateBattleRoomCode() {
  return `BB-${Math.floor(10000 + Math.random() * 90000)}`;
}

function normalizeBattleRoomCode(code = '') {
  const raw = String(code || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!raw) return '';
  return raw.startsWith('BB-') ? raw : `BB-${raw.replace(/^BB-?/, '')}`;
}

function calculateBattleAchievement(percentage, rank, timeTakenSeconds) {
  if (rank === 1 && percentage >= 80) return '🏆 Battle Champion';
  if (percentage >= 90) return '🎯 Accuracy King';
  if (percentage >= 80 && timeTakenSeconds <= 8 * 60) return '⚡ Speed Master';
  if (percentage >= 70) return '🚀 Rising Star';
  if (percentage >= 50) return '📘 Steady Learner';
  return '💪 Keep Practicing';
}

function calculateBattleRemarks(percentage) {
  if (percentage >= 90) return 'Excellent performance. You understood the concept very well.';
  if (percentage >= 75) return 'Great work. Revise the missed questions once.';
  if (percentage >= 50) return 'Good attempt. Focus on weak areas and try again.';
  return 'Needs improvement. Rewatch the summary and practice again.';
}

function safeBattleRoom(doc) {
  const data = doc.data ? doc.data() : doc;
  const players = data.players || {};
  return {
    id: doc.id || data.id,
    roomCode: data.roomCode || '',
    hostId: data.hostId || '',
    hostName: data.hostName || '',
    title: data.title || 'Battle Room',
    status: data.status || 'waiting',
    questionCount: Number(data.questionCount || 20),
    timerMinutes: Number(data.timerMinutes || 20),
    difficulty: data.difficulty || 'medium',
    questionType: data.questionType || 'mcq',
    createdAt: data.createdAt || null,
    startedAt: data.startedAt || null,
    endsAt: data.endsAt || null,
    completedAt: data.completedAt || null,
    players: Object.keys(players).map((id) => ({ userId: id, ...players[id] })),
    leaderboard: Array.isArray(data.leaderboard) ? data.leaderboard : [],
    questions: Array.isArray(data.questions) ? data.questions : []
  };
}

async function getBattleRoomByCode(roomCode) {
  const code = normalizeBattleRoomCode(roomCode);
  if (!code) return null;
  const snapshot = await firestoreDb.collection('battleRooms').where('roomCode', '==', code).limit(1).get();
  if (snapshot.empty) return null;
  return snapshot.docs[0];
}

async function updateBattleLeaderboard(roomRef) {
  const roomDoc = await roomRef.get();
  if (!roomDoc.exists) return [];
  const data = roomDoc.data() || {};
  const players = data.players || {};

  const leaderboard = Object.keys(players)
    .map((userId) => ({ userId, ...players[userId] }))
    .filter((player) => player.submitted)
    .sort((a, b) => {
      const scoreDiff = Number(b.score || 0) - Number(a.score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return Number(a.timeTakenSeconds || 999999) - Number(b.timeTakenSeconds || 999999);
    })
    .map((player, index) => ({
      ...player,
      rank: index + 1,
      achievement: calculateBattleAchievement(Number(player.percentage || 0), index + 1, Number(player.timeTakenSeconds || 0)),
      remarks: calculateBattleRemarks(Number(player.percentage || 0))
    }));

  const playerUpdates = {};
  leaderboard.forEach((player) => {
    playerUpdates[`players.${player.userId}.rank`] = player.rank;
    playerUpdates[`players.${player.userId}.achievement`] = player.achievement;
    playerUpdates[`players.${player.userId}.remarks`] = player.remarks;
  });

  await roomRef.set({ leaderboard, ...playerUpdates, updatedAt: nowISO() }, { merge: true });
  return leaderboard;
}

async function addBattleRoomActivity(userId, type, meta = {}) {
  if (!userId) return;
  await addActivity({ userId, type, meta });
}

// Create a Battle Room from current summary. Fixed 20 questions and 20 minutes.
app.post('/api/battle-rooms/create', async (req, res) => {
  try {
    const { userId, hostName, summary, title, language, questionType = 'mcq', difficulty = 'medium' } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId is required.' });
    if (!String(summary || '').trim()) return res.status(400).json({ error: 'Generate a summary first to create a Battle Room.' });

    let roomCode = generateBattleRoomCode();
    for (let i = 0; i < 5; i++) {
      const exists = await getBattleRoomByCode(roomCode);
      if (!exists) break;
      roomCode = generateBattleRoomCode();
    }

    const cleanType = ['mcq', 'fill_blank', 'descriptive', 'sjt', 'mixed'].includes(questionType) ? questionType : 'mcq';
    const questions = await generateAssessmentQuestions({
      summary,
      questionType: cleanType,
      difficulty,
      language,
      questionCount: 20
    });

    if (questions.length < 5) {
      return res.status(500).json({ error: 'Battle Room questions were not generated correctly. Try again.' });
    }

    const roomRef = firestoreDb.collection('battleRooms').doc();
    const cleanHostName = hostName || (await getUserProfile(userId))?.name || 'Host';
    const payload = {
      roomCode,
      hostId: String(userId),
      hostName: cleanHostName,
      title: title || 'Battle Room',
      summary: String(summary).slice(0, 7000),
      questions: questions.slice(0, 20),
      questionCount: 20,
      timerMinutes: 20,
      difficulty,
      questionType: cleanType,
      status: 'waiting',
      players: {
        [String(userId)]: {
          userId: String(userId),
          name: cleanHostName,
          role: 'host',
          joinedAt: nowISO(),
          submitted: false,
          score: 0,
          totalMarks: 20,
          percentage: 0,
          timeTakenSeconds: 0
        }
      },
      createdAt: nowISO(),
      updatedAt: nowISO()
    };

    await roomRef.set(payload);
    await incrementUserActivityCount(userId, 'battleRoomsCreated');
    await addBattleRoomActivity(userId, 'battle_room_created', { roomCode, roomId: roomRef.id });

    return res.json({ ok: true, room: safeBattleRoom({ id: roomRef.id, ...payload }) });
  } catch (error) {
    console.error('[Battle Room Create Error]', error);
    return res.status(error.statusCode || 500).json({ error: 'Battle Room creation failed: ' + error.message });
  }
});

// Join with room code.
app.post('/api/battle-rooms/join', async (req, res) => {
  try {
    const { roomCode, userId, name } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId is required.' });

    const roomDoc = await getBattleRoomByCode(roomCode);
    if (!roomDoc) return res.status(404).json({ error: 'Battle Room not found. Check the room code.' });

    const room = roomDoc.data() || {};
    if (room.status === 'completed') return res.status(400).json({ error: 'This Battle Room is already completed.' });

    const profile = await getUserProfile(userId);
    const playerName = name || profile?.name || profile?.email || 'Player';

    await roomDoc.ref.set({
      [`players.${String(userId)}`]: {
        userId: String(userId),
        name: playerName,
        role: room.hostId === String(userId) ? 'host' : 'player',
        joinedAt: nowISO(),
        submitted: false,
        score: 0,
        totalMarks: 20,
        percentage: 0,
        timeTakenSeconds: 0
      },
      updatedAt: nowISO()
    }, { merge: true });

    await incrementUserActivityCount(userId, 'battleRoomsJoined');
    await addBattleRoomActivity(userId, 'battle_room_joined', { roomCode: room.roomCode, roomId: roomDoc.id });

    const updated = await roomDoc.ref.get();
    return res.json({ ok: true, room: safeBattleRoom(updated) });
  } catch (error) {
    console.error('[Battle Room Join Error]', error);
    return res.status(500).json({ error: 'Unable to join Battle Room: ' + error.message });
  }
});

// Get room by code/id.
app.get('/api/battle-rooms/:roomCode', async (req, res) => {
  try {
    const roomDoc = await getBattleRoomByCode(req.params.roomCode);
    if (!roomDoc) return res.status(404).json({ error: 'Battle Room not found.' });
    return res.json({ ok: true, room: safeBattleRoom(roomDoc) });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load Battle Room: ' + error.message });
  }
});

// Host starts battle.
app.post('/api/battle-rooms/:roomCode/start', async (req, res) => {
  try {
    const { userId } = req.body || {};
    const roomDoc = await getBattleRoomByCode(req.params.roomCode);
    if (!roomDoc) return res.status(404).json({ error: 'Battle Room not found.' });

    const room = roomDoc.data() || {};
    if (room.hostId !== String(userId)) return res.status(403).json({ error: 'Only host can start the battle.' });

    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + 20 * 60 * 1000);

    await roomDoc.ref.set({
      status: 'active',
      startedAt: startedAt.toISOString(),
      endsAt: endsAt.toISOString(),
      updatedAt: nowISO()
    }, { merge: true });

    const updated = await roomDoc.ref.get();
    return res.json({ ok: true, room: safeBattleRoom(updated) });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to start Battle Room: ' + error.message });
  }
});

// Submit battle.
app.post('/api/battle-rooms/:roomCode/submit', async (req, res) => {
  try {
    const { userId, answers = {}, autoSubmit = false } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId is required.' });

    const roomDoc = await getBattleRoomByCode(req.params.roomCode);
    if (!roomDoc) return res.status(404).json({ error: 'Battle Room not found.' });

    const room = roomDoc.data() || {};
    const questions = Array.isArray(room.questions) ? room.questions.slice(0, 20) : [];
    if (!questions.length) return res.status(400).json({ error: 'This room has no questions.' });

    let score = 0;
    const review = questions.map((question) => {
      const userAnswer = String(answers[question.id] ?? '').trim();
      const correctAnswer = String(question.correctAnswer || question.answer || '').trim();
      const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
      if (isCorrect) score += 1;
      return {
        questionId: question.id,
        question: question.question,
        userAnswer,
        correctAnswer,
        isCorrect,
        explanation: question.explanation || ''
      };
    });

    const totalMarks = questions.length;
    const percentage = totalMarks ? Math.round((score / totalMarks) * 100) : 0;
    const startedAtMs = room.startedAt ? new Date(room.startedAt).getTime() : Date.now();
    const timeTakenSeconds = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));

    await roomDoc.ref.set({
      [`players.${String(userId)}.submitted`]: true,
      [`players.${String(userId)}.score`]: score,
      [`players.${String(userId)}.totalMarks`]: totalMarks,
      [`players.${String(userId)}.percentage`]: percentage,
      [`players.${String(userId)}.accuracy`]: percentage,
      [`players.${String(userId)}.timeTakenSeconds`]: timeTakenSeconds,
      [`players.${String(userId)}.submittedAt`]: nowISO(),
      [`players.${String(userId)}.autoSubmit`]: Boolean(autoSubmit),
      [`players.${String(userId)}.review`]: review,
      updatedAt: nowISO()
    }, { merge: true });

    await incrementUserActivityCount(userId, 'battleRoomsAttempted');
    await addBattleRoomActivity(userId, 'battle_room_submitted', { roomCode: room.roomCode, score, totalMarks, percentage });

    const leaderboard = await updateBattleLeaderboard(roomDoc.ref);
    const afterLeaderboardDoc = await roomDoc.ref.get();
    const afterLeaderboardRoom = afterLeaderboardDoc.data() || {};
    const players = afterLeaderboardRoom.players || {};
    const playerList = Object.keys(players).map((id) => ({ userId: id, ...players[id] }));
    const allSubmitted = playerList.length > 0 && playerList.every((player) => player.submitted);

    if (allSubmitted) {
      await roomDoc.ref.set({
        status: 'completed',
        completedAt: nowISO(),
        updatedAt: nowISO()
      }, { merge: true });
    }

    try {
      const historyRoomSnapshot = await roomDoc.ref.get();
      const historyRoom = historyRoomSnapshot.data() || {};
      const historyPlayers = historyRoom.players || {};
      const thisPlayer = historyPlayers[String(userId)] || {};
      const thisLeaderboardPlayer = (Array.isArray(leaderboard) ? leaderboard : []).find((player) => player.userId === String(userId)) || {};

      await saveAssessmentHistory(userId, {
        mode: 'battle',
        title: historyRoom.title || room.title || 'Battle Room Assessment',
        roomCode: historyRoom.roomCode || room.roomCode || normalizeBattleRoomCode(req.params.roomCode),
        hostName: historyRoom.hostName || room.hostName || '',
        rank: thisPlayer.rank || thisLeaderboardPlayer.rank || '',
        achievement: thisPlayer.achievement || thisLeaderboardPlayer.achievement || calculateBattleAchievement(percentage, Number(thisPlayer.rank || thisLeaderboardPlayer.rank || 0), timeTakenSeconds),
        remarks: thisPlayer.remarks || calculateBattleRemarks(percentage),
        score,
        totalMarks,
        percentage,
        accuracy: percentage,
        timeTakenSeconds,
        submittedAt: nowISO(),
        review,
        questions: questions.map((question) => ({
          id: question.id,
          question: question.question,
          options: question.options || [],
          correctAnswer: question.correctAnswer || question.answer || '',
          explanation: question.explanation || ''
        }))
      });
    } catch (historyError) {
      console.log('[Battle History Save Error]', historyError.message);
    }

const updated = await roomDoc.ref.get();

    return res.json({
      ok: true,
      result: {
        score,
        totalMarks,
        percentage,
        accuracy: percentage,
        timeTakenSeconds,
        leaderboard,
        achievement: leaderboard.find((player) => player.userId === String(userId))?.achievement || calculateBattleAchievement(percentage, 0, timeTakenSeconds),
        remarks: calculateBattleRemarks(percentage),
        review
      },
      room: safeBattleRoom(updated)
    });
  } catch (error) {
    console.error('[Battle Room Submit Error]', error);
    return res.status(500).json({ error: 'Battle Room submission failed: ' + error.message });
  }
});


app.post('/api/battle-rooms/:roomCode/quit', async (req, res) => {
  try {
    const { userId } = req.body || {};
    const roomDoc = await getBattleRoomByCode(req.params.roomCode);
    if (!roomDoc) return res.status(404).json({ error: 'Battle Room not found.' });
    if (userId) {
      await addBattleRoomActivity(userId, 'battle_room_quit', { roomCode: normalizeBattleRoomCode(req.params.roomCode) });
    }
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to quit Battle Room: ' + error.message });
  }
});

// Battle room admin summary.
app.get('/api/admin/battle-room-stats', async (req, res) => {
  try {
    const { adminId } = req.query || {};
    const adminUser = await getUserProfile(adminId);
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    const normalizeAdminBattleRoom = (raw = {}, id = '') => {
      const playersRaw = raw.players || {};
      const players = Array.isArray(playersRaw) ? playersRaw : Object.keys(playersRaw).map((playerId) => ({ userId: playerId, ...playersRaw[playerId] }));
      const leaderboardRaw = Array.isArray(raw.leaderboard) ? raw.leaderboard : [];

      const normalizedPlayers = players.map((player) => {
        const leader = leaderboardRaw.find((item) => String(item.userId || item.id) === String(player.userId));
        return {
          userId: String(player.userId || player.id || ''),
          name: player.name || player.userName || player.email || 'Player',
          email: player.email || '',
          role: player.role || (player.isHost ? 'host' : String(player.userId || '') === String(raw.hostId || raw.createdBy || '') ? 'host' : 'player'),
          submitted: Boolean(player.submitted),
          score: Number(player.score ?? leader?.score ?? 0),
          totalMarks: Number(player.totalMarks ?? leader?.totalMarks ?? raw.totalQuestions ?? raw.questionCount ?? 20),
          percentage: Number(player.percentage ?? player.accuracy ?? leader?.percentage ?? leader?.accuracy ?? 0),
          accuracy: Number(player.accuracy ?? player.percentage ?? leader?.accuracy ?? leader?.percentage ?? 0),
          achievement: player.achievement || leader?.achievement || '',
          remarks: player.remarks || leader?.remarks || '',
          timeTakenSeconds: Number(player.timeTakenSeconds ?? leader?.timeTakenSeconds ?? 0),
          joinedAt: player.joinedAt || null,
          submittedAt: player.submittedAt || leader?.submittedAt || null
        };
      });

      return {
        id,
        roomCode: raw.roomCode || '',
        title: raw.title || 'Battle Room',
        hostId: raw.hostId || raw.createdBy || '',
        hostName: raw.hostName || raw.createdByName || 'Host',
        status: raw.status || 'waiting',
        players: normalizedPlayers,
        leaderboard: leaderboardRaw,
        questionCount: Number(raw.questionCount || raw.totalQuestions || 20),
        timerMinutes: Number(raw.timerMinutes || raw.timeLimitMinutes || 20),
        createdAt: raw.createdAt || null,
        startedAt: raw.startedAt || null,
        completedAt: raw.completedAt || null,
        source: raw.assessmentMode === 'battle' ? 'assessments' : 'battleRooms'
      };
    };

    let oldBattleSnapshot;
    try {
      oldBattleSnapshot = await firestoreDb.collection('battleRooms').orderBy('createdAt', 'desc').limit(150).get();
    } catch (orderError) {
      console.log('[Admin Battle Stats] battleRooms orderBy fallback:', orderError.message);
      oldBattleSnapshot = await firestoreDb.collection('battleRooms').limit(150).get();
    }

    let assessmentBattleSnapshot;
    try {
      assessmentBattleSnapshot = await assessmentsCollection.where('assessmentMode', '==', 'battle').orderBy('createdAt', 'desc').limit(200).get();
    } catch (assessmentOrderError) {
      console.log('[Admin Battle Stats] assessments orderBy fallback:', assessmentOrderError.message);
      assessmentBattleSnapshot = await assessmentsCollection.where('assessmentMode', '==', 'battle').limit(200).get();
    }

    const oldRooms = oldBattleSnapshot.docs.map((doc) => normalizeAdminBattleRoom(doc.data() || {}, doc.id));
    const assessmentRooms = assessmentBattleSnapshot.docs.map((doc) => normalizeAdminBattleRoom(doc.data() || {}, doc.id));

    const roomMap = new Map();
    [...oldRooms, ...assessmentRooms].forEach((room) => {
      const key = room.roomCode || room.id;
      const existing = roomMap.get(key);
      if (!existing || (room.players?.length || 0) >= (existing.players?.length || 0)) {
        roomMap.set(key, room);
      }
    });

    const rooms = Array.from(roomMap.values())
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    const totalRooms = rooms.length;
    const waitingRooms = rooms.filter((room) => room.status === 'waiting').length;
    const activeRooms = rooms.filter((room) => room.status === 'active').length;
    const completedRooms = rooms.filter((room) => room.status === 'completed').length;
    const totalPlayers = rooms.reduce((sum, room) => sum + (Array.isArray(room.players) ? room.players.length : 0), 0);
    const totalAttempts = rooms.reduce((sum, room) => sum + (Array.isArray(room.players) ? room.players.filter((player) => player.submitted).length : 0), 0);

    const submittedPlayers = rooms.flatMap((room) =>
      (room.players || [])
        .filter((player) => player.submitted)
        .map((player) => ({
          ...player,
          roomCode: room.roomCode,
          roomTitle: room.title,
          hostName: room.hostName
        }))
    );

    const averageAccuracy = submittedPlayers.length
      ? Math.round(submittedPlayers.reduce((sum, player) => sum + Number(player.percentage || player.accuracy || 0), 0) / submittedPlayers.length)
      : 0;

    const topPlayers = submittedPlayers
      .slice()
      .sort((a, b) => {
        const scoreDiff = Number(b.percentage || b.accuracy || 0) - Number(a.percentage || a.accuracy || 0);
        if (scoreDiff !== 0) return scoreDiff;
        return Number(a.timeTakenSeconds || 999999) - Number(b.timeTakenSeconds || 999999);
      })
      .slice(0, 10)
      .map((player, index) => ({
        rank: index + 1,
        userId: player.userId,
        name: player.name || 'Player',
        roomCode: player.roomCode,
        roomTitle: player.roomTitle || 'Battle Room',
        score: Number(player.score || 0),
        totalMarks: Number(player.totalMarks || 20),
        percentage: Number(player.percentage || player.accuracy || 0),
        timeTakenSeconds: Number(player.timeTakenSeconds || 0),
        achievement: player.achievement || calculateBattleAchievement(Number(player.percentage || player.accuracy || 0), index + 1, Number(player.timeTakenSeconds || 0))
      }));

    let smartCompareDocs = [];
    try {
      const compareSnapshot = await firestoreDb.collection('smartCompareReports').orderBy('generatedAt', 'desc').limit(100).get();
      smartCompareDocs = compareSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (compareError) {
      console.log('[Admin Smart Compare] report collection fallback:', compareError.message);
    }

    let smartCompareActivities = [];
    try {
      const compareActivitySnapshot = await activitiesCollection.where('type', '==', 'smart_compare_generated').limit(150).get();
      smartCompareActivities = compareActivitySnapshot.docs.map((doc) => {
        const data = doc.data() || {};
        return {
          id: doc.id,
          userId: data.userId || '',
          video1: data.meta?.video1 || '',
          video2: data.meta?.video2 || '',
          similarityScore: Number(data.meta?.similarityScore || 0),
          isSimilar: Boolean(data.meta?.isSimilar),
          generatedAt: data.createdAt || null
        };
      });
    } catch (activityError) {
      console.log('[Admin Smart Compare] activity fallback:', activityError.message);
    }

    const compareMap = new Map();
    [...smartCompareDocs, ...smartCompareActivities].forEach((item) => {
      const key = item.id || `${item.userId}_${item.video1}_${item.video2}_${item.generatedAt}`;
      if (!compareMap.has(key)) compareMap.set(key, item);
    });

    const compareItems = Array.from(compareMap.values()).sort((a, b) => String(b.generatedAt || '').localeCompare(String(a.generatedAt || '')));
    const totalCompares = compareItems.length;
    const similarCompares = compareItems.filter((item) => item.isSimilar).length;
    const mismatchCompares = totalCompares - similarCompares;
    const averageSimilarity = totalCompares
      ? Math.round(compareItems.reduce((sum, item) => sum + Number(item.similarityScore || 0), 0) / totalCompares)
      : 0;

    return res.json({
      ok: true,
      stats: {
        totalRooms,
        waitingRooms,
        activeRooms,
        completedRooms,
        totalPlayers,
        totalAttempts,
        averageAccuracy
      },
      smartCompare: {
        totalCompares,
        similarCompares,
        mismatchCompares,
        averageSimilarity,
        recent: compareItems.slice(0, 8).map((item) => ({
          id: item.id,
          userId: item.userId || '',
          similarityScore: Number(item.similarityScore || 0),
          isSimilar: Boolean(item.isSimilar),
          video1Topic: item.video1Topic || '',
          video2Topic: item.video2Topic || '',
          bestOverall: item.bestOverall || '',
          generatedAt: item.generatedAt || null
        }))
      },
      topPlayers,
      rooms: rooms.map((room) => {
        const players = Array.isArray(room.players) ? room.players : [];
        const attemptedPlayers = players.filter((player) => player.submitted);
        const winner = attemptedPlayers
          .slice()
          .sort((a, b) => {
            const scoreDiff = Number(b.score || 0) - Number(a.score || 0);
            if (scoreDiff !== 0) return scoreDiff;
            return Number(a.timeTakenSeconds || 999999) - Number(b.timeTakenSeconds || 999999);
          })[0];

        return {
          id: room.id,
          roomCode: room.roomCode,
          title: room.title || 'Battle Room',
          hostId: room.hostId,
          hostName: room.hostName || 'Host',
          status: room.status,
          source: room.source,
          playerCount: players.length,
          attemptedCount: attemptedPlayers.length,
          averageAccuracy: attemptedPlayers.length
            ? Math.round(attemptedPlayers.reduce((sum, player) => sum + Number(player.percentage || player.accuracy || 0), 0) / attemptedPlayers.length)
            : 0,
          winnerName: winner?.name || '',
          winnerScore: winner ? `${winner.score || 0}/${winner.totalMarks || 20}` : '',
          players: players.map((player) => ({
            userId: player.userId,
            name: player.name || 'Player',
            role: player.role || 'player',
            submitted: Boolean(player.submitted),
            score: Number(player.score || 0),
            totalMarks: Number(player.totalMarks || 20),
            percentage: Number(player.percentage || player.accuracy || 0),
            achievement: player.achievement || '',
            timeTakenSeconds: Number(player.timeTakenSeconds || 0)
          })),
          createdAt: room.createdAt,
          startedAt: room.startedAt,
          completedAt: room.completedAt
        };
      })
    });
  } catch (error) {
    console.error('[Admin Battle Stats Error]', error);
    return res.status(500).json({ error: 'Unable to load Battle Room stats: ' + error.message });
  }
});

app.post('/api/users/:userId/test-history', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: 'userId is required.' });
    const saved = await saveAssessmentHistory(userId, req.body || {});
    return res.json({ ok: true, history: saved });
  } catch (error) {
    console.error('[Test History Save Error]', error);
    return res.status(500).json({ error: 'Unable to save test history: ' + error.message });
  }
});

app.get('/api/users/:userId/test-history', async (req, res) => {
  try {
    const { userId } = req.params;
    const mode = String(req.query.mode || '').toLowerCase();

    if (mode === 'boss_champion') {
      const assessmentSnapshot = await assessmentsCollection.orderBy('createdAt', 'desc').limit(250).get();
      const championTests = [];

      for (const assessmentDoc of assessmentSnapshot.docs) {
        const assessment = assessmentDoc.data() || {};
        if (assessment.assessmentMode !== 'battle') continue;

        const bossBattle = assessment.bossBattle || {};
        const champion = bossBattle.champion || null;
        if (!champion || String(champion.userId || '') !== String(userId)) continue;

        let bossAttempt = {};
        try {
          const attemptDoc = await assessmentDoc.ref.collection('bossAttempts').doc(String(userId)).get();
          bossAttempt = attemptDoc.exists ? attemptDoc.data() || {} : {};
        } catch {}

        championTests.push({
          id: `boss_${assessmentDoc.id}`,
          mode: 'boss_champion',
          title: assessment.title || 'Brief Boss Battle',
          roomCode: assessment.roomCode || '',
          bossTitle: bossBattle.title || 'Brief Boss Battle',
          rank: 1,
          badge: 'Brief Boss Champion',
          achievement: 'Brief Boss Champion',
          remarks: 'You won the final Boss Battle round.',
          score: Number(champion.score ?? bossAttempt.score ?? 0),
          totalMarks: Number(champion.totalMarks ?? bossAttempt.totalMarks ?? 5),
          percentage: Number(champion.percentage ?? bossAttempt.percentage ?? 0),
          accuracy: Number(champion.percentage ?? bossAttempt.percentage ?? 0),
          timeTakenSeconds: Number(champion.timeTakenSeconds ?? bossAttempt.timeTakenSeconds ?? 0),
          submittedAt: champion.submittedAt || bossAttempt.submittedAt || bossBattle.completedAt || bossBattle.updatedAt || assessment.completedAt || assessment.createdAt || nowISO(),
          questions: Array.isArray(bossBattle.questions) ? bossBattle.questions : [],
          review: Array.isArray(bossAttempt.review) ? bossAttempt.review : []
        });
      }

      const tests = championTests.sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')));
      const totalTests = tests.length;
      const averageProgress = totalTests ? Math.round(tests.reduce((sum, test) => sum + Number(test.percentage || test.accuracy || 0), 0) / totalTests) : 0;
      const bestScore = totalTests ? Math.max(...tests.map((test) => Number(test.percentage || test.accuracy || 0))) : 0;
      const totalCorrect = tests.reduce((sum, test) => sum + Number(test.score || 0), 0);
      const totalMarks = tests.reduce((sum, test) => sum + Number(test.totalMarks || 0), 0);

      return res.json({
        ok: true,
        summary: { mode: 'boss_champion', totalTests, averageProgress, bestScore, totalCorrect, totalMarks, overallAccuracy: totalMarks ? Math.round((totalCorrect / totalMarks) * 100) : 0 },
        tests
      });
    }

    let snapshot;
    try {
      snapshot = await firestoreDb.collection('users').doc(String(userId)).collection('testHistory').orderBy('submittedAt', 'desc').limit(100).get();
    } catch (orderError) {
      snapshot = await firestoreDb.collection('users').doc(String(userId)).collection('testHistory').limit(100).get();
    }

    let tests = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')));

    if (mode === 'solo' || mode === 'battle') tests = tests.filter((test) => String(test.mode || '').toLowerCase() === mode);

    const totalTests = tests.length;
    const averageProgress = totalTests ? Math.round(tests.reduce((sum, test) => sum + Number(test.percentage || test.accuracy || 0), 0) / totalTests) : 0;
    const bestScore = totalTests ? Math.max(...tests.map((test) => Number(test.percentage || test.accuracy || 0))) : 0;
    const totalCorrect = tests.reduce((sum, test) => sum + Number(test.score || 0), 0);
    const totalMarks = tests.reduce((sum, test) => sum + Number(test.totalMarks || 0), 0);

    return res.json({
      ok: true,
      summary: { mode: mode || 'all', totalTests, averageProgress, bestScore, totalCorrect, totalMarks, overallAccuracy: totalMarks ? Math.round((totalCorrect / totalMarks) * 100) : 0 },
      tests
    });
  } catch (error) {
    console.error('[Test History Load Error]', error);
    return res.status(500).json({ error: 'Unable to load test history: ' + error.message });
  }
});


app.listen(port, () => {
  console.log(`Server online with Firebase Auth + Cerebras Fast Summary Engine on port ${port}`);
});
