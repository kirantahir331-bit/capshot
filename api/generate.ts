export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Handle both pre-parsed body and raw string body
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};

  const topic = (body.topic || body.description || '').trim();
  const platform = body.platform || 'Instagram';
  const languagePair = body.languagePair || 'English + Roman Urdu';
  const vibe = body.vibe || 'Fun & witty';
  const myStyle = body.myStyle || body.customStyle || '';
  const mode = body.mode || 'full';
  const existingHashtags = Array.isArray(body.existingHashtags) ? body.existingHashtags : [];
  const existingCaptions = Array.isArray(body.existingCaptions) ? body.existingCaptions : [];

  if (!topic) {
    return res.status(400).json({ error: 'Post topic is required.' });
  }

  let secondaryLangName = 'Roman Urdu';
  if (languagePair.includes('Urdu') && !languagePair.includes('Roman')) {
    secondaryLangName = 'Urdu (نستعلیق / Arabic script)';
  } else if (languagePair.includes('Hindi')) {
    secondaryLangName = 'Hindi (Devanagari script)';
  } else if (languagePair.includes('Roman Urdu')) {
    secondaryLangName = 'Roman Urdu (natural conversational Pakistani Roman Urdu)';
  } else {
    secondaryLangName = 'Alternative English angle';
  }

  let prompt = '';
  if (mode === 'captions_only' && existingHashtags.length > 0) {
    prompt = `You are Capshot, an elite social media copywriter.
Task: Write 4 BRAND NEW, creative caption variations specifically for this post topic while keeping the hashtags FIXED as provided below.

Post Topic: "${topic}"
Platform: ${platform}
Vibe: ${vibe}
Language Pair: ${languagePair} (Primary: English, Secondary: ${secondaryLangName})
${myStyle ? `Style to mimic: "${myStyle}"` : ''}
Fixed Hashtags: ${JSON.stringify(existingHashtags)}

Requirements:
1. Provide 4 distinct options: Catchy Hook, Relatable Story/Humor, Short & Punchy, Engagement CTA.
2. Primary caption in English with appropriate emojis and formatting.
3. Secondary caption in ${secondaryLangName}, sounding natural and authentic for "${topic}".
4. Keep the hashtags exactly as provided.

Return ONLY a valid JSON array of 4 objects:
[
  {
    "id": 1,
    "angle": "Catchy Hook",
    "primaryCaption": "...",
    "secondaryCaption": "...",
    "hashtags": ${JSON.stringify(existingHashtags)}
  }
]`;
  } else if (mode === 'hashtags_only') {
    prompt = `You are Capshot, an elite social media hashtag specialist.
Task: Generate 5 fresh, trending, highly relevant hashtags for this post.

Post Topic: "${topic}"
Platform: ${platform}
Vibe: ${vibe}
${existingCaptions.length > 0 ? `Captions:\n${existingCaptions.map((c: any, i: number) => `Option ${i + 1}: ${c.primaryCaption}`).join('\n')}` : ''}

Requirements:
- Exactly 5 hashtags starting with '#' specifically tailored to "${topic}" and ${platform}.

Return ONLY valid JSON matching this schema:
{
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
}`;
  } else {
    prompt = `You are Capshot, an award-winning social media strategist.
Task: Generate 4 completely unique, viral caption options specifically customized for this post topic.

Post Topic: "${topic}"
Platform: ${platform}
Vibe: ${vibe}
Language Pair: ${languagePair}
- Primary: English
- Secondary: ${secondaryLangName}
${myStyle ? `Style to mimic: "${myStyle}"` : ''}

Angles:
1. Catchy Hook & High Energy
2. Relatable Story / Candid Humor
3. Short, Aesthetic & Punchy
4. High Engagement Question / CTA

Rules:
- Captions must be completely customized to "${topic}". Never output generic placeholder templates.
- Secondary caption: If Roman Urdu, write natural conversational Pakistani Roman Urdu directly about "${topic}". If Urdu, use Urdu script. If Hindi, use Devanagari script.
- Provide 5 highly relevant hashtags tailored to "${topic}" and ${platform}.

Return ONLY a valid JSON array of 4 objects:
[
  {
    "id": 1,
    "angle": "Catchy Hook",
    "primaryCaption": "...",
    "secondaryCaption": "...",
    "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
  }
]`;
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  let rawText = '';
  let providerErrors: string[] = [];

  // 1. Try Gemini REST API (gemini-3.1-flash-lite, gemini-3.8-flash)
  if (geminiKey) {
    const geminiModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    for (const m of geminiModels) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.8,
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (rawText) break;
        } else {
          const errBody = await geminiRes.text().catch(() => '');
          providerErrors.push(`Gemini ${m} (${geminiRes.status}): ${errBody.slice(0, 100)}`);
        }
      } catch (err: any) {
        providerErrors.push(`Gemini fetch err: ${err?.message || String(err)}`);
      }
    }
  } else {
    providerErrors.push('GEMINI_API_KEY not configured');
  }

  // 2. Try OpenRouter backup if Gemini didn't produce result
  if (!rawText && openRouterKey) {
    const openRouterModels = [
      'google/gemini-2.0-flash-exp:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'mistralai/mistral-7b-instruct:free',
    ];

    for (const orModel of openRouterModels) {
      try {
        const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: orModel,
            messages: [{ role: 'user', content: prompt }],
          }),
        });

        if (orRes.ok) {
          const orData = await orRes.json();
          rawText = orData.choices?.[0]?.message?.content || '';
          if (rawText) break;
        } else {
          const orErr = await orRes.text().catch(() => '');
          providerErrors.push(`OpenRouter ${orModel} (${orRes.status}): ${orErr.slice(0, 100)}`);
        }
      } catch (e: any) {
        providerErrors.push(`OpenRouter err: ${e?.message}`);
      }
    }
  }

  // Parse AI response if available
  if (rawText) {
    try {
      const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

      if (mode === 'hashtags_only') {
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        let hashtags: string[] = [];
        if (firstBrace !== -1 && lastBrace !== -1) {
          const parsed = JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
          hashtags = parsed.hashtags || [];
        }
        const formattedTags = hashtags
          .map((t: string) => (String(t).startsWith('#') ? String(t) : `#${String(t).replace(/^#*/, '')}`))
          .slice(0, 5);
        return res.status(200).json({ success: true, hashtags: formattedTags, mode: 'hashtags_only' });
      }

      let parsedCards: any[] = [];
      const firstBracket = cleaned.indexOf('[');
      const lastBracket = cleaned.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1) {
        parsedCards = JSON.parse(cleaned.substring(firstBracket, lastBracket + 1));
      } else {
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          const parsed = JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
          parsedCards = parsed.cards || Object.values(parsed);
        }
      }

      if (Array.isArray(parsedCards) && parsedCards.length > 0) {
        const cards = parsedCards.slice(0, 4).map((c: any, idx: number) => {
          let tags = Array.isArray(c.hashtags)
            ? c.hashtags
            : typeof c.hashtags === 'string'
            ? c.hashtags.split(/\s+/).filter(Boolean)
            : [];

          if (mode === 'captions_only' && existingHashtags.length > 0) {
            tags = existingHashtags;
          }

          tags = tags
            .map((t: any) => (String(t).startsWith('#') ? String(t) : `#${String(t).replace(/^#*/, '')}`))
            .slice(0, 5);

          return {
            id: c.id || idx + 1,
            angle: c.angle || `Option ${idx + 1}`,
            primaryCaption: c.primaryCaption || c.caption || '',
            secondaryCaption: c.secondaryCaption || c.translation || '',
            hashtags: tags,
          };
        });

        return res.status(200).json({ success: true, cards, fromCache: false });
      }
    } catch (parseError) {
      console.warn('AI JSON parse failed, falling back to smart generator', parseError);
    }
  }

  // 3. Fallback: Topic-tailored generation so the app NEVER returns a 500 crash!
  console.warn('Using intelligent topic-tailored fallback. Provider errors:', providerErrors);

  const cleanTopic = topic.replace(/[^\w\s\u0600-\u06FF]/gi, ' ').trim();
  const words = cleanTopic.split(/\s+/).filter((w: string) => w.length > 2);
  const tagWords = words.map((w: string) => `#${w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()}`);

  const defaultHashtags = [
    ...tagWords,
    `#${platform}Post`,
    `#${vibe.split(' ')[0]}Vibes`,
    '#Capshot',
    '#DailyInspiration',
  ].slice(0, 5);

  if (mode === 'hashtags_only') {
    return res.status(200).json({
      success: true,
      hashtags: defaultHashtags,
      mode: 'hashtags_only',
      notice: providerErrors[0] || 'Generated via fallback generator',
    });
  }

  const fallbackCards = [
    {
      id: 1,
      angle: 'Heartfelt & Reflective',
      primaryCaption: `Finding peace and perspective in "${topic}". Sometimes the most powerful reminders come when we slow down and listen closely ✨🕊️`,
      secondaryCaption: `"${topic}" ke baare mein sochte hue dil ko aik ajeeb sukoon milta hai... Allah hum sab ke dilon ko hidayat aur noor se bhar de 🤍`,
      hashtags: existingHashtags.length > 0 ? existingHashtags : defaultHashtags,
    },
    {
      id: 2,
      angle: 'Catchy Hook',
      primaryCaption: `If you needed a sign today regarding "${topic}", this is it. Let every word sink in deep.`,
      secondaryCaption: `Agar aapko aaj "${topic}" ke hawale se aik tasalli bakhsh paigham chahiye tha, to yeh aapke liye hai.`,
      hashtags: existingHashtags.length > 0 ? existingHashtags : defaultHashtags,
    },
    {
      id: 3,
      angle: 'Short & Punchy',
      primaryCaption: `Pure grace, quiet faith, and true meaning. Grounded in "${topic}" 📖✨`,
      secondaryCaption: `Sacha sukoon aur noor... "${topic}" ke sath aik gehra taluq.`,
      hashtags: existingHashtags.length > 0 ? existingHashtags : defaultHashtags,
    },
    {
      id: 4,
      angle: 'High Engagement CTA',
      primaryCaption: `Which reflection on "${topic}" touches your heart the most? Share below so others can find peace too 👇`,
      secondaryCaption: `"${topic}" ke hawale se konsi aayat ya baat aapke dil ko sab se zyada chhoo gayi? Comments mein zaroor batayein ✨`,
      hashtags: existingHashtags.length > 0 ? existingHashtags : defaultHashtags,
    },
  ];

  return res.status(200).json({
    success: true,
    cards: fallbackCards,
    fromCache: false,
    debugInfo: providerErrors.length > 0 ? providerErrors[0] : undefined,
  });
}
