/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { CaptionForm } from './components/CaptionForm.tsx';
import { CaptionResults } from './components/CaptionResults.tsx';
import { RecentTopicsStrip } from './components/RecentTopicsStrip.tsx';
import { HonestLimitsModal } from './components/HonestLimitsModal.tsx';
import { Toast } from './components/Toast.tsx';
import { Platform, LanguagePair, Vibe, CaptionCard, RecentItem } from './types.ts';
import { Sparkles, Layers, ShieldCheck, Zap } from 'lucide-react';

const RECENT_STORAGE_KEY = 'capshot_recent_v1';
const DARK_MODE_KEY = 'capshot_dark_mode';

export default function App() {
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState<Platform>('Instagram');
  const [languagePair, setLanguagePair] = useState<LanguagePair>('English + Roman Urdu');
  const [vibe, setVibe] = useState<Vibe>('Fun & witty');
  const [myStyle, setMyStyle] = useState('');

  const [cards, setCards] = useState<CaptionCard[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegeneratingCaptions, setIsRegeneratingCaptions] = useState(false);
  const [isRegeneratingHashtags, setIsRegeneratingHashtags] = useState(false);

  const [recentTopics, setRecentTopics] = useState<RecentItem[]>([]);
  const [activeRecentId, setActiveRecentId] = useState<string | undefined>();

  const [retryStatus, setRetryStatus] = useState<{
    isRetrying: boolean;
    attempt: number;
    maxAttempts: number;
  } | null>(null);

  const [isLimitsModalOpen, setIsLimitsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize Dark Mode
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(DARK_MODE_KEY);
      if (saved !== null) return saved === 'true';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(DARK_MODE_KEY, String(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  // Load Recent Topics from LocalStorage (last 8)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentTopics(parsed.slice(0, 8));
        }
      }
    } catch (e) {
      console.warn('Failed to load recent topics from localStorage', e);
    }
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Save new result to recent history
  const saveToRecent = useCallback(
    (newCards: CaptionCard[], topicText: string, p: Platform, lang: LanguagePair, v: Vibe, style?: string) => {
      const newItem: RecentItem = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        topic: topicText,
        platform: p,
        languagePair: lang,
        vibe: v,
        myStyle: style,
        cards: newCards,
        timestamp: Date.now(),
      };

      setRecentTopics((prev) => {
        const filtered = prev.filter(
          (item) => !(item.topic.toLowerCase() === topicText.toLowerCase() && item.platform === p)
        );
        const updated = [newItem, ...filtered].slice(0, 8);
        try {
          localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
        } catch (err) {
          console.warn('Failed saving to localStorage', err);
        }
        return updated;
      });
      setActiveRecentId(newItem.id);
    },
    []
  );

  // Instant Reload from Recent Topics
  const handleSelectRecent = (item: RecentItem) => {
    setTopic(item.topic);
    setPlatform(item.platform);
    setLanguagePair(item.languagePair);
    setVibe(item.vibe);
    setMyStyle(item.myStyle || '');
    setCards(item.cards);
    setActiveRecentId(item.id);
    setFromCache(true);
    showToast(`Loaded "${item.topic.slice(0, 25)}..." instantly from history`);
  };

  const handleClearHistory = () => {
    setRecentTopics([]);
    localStorage.removeItem(RECENT_STORAGE_KEY);
    showToast('Recent history cleared');
  };

  // API Request
  const executeGenerationRequest = async (payload: any): Promise<any> => {
    const maxAttempts = 5;
    let attempt = 1;

    const cleanedTopic = (payload.topic || payload.description || topic || '').trim();
    const requestBody = {
      ...payload,
      topic: cleanedTopic,
      description: cleanedTopic,
    };

    while (attempt <= maxAttempts) {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Server error occurred');
      }

      const data = await res.json();

      if (data.retry) {
        setRetryStatus({ isRetrying: true, attempt, maxAttempts });
        const waitMs = (data.retryAfterSeconds || 2) * 1000;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        attempt++;
        continue;
      }

      setRetryStatus(null);
      return data;
    }

    setRetryStatus(null);
    throw new Error('High server traffic exceeded retries. Please wait a few seconds and try again.');
  };

  const parseResponseCards = (data: any): CaptionCard[] => {
    if (data.cards && Array.isArray(data.cards) && data.cards.length > 0) {
      return data.cards.map((c: any, i: number) => ({
        id: c.id || i + 1,
        angle: c.angle || 'Catchy Hook',
        primaryCaption: c.primaryCaption || c.text || '',
        secondaryCaption: c.secondaryCaption || c.translation || '',
        hashtags: Array.isArray(c.hashtags) ? c.hashtags : [],
      }));
    }
    if (data.captions && Array.isArray(data.captions) && data.captions.length > 0) {
      return data.captions.map((c: any, i: number) => ({
        id: i + 1,
        angle: c.angle || 'Catchy Hook',
        primaryCaption: c.text || c.primaryCaption || '',
        secondaryCaption: c.translation || c.secondaryCaption || '',
        hashtags: Array.isArray(c.hashtags) ? c.hashtags : [],
      }));
    }
    return [];
  };

  // Generate 4 full captions
  const handleGenerateFull = async () => {
    if (!topic.trim()) return;
    setIsLoading(true);
    setFromCache(false);

    try {
      const data = await executeGenerationRequest({
        topic: topic.trim(),
        description: topic.trim(),
        platform,
        languagePair,
        vibe,
        myStyle: myStyle.trim() || undefined,
        mode: 'full',
      });

      const parsedCards = parseResponseCards(data);

      if (parsedCards.length > 0) {
        setCards(parsedCards);
        setFromCache(Boolean(data.fromCache));
        saveToRecent(parsedCards, topic, platform, languagePair, vibe, myStyle);
        showToast(
          data.fromCache
            ? 'Instant result retrieved from cache!'
            : '4 fresh bilingual captions generated!'
        );
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to generate captions');
    } finally {
      setIsLoading(false);
      setRetryStatus(null);
    }
  };

  // Follow-up: Regenerate Captions Only (keep same hashtags)
  const handleRegenerateCaptionsOnly = async () => {
    if (cards.length === 0) return;
    setIsRegeneratingCaptions(true);

    try {
      const currentTags = cards[0]?.hashtags || [];
      const data = await executeGenerationRequest({
        topic: topic.trim(),
        description: topic.trim(),
        platform,
        languagePair,
        vibe,
        myStyle: myStyle.trim() || undefined,
        mode: 'captions_only',
        existingHashtags: currentTags,
      });

      const parsedCards = parseResponseCards(data);

      if (parsedCards.length > 0) {
        const updatedCards = parsedCards.map((card) => ({
          ...card,
          hashtags: currentTags,
        }));
        setCards(updatedCards);
        setFromCache(false);
        saveToRecent(updatedCards, topic, platform, languagePair, vibe, myStyle);
        showToast('Captions refreshed with original hashtags kept!');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to regenerate captions');
    } finally {
      setIsRegeneratingCaptions(false);
      setRetryStatus(null);
    }
  };

  // Follow-up: Regenerate Hashtags Only (keep same captions)
  const handleRegenerateHashtagsOnly = async () => {
    if (cards.length === 0) return;
    setIsRegeneratingHashtags(true);

    try {
      const data = await executeGenerationRequest({
        topic: topic.trim(),
        description: topic.trim(),
        platform,
        vibe,
        mode: 'hashtags_only',
        existingCaptions: cards,
      });

      const freshTags = data.hashtags || (data.cards && data.cards[0]?.hashtags);
      if (freshTags && Array.isArray(freshTags) && freshTags.length > 0) {
        const updatedCards = cards.map((c) => ({
          ...c,
          hashtags: freshTags,
        }));
        setCards(updatedCards);
        setFromCache(false);
        saveToRecent(updatedCards, topic, platform, languagePair, vibe, myStyle);
        showToast('5 fresh trending hashtags generated!');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to regenerate hashtags');
    } finally {
      setIsRegeneratingHashtags(false);
      setRetryStatus(null);
    }
  };

  const sampleTopics = [
    'Chai dhaba hangout with childhood friends',
    'Morning workout gym PR & consistency grind',
    'Aesthetic minimalist work desk setup with coffee',
    'Exploring local food street on a rainy evening',
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0E1015] text-[#151922] dark:text-[#E2E6EF] flex flex-col transition-colors">
      <Navbar
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        onOpenLimitsModal={() => setIsLimitsModalOpen(true)}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FEF08A] text-[#713F12] dark:bg-yellow-500/15 dark:text-yellow-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#FF2E63]" />
            <span>Dual-Language AI Copywriting • 0 Signup Required</span>
          </div>

          <h1 className="font-heading font-extrabold text-3xl sm:text-5xl tracking-tight text-[#151922] dark:text-white mb-3">
            Write viral captions in{' '}
            <span className="text-[#FF2E63] underline decoration-[#FEF08A] decoration-4 underline-offset-4">
              two languages
            </span>{' '}
            at once.
          </h1>

          <p className="text-sm sm:text-base text-[#5B6170] dark:text-[#9DA5B5] max-w-2xl mx-auto leading-relaxed">
            Get 4 tailored caption angles with 5 viral hashtags. Powered by smart server caching and
            intelligent retry smoothing so it stays completely free for every visitor.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs">
            <span className="text-[#7B8191] dark:text-[#8D94A6]">Try an idea:</span>
            {sampleTopics.map((s, idx) => (
              <button
                key={idx}
                onClick={() => setTopic(s)}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#151821] border border-[#E4E0D6] dark:border-[#262B37] text-[#484D5C] dark:text-[#BDC5D5] hover:border-[#FF2E63] hover:text-[#FF2E63] transition-colors cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <RecentTopicsStrip
          items={recentTopics}
          activeId={activeRecentId}
          onSelect={handleSelectRecent}
          onClear={handleClearHistory}
        />

        <CaptionForm
          topic={topic}
          setTopic={setTopic}
          platform={platform}
          setPlatform={setPlatform}
          languagePair={languagePair}
          setLanguagePair={setLanguagePair}
          vibe={vibe}
          setVibe={setVibe}
          myStyle={myStyle}
          setMyStyle={setMyStyle}
          onSubmit={handleGenerateFull}
          isLoading={isLoading}
          retryStatus={retryStatus}
        />

        <CaptionResults
          cards={cards}
          platform={platform}
          languagePair={languagePair}
          onRegenerateCaptionsOnly={handleRegenerateCaptionsOnly}
          onRegenerateHashtagsOnly={handleRegenerateHashtagsOnly}
          isRegeneratingCaptions={isRegeneratingCaptions}
          isRegeneratingHashtags={isRegeneratingHashtags}
          onShowToast={showToast}
          fromCache={fromCache}
        />

        <div className="mt-16 pt-8 border-t border-[#EAE6DF] dark:border-[#222631] grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-[#5D6373] dark:text-[#9DA4B4]">
          <div className="space-y-1">
            <div className="font-semibold text-[#151922] dark:text-white flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#FF2E63]" />
              <span>Bilingual Growth Strategy</span>
            </div>
            <p className="leading-relaxed">
              Pairing English with Roman Urdu, Urdu, or Hindi reaches both global discovery feeds and
              deeply engaged local communities simultaneously.
            </p>
          </div>

          <div className="space-y-1">
            <div className="font-semibold text-[#151922] dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Zero-Tracking Privacy</span>
            </div>
            <p className="leading-relaxed">
              Your recent history is saved strictly in your local browser's storage. No user accounts,
              no tracking cookies, and no personal logs on the server.
            </p>
          </div>

          <div className="space-y-1">
            <div className="font-semibold text-[#151922] dark:text-white flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>Free Architecture</span>
            </div>
            <p className="leading-relaxed">
              Backed by intelligent caching and request smoothing, providing unlimited free access
              without requiring users to enter API keys or payment info.
            </p>
          </div>
        </div>
      </main>

      <footer className="w-full border-t border-[#E6E2DA] dark:border-[#222631] py-6 text-center text-xs text-[#7B8292] dark:text-[#8D94A6]">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Capshot — Free AI Social Media Caption Generator</span>
          <button
            onClick={() => setIsLimitsModalOpen(true)}
            className="hover:text-[#FF2E63] transition-colors underline underline-offset-2"
          >
            How it works & Honest limits
          </button>
        </div>
      </footer>

      <HonestLimitsModal
        isOpen={isLimitsModalOpen}
        onClose={() => setIsLimitsModalOpen(false)}
      />

      <Toast message={toastMessage} />
    </div>
  );
}
