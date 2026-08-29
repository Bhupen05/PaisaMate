import React, { useState } from 'react';
import { X, UserPlus, AtSign, DollarSign } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

export const AddFriendModal: React.FC = () => {
  const { isAddFriendOpen, setIsAddFriendOpen, addFriend } = useFinance();

  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [initialBalance, setInitialBalance] = useState('');

  if (!isAddFriendOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const formattedHandle = handle.trim()
      ? handle.trim().startsWith('@')
        ? handle.trim()
        : `@${handle.trim()}`
      : `@${name.toLowerCase().replace(/\s+/g, '')}`;

    const balanceNum = parseFloat(initialBalance) || 0;

    addFriend(name.trim(), formattedHandle, balanceNum);
    setName('');
    setHandle('');
    setInitialBalance('');
    setIsAddFriendOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="add-friend-modal"
        className="bg-white rounded-3xl border border-[#c8c5cd]/60 shadow-2xl max-w-md w-full p-6 md:p-8 relative"
      >
        <button
          onClick={() => setIsAddFriendOpen(false)}
          className="absolute top-6 right-6 p-2 rounded-full text-[#78767d] hover:bg-[#f1edef] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-[24px] font-bold text-[#00000b] tracking-tight flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-[#675df9]" />
            Add Connection
          </h2>
          <p className="text-[13px] text-[#47464c] mt-0.5">
            Connect with a friend to share bills and split expenses.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-[#47464c] uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jordan Hayes"
              className="w-full h-11 px-3.5 rounded-xl border border-[#c8c5cd]/60 text-[14px] outline-none focus:border-[#675df9] transition-all"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#47464c] uppercase tracking-wider mb-1.5">
              Handle / Username
            </label>
            <div className="relative">
              <AtSign className="w-4 h-4 text-[#78767d] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="jordanhayes"
                className="w-full h-11 pl-9 pr-3.5 rounded-xl border border-[#c8c5cd]/60 text-[14px] outline-none focus:border-[#675df9] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#47464c] uppercase tracking-wider mb-1.5">
              Starting Net Balance ($ optional)
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-[#78767d] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                step="0.01"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                placeholder="0.00 (Positive if they owe you)"
                className="w-full h-11 pl-9 pr-3.5 rounded-xl border border-[#c8c5cd]/60 font-mono-amount text-[14px] outline-none focus:border-[#675df9] transition-all"
              />
            </div>
            <span className="text-[11px] text-[#78767d] mt-1 block">
              Enter a positive number if they owe you, or negative if you owe them.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#c8c5cd]/40">
            <button
              type="button"
              onClick={() => setIsAddFriendOpen(false)}
              className="px-5 py-2.5 rounded-xl border border-[#c8c5cd] text-[#47464c] hover:bg-[#f1edef] text-[13px] font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#675df9] hover:bg-[#4d41df] text-white text-[13px] font-semibold shadow-xs transition-colors"
            >
              Add Friend
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
