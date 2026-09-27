import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'ok', message: 'Capshot API active' });
  }

  // Accept BOTH topic and description
  const body = req.body || {};
  const topic = (body.topic || body.description || '').trim();
  const platform = body.platform || 'Instagram';
  const languagePair = body.languagePair || 'English + Roman Urdu';
  const vibe = body.vibe || 'Fun & witty';
  const myStyle = body.myStyle || body.customStyle || '';

  if (!topic) {
    return res.status(400).json({ error: 'Post topic is required.' });
  }

  const prompt = `You are a creative social media copywriter. Generate 4 bilingual captions specifically customized for this topic with 5 relevant hashtags.
Topic: "${topic}"
Platform: "${platform}"
Language Pair: "${languagePair}"
Vibe: "${vibe}"
${myStyle ? `Tone/Style to mimic: "${myStyle}"` : ''}

Generate 4 unique angles:
1. Catchy Hook & Vibe (attention-grabbing first line)
2. Relatable Story / Candid Humor
3. Short, Punchy & Aesthetic
4. High Engagement Question / CTA (Call to Action)

Return ONLY a valid JSON object matching this exact structure, with NO extra text and NO markdown ticks:
{
  "success": true,
  "cards": [
    {
      "id": 1,
      "angle": "Catchy Hook & Vibe",
      "primaryCaption": "English caption with relevant emojis",
      "secondaryCaption": "Authentic Roman Urdu translation capturing the exact cultural vibe",
      "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
    },
    {
      "id": 2,
      "angle": "Relatable Humor",
      "primaryCaption": "Relatable English caption",
      "secondaryCaption": "Funny, relatable Roman Urdu translation",
      "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
    },
    {
      "id": 3,
      "angle": "Short & Punchy",
      "primaryCaption": "Short punchy English caption",
      "secondaryCaption": "Short punchy Roman Urdu translation",
      "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
    },
    {
      "id": 4,
      "angle": "High Engagement CTA",
      "primaryCaption": "Interactive English caption with a question",
      "secondaryCaption": "Engaging Roman Urdu question asking for comments",
      "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
    }
  ]
}`;

  try {
    let resultText = '';

    if (process.env.OPENROUTER_API_KEY) {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://capshot.vercel.app',
          'X-Title': 'Capshot'
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7
        })
      });

      const data = await response.json();
      resultText = data.choices?.[0]?.message?.content || '';
    } else if (process.env.GEMINI_API_KEY) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    const cleaned = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const firstBracket = cleaned.indexOf('{');
    const lastBracket = cleaned.lastIndexOf('}');
    
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      const jsonSubstring = cleaned.substring(firstBracket, lastBracket + 1);
      const parsed = JSON.parse(jsonSubstring);
      if (parsed.cards && parsed.cards.length > 0) {
        return res.status(200).json({ success: true, cards: parsed.cards, fromCache: false });
      }
    }
    throw new Error('AI output parsing fallback');
  } catch (err) {
    // Contextual fallback based on topic keywords
    const tagBase = topic.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15);
    return res.status(200).json({
      success: true,
      cards: [
        {
          id: 1,
          angle: "Catchy Hook & Vibe",
          primaryCaption: `Obsessed with this: ${topic}! ✨\n\nLiving in the moment and enjoying every single bit of it. Rate this vibe from 1-10!`,
          secondaryCaption: `${topic} ka scene hi alag hai boss! ✨\n\nPoora enjoy chal raha hai. Aap batao, vibe match hui ke nahi?`,
          hashtags: [`#${tagBase || 'Vibes'}`, "#TrendingNow", "#ExplorePage", "#GoodVibesOnly", "#InstaDaily"]
        },
        {
          id: 2,
          angle: "Relatable Humor",
          primaryCaption: `Current status: 90% thinking about ${topic}, 10% actually being productive. 🫠\n\nWho else is guilty of this?`,
          secondaryCaption: `Zindagi mein baqi kaam ek taraf, aur ${topic} ek taraf. 🫠\n\nSach sach batana, kis kis ka yehi haal hai?`,
          hashtags: [`#${tagBase || 'Relatable'}`, "#MoodOfTheDay", "#PakistaniCreators", "#RelatablePost", "#DailyHumor"]
        },
        {
          id: 3,
          angle: "Short & Punchy",
          primaryCaption: `Pure ${topic} energy. No filters needed. 🔥`,
          secondaryCaption: `Solid scene, no drama. 🔥`,
          hashtags: [`#${tagBase || 'Aesthetic'}`, "#CleanVibes", "#CurrentMood", "#ViralPost", "#DailyInspo"]
        },
        {
          id: 4,
          angle: "High Engagement CTA",
          primaryCaption: `Tell me your favorite memory related to ${topic}! Dropping replies to everyone in the comments below. 👇`,
          secondaryCaption: `Aapka ${topic} ke baray mein kya experience raha hai? Jaldi se comments mein share karein! 👇`,
          hashtags: [`#${tagBase || 'Engagement'}`, "#CommentBelow", "#ShareYourStory", "#Interactive", "#DesiVibes"]
        }
      ],
      fromCache: false
    });
  }
}
