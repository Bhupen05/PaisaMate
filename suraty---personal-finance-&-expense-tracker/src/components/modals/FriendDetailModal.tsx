import React from 'react';
import { X, CheckCircle2, ArrowUpRight, ArrowDownLeft, Plus, Handshake } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

export const FriendDetailModal: React.FC = () => {
  const {
    selectedFriendDetail,
    setSelectedFriendDetail,
    formatAmount,
    setSettleTargetFriend,
    setIsSettleUpOpen,
    setIsAddExpenseOpen,
  } = useFinance();

  if (!selectedFriendDetail) return null;

  const friend = selectedFriendDetail;
  const isPositive = friend.netBalance > 0;
  const isNegative = friend.netBalance < 0;

  const handleSettle = () => {
    setSettleTargetFriend(friend);
    setSelectedFriendDetail(null);
    setIsSettleUpOpen(true);
  };

  const handleAddShared = () => {
    setSelectedFriendDetail(null);
    setIsAddExpenseOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="friend-detail-modal"
        className="bg-white rounded-3xl border border-[#c8c5cd]/60 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto custom-scrollbar p-6 md:p-8 relative"
      >
        <button
          onClick={() => setSelectedFriendDetail(null)}
          className="absolute top-6 right-6 p-2 rounded-full text-[#78767d] hover:bg-[#f1edef] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Profile Card Header */}
        <div className="flex items-center gap-4 mb-6">
          {friend.avatarUrl ? (
            <img
              src={friend.avatarUrl}
              alt={friend.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-[#675df9]"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#675df9] text-white font-bold text-[22px] flex items-center justify-center border-2 border-[#675df9]">
              {friend.initials || 'FD'}
            </div>
          )}
          <div>
            <h2 className="text-[22px] font-bold text-[#00000b] tracking-tight">
              {friend.name}
            </h2>
            <p className="text-[13px] text-[#47464c]">{friend.handle}</p>
          </div>
        </div>

        {/* Net Balance Status */}
        <div className="bg-[#f6f2f4] rounded-2xl p-5 border border-[#c8c5cd]/40 mb-6 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-[#78767d] uppercase tracking-wider block">
              Current Net Balance
            </span>
            <span
              className={`text-[28px] font-mono-amount font-bold ${
                isPositive
                  ? 'text-[#00C853]'
                  : isNegative
                  ? 'text-[#ba1a1a]'
                  : 'text-[#47464c]'
              }`}
            >
              {isPositive && '+'}
              {formatAmount(friend.netBalance)}
            </span>
            <p className="text-[12px] text-[#78767d] mt-0.5">
              {isPositive && `${friend.name} owes you`}
              {isNegative && `You owe ${friend.name}`}
              {!isPositive && !isNegative && 'All clear and settled up'}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleSettle}
              className="bg-[#675df9] hover:bg-[#4d41df] text-white px-4 py-2 rounded-xl text-[12px] font-semibold tracking-wide flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Handshake className="w-4 h-4" /> Settle
            </button>
            <button
              onClick={handleAddShared}
              className="bg-white border border-[#c8c5cd] text-[#1c1b1d] hover:bg-[#e5e1e3] px-4 py-2 rounded-xl text-[12px] font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" /> Split
            </button>
          </div>
        </div>

        {/* Breakdown Items List */}
        <div className="space-y-3">
          <h3 className="text-[14px] font-bold text-[#00000b] uppercase tracking-wider text-[#47464c]">
            Expense History Breakdown
          </h3>

          {friend.breakdown.length === 0 ? (
            <div className="p-8 text-center bg-[#fcf8fa] rounded-2xl border border-dashed border-[#c8c5cd] text-[#47464c] space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-[#00C853]" />
              <p className="text-[13px] font-medium text-[#1c1b1d]">
                No pending items with {friend.name}
              </p>
              <p className="text-[12px]">
                Create a new shared expense or split to see items here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#c8c5cd]/40 border border-[#c8c5cd]/60 rounded-2xl overflow-hidden">
              {friend.breakdown.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-white hover:bg-[#f6f2f4]/60 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        item.amount >= 0 ? 'bg-[#E8F5E9]' : 'bg-[#ffdad6]'
                      }`}
                    >
                      {item.amount >= 0 ? (
                        <ArrowDownLeft className="w-4 h-4 text-[#00C853]" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-[#ba1a1a]" />
                      )}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#1c1b1d]">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-[#78767d]">{item.date}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[14px] font-mono-amount font-bold ${
                      item.amount >= 0 ? 'text-[#00C853]' : 'text-[#ba1a1a]'
                    }`}
                  >
                    {item.amount >= 0 ? '+' : ''}
                    {formatAmount(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
