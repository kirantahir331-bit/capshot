import React, { useState } from 'react';
import {
  Copy,
  Check,
  RefreshCw,
  Hash,
  Sparkles,
  ArrowRight,
  MessageSquare,
  Repeat,
  Share2,
} from 'lucide-react';
import { CaptionCard, Platform, LanguagePair } from '../types.ts';
import { TiltWrapper } from './TiltWrapper.tsx';

interface CaptionResultsProps {
  cards: CaptionCard[];
  platform: Platform;
  languagePair: LanguagePair;
  onRegenerateCaptionsOnly: () => void;
  onRegenerateHashtagsOnly: () => void;
  isRegeneratingCaptions: boolean;
  isRegeneratingHashtags: boolean;
  onShowToast: (message: string) => void;
  fromCache?: boolean;
}

export const CaptionResults: React.FC<CaptionResultsProps> = ({
  cards,
  platform,
  languagePair,
  onRegenerateCaptionsOnly,
  onRegenerateHashtagsOnly,
  isRegeneratingCaptions,
  isRegeneratingHashtags,
  onShowToast,
  fromCache,
}) => {
  const [copiedCardId, setCopiedCardId] = useState<number | string | null>(null);
  const [copiedPartKey, setCopiedPartKey] = useState<string | null>(null);
  const [isCopiedAll, setIsCopiedAll] = useState(false);

  if (!cards || cards.length === 0) return null;

  const handleCopyAllOptions = () => {
    if (!cards || cards.length === 0) return;

    const formattedBlocks = cards
      .map((card, idx) => {
        const optionNum = idx + 1;
        const angle = card.angle || `Option ${optionNum}`;
        const hashtagsStr = card.hashtags?.length ? card.hashtags.join(' ') : '';

        let block = `--- OPTION ${optionNum}: ${angle} ---\n`;
        block += `${card.primaryCaption}\n`;
        if (card.secondaryCaption) {
          block += `\n${card.secondaryCaption}\n`;
        }
        if (hashtagsStr) {
          block += `\n${hashtagsStr}`;
        }
        return block.trim();
      })
      .join('\n\n==============================\n\n');

    const fullText = `CAPSHOT - ALL 4 CAPTION OPTIONS (${platform})\n\n${formattedBlocks}`;

    navigator.clipboard.writeText(fullText);
    setIsCopiedAll(true);
    onShowToast('All 4 caption options & hashtags copied to clipboard!');
    setTimeout(() => setIsCopiedAll(false), 2500);
  };

  const handleCopyCardAll = (card: CaptionCard) => {
    const textToCopy = `${card.primaryCaption}\n\n${card.secondaryCaption}\n\n${card.hashtags.join(' ')}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedCardId(card.id);
    onShowToast(`Option ${card.id} (Captions + Hashtags) copied!`);
    setTimeout(() => setCopiedCardId(null), 2500);
  };

  const handleCopySpecific = (text: string, label: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPartKey(key);
    onShowToast(`${label} copied!`);
    setTimeout(() => setCopiedPartKey(null), 2000);
  };

  const isBilingual = languagePair !== 'English only';
  const secondaryLabel = languagePair.includes('Roman Urdu')
    ? 'Roman Urdu'
    : languagePair.includes('Urdu')
    ? 'Urdu (اردو)'
    : languagePair.includes('Hindi')
    ? 'Hindi (हिन्दी)'
    : 'Alternative Angle';

  return (
    <div className="mt-8 space-y-6">
      {/* Results Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#EAE6DF] dark:border-[#222734]">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF2E63]" />
          <h2 className="font-heading font-bold text-lg text-[#151922] dark:text-white">
            4 Caption Variations
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-md bg-[#FAF0E6] dark:bg-[#202533] text-[#785E4E] dark:text-[#A8B2C4] font-medium">
            {platform}
          </span>
          {fromCache && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              ⚡ Instant Cache Hit
            </span>
          )}
        </div>

        {/* Global Actions (Copy All + Regenerate) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Copy All Button */}
          <button
            onClick={handleCopyAllOptions}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FF2E63]/10 dark:bg-[#FF2E63]/20 border border-[#FF2E63]/40 text-[#FF2E63] hover:bg-[#FF2E63] hover:text-white transition-all shadow-sm active:scale-95"
            title="Copy all 4 caption options and hashtags as a single formatted block"
          >
            {isCopiedAll ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">All 4 Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy All (4 Options)</span>
              </>
            )}
          </button>

          <button
            onClick={onRegenerateCaptionsOnly}
            disabled={isRegeneratingCaptions || isRegeneratingHashtags}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#D8D3CA] dark:border-[#2D3344] bg-white dark:bg-[#151821] text-[#3E4351] dark:text-[#C5CCD8] hover:text-[#FF2E63] hover:border-[#FF2E63] transition-all disabled:opacity-50"
            title="Keep current hashtags, write 4 new captions"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRegeneratingCaptions ? 'animate-spin text-[#FF2E63]' : ''}`}
            />
            <span>{isRegeneratingCaptions ? 'Rewriting captions...' : 'New captions only'}</span>
          </button>

          <button
            onClick={onRegenerateHashtagsOnly}
            disabled={isRegeneratingCaptions || isRegeneratingHashtags}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#D8D3CA] dark:border-[#2D3344] bg-white dark:bg-[#151821] text-[#3E4351] dark:text-[#C5CCD8] hover:text-[#FF2E63] hover:border-[#FF2E63] transition-all disabled:opacity-50"
            title="Keep current captions, find 5 fresh hashtags"
          >
            <Hash
              className={`w-3.5 h-3.5 ${isRegeneratingHashtags ? 'animate-pulse text-[#FF2E63]' : ''}`}
            />
            <span>{isRegeneratingHashtags ? 'Updating tags...' : 'New hashtags only'}</span>
          </button>
        </div>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {cards.map((card, index) => {
          const isCopiedAll = copiedCardId === card.id;

          return (
            <TiltWrapper
              key={card.id || index}
              maxTilt={3.5}
              className="h-full rounded-[18px]"
            >
              <div
                className="h-full bg-white dark:bg-[#151821] rounded-[18px] border border-[#E5E2DC] dark:border-[#242936] p-5 flex flex-col justify-between transition-all hover:border-[#D6D0C5] dark:hover:border-[#353C4E] relative group shadow-3d-card"
              >
              <div>
                {/* Card Top Angle / Tag */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FAF0E6] dark:bg-[#202533] text-[#7A6150] dark:text-[#BDC5D5] flex items-center justify-center text-[11px] font-bold">
                      {index + 1}
                    </span>
                    <span className="font-heading font-semibold text-xs text-[#151922] dark:text-[#ECEEF2]">
                      {card.angle || `Option ${index + 1}`}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopyCardAll(card)}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                      isCopiedAll
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#FF2E63]/10 text-[#FF2E63] hover:bg-[#FF2E63] hover:text-white dark:bg-[#FF2E63]/15'
                    }`}
                  >
                    {isCopiedAll ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied All</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy All</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Primary Caption (English) */}
                <div className="mb-4 bg-[#FAF8F5]/60 dark:bg-[#0F1117] p-3.5 rounded-xl border border-[#EDEAE3] dark:border-[#222734] relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#737887] dark:text-[#8D94A6]">
                      Primary (English)
                    </span>
                    <button
                      onClick={() =>
                        handleCopySpecific(
                          card.primaryCaption,
                          'English caption',
                          `p-${card.id}`
                        )
                      }
                      className="text-[11px] text-[#737887] dark:text-[#8D94A6] hover:text-[#FF2E63] transition-colors flex items-center gap-1"
                      title="Copy English only"
                    >
                      {copiedPartKey === `p-${card.id}` ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>Copy</span>
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-[#151922] dark:text-[#ECEEF2] whitespace-pre-line leading-relaxed">
                    {card.primaryCaption}
                  </p>
                </div>

                {/* Secondary Caption (Roman Urdu / Urdu / Hindi / etc) */}
                {isBilingual && card.secondaryCaption && (
                  <div className="mb-4 bg-[#FEFCE8]/40 dark:bg-yellow-950/15 p-3.5 rounded-xl border border-yellow-200/60 dark:border-yellow-900/40 relative">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-yellow-400">
                        {secondaryLabel}
                      </span>
                      <button
                        onClick={() =>
                          handleCopySpecific(
                            card.secondaryCaption,
                            `${secondaryLabel} caption`,
                            `s-${card.id}`
                          )
                        }
                        className="text-[11px] text-amber-800 dark:text-yellow-400 hover:text-[#FF2E63] transition-colors flex items-center gap-1"
                        title={`Copy ${secondaryLabel} only`}
                      >
                        {copiedPartKey === `s-${card.id}` ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>Copy</span>
                      </button>
                    </div>
                    <p
                      className={`text-xs sm:text-sm text-[#151922] dark:text-[#ECEEF2] whitespace-pre-line leading-relaxed ${
                        languagePair.includes('Urdu') && !languagePair.includes('Roman')
                          ? 'font-serif text-right text-base leading-loose'
                          : ''
                      }`}
                    >
                      {card.secondaryCaption}
                    </p>
                  </div>
                )}
              </div>

              {/* 5 Hashtags */}
              <div className="pt-3 border-t border-[#EDEAE3] dark:border-[#222734]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-[#666B78] dark:text-[#9EA5B4]">
                    <Hash className="w-3 h-3 text-[#FF2E63]" />
                    <span>5 Trending Hashtags</span>
                  </div>
                  <button
                    onClick={() =>
                      handleCopySpecific(
                        card.hashtags.join(' '),
                        'Hashtags',
                        `h-${card.id}`
                      )
                    }
                    className="text-[10px] text-[#666B78] dark:text-[#9EA5B4] hover:text-[#FF2E63] transition-colors flex items-center gap-1"
                  >
                    {copiedPartKey === `h-${card.id}` ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>Copy tags</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {card.hashtags.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      onClick={() => handleCopySpecific(tag, tag, `single-${tag}-${card.id}`)}
                      className="cursor-pointer text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#F2EFE9] dark:bg-[#1E2330] text-[#3D4250] dark:text-[#BDC5D5] hover:bg-[#FF2E63]/10 hover:text-[#FF2E63] transition-colors"
                      title="Click to copy single hashtag"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            </TiltWrapper>
          );
        })}
      </div>

      {/* Follow-up bottom banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-[#FAF8F5] dark:bg-[#111319] border border-[#E5E2DC] dark:border-[#222631] text-xs">
        <div className="flex items-center gap-2 text-[#555A67] dark:text-[#A6ADB8]">
          <Repeat className="w-4 h-4 text-[#FF2E63]" />
          <span>
            Want to fine-tune? Keep the hashtags and regenerate captions, or vice versa.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyAllOptions}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF2E63] text-white font-medium hover:bg-[#E02656] transition-all shadow-sm active:scale-95"
            title="Copy all 4 caption options and hashtags as a single formatted block"
          >
            {isCopiedAll ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>All 4 Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy All (4 Options)</span>
              </>
            )}
          </button>
          <button
            onClick={onRegenerateCaptionsOnly}
            disabled={isRegeneratingCaptions || isRegeneratingHashtags}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#1B1F2A] border border-[#D5D0C6] dark:border-[#2D3344] font-medium text-[#222734] dark:text-white hover:border-[#FF2E63] hover:text-[#FF2E63] transition-all disabled:opacity-50"
          >
            Regenerate Captions Only
          </button>
          <button
            onClick={onRegenerateHashtagsOnly}
            disabled={isRegeneratingCaptions || isRegeneratingHashtags}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#1B1F2A] border border-[#D5D0C6] dark:border-[#2D3344] font-medium text-[#222734] dark:text-white hover:border-[#FF2E63] hover:text-[#FF2E63] transition-all disabled:opacity-50"
          >
            Regenerate Hashtags Only
          </button>
        </div>
      </div>
    </div>
  );
};
