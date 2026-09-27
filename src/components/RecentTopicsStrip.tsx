import React from 'react';
import { History, X, Sparkles } from 'lucide-react';
import { RecentItem } from '../types.ts';

interface RecentTopicsStripProps {
  items: RecentItem[];
  activeId?: string;
  onSelect: (item: RecentItem) => void;
  onClear: () => void;
}

export const RecentTopicsStrip: React.FC<RecentTopicsStripProps> = ({
  items,
  activeId,
  onSelect,
  onClear,
}) => {
  if (items.length === 0) return null;

  return (
    <div className="w-full mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#6E7381] dark:text-[#9DA3B4]">
          <History className="w-3.5 h-3.5 text-[#FF2E63]" />
          <span>Recent Topics (Instant Reload • 0 AI Quota)</span>
        </div>
        <button
          onClick={onClear}
          className="text-[11px] text-[#8E94A2] hover:text-[#FF2E63] transition-colors"
        >
          Clear history
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all border ${
                isActive
                  ? 'bg-[#FF2E63] text-white border-[#FF2E63] shadow-sm font-medium'
                  : 'bg-white dark:bg-[#161922] text-[#404552] dark:text-[#C5CCD8] border-[#E5E2DC] dark:border-[#262B37] hover:border-[#FF2E63] hover:text-[#FF2E63]'
              }`}
            >
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-[#F2EFE9] dark:bg-[#202533] text-[#6B7280] dark:text-[#9DA3B4]'
              }`}>
                {item.platform}
              </span>
              <span className="max-w-[160px] truncate">{item.topic}</span>
              <span className="text-[10px] opacity-70">
                ({item.cards.length})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
