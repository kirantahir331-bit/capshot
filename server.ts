import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { createRequire } from 'module';
import { GoogleGenAI } from '@google/genai';

const require = createRequire(import.meta.url);
const archiverPkg = require('archiver');
const archiver = typeof archiverPkg === 'function' ? archiverPkg : (archiverPkg.default || archiverPkg);

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));

// In-Memory Cache with TTL (30 days default)
interface CacheEntry {
  data: any;
  expiresAt: number;
}
const localCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Clean up expired cache items periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of localCache.entries()) {
    if (entry.expiresAt < now) {
      localCache.delete(key);
    }
  }
}, 60 * 60 * 1000);

// Request tracking for Rate-Limiting / Concurrency smoothing
const requestTimestamps: number[] = [];
const RPM_LIMIT = 40; // Requests per minute threshold before gentle retry signal

function isRateLimitNear(): boolean {
  const now = Date.now();
  // Filter out timestamps older than 60s
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - 60000) {
    requestTimestamps.shift();
  }
  return requestTimestamps.length >= RPM_LIMIT;
}

function recordRequest(): void {
  requestTimestamps.push(Date.now());
}

// Upstash Redis helper functions (REST API)
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

async function getFromRedis(key: string): Promise<any | null> {
  if (!upstashUrl || !upstashToken) return null;
  try {
    const res = await fetch(`${upstashUrl}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${upstashToken}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json && json.result) {
      return JSON.parse(json.result);
    }
  } catch (err) {
    console.warn('Upstash Redis get error:', err);
  }
  return null;
}

async function setToRedis(key: string, value: any, ttlSeconds: number = 30 * 24 * 3600): Promise<void> {
  if (!upstashUrl || !upstashToken) return;
  try {
    await fetch(`${upstashUrl}/setex/${encodeURIComponent(key)}/${ttlSeconds}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${upstashToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(JSON.stringify(value)),
    });
  } catch (err) {
    console.warn('Upstash Redis set error:', err);
  }
}

// Generate Cache Key
function createCacheKey(topic: string, platform: string, languagePair: string, vibe: string, myStyle?: string): string {
  const normalized = [
    topic.trim().toLowerCase(),
    platform.trim().toLowerCase(),
    languagePair.trim().toLowerCase(),
    vibe.trim().toLowerCase(),
    (myStyle || '').trim().toLowerCase(),
  ].join('|');
  const hash = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 32);
  return `capshot:${hash}`;
}

// AI Caption Generation Logic
async function generateWithAI(params: {
  topic: string;
  platform: string;
  languagePair: string;
  vibe: string;
  myStyle?: string;
  mode?: 'full' | 'captions_only' | 'hashtags_only';
  existingHashtags?: string[];
  existingCaptions?: any[];
}): Promise<any> {
  const { topic, platform, languagePair, vibe, myStyle, mode = 'full', existingHashtags, existingCaptions } = params;

  // First choice: Google Gemini API (via @google/genai, native to AI Studio, completely free and reliable)
  // Fallback / Alternate: OpenRouter free model router if OPENROUTER_API_KEY is configured
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  let secondaryLangName = 'Roman Urdu';
  if (languagePair.includes('Urdu') && !languagePair.includes('Roman')) {
    secondaryLangName = 'Urdu (نستعلیق / Arabic script)';
  } else if (languagePair.includes('Hindi')) {
    secondaryLangName = 'Hindi (Devanagari script)';
  } else if (languagePair.includes('Roman Urdu')) {
    secondaryLangName = 'Roman Urdu (Urdu written in English alphabets, e.g. "Aaj ka mausam bohot pyara hai")';
  } else {
    secondaryLangName = 'None (English only)';
  }

  // Construct precise prompt according to mode
  let promptText = '';

  if (mode === 'captions_only' && existingHashtags && existingHashtags.length > 0) {
    promptText = `You are Capshot, an elite social media copywriter.
Task: Write 4 BRAND NEW, creative caption variations for the following post topic while keeping the hashtags FIXED as provided below.

Post Topic: "${topic}"
Platform: ${platform}
Vibe/Tone: ${vibe}
Language Pair: ${languagePair} (Primary: English, Secondary: ${secondaryLangName})
${myStyle ? `User Custom Style Reference: "${myStyle}". Match this cadence, tone, formatting, and emoji density.` : ''}
Fixed Hashtags to attach: ${JSON.stringify(existingHashtags)}

Requirements:
1. Provide exactly 4 diverse variations (e.g., Punchy/Direct, Storyteller, Question/Engagement-hook, Emotional/Vibe).
2. Primary caption must be in English, perfectly tailored for ${platform} (optimal character count, spacing, emojis).
3. Secondary caption: ${secondaryLangName === 'None (English only)' ? 'Provide a punchy alternative English angle' : `Provide a high-quality, natural translation/adaptation in ${secondaryLangName}`}.
4. Attach the exact 5 fixed hashtags: ${JSON.stringify(existingHashtags)}.

Return ONLY valid JSON matching this schema:
[
  {
    "id": 1,
    "angle": "Short title for this option (e.g. Punchy Hook, Story Angle)",
    "primaryCaption": "Full English caption with spacing & emojis",
    "secondaryCaption": "Secondary language caption",
    "hashtags": ${JSON.stringify(existingHashtags)}
  }
]`;
  } else if (mode === 'hashtags_only' && existingCaptions && existingCaptions.length > 0) {
    promptText = `You are Capshot, an elite social media algorithm and hashtag specialist.
Task: Generate 5 fresh, high-reach, high-relevance hashtags for this post.

Post Topic: "${topic}"
Platform: ${platform}
Vibe/Tone: ${vibe}
Sample Captions:
${existingCaptions.map((c, i) => `Option ${i + 1}: ${c.primaryCaption}`).join('\n')}

Requirements:
- Provide exactly 5 fresh, trending, highly relevant hashtags starting with '#' (e.g. mix of broad reach and niche topic tags).
- Tailored specifically for ${platform}.

Return ONLY valid JSON matching this schema:
{
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
}`;
  } else {
    promptText = `You are Capshot, an award-winning social media strategist and copywriter.
Task: Generate 4 viral, high-converting social media caption options for this post.

Post Topic: "${topic}"
Target Platform: ${platform}
Desired Vibe: ${vibe}
Language Configuration: ${languagePair}
- Primary Language: English
- Secondary Language: ${secondaryLangName}
${myStyle ? `User Past Style Examples to Imitate:\n"${myStyle}"\n(Imitate this exact voice, formatting, capitalization, slang, and emoji rhythm.)` : ''}

Platform Best Practices to Follow:
- Instagram: Punchy first 2 lines (before "...more"), clean line breaks, evocative emojis, clear call-to-action.
- TikTok: Fast hook, viral trend cadence, conversational curiosity gap.
- YouTube Shorts: High-energy 1-liner hook, comment bait question.
- LinkedIn: Thoughtful professional storytelling, value takeaway, readable micro-paragraphs.
- X/Twitter: Sharp, witty, under 280 characters, strong opinions or punchline.
- Facebook: Relatable, friendly, community-oriented.

Language Nuances:
- If Roman Urdu: write natural conversational Pakistani Roman Urdu that sounds authentic, relatable, and modern (e.g., "Yeh scene check karo", "Dil khush ho gaya", "Apka kya khayal hai?").
- If Urdu: Use elegant modern Urdu in standard script.
- If Hindi: Use natural conversational Hindi in Devanagari script.
- If English only: Provide a distinct alternative English variation in the secondary field.

Return ONLY a JSON array with exactly 4 objects. No markdown backticks, no explanatory text.
JSON structure:
[
  {
    "id": 1,
    "angle": "e.g. Viral Hook & Curiosity",
    "primaryCaption": "English caption with proper line breaks and emojis...",
    "secondaryCaption": "Secondary language caption...",
    "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"]
  },
  {
    "id": 2,
    "angle": "e.g. Relatable & Candid",
    "primaryCaption": "...",
    "secondaryCaption": "...",
    "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
  },
  {
    "id": 3,
    "angle": "e.g. Short & Aesthetic",
    "primaryCaption": "...",
    "secondaryCaption": "...",
    "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
  },
  {
    "id": 4,
    "angle": "e.g. High Engagement Question",
    "primaryCaption": "...",
    "secondaryCaption": "...",
    "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
  }
]`;
  }

  // 1. Try Gemini API with valid models from skill (gemini-3.8-flash -> gemini-3.1-flash-lite)
  if (geminiKey) {
    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const ai = new GoogleGenAI();
        const response = await ai.models.generateContent({
          model: modelName,
          contents: promptText,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.8,
          },
        });

        const responseText = response.text || '';
        const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return parsed;
      } catch (geminiError: any) {
        lastError = geminiError;
        const errMsg = geminiError?.message || String(geminiError);
        console.warn(`Gemini model ${modelName} error:`, errMsg);

        // If high demand / 503 / 429, try next model or fallback
        if (
          geminiError?.status === 429 ||
          geminiError?.status === 503 ||
          errMsg.includes('503') ||
          errMsg.includes('429') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('high demand')
        ) {
          console.warn(`Gemini model ${modelName} rate-limited or unavailable, trying next option...`);
          continue;
        }
        break;
      }
    }

    // If Gemini succeeded, return parsed result
    // If all Gemini models failed:
    if (lastError) {
      const lastErrMsg = lastError?.message || String(lastError);
      console.warn('All Gemini attempts finished with warning/error:', lastErrMsg);
      
      // If we don't have OpenRouter, trigger RATE_LIMIT_TRIGGERED or throw
      if (!openRouterKey) {
        if (
          lastError?.status === 429 ||
          lastError?.status === 503 ||
          lastErrMsg.includes('503') ||
          lastErrMsg.includes('429') ||
          lastErrMsg.includes('UNAVAILABLE') ||
          lastErrMsg.includes('high demand')
        ) {
          throw new Error('RATE_LIMIT_TRIGGERED');
        }
        throw lastError;
      }
      
      console.log('Gemini capacity reached or errored. Seamlessly activating OpenRouter backup router...');
    }
  }

  // 2. Try OpenRouter free model router
  if (openRouterKey) {
    try {
      console.log('Calling OpenRouter (model: openrouter/free)...');
      const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://capshot.app',
          'X-Title': 'Capshot Free AI Caption Generator',
        },
        body: JSON.stringify({
          model: 'openrouter/free',
          messages: [
            {
              role: 'system',
              content: 'You are Capshot, an elite social media copywriter. Output strictly a JSON array of 4 caption objects. No markdown wrapping or backticks.',
            },
            { role: 'user', content: promptText },
          ],
        }),
      });

      if (openRouterRes.status === 429) {
        console.warn('OpenRouter rate limit hit.');
        throw new Error('RATE_LIMIT_TRIGGERED');
      }

      if (!openRouterRes.ok) {
        const errorText = await openRouterRes.text();
        console.warn(`OpenRouter response error: ${openRouterRes.status}`, errorText);
        throw new Error(`OpenRouter error: ${openRouterRes.status} ${errorText}`);
      }

      const orJson = await openRouterRes.json();
      const rawContent = orJson.choices?.[0]?.message?.content || '';
      const cleaned = rawContent
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
        
      // Extract array from text if surrounded by extra text
      const firstBracket = cleaned.indexOf('[');
      const lastBracket = cleaned.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        const jsonSubstring = cleaned.substring(firstBracket, lastBracket + 1);
        const parsed = JSON.parse(jsonSubstring);
        return parsed;
      }

      const parsed = JSON.parse(cleaned);
      return parsed;
    } catch (orError: any) {
      console.error('OpenRouter call error:', orError?.message || orError);
      if (orError.message === 'RATE_LIMIT_TRIGGERED') {
        throw orError;
      }
      throw orError;
    }
  }

  throw new Error('No AI provider configured. Set GEMINI_API_KEY or OPENROUTER_API_KEY.');
}

// POST /api/generate
app.post('/api/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { topic, platform, languagePair, vibe, myStyle, mode = 'full', existingHashtags, existingCaptions } = req.body;

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      res.status(400).json({ error: 'Post topic is required.' });
      return;
    }

    // Step 5: Check requests-per-minute rate ceiling
    if (isRateLimitNear()) {
      res.json({
        retry: true,
        retryAfterSeconds: 2,
        message: 'High visitor traffic. Retrying in 2 seconds...',
      });
      return;
    }

    const cacheKey = createCacheKey(
      topic,
      platform || 'Instagram',
      languagePair || 'English + Roman Urdu',
      vibe || 'Fun & witty',
      myStyle
    );

    // Step 2: Check Redis / In-Memory cache first if full mode
    if (mode === 'full') {
      // Check in-memory first (instant)
      const localCached = localCache.get(cacheKey);
      if (localCached && localCached.expiresAt > Date.now()) {
        res.json({
          success: true,
          cards: localCached.data,
          fromCache: true,
          cacheType: 'memory',
        });
        return;
      }

      // Check Upstash Redis
      const redisCached = await getFromRedis(cacheKey);
      if (redisCached) {
        // Also populate local cache for speed
        localCache.set(cacheKey, { data: redisCached, expiresAt: Date.now() + CACHE_TTL_MS });
        res.json({
          success: true,
          cards: redisCached,
          fromCache: true,
          cacheType: 'redis',
        });
        return;
      }
    }

    // Track request
    recordRequest();

    // Generate with AI
    let aiResult;
    try {
      aiResult = await generateWithAI({
        topic,
        platform: platform || 'Instagram',
        languagePair: languagePair || 'English + Roman Urdu',
        vibe: vibe || 'Fun & witty',
        myStyle,
        mode,
        existingHashtags,
        existingCaptions,
      });
    } catch (aiErr: any) {
      if (aiErr.message === 'RATE_LIMIT_TRIGGERED') {
        res.json({
          retry: true,
          retryAfterSeconds: 2,
          message: 'AI model busy right now. Retrying automatically...',
        });
        return;
      }
      throw aiErr;
    }

    // Handle partial regeneration response formats
    if (mode === 'hashtags_only') {
      let freshHashtags: string[] = [];
      if (Array.isArray(aiResult)) {
        freshHashtags = aiResult[0]?.hashtags || [];
      } else if (Array.isArray(aiResult.hashtags)) {
        freshHashtags = aiResult.hashtags;
      }

      // Ensure they have # prefix and exactly 5
      freshHashtags = freshHashtags
        .map((t: string) => (t.startsWith('#') ? t : `#${t}`))
        .slice(0, 5);

      if (freshHashtags.length === 0) {
        freshHashtags = ['#trending', `#${(platform || 'social').toLowerCase()}`, '#viral', '#explore', '#content'];
      }

      res.json({
        success: true,
        hashtags: freshHashtags,
        mode: 'hashtags_only',
      });
      return;
    }

    // Validate standard cards array
    let cards = Array.isArray(aiResult) ? aiResult : (aiResult.cards || aiResult.captions || []);
    if (!Array.isArray(cards) || cards.length === 0) {
      // Fallback normalization if returned as dictionary
      const values = Object.values(aiResult);
      if (values.length > 0 && typeof values[0] === 'object') {
        cards = values;
      }
    }

    // Format and sanitize cards
    const sanitizedCards = (cards.slice(0, 4) as any[]).map((card, idx) => {
      let tags: string[] = Array.isArray(card.hashtags) ? card.hashtags : [];
      tags = tags.map((t: any) => (String(t).startsWith('#') ? String(t) : `#${t}`)).slice(0, 5);

      return {
        id: card.id || idx + 1,
        angle: card.angle || `Option ${idx + 1}`,
        primaryCaption: card.primaryCaption || card.englishCaption || card.caption || '',
        secondaryCaption: card.secondaryCaption || card.translation || card.urduCaption || '',
        hashtags: tags.length === 5 ? tags : ['#viral', '#trending', `#${(platform || 'creator').toLowerCase().replace(/\s+/g, '')}`, '#explorepage', '#fyp'],
      };
    });

    // Step 4: Save fresh result back into Redis & in-memory cache (30-day expiry)
    if (mode === 'full' && sanitizedCards.length > 0) {
      localCache.set(cacheKey, { data: sanitizedCards, expiresAt: Date.now() + CACHE_TTL_MS });
      // Non-blocking Upstash set
      setToRedis(cacheKey, sanitizedCards).catch(() => {});
    }

    res.json({
      success: true,
      cards: sanitizedCards,
      fromCache: false,
    });
  } catch (error: any) {
    console.error('Error in /api/generate:', error);
    res.status(500).json({
      error: 'Failed to generate captions. Please try again in a moment.',
      details: error?.message || 'Unknown error',
    });
  }
});

// GET /api/stats (for cache and health observability)
app.get('/api/stats', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    cachedEntries: localCache.size,
    upstashConfigured: Boolean(upstashUrl && upstashToken),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    openRouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
    requestsLastMinute: requestTimestamps.length,
    rpmLimit: RPM_LIMIT,
  });
});

// GET /api/download-zip - generates and streams a zip of project files for easy export to Vercel/GitHub
app.get('/api/download-zip', (_req: Request, res: Response) => {
  res.attachment('capshot-project.zip');
  res.setHeader('Content-Type', 'application/zip');
  const archive = new archiver.ZipArchive({ zlib: { level: 9 } });

  archive.on('error', (err: any) => {
    console.error('Archive error:', err);
    if (!res.headersSent) {
      res.status(500).send('Error generating zip file');
    }
  });

  archive.pipe(res);

  // Add files, ignoring node_modules, .git, dist, .aistudio
  archive.glob('**/*', {
    cwd: __dirname,
    ignore: [
      'node_modules/**',
      '.git/**',
      'dist/**',
      '.aistudio/**',
      '*.log',
      'capshot-project.zip',
    ],
    dot: true,
  });

  archive.finalize();
});

// Vite Middleware for development OR static serve for production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Capshot server running on http://0.0.0.0:${PORT}`);
  });
}

// Only start standalone HTTP server if not running inside a serverless platform like Vercel
if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export default app;
