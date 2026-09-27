import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Instagram,
  Video,
  Linkedin,
  Twitter,
  Facebook,
  Languages,
  Wand2,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { Platform, LanguagePair, Vibe } from '../types.ts';
import { TiltWrapper } from './TiltWrapper.tsx';

interface CaptionFormProps {
  topic: string;
  setTopic: (val: string) => void;
  platform: Platform;
  setPlatform: (val: Platform) => void;
  languagePair: LanguagePair;
  setLanguagePair: (val: LanguagePair) => void;
  vibe: Vibe;
  setVibe: (val: Vibe) => void;
  myStyle: string;
  setMyStyle: (val: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  retryStatus: { isRetrying: boolean; attempt: number; maxAttempts: number } | null;
}

export const CaptionForm: React.FC<CaptionFormProps> = ({
  topic,
  setTopic,
  platform,
  setPlatform,
  languagePair,
  setLanguagePair,
  vibe,
  setVibe,
  myStyle,
  setMyStyle,
  onSubmit,
  isLoading,
  retryStatus,
}) => {
  const [isStyleOpen, setIsStyleOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Detect Speech Recognition support gracefully
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setTopic(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [setTopic]);

  const toggleSpeech = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Speech recognition start failed:', err);
      }
    }
  };

  const platforms: { name: Platform; icon: React.ReactNode }[] = [
    { name: 'Instagram', icon: <Instagram className="w-4 h-4 text-pink-500" /> },
    { name: 'TikTok', icon: <Video className="w-4 h-4 text-cyan-500" /> },
    { name: 'YouTube Shorts', icon: <Video className="w-4 h-4 text-red-500" /> },
    { name: 'Facebook', icon: <Facebook className="w-4 h-4 text-blue-600" /> },
    { name: 'LinkedIn', icon: <Linkedin className="w-4 h-4 text-blue-500" /> },
    { name: 'X/Twitter', icon: <Twitter className="w-4 h-4 text-sky-400" /> },
  ];

  const languagePairs: LanguagePair[] = [
    'English + Roman Urdu',
    'English + Urdu',
    'English + Hindi',
    'English only',
  ];

  const vibes: Vibe[] = [
    'Fun & witty',
    'Aesthetic & minimal',
    'Bold & confident',
    'Heartfelt',
    'Professional',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || isLoading) return;
    onSubmit();
  };

  return (
    <TiltWrapper maxTilt={2.2} className="rounded-[18px]">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-[#151821] rounded-[18px] border border-[#E5E2DC] dark:border-[#242936] p-5 sm:p-7 transition-colors shadow-3d-panel"
      >
      {/* Topic input with mic button */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-[#151922] dark:text-[#ECEEF2] flex items-center gap-1.5">
            <span>What's the post about?</span>
            <span className="text-xs font-normal text-[#7E8494] dark:text-[#8E95A6]">
              (e.g., weekend trip, product launch, morning reflection)
            </span>
          </label>
          {speechSupported && (
            <button
              type="button"
              onClick={toggleSpeech}
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-all ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-[#F2EFE9] dark:bg-[#1E2330] text-[#555A67] dark:text-[#A6ADB8] hover:text-[#FF2E63]'
              }`}
              title={isListening ? 'Stop listening' : 'Dictate with microphone'}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span>{isListening ? 'Listening...' : 'Voice input'}</span>
            </button>
          )}
        </div>

        <div className="relative">
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Describe your post or photo... (e.g. 'Late night chai with friends at dhaba, laughing about old college memories and planning our next road trip')"
            rows={3}
            className="w-full rounded-xl border border-[#DCD7CE] dark:border-[#2C3140] bg-[#FAF8F5]/50 dark:bg-[#0F1117] p-3.5 text-sm text-[#151922] dark:text-[#F3F4F6] placeholder-[#8F94A2] dark:placeholder-[#676D7E] focus:outline-none focus:ring-2 focus:ring-[#FF2E63] focus:border-transparent transition-all resize-y"
          />
        </div>
      </div>

      {/* Collapsible: Match my own style */}
      <div className="mb-5 border border-[#ECE8E1] dark:border-[#232733] rounded-xl overflow-hidden bg-[#FAF8F5]/30 dark:bg-[#111319]/40">
        <button
          type="button"
          onClick={() => setIsStyleOpen(!isStyleOpen)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#F4F0E8] dark:hover:bg-[#1A1E29] transition-colors"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#FF2E63]" />
            <span className="text-xs font-semibold text-[#151922] dark:text-[#ECEEF2]">
              Match my own style
            </span>
            <span className="text-[11px] text-[#7E8494] dark:text-[#8E95A6]">
              (Optional — paste 2-3 past captions to imitate your tone)
            </span>
          </div>
          {isStyleOpen ? (
            <ChevronUp className="w-4 h-4 text-[#7E8494]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#7E8494]" />
          )}
        </button>

        {isStyleOpen && (
          <div className="px-4 pb-4 pt-1">
            <textarea
              value={myStyle}
              onChange={(e) => setMyStyle(e.target.value)}
              placeholder="Paste your past captions here... Capshot will imitate your emoji density, line-breaking style, vocabulary, and humor level."
              rows={3}
              className="w-full rounded-lg border border-[#DCD7CE] dark:border-[#2C3140] bg-white dark:bg-[#0F1117] p-3 text-xs text-[#151922] dark:text-[#F3F4F6] placeholder-[#8F94A2] dark:placeholder-[#676D7E] focus:outline-none focus:ring-2 focus:ring-[#FF2E63] focus:border-transparent transition-all"
            />
          </div>
        )}
      </div>

      {/* Selectors grid: Platform & Language Pair */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {/* Platform Dropdown */}
        <div>
          <label className="block text-xs font-semibold text-[#151922] dark:text-[#ECEEF2] mb-1.5">
            Platform
          </label>
          <div className="relative">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              className="w-full appearance-none rounded-xl border border-[#DCD7CE] dark:border-[#2C3140] bg-white dark:bg-[#0F1117] py-2.5 pl-3.5 pr-10 text-xs font-medium text-[#151922] dark:text-[#F3F4F6] focus:outline-none focus:ring-2 focus:ring-[#FF2E63] focus:border-transparent transition-colors cursor-pointer"
            >
              {platforms.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[#7E8494] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Language Pair Dropdown */}
        <div>
          <label className="block text-xs font-semibold text-[#151922] dark:text-[#ECEEF2] mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-[#FF2E63]" />
              <span>Language Pair</span>
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              Bilingual output
            </span>
          </label>
          <div className="relative">
            <select
              value={languagePair}
              onChange={(e) => setLanguagePair(e.target.value as LanguagePair)}
              className="w-full appearance-none rounded-xl border border-[#DCD7CE] dark:border-[#2C3140] bg-white dark:bg-[#0F1117] py-2.5 pl-3.5 pr-10 text-xs font-medium text-[#151922] dark:text-[#F3F4F6] focus:outline-none focus:ring-2 focus:ring-[#FF2E63] focus:border-transparent transition-colors cursor-pointer"
            >
              {languagePairs.map((pair) => (
                <option key={pair} value={pair}>
                  {pair}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[#7E8494] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Selectable Vibe Chips */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-[#151922] dark:text-[#ECEEF2] mb-2">
          Select Vibe
        </label>
        <div className="flex flex-wrap gap-2">
          {vibes.map((v) => {
            const isSelected = vibe === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setVibe(v)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-[#FF2E63] text-white shadow-xs font-semibold scale-[1.02]'
                    : 'bg-[#F4F1EA] dark:bg-[#1E222F] text-[#4F5463] dark:text-[#B1B7C4] hover:bg-[#EAE5DC] dark:hover:bg-[#282E3E]'
                }`}
              >
                {v}
              </button>
            );
          })}
        </div>
      </div>

      {/* Retry indicator bar (if server asked to wait & retry) */}
      {retryStatus?.isRetrying && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-600 flex-shrink-0" />
          <span>
            High server traffic: quietly retrying in 2s (Attempt {retryStatus.attempt} of{' '}
            {retryStatus.maxAttempts}). Please wait...
          </span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || !topic.trim()}
        className={`w-full py-3.5 px-6 rounded-xl font-heading font-bold text-sm text-white flex items-center justify-center gap-2 transition-all shadow-sm ${
          isLoading || !topic.trim()
            ? 'bg-[#FF2E63]/60 cursor-not-allowed'
            : 'bg-[#FF2E63] hover:bg-[#E11D48] active:scale-[0.99] cursor-pointer'
        }`}
      >
        {isLoading ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Generating 4 bilingual caption variations...</span>
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4" />
            <span>Generate Captions</span>
          </>
        )}
      </button>
    </form>
    </TiltWrapper>
  );
};
