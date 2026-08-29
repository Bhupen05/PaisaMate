import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Sparkles,
  Compass,
  Users,
  Check,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { ExpenseCategory, PriorityClassification } from '../../types';

export const AddExpenseModal: React.FC = () => {
  const {
    isAddExpenseOpen,
    setIsAddExpenseOpen,
    addTransaction,
    addGroupExpense,
    friends,
    currency,
  } = useFinance();

  const [amountStr, setAmountStr] = useState('45.00');
  const [title, setTitle] = useState('Sushi Dinner');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<ExpenseCategory>('Dining Out');
  const [classification, setClassification] = useState<PriorityClassification>('Want');
  const [isSplit, setIsSplit] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  if (!isAddExpenseOpen) return null;

  const categories: ExpenseCategory[] = [
    'Dining Out',
    'Groceries',
    'Transport',
    'Travel',
    'Housing',
    'Utilities',
    'Entertainment',
    'Health',
    'Shopping',
    'Other',
  ];

  const handleToggleFriend = (friendId: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amountStr) || 0;
    if (parsedAmount <= 0 || !title.trim()) return;

    if (isSplit && selectedFriendIds.length > 0) {
      const selectedFriends = friends.filter((f) =>
        selectedFriendIds.includes(f.id)
      );
      const splitCount = selectedFriends.length + 1; // Including user
      const perPersonShare = Math.round((parsedAmount / splitCount) * 100) / 100;

      addGroupExpense({
        title: title.trim(),
        totalAmount: parsedAmount,
        splitType: 'EQUAL SPLIT',
        createdAt: 'Just now',
        paidBy: 'You',
        iconType: category === 'Travel' ? 'flight' : 'restaurant',
        participants: [
          ...selectedFriends.map((f) => ({
            userId: f.id,
            name: f.name,
            initials: f.initials || f.name.substring(0, 2).toUpperCase(),
            avatarUrl: f.avatarUrl,
            shareAmount: perPersonShare,
            isCurrentUser: false,
            status: 'owes_you' as const,
          })),
          {
            userId: 'f-user-me',
            name: 'You',
            initials: 'ME',
            shareAmount: perPersonShare,
            isCurrentUser: true,
            status: 'paid' as const,
          },
        ],
      });
    } else {
      addTransaction({
        title: title.trim(),
        category,
        classification,
        amount: parsedAmount,
        date,
        dateGroup: 'Today',
        notes: notes.trim() || undefined,
        isShared: isSplit,
      });
    }

    setIsAddExpenseOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="add-expense-modal"
        className="bg-white rounded-3xl border border-[#c8c5cd]/60 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto custom-scrollbar p-6 md:p-8 relative"
      >
        {/* Close Button */}
        <button
          onClick={() => setIsAddExpenseOpen(false)}
          className="absolute top-6 right-6 p-2 rounded-full text-[#78767d] hover:bg-[#f1edef] hover:text-[#1c1b1d] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <h2 className="text-[24px] font-bold text-[#00000b] tracking-tight">
            New Expense
          </h2>
          <p className="text-[13px] text-[#47464c] mt-0.5">
            Enter details for your transaction.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Amount Display */}
          <div className="bg-[#f6f2f4] rounded-2xl p-4 text-center border border-[#c8c5cd]/40">
            <span className="text-[12px] font-semibold text-[#78767d] uppercase tracking-wider block mb-1">
              Amount ({currency})
            </span>
            <div className="flex items-center justify-center gap-1 font-mono-amount">
              <span className="text-[32px] font-bold text-[#1c1b1d]">$</span>
              <input
                id="expense-amount-input"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="text-[36px] font-bold text-[#1c1b1d] bg-transparent outline-none max-w-[200px] text-center"
              />
            </div>
          </div>

          {/* Title and Date Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="expense-title-input"
                className="block text-[12px] font-semibold text-[#47464c] uppercase tracking-wider mb-1.5"
              >
                Title
              </label>
              <input
                id="expense-title-input"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Dinner with Sarah"
                className="w-full h-11 px-3.5 rounded-xl border border-[#c8c5cd]/60 bg-white text-[14px] outline-none focus:border-[#675df9] focus:ring-1 focus:ring-[#675df9] transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="expense-date-input"
                className="block text-[12px] font-semibold text-[#47464c] uppercase tracking-wider mb-1.5"
              >
                Date
              </label>
              <input
                id="expense-date-input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-[#c8c5cd]/60 bg-white text-[14px] outline-none focus:border-[#675df9] focus:ring-1 focus:ring-[#675df9] transition-all"
              />
            </div>
          </div>

          {/* Category Dropdown */}
          <div>
            <label
              htmlFor="expense-category-select"
              className="block text-[12px] font-semibold text-[#47464c] uppercase tracking-wider mb-1.5"
            >
              Category
            </label>
            <select
              id="expense-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full h-11 px-3.5 rounded-xl border border-[#c8c5cd]/60 bg-white text-[14px] outline-none focus:border-[#675df9] transition-all cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Level: 3-Card Toggle Matching Screen 5 */}
          <div>
            <label className="block text-[12px] font-semibold text-[#47464c] uppercase tracking-wider mb-2">
              Priority Level
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Need Card */}
              <button
                type="button"
                onClick={() => setClassification('Need')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  classification === 'Need'
                    ? 'border-[#00C853] bg-[#E8F5E9]/60 shadow-xs ring-1 ring-[#00C853]'
                    : 'border-[#c8c5cd]/60 bg-white hover:bg-[#f6f2f4]/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[14px] font-bold text-[#00C853]">Need</span>
                  <ShieldCheck className="w-4 h-4 text-[#00C853]" />
                </div>
                <p className="text-[11px] text-[#47464c] leading-tight">
                  Essentials: rent, groceries, bills
                </p>
              </button>

              {/* Want Card */}
              <button
                type="button"
                onClick={() => setClassification('Want')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  classification === 'Want'
                    ? 'border-[#FFAB00] bg-[#FFF8E1]/80 shadow-xs ring-1 ring-[#FFAB00]'
                    : 'border-[#c8c5cd]/60 bg-white hover:bg-[#f6f2f4]/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[14px] font-bold text-[#FFAB00]">Want</span>
                  <Sparkles className="w-4 h-4 text-[#FFAB00]" />
                </div>
                <p className="text-[11px] text-[#47464c] leading-tight">
                  Non-essentials: dining, entertainment
                </p>
              </button>

              {/* Dream Card */}
              <button
                type="button"
                onClick={() => setClassification('Dream')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  classification === 'Dream'
                    ? 'border-[#00B0FF] bg-[#E1F5FE]/70 shadow-xs ring-1 ring-[#00B0FF]'
                    : 'border-[#c8c5cd]/60 bg-white hover:bg-[#f6f2f4]/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[14px] font-bold text-[#00B0FF]">Dream</span>
                  <Compass className="w-4 h-4 text-[#00B0FF]" />
                </div>
                <p className="text-[11px] text-[#47464c] leading-tight">
                  Long term: trips, investments
                </p>
              </button>
            </div>
          </div>

          {/* Split with friends toggle */}
          <div className="pt-2 border-t border-[#c8c5cd]/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#47464c]" />
                <span className="text-[13px] font-semibold text-[#1c1b1d]">
                  Split this expense with friends
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsSplit(!isSplit)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                  isSplit ? 'bg-[#675df9]' : 'bg-[#c8c5cd]'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                    isSplit ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Split Friends Selection */}
            {isSplit && (
              <div className="mt-3 p-3 bg-[#f6f2f4] rounded-2xl space-y-2 animate-in fade-in duration-150">
                <span className="text-[11px] font-semibold text-[#78767d] uppercase tracking-wider block">
                  Select friends to split with:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {friends.map((f) => {
                    const isSelected = selectedFriendIds.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleToggleFriend(f.id)}
                        className={`flex items-center gap-2 p-2 rounded-xl text-left border text-[12px] transition-all ${
                          isSelected
                            ? 'bg-white border-[#675df9] text-[#1c1b1d] font-semibold shadow-2xs'
                            : 'bg-transparent border-[#c8c5cd]/60 text-[#47464c]'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border ${
                            isSelected
                              ? 'bg-[#675df9] border-[#675df9] text-white'
                              : 'border-[#78767d]'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <span className="truncate">{f.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="expense-notes-input"
              className="block text-[12px] font-semibold text-[#47464c] uppercase tracking-wider mb-1.5"
            >
              Notes (optional)
            </label>
            <textarea
              id="expense-notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add memo or receipt details..."
              className="w-full p-3 rounded-xl border border-[#c8c5cd]/60 bg-white text-[13px] outline-none focus:border-[#675df9] transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#c8c5cd]/40">
            <button
              type="button"
              onClick={() => setIsAddExpenseOpen(false)}
              className="px-5 py-2.5 rounded-xl border border-[#c8c5cd] text-[#47464c] hover:bg-[#f1edef] text-[13px] font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#675df9] hover:bg-[#4d41df] text-white text-[13px] font-semibold shadow-xs transition-colors"
            >
              Save Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
