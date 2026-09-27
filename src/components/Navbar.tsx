import React from 'react';
import { Moon, Sun, Info, ShieldCheck } from 'lucide-react';
import { Decorative3DCube } from './Decorative3DCube.tsx';

interface NavbarProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenLimitsModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  darkMode,
  onToggleDarkMode,
  onOpenLimitsModal,
}) => {
  return (
    <header className="w-full border-b border-[#E6E2DA] dark:border-[#222631] bg-[#FAF8F5]/90 dark:bg-[#0E1015]/90 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand with 3D Core element */}
        <div className="flex items-center gap-3">
          <Decorative3DCube size={34} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-xl tracking-tight text-[#151922] dark:text-white">
                Capshot
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FEF08A] text-[#854D0E] dark:bg-yellow-500/20 dark:text-yellow-300">
                100% Free
              </span>
            </div>
            <p className="text-[11px] text-[#6E7381] dark:text-[#9DA3B4] hidden sm:block">
              Bilingual AI Social Media Captions & Hashtags
            </p>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenLimitsModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-[#555A67] dark:text-[#A6ADB8] hover:text-[#151922] dark:hover:text-white hover:bg-[#EFECE6] dark:hover:bg-[#1A1E29] transition-colors"
            title="Read honest limits & free architecture"
          >
            <Info className="w-3.5 h-3.5 text-[#FF2E63]" />
            <span className="hidden md:inline">How It Works & Limits</span>
            <span className="md:hidden">Limits</span>
          </button>

          <div className="hidden sm:flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>No Account Needed</span>
          </div>

          <button
            onClick={onToggleDarkMode}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#E6E2DA] dark:border-[#262B37] text-[#555A67] dark:text-[#A6ADB8] hover:text-[#151922] dark:hover:text-white hover:bg-[#F3EFE9] dark:hover:bg-[#1D212C] transition-colors"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>
      </div>
    </header>
  );
};
