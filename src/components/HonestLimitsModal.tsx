import React, { useEffect, useState } from "react";
import { X, ShieldAlert, Zap, Server, Database, Sparkles } from "lucide-react";

interface HonestLimitsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HonestLimitsModal: React.FC<HonestLimitsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [stats, setStats] = useState<{
    cachedEntries?: number;
    requestsLastMinute?: number;
    rpmLimit?: number;
    upstashConfigured?: boolean;
    geminiConfigured?: boolean;
    openRouterConfigured?: boolean;
  }>({});

  useEffect(() => {
    if (isOpen) {
      fetch("/api/stats")
        .then((res) => res.json())
        .then((data) => setStats(data))
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#FAF8F5] dark:bg-[#1A1F2C] border border-[#EAE6DF] dark:border-[#252A37] rounded-3xl p-6 shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-[#7A8191] hover:text-[#151922] dark:hover:text-white hover:bg-[#F3EFEA] dark:hover:bg-[#252A37] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#FEF08A] text-[#854D0E] dark:bg-yellow-500/20 dark:text-yellow-400 flex items-center justify-center font-bold">
            <Zap className="w-5 h-5 text-[#854D0E] dark:text-yellow-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#151922] dark:text-white">
              How Capshot Works & Honest Limits
            </h3>
            <p className="text-xs text-[#7A8191]">
              Transparency first — no hidden credit card paywalls.
            </p>
          </div>
        </div>

        {/* System Status Indicators */}
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <div className="p-3 rounded-2xl bg-white dark:bg-[#151922] border border-[#EAE6DF] dark:border-[#252A37] flex items-center gap-2.5">
            <Server className="w-4 h-4 text-[#08D9D6]" />
            <div>
              <div className="text-[10px] text-[#7A8191] font-medium uppercase tracking-wider">AI Pipeline</div>
              <div className="text-xs font-semibold text-[#151922] dark:text-white flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Fast Multi-Model
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-[#151922] border border-[#EAE6DF] dark:border-[#252A37] flex items-center gap-2.5">
            <Database className="w-4 h-4 text-[#FF2E63]" />
            <div>
              <div className="text-[10px] text-[#7A8191] font-medium uppercase tracking-wider">Smart Cache</div>
              <div className="text-xs font-semibold text-[#151922] dark:text-white">
                {stats.cachedEntries ?? 0} Instant Results
              </div>
            </div>
          </div>
        </div>

        {/* Honest Limitations Checklist */}
        <div className="space-y-3 text-xs text-[#525765] dark:text-gray-300">
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-900 dark:text-amber-200">Rate Limiting Protection: </span>
              To keep Capshot completely free for everyone, requests are rate-limited to maintain high speed and prevent bot exhaustion.
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#151922] border border-[#EAE6DF] dark:border-[#252A37] space-y-2">
            <div className="font-semibold text-[#151922] dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#08D9D6]" />
              What to expect:
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-[#7A8191]">
              <li>
                <strong>Instant caching:</strong> Common trends and topics generate in milliseconds from high-speed cache.
              </li>
              <li>
                <strong>Output model scope:</strong> Ideal for creative captions, engagement hooks, and social hashtags.
              </li>
              <li>
                <strong>Generous Free Tier:</strong> Free to generate anytime without subscription traps.
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-[#EAE6DF] dark:border-[#252A37] flex items-center justify-between">
          <span className="text-[11px] text-[#7A8191]">
            Capshot • Built for creators and marketers
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#151922] hover:bg-black text-white dark:bg-white dark:text-[#151922] dark:hover:bg-gray-100 font-semibold text-xs transition-colors"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
};
