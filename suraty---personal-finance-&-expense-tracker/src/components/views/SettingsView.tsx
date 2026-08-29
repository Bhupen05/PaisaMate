import React, { useState } from 'react';
import {
  Sliders,
  User,
  Shield,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  DollarSign,
  Globe,
} from 'lucide-react';
import { useFinance, CurrencyCode } from '../../context/FinanceContext';
import { INITIAL_USER } from '../../data/mockData';

export const SettingsView: React.FC = () => {
  const {
    currency,
    setCurrency,
    budgetPercentages,
    setBudgetPercentages,
    showToast,
  } = useFinance();

  const [needTarget, setNeedTarget] = useState(budgetPercentages.need);
  const [wantTarget, setWantTarget] = useState(budgetPercentages.want);
  const [dreamTarget, setDreamTarget] = useState(budgetPercentages.dream);

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (needTarget + wantTarget + dreamTarget !== 100) {
      showToast('Budget percentages must add up to exactly 100%');
      return;
    }
    setBudgetPercentages({
      need: needTarget,
      want: wantTarget,
      dream: dreamTarget,
    });
    showToast('50/30/20 Budget targets updated successfully!');
  };

  const handleResetData = () => {
    if (window.confirm('Reset all transaction and settlement data to default?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div id="settings-view" className="p-4 md:p-6 lg:p-8 max-w-[1200px] mx-auto w-full space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-[32px] md:text-[36px] font-bold text-[#00000b] tracking-tight">
          Settings & Preferences
        </h1>
        <p className="text-[14px] text-[#47464c] mt-1">
          Customize your budget allocations, currency display, and profile.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Budget Allocation & Preferences */}
        <div className="lg:col-span-2 space-y-6">
          {/* Custom Budget Target Allocation */}
          <div className="bg-white rounded-2xl border border-[#c8c5cd]/60 p-6 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#675df9]/10 text-[#675df9] flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[18px] font-bold text-[#1c1b1d]">
                  50/30/20 Budget Ratios
                </h3>
                <p className="text-[13px] text-[#47464c]">
                  Fine-tune your monthly targets for Need, Want, and Dream spending.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div className="space-y-3">
                {/* Need Slider */}
                <div>
                  <div className="flex justify-between text-[13px] font-semibold mb-1">
                    <span className="text-[#00C853]">Need (Essentials)</span>
                    <span className="font-mono-amount">{needTarget}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="80"
                    value={needTarget}
                    onChange={(e) => setNeedTarget(Number(e.target.value))}
                    className="w-full accent-[#00C853] h-2 bg-[#f1edef] rounded-lg cursor-pointer"
                  />
                </div>

                {/* Want Slider */}
                <div>
                  <div className="flex justify-between text-[13px] font-semibold mb-1">
                    <span className="text-[#FFAB00]">Want (Lifestyle)</span>
                    <span className="font-mono-amount">{wantTarget}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="80"
                    value={wantTarget}
                    onChange={(e) => setWantTarget(Number(e.target.value))}
                    className="w-full accent-[#FFAB00] h-2 bg-[#f1edef] rounded-lg cursor-pointer"
                  />
                </div>

                {/* Dream Slider */}
                <div>
                  <div className="flex justify-between text-[13px] font-semibold mb-1">
                    <span className="text-[#00B0FF]">Dream (Future)</span>
                    <span className="font-mono-amount">{dreamTarget}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="80"
                    value={dreamTarget}
                    onChange={(e) => setDreamTarget(Number(e.target.value))}
                    className="w-full accent-[#00B0FF] h-2 bg-[#f1edef] rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Total Check */}
              <div className="flex items-center justify-between pt-3 border-t border-[#c8c5cd]/40">
                <span
                  className={`text-[13px] font-semibold ${
                    needTarget + wantTarget + dreamTarget === 100
                      ? 'text-[#00C853]'
                      : 'text-[#ba1a1a]'
                  }`}
                >
                  Total: {needTarget + wantTarget + dreamTarget}% (Must be 100%)
                </span>
                <button
                  type="submit"
                  className="bg-[#675df9] hover:bg-[#4d41df] text-white px-5 py-2 rounded-xl text-[13px] font-semibold shadow-2xs transition-colors"
                >
                  Save Targets
                </button>
              </div>
            </form>
          </div>

          {/* Regional & Currency Settings */}
          <div className="bg-white rounded-2xl border border-[#c8c5cd]/60 p-6 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#00B0FF]/10 text-[#00B0FF] flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[18px] font-bold text-[#1c1b1d]">
                  Currency & Region
                </h3>
                <p className="text-[13px] text-[#47464c]">
                  Choose your default currency denomination across all screens.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['USD', 'EUR', 'GBP', 'CAD'] as CurrencyCode[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`p-3 rounded-xl border font-mono-amount font-bold text-[14px] transition-all ${
                    currency === c
                      ? 'border-[#675df9] bg-[#675df9] text-white shadow-xs'
                      : 'border-[#c8c5cd]/60 bg-white text-[#1c1b1d] hover:bg-[#f6f2f4]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: User Account & Reset Actions */}
        <div className="space-y-6">
          {/* User Card */}
          <div className="bg-white rounded-2xl border border-[#c8c5cd]/60 p-6 shadow-xs text-center space-y-4">
            <img
              src={INITIAL_USER.avatar}
              alt={INITIAL_USER.name}
              className="w-20 h-20 rounded-full mx-auto object-cover border-2 border-[#675df9]"
            />
            <div>
              <h3 className="text-[18px] font-bold text-[#1c1b1d]">
                {INITIAL_USER.name}
              </h3>
              <p className="text-[13px] text-[#47464c]">
                {INITIAL_USER.role} Account
              </p>
            </div>
            <div className="p-3 bg-[#f6f2f4] rounded-xl text-[12px] text-[#47464c]">
              Verified Cloud Session • Sync Enabled
            </div>
          </div>

          {/* Reset Demo Data */}
          <div className="bg-white rounded-2xl border border-[#ba1a1a]/30 p-6 shadow-xs space-y-3">
            <h4 className="text-[15px] font-bold text-[#ba1a1a]">Data Reset</h4>
            <p className="text-[12px] text-[#47464c]">
              Reset all local transactions, split records, and settlements back to original design defaults.
            </p>
            <button
              onClick={handleResetData}
              className="w-full py-2.5 rounded-xl border border-[#ba1a1a] text-[#ba1a1a] hover:bg-[#ffdad6]/40 text-[13px] font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Reset Mock Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
