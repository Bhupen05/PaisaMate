import React, { useState } from 'react';
import { X, CheckCircle2, ArrowRight, Wallet } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Friend } from '../../types';

export const SettleUpModal: React.FC = () => {
  const {
    isSettleUpOpen,
    setIsSettleUpOpen,
    settleTargetFriend,
    setSettleTargetFriend,
    friends,
    addSettlement,
    formatAmount,
  } = useFinance();

  const [selectedFriendId, setSelectedFriendId] = useState<string>(
    settleTargetFriend ? settleTargetFriend.id : friends[0]?.id || ''
  );
  const [settlementAmount, setSettlementAmount] = useState<string>(() => {
    if (settleTargetFriend) {
      return Math.abs(settleTargetFriend.netBalance).toFixed(2);
    }
    return friends[0] ? Math.abs(friends[0].netBalance).toFixed(2) : '45.00';
  });
  const [settleType, setSettleType] = useState<'received' | 'paid'>('received');
  const [note, setNote] = useState('Full balance settlement');

  if (!isSettleUpOpen) return null;

  const currentSelectedFriend =
    friends.find((f) => f.id === selectedFriendId) || friends[0];

  const handleSelectFriend = (f: Friend) => {
    setSelectedFriendId(f.id);
    setSettlementAmount(Math.abs(f.netBalance).toFixed(2));
    setSettleType(f.netBalance >= 0 ? 'received' : 'paid');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(settlementAmount) || 0;
    if (amount <= 0 || !currentSelectedFriend) return;

    addSettlement({
      title:
        settleType === 'received'
          ? `${currentSelectedFriend.name} Paid You`
          : `You Paid ${currentSelectedFriend.name}`,
      type: settleType,
      amount,
      date: new Date().toISOString().split('T')[0],
      dateLabel: 'Today',
      personName: currentSelectedFriend.name,
      personAvatar: currentSelectedFriend.avatarUrl,
      personInitials: currentSelectedFriend.initials,
      categoryNote: note.trim() || 'Settlement Transfer',
      iconType: 'restaurant',
      quote: note.trim() ? `${note}` : undefined,
    });

    setIsSettleUpOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="settle-up-modal"
        className="bg-white rounded-3xl border border-[#c8c5cd]/60 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto custom-scrollbar p-6 md:p-8 relative"
      >
        <button
          onClick={() => {
            setIsSettleUpOpen(false);
            setSettleTargetFriend(null);
          }}
          className="absolute top-6 right-6 p-2 rounded-full text-[#78767d] hover:bg-[#f1edef] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-[24px] font-bold text-[#00000b] tracking-tight">
            Record Settlement
          </h2>
          <p className="text-[13px] text-[#47464c] mt-0.5">
            Clear debts and log payment transfers.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Select Friend */}
          <div>
            <label className="block text-[12px] font-semibold text-[#47464c] uppercase tracking-wider mb-2">
              Select Friend
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {friends.map((f) => {
                const isSelected = f.id === selectedFriendId;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleSelectFriend(f)}
                    className={`flex flex-col items-center p-2.5 rounded-2xl border min-w-[85px] transition-all ${
                      isSelected
                        ? 'border-[#675df9] bg-[#675df9]/10 shadow-xs ring-1 ring-[#675df9]'
                        : 'border-[#c8c5cd]/60 bg-white hover:bg-[#f6f2f4]'
                    }`}
                  >
                    {f.avatarUrl ? (
                      <img
                        src={f.avatarUrl}
                        alt={f.name}
                        className="w-10 h-10 rounded-full object-cover border border-[#c8c5cd]"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#f1edef] text-[#1c1b1d] font-bold text-[13px] flex items-center justify-center border border-[#c8c5cd]">
                        {f.initials || 'FD'}
                      </div>
                    )}
                    <span className="text-[12px] font-medium text-[#1c1b1d] mt-1.5 truncate max-w-[75px]">
                      {f.name.split(' ')[0]}
                    </span>
                    <span
                      className={`text-[10px] font-mono-amount font-bold ${
                        f.netBalance > 0
                          ? 'text-[#00C853]'
                          : f.netBalance < 0
                          ? 'text-[#ba1a1a]'
                          : 'text-[#78767d]'
                      }`}
                    >
                      {formatAmount(f.netBalance)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Settle Direction */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSettleType('received')}
              className={`p-3 rounded-xl border text-center text-[13px] font-semibold transition-all ${
                settleType === 'received'
                  ? 'border-[#00C853] bg-[#E8F5E9] text-[#00C853] shadow-xs'
                  : 'border-[#c8c5cd]/60 text-[#47464c] hover:bg-[#f6f2f4]'
              }`}
            >
              {currentSelectedFriend?.name.split(' ')[0]} paid you
            </button>
            <button
              type="button"
              onClick={() => setSettleType('paid')}
              className={`p-3 rounded-xl border text-center text-[13px] font-semibold transition-all ${
                settleType === 'paid'
                  ? 'border-[#ba1a1a] bg-[#ffdad6] text-[#ba1a1a] shadow-xs'
                  : 'border-[#c8c5cd]/60 text-[#47464c] hover:bg-[#f6f2f4]'
              }`}
            >
              You paid {currentSelectedFriend?.name.split(' ')[0]}
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-[12px] font-semibold text-[#47464c] uppercase tracking-wider mb-1.5">
              Settlement Amount ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={settlementAmount}
              onChange={(e) => setSettlementAmount(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-[#c8c5cd]/60 font-mono-amount text-[20px] font-bold text-[#1c1b1d] outline-none focus:border-[#675df9] transition-all"
            />
          </div>

          {/* Note / Memo */}
          <div>
            <label className="block text-[12px] font-semibold text-[#47464c] uppercase tracking-wider mb-1.5">
              Payment Memo / Reference
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Venmo transfer, Cash, Dinner share"
              className="w-full h-11 px-3.5 rounded-xl border border-[#c8c5cd]/60 text-[14px] outline-none focus:border-[#675df9] transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#c8c5cd]/40">
            <button
              type="button"
              onClick={() => setIsSettleUpOpen(false)}
              className="px-5 py-2.5 rounded-xl border border-[#c8c5cd] text-[#47464c] hover:bg-[#f1edef] text-[13px] font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#675df9] hover:bg-[#4d41df] text-white text-[13px] font-semibold shadow-xs transition-colors"
            >
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
