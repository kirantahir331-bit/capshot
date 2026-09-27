import React, { useEffect, useState } from 'react';
import { X, ShieldAlert, Zap, Server, Database, Sparkles, CheckCircle2, Download, Loader2 } from 'lucide-react';

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
  const [downloading, setDownloading] = useState(false);

  const handleDownloadZip = async () => {
    try {
      setDownloading(true);
      const res = await fetch('/api/download-zip');
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'capshot-project.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetch('/api/stats')
        .then((res) => res.json())
        .then((data) => setStats(data))
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#141720] border border-[#E5E2DC] dark:border-[#252A37] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-7 relative text-[#151922] dark:text-[#E2E6EF]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-[#7A8191] hover:text-[#151922] dark:hover:text-white hover:bg-[#F2EFE9] dark:hover:bg-[#1E2330] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#FEF08A] text-[#854D0E] dark:bg-yellow-500/20 dark:text-yellow-400 flex items-center justify-center font-bold">
            <Zap className="w-5 h-5 text-[#854D0E] dark:text-yellow-400" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-xl text-[#151922] dark:text-white">
              Capshot Architecture & Honest Limits
            </h3>
            <p className="text-xs text-[#6B7280] dark:text-[#9DA3B4]">
              Transparent breakdown of how Capshot runs 100% free with zero accounts.
            </p>
          </div>
        </div>

        {/* Live Server & Cache Status */}
        <div className="mb-6 p-3.5 rounded-xl bg-[#FAF8F5] dark:bg-[#0F1117] border border-[#EBE7E0] dark:border-[#222734] grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-[10px] uppercase font-bold text-[#868C9C]">Cached Prompts</div>
            <div className="text-base font-bold text-[#FF2E63] font-heading">
              {stats.cachedEntries ?? 0}
            </div>
            <div className="text-[9px] text-[#6B7280]">30-day TTL</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-[#868C9C]">RPM Ceiling</div>
            <div className="text-base font-bold text-[#151922] dark:text-white font-heading">
              {stats.rpmLimit ?? 40} req/m
            </div>
            <div className="text-[9px] text-[#6B7280]">Rate-limit guard</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-[#868C9C]">Cache Engine</div>
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.upstashConfigured ? 'Upstash Redis' : 'In-Memory LRU'}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-[#868C9C]">Visitor Cost</div>
            <div className="text-xs font-semibold text-[#FF2E63] mt-1">$0 / Forever</div>
          </div>
        </div>

        {/* Core Architecture Insights */}
        <div className="space-y-4 text-xs sm:text-sm text-[#444A57] dark:text-[#CBD2E0] leading-relaxed">
          <div className="p-3.5 rounded-xl bg-[#FAF8F5]/80 dark:bg-[#1A1E29] border border-[#E6E1D8] dark:border-[#2A3142]">
            <h4 className="font-semibold text-xs sm:text-sm text-[#151922] dark:text-white flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Why zero logins or visitor API keys are required</span>
            </h4>
            <p className="text-xs text-[#555B6A] dark:text-[#A7AFBD]">
              A visitor's own AI account or credit card is never touched. The server handles
              requests on the backend using site-level API keys and an automatic free-model router
              or Google Gemini. You can safely bookmark and share Capshot without anyone needing to sign up.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF8F5]/80 dark:bg-[#1A1E29] border border-[#E6E1D8] dark:border-[#2A3142]">
            <h4 className="font-semibold text-xs sm:text-sm text-[#151922] dark:text-white flex items-center gap-1.5 mb-1">
              <Database className="w-4 h-4 text-blue-500" />
              <span>Redis caching + silent auto-retry loop</span>
            </h4>
            <p className="text-xs text-[#555B6A] dark:text-[#A7AFBD]">
              Duplicate and similar requests are returned instantly from cache (30-day expiry),
              consuming 0 API calls. If hundreds of people query simultaneously and hit the free
              rate ceiling, the server returns a quiet retry signal that auto-attempts 5 times
              before showing an error.
            </p>
          </div>

          {/* Honest Limits section */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 text-amber-900 dark:text-amber-200">
            <h4 className="font-semibold text-xs sm:text-sm flex items-center gap-1.5 mb-1 text-amber-900 dark:text-amber-300">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Honest limits you should know</span>
            </h4>
            <ul className="list-disc list-inside space-y-1 text-xs text-amber-800 dark:text-amber-300/90 pl-1">
              <li>
                <strong>Free-tier ceilings:</strong> Designed for tens of requests per minute and
                thousands per day. Viral traffic spikes can momentarily trigger the 2s retry queue.
              </li>
              <li>
                <strong>Output model scope:</strong> Ideal for creative captions, engagement hooks,
                and social hashtags. Not intended for academic or high-stakes legal copywriting.
              </li>
              <li>
                <strong>Scaling up:</strong> If traffic exceeds free limits, adding a low-cost paid
                tier on the backend is plug-and-play without changing user UX.
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-[#EAE6DF] dark:border-[#252A37] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={handleDownloadZip}
            disabled={downloading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-[#FF2E63] hover:bg-[#E02656] text-white font-medium text-xs transition-colors shadow-sm disabled:opacity-70"
            title="Download complete project ZIP to deploy on Vercel"
          >
            {downloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{downloading ? 'Preparing ZIP...' : 'Download Project Code (ZIP)'}</span>
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#151922] hover:bg-black text-white dark:bg-white dark:text-[#151922] dark:hover:bg-gray-100 font-semibold text-xs transition-colors"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
};
