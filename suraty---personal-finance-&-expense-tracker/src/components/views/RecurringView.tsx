import React, { useState } from 'react';
import { Repeat, Plus, Check, Calendar, ShieldCheck, Sparkles, Compass } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { ExpenseCategory, PriorityClassification } from '../../types';

export const RecurringView: React.FC = () => {
  const { recurring, addRecurring, toggleRecurringAutoPay, formatAmount } =
    useFinance();

  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Utilities');
  const [classification, setClassification] =
    useState<PriorityClassification>('Need');
  const [billingDate, setBillingDate] = useState('1st of month');

  const totalMonthlyOverhead = recurring.reduce((acc, r) => acc + r.amount, 0);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountStr) || 0;
    if (amount <= 0 || !name.trim()) return;

    addRecurring({
      name: name.trim(),
      category,
      classification,
      amount,
      frequency: 'Monthly',
      nextBillingDate: billingDate,
      autoPay: true,
    });

    setName('');
    setAmountStr('');
    setIsAdding(false);
  };

  return (
    <div id="recurring-view" className="p-4 md:p-6 lg:p-8 max-w-[1200px] mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[32px] md:text-[36px] font-bold text-[#00000b] tracking-tight">
            Recurring & Fixed
          </h1>
          <p className="text-[14px] text-[#47464c] mt-1">
            Manage your monthly subscriptions, leases, and utility commitments.
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-[#675df9] hover:bg-[#4d41df] text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold tracking-wide transition-all flex items-center gap-2 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          {isAdding ? 'Cancel' : 'Add Recurring Bill'}
        </button>
      </div>

      {/* Monthly Overhead Card */}
      <div className="bg-[#1a1a2e] text-white rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[12px] font-semibold text-white/70 uppercase tracking-wider block mb-1">
            Total Fixed Monthly Overhead
          </span>
          <span className="text-[32px] font-mono-amount font-bold tracking-tight">
            {formatAmount(totalMonthlyOverhead)}
          </span>
        </div>
        <div className="bg-white/10 px-4 py-2 rounded-xl text-[13px] border border-white/15">
          <span>{recurring.length} Active Subscriptions & Bills</span>
        </div>
      </div>

      {/* Add New Recurring Form */}
      {isAdding && (
        <form
          onSubmit={handleAdd}
          className="bg-white p-6 rounded-2xl border border-[#675df9] shadow-md space-y-4 animate-in fade-in duration-200"
        >
          <h3 className="text-[16px] font-bold text-[#1c1b1d]">
            Add New Recurring Item
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#47464c] uppercase mb-1">
                Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Netflix, Gym, Rent"
                className="w-full h-10 px-3 rounded-xl border border-[#c8c5cd]/60 text-[13px] outline-none focus:border-[#675df9]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#47464c] uppercase mb-1">
                Monthly Cost ($)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                className="w-full h-10 px-3 rounded-xl border border-[#c8c5cd]/60 font-mono-amount text-[13px] outline-none focus:border-[#675df9]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#47464c] uppercase mb-1">
                Classification
              </label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl border border-[#c8c5cd]/60 text-[13px] outline-none focus:border-[#675df9]"
              >
                <option value="Need">Need</option>
                <option value="Want">Want</option>
                <option value="Dream">Dream</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#47464c] uppercase mb-1">
                Next Billing Date
              </label>
              <input
                type="text"
                value={billingDate}
                onChange={(e) => setBillingDate(e.target.value)}
                placeholder="e.g. 1st of month"
                className="w-full h-10 px-3 rounded-xl border border-[#c8c5cd]/60 text-[13px] outline-none focus:border-[#675df9]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 rounded-xl text-[12px] border border-[#c8c5cd] text-[#47464c]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-[12px] bg-[#675df9] text-white font-semibold"
            >
              Save Recurring
            </button>
          </div>
        </form>
      )}

      {/* Recurring List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recurring.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-[#c8c5cd]/60 p-5 shadow-xs flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#f1edef] flex items-center justify-center text-[#675df9]">
                <Repeat className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-[#1c1b1d]">
                  {item.name}
                </h3>
                <div className="flex items-center gap-2 mt-0.5 text-[12px] text-[#47464c]">
                  <span>{item.category}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#78767d]" />
                    {item.nextBillingDate}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <span className="text-[17px] font-mono-amount font-bold text-[#1c1b1d]">
                {formatAmount(item.amount)}
                <span className="text-[11px] text-[#78767d] font-normal">/mo</span>
              </span>
              <button
                onClick={() => toggleRecurringAutoPay(item.id)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase transition-colors flex items-center gap-1 ${
                  item.autoPay
                    ? 'bg-[#E8F5E9] text-[#00C853]'
                    : 'bg-[#f1edef] text-[#78767d]'
                }`}
              >
                {item.autoPay && <Check className="w-3 h-3" />}
                {item.autoPay ? 'Auto-Pay On' : 'Manual'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
