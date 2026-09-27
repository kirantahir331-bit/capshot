import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#151922] text-white dark:bg-white dark:text-[#151922] shadow-xl text-xs font-medium animate-in slide-in-from-bottom-2 fade-in duration-200">
      <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
};
