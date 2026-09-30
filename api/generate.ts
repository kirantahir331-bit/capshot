import { GoogleGenAI, Type } from '@google/genai';

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
1. Provide 4 distinct options: Catchy Hook, Relatable Humor/Story, Short & Punchy, Engagement CTA.
2. Primary caption must be in English with appropriate emojis and formatting.
3. Secondary caption must be in ${secondaryLangName}, sounding natural and authentic for the topic.
4. Keep the hashtags exactly as provided.`;
  } else if (mode === 'hashtags_only') {
    prompt = `You are Capshot, an elite social media hashtag specialist.
Task: Generate 5 fresh, trending, highly relevant hashtags for this post.

Post Topic: "${topic}"
Platform: ${platform}
Vibe: ${vibe}
${existingCaptions.length > 0 ? `Captions:\n${existingCaptions.map((c: any, i: number) => `Option ${i + 1}: ${c.primaryCaption}`).join('\n')}` : ''}

Requirements:
- Exactly 5 hashtags starting with '#' specifically tailored to "${topic}" and ${platform}.`;
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
- Provide 5 highly relevant hashtags tailored to "${topic}" and ${platform}.`;
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const targetSchema = mode === 'hashtags_only'
      ? {
          type: Type.OBJECT,
          properties: {
            hashtags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['hashtags'],
        }
      : {
          type: Type.OBJECT,
          properties: {
            cards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  angle: { type: Type.STRING },
                  primaryCaption: { type: Type.STRING },
                  secondaryCaption: { type: Type.STRING },
                  hashtags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['id', 'angle', 'primaryCaption', 'secondaryCaption', 'hashtags'],
              },
            },
          },
          required: ['cards'],
        };

    const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: targetSchema,
            temperature: 0.8,
          },
        });

        const text = response.text || '';
        const parsed = JSON.parse(text.replace(/```json/gi, '').replace(/```/g, '').trim());

        if (mode === 'hashtags_only') {
          const freshHashtags = (parsed.hashtags || [])
            .map((t: string) => (String(t).startsWith('#') ? String(t) : `#${String(t).replace(/^#*/, '')}`))
            .slice(0, 5);
          return res.status(200).json({ success: true, hashtags: freshHashtags });
        }

        const cards = (parsed.cards || []).slice(0, 4).map((c: any, idx: number) => {
          let tags = Array.isArray(c.hashtags) ? c.hashtags : [];
          if (mode === 'captions_only' && existingHashtags.length > 0) {
            tags = existingHashtags;
          }
          tags = tags.map((t: any) => (String(t).startsWith('#') ? String(t) : `#${String(t).replace(/^#*/, '')}`)).slice(0, 5);
          return {
            id: c.id || idx + 1,
            angle: c.angle || `Option ${idx + 1}`,
            primaryCaption: c.primaryCaption || '',
            secondaryCaption: c.secondaryCaption || '',
            hashtags: tags,
          };
        });

        return res.status(200).json({ success: true, cards, fromCache: false });
      } catch (err: any) {
        lastError = err;
        continue;
      }
    }

    throw lastError || new Error('All AI models failed');
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to generate captions. Please try again.',
      details: error?.message || String(error),
    });
  }
}
