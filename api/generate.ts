export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const topic = (body.topic || body.description || '').trim();
  const platform = body.platform || 'Instagram';
  const languagePair = body.languagePair || 'English + Roman Urdu';
  const vibe = body.vibe || 'Fun & witty';
  const myStyle = body.myStyle || body.customStyle || '';
  const mode = body.mode || 'full';
  const existingHashtags = body.existingHashtags || [];
  const existingCaptions = body.existingCaptions || [];

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
  if (mode === 'captions_only' && existingHashtags && existingHashtags.length > 0) {
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
3. Secondary caption in ${secondaryLangName}, sounding natural and authentic for the topic.
4. Keep the hashtags exactly as provided.

Return ONLY a valid JSON array of 4 objects matching this structure:
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

  if (!geminiKey && !openRouterKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY is missing. Please add GEMINI_API_KEY in Vercel Project Settings > Environment Variables.',
    });
  }

  try {
    let rawText = '';

    // 1. Try Gemini REST API (Zero external packages required)
    if (geminiKey) {
      const models = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
      for (const m of models) {
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
          }
        } catch {
          // fallback to next model
        }
      }
    }

    // 2. Fallback to OpenRouter if configured and Gemini didn't return
    if (!rawText && openRouterKey) {
      const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openrouter/free',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (orRes.ok) {
        const orData = await orRes.json();
        rawText = orData.choices?.[0]?.message?.content || '';
      }
    }

    if (!rawText) {
      throw new Error('AI provider returned empty response. Please verify GEMINI_API_KEY in Vercel settings.');
    }

    const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

    // Mode: hashtags_only
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

    // Mode: full or captions_only
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

    if (!Array.isArray(parsedCards) || parsedCards.length === 0) {
      throw new Error('Failed to parse AI output. Please try again.');
    }

    const cards = parsedCards.slice(0, 4).map((c: any, idx: number) => {
      let tags = Array.isArray(c.hashtags)
        ? c.hashtags
        : typeof c.hashtags === 'string'
        ? c.hashtags.split(/\s+/).filter(Boolean)
        : [];

      if (mode === 'captions_only' && existingHashtags.length > 0) {
        tags = existingHashtags;
      }

      tags = tags.map((t: any) => (String(t).startsWith('#') ? String(t) : `#${String(t).replace(/^#*/, '')}`)).slice(0, 5);

      return {
        id: c.id || idx + 1,
        angle: c.angle || `Option ${idx + 1}`,
        primaryCaption: c.primaryCaption || c.caption || '',
        secondaryCaption: c.secondaryCaption || c.translation || '',
        hashtags: tags,
      };
    });

    return res.status(200).json({ success: true, cards, fromCache: false });
  } catch (err: any) {
    console.error('Error generating captions:', err);
    return res.status(500).json({
      error: 'Failed to generate captions: ' + (err?.message || 'Server error'),
    });
  }
}
