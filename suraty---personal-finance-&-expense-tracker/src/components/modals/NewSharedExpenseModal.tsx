import React, { useState } from 'react';
import { X, Users, Plane, Utensils, Hotel, Receipt, Plus } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

export const NewSharedExpenseModal: React.FC = () => {
  const { isNewSharedOpen, setIsNewSharedOpen, addGroupExpense, friends } =
    useFinance();

  const [title, setTitle] = useState('');
  const [totalAmountStr, setTotalAmountStr] = useState('');
  const [splitType, setSplitType] = useState<'EQUAL SPLIT' | 'CUSTOM'>('EQUAL SPLIT');
  const [paidBy, setPaidBy] = useState('You');
  const [iconType, setIconType] = useState<'flight' | 'restaurant' | 'hotel' | 'receipt'>('restaurant');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>(
    friends.slice(0, 2).map((f) => f.id)
  );

  if (!isNewSharedOpen) return null;

  const handleToggleFriend = (id: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(id) ? prev.filter((fId) => fId !== id) : [...prev, id]
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(totalAmountStr) || 0;
    if (amount <= 0 || !title.trim()) return;

    const chosenFriends = friends.filter((f) => selectedFriendIds.includes(f.id));
    const count = chosenFriends.length + 1; // including current user
    const share = Math.round((amount / count) * 100) / 100;

    const isUserPayer = paidBy === 'You';

    const participants = [
      {
        userId: 'f-user-me',
        name: 'You',
        initials: 'ME',
        shareAmount: share,
        isCurrentUser: true,
        status: isUserPayer
          ? ('paid' as const)
          : ('you_owe' as const),
      },
      ...chosenFriends.map((f) => ({
        userId: f.id,
        name: f.name,
        initials: f.initials || f.name.substring(0, 2).toUpperCase(),
        avatarUrl: f.avatarUrl,
        shareAmount: share,
        isCurrentUser: false,
        status: isUserPayer
          ? ('owes_you' as const)
          : f.name === paidBy
          ? ('paid' as const)
          : ('owes_you' as const),
      })),
    ];

    addGroupExpense({
      title: title.trim(),
      totalAmount: amount,
      splitType,
      createdAt: 'Just now',
      paidBy,
      iconType,
      participants,
    });

    setIsNewSharedOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="new-shared-modal"
        className="bg-white rounded-3xl border border-[#c8c5cd]/60 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto custom-scrollbar p-6 md:p-8 relative"
      >
        <button
          onClick={() => setIsNewSharedOpen(false)}
          className="absolute top-6 right-6 p-2 rounded-full text-[#78767d] hover:bg-[#f1edef] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-[24px] font-bold text-[#00000b] tracking-tight">
            New Shared Expense
          </h2>
          <p className="text-[13px] text-[#47464c] mt-0.5">
            Split a trip, bill, or event with your network.
          </p>
        </div>

        <form onSubmit={handleCreate} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-[12px] font-semibold text-[#47464c] uppercase tracking-wider mb-1.5">
              Group / Event Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Ski Trip Cabin or Weekend Brunch"
              className="w-full h-11 px-3.5 rounded-xl border border-[#c8c5cd]/60 text-[14px] outline-none focus:border-[#675df9] transition-all"
            />
          </div>

          {/* Amount & Icon Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#47464c] uppercase tracking-wider mb-1.5">
                Total Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={totalAmountStr}
                onChange={(e) => setTotalAmountStr(e.target.value)}
                placeholder="0.00"
                className="w-full h-11 px-3.5 rounded-xl border border-[#c8c5cd]/60 font-mono-amount text-[15px] font-bold outline-none focus:border-[#675df9] transition-all"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#47464c] uppercase tracking-wider mb-1.5">
                Expense Type Icon
              </label>
              <div className="flex gap-2">
                {[
                  { id: 'restaurant', icon: <Utensils className="w-4 h-4" /> },
                  { id: 'flight', icon: <Plane className="w-4 h-4" /> },
                  { id: 'hotel', icon: <Hotel className="w-4 h-4" /> },
                  { id: 'receipt', icon: <Receipt className="w-4 h-4" /> },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIconType(item.id as any)}
                    className={`flex-1 h-11 rounded-xl border flex items-center justify-center transition-all ${
                      iconType === item.id
                        ? 'border-[#675df9] bg-[#675df9] text-white shadow-xs'
                        : 'border-[#c8c5cd]/60 text-[#47464c] hover:bg-[#f1edef]'
                    }`}
                  >
                    {item.icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Paid By & Split Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#47464c] uppercase tracking-wider mb-1.5">
                Paid By
              </label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-[#c8c5cd]/60 bg-white text-[14px] outline-none focus:border-[#675df9] cursor-pointer"
              >
                <option value="You">You (Alex Morgan)</option>
                {friends.map((f) => (
                  <option key={f.id} value={f.name}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#47464c] uppercase tracking-wider mb-1.5">
                Split Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSplitType('EQUAL SPLIT')}
                  className={`flex-1 h-11 rounded-xl border text-[12px] font-semibold tracking-wider transition-all ${
                    splitType === 'EQUAL SPLIT'
                      ? 'border-[#675df9] bg-[#675df9] text-white'
                      : 'border-[#c8c5cd]/60 text-[#47464c] hover:bg-[#f1edef]'
                  }`}
                >
                  EQUAL
                </button>
                <button
                  type="button"
                  onClick={() => setSplitType('CUSTOM')}
                  className={`flex-1 h-11 rounded-xl border text-[12px] font-semibold tracking-wider transition-all ${
                    splitType === 'CUSTOM'
                      ? 'border-[#675df9] bg-[#675df9] text-white'
                      : 'border-[#c8c5cd]/60 text-[#47464c] hover:bg-[#f1edef]'
                  }`}
                >
                  CUSTOM
                </button>
              </div>
            </div>
          </div>

          {/* Friends Selection */}
          <div>
            <label className="block text-[12px] font-semibold text-[#47464c] uppercase tracking-wider mb-2">
              Participants in Group
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
              {friends.map((f) => {
                const isSelected = selectedFriendIds.includes(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleToggleFriend(f.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left text-[13px] transition-all ${
                      isSelected
                        ? 'border-[#675df9] bg-[#675df9]/10 font-semibold text-[#1c1b1d]'
                        : 'border-[#c8c5cd]/60 text-[#47464c] hover:bg-[#f6f2f4]'
                    }`}
                  >
                    {f.avatarUrl ? (
                      <img
                        src={f.avatarUrl}
                        alt={f.name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-[#675df9] text-white text-[10px] flex items-center justify-center font-bold">
                        {f.initials || 'FD'}
                      </div>
                    )}
                    <span className="truncate">{f.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#c8c5cd]/40">
            <button
              type="button"
              onClick={() => setIsNewSharedOpen(false)}
              className="px-5 py-2.5 rounded-xl border border-[#c8c5cd] text-[#47464c] hover:bg-[#f1edef] text-[13px] font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#675df9] hover:bg-[#4d41df] text-white text-[13px] font-semibold shadow-xs transition-colors"
            >
              Create Group Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
