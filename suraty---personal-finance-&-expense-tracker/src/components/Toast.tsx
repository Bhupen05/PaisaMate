import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

export const Toast: React.FC = () => {
  const { toastMessage } = useFinance();

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-8 right-4 lg:right-8 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center gap-3 bg-[#1a1a2e] text-white px-4 py-3 rounded-xl shadow-2xl border border-white/10">
        <CheckCircle2 className="w-5 h-5 text-[#00C853] shrink-0" />
        <span className="text-[13px] font-medium tracking-wide">{toastMessage}</span>
      </div>
    </div>
  );
};
