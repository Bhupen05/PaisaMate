import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  Plus,
  Plane,
  Utensils,
  Hotel,
  Receipt,
  UserCheck,
  BellRing,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

export const SharedView: React.FC = () => {
  const {
    groupExpenses,
    formatAmount,
    totalOwedToYou,
    totalYouOwe,
    setIsNewSharedOpen,
    setIsSettleUpOpen,
    showToast,
  } = useFinance();

  const handleRemindAll = () => {
    showToast('Payment reminders sent to all 3 groups via email and push.');
  };

  const getGroupIcon = (iconType: string) => {
    switch (iconType) {
      case 'flight':
        return <Plane className="w-6 h-6 text-[#47464c]" />;
      case 'restaurant':
        return <Utensils className="w-6 h-6 text-[#47464c]" />;
      case 'hotel':
        return <Hotel className="w-6 h-6 text-[#47464c]" />;
      default:
        return <Receipt className="w-6 h-6 text-[#47464c]" />;
    }
  };

  return (
    <div id="shared-view" className="p-4 md:p-6 lg:p-8 max-w-[1200px] mx-auto w-full space-y-8">
      {/* Page Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] md:text-[36px] font-bold text-[#1c1b1d] tracking-tight">
            Group Activity
          </h1>
          <p className="text-[14px] text-[#47464c] mt-1">
            Track shared costs and settle balances.
          </p>
        </div>
        <button
          id="new-shared-expense-btn"
          onClick={() => setIsNewSharedOpen(true)}
          className="bg-[#675df9] hover:bg-[#4d41df] text-white px-6 py-2.5 rounded-full text-[13px] font-semibold tracking-wide transition-all flex items-center gap-2 shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          New Shared Expense
        </button>
      </div>

      {/* Net Balances Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Total You Are Owed Card */}
        <div className="bg-white rounded-2xl border border-[#c8c5cd]/60 p-6 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-28 h-28 bg-[#00C853]/5 rounded-full blur-xl pointer-events-none" />
          <div>
            <div className="flex items-center gap-2 mb-2 text-[#47464c]">
              <div className="w-6 h-6 rounded-full bg-[#E8F5E9] flex items-center justify-center">
                <ArrowDown className="w-3.5 h-3.5 text-[#00C853]" />
              </div>
              <span className="text-[12px] font-semibold tracking-wider uppercase text-[#47464c]">
                Total You Are Owed
              </span>
            </div>
            <p className="text-[30px] md:text-[32px] font-mono-amount font-bold text-[#00C853] tracking-tight">
              {formatAmount(totalOwedToYou)}
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-[#c8c5cd]/40 flex justify-between items-center text-[13px]">
            <span className="text-[#47464c]">From 3 active groups</span>
            <button
              onClick={handleRemindAll}
              className="text-[#675df9] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <BellRing className="w-3.5 h-3.5" /> Remind All
            </button>
          </div>
        </div>

        {/* Total You Owe Card */}
        <div className="bg-white rounded-2xl border border-[#c8c5cd]/60 p-6 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-28 h-28 bg-[#ba1a1a]/5 rounded-full blur-xl pointer-events-none" />
          <div>
            <div className="flex items-center gap-2 mb-2 text-[#47464c]">
              <div className="w-6 h-6 rounded-full bg-[#ffdad6] flex items-center justify-center">
                <ArrowUp className="w-3.5 h-3.5 text-[#ba1a1a]" />
              </div>
              <span className="text-[12px] font-semibold tracking-wider uppercase text-[#47464c]">
                Total You Owe
              </span>
            </div>
            <p className="text-[30px] md:text-[32px] font-mono-amount font-bold text-[#1c1b1d] tracking-tight">
              {formatAmount(totalYouOwe)}
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-[#c8c5cd]/40 flex justify-between items-center text-[13px]">
            <span className="text-[#47464c]">Across 2 active groups</span>
            <button
              onClick={() => setIsSettleUpOpen(true)}
              className="text-[#675df9] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" /> Settle Up
            </button>
          </div>
        </div>
      </div>

      {/* List of Recent Groups */}
      <div className="space-y-4">
        <h3 className="text-[20px] font-bold text-[#1c1b1d] border-b border-[#c8c5cd]/60 pb-2 tracking-tight">
          Recent Groups
        </h3>

        <div className="space-y-4">
          {groupExpenses.map((grp) => (
            <div
              key={grp.id}
              className="bg-white rounded-2xl border border-[#c8c5cd]/60 shadow-xs hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-[#c8c5cd]/40 flex justify-between items-start bg-[#fcf8fa]">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-xl bg-[#f1edef] flex items-center justify-center border border-[#c8c5cd]/40 shrink-0">
                    {getGroupIcon(grp.iconType)}
                  </div>
                  <div>
                    <h4 className="text-[18px] font-bold text-[#1c1b1d] leading-tight">
                      {grp.title}
                    </h4>
                    <p className="text-[13px] text-[#47464c] mt-0.5">
                      {grp.createdAt}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[17px] font-mono-amount font-bold text-[#1c1b1d]">
                    {formatAmount(grp.totalAmount)}
                  </p>
                  <span className="inline-block mt-1 bg-[#f1edef] px-2.5 py-0.5 rounded-full border border-[#c8c5cd]/50 text-[10px] font-bold text-[#47464c] tracking-wider uppercase">
                    {grp.splitType}
                  </span>
                </div>
              </div>

              {/* Split Details */}
              <div className="p-5 bg-white space-y-4">
                <div className="flex items-center gap-2 text-[13px] text-[#47464c]">
                  <span>
                    Paid by{' '}
                    <strong className="text-[#1c1b1d] font-semibold">
                      {grp.paidBy}
                    </strong>
                  </span>
                </div>

                {/* Participants */}
                <div className="space-y-2.5">
                  {grp.participants.map((p) => (
                    <div
                      key={p.userId}
                      className={`flex justify-between items-center py-1.5 px-3 rounded-lg ${
                        p.isCurrentUser ? 'bg-[#f6f2f4]/60' : 'hover:bg-[#f6f2f4]/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {p.avatarUrl ? (
                          <img
                            src={p.avatarUrl}
                            alt={p.name}
                            className="w-8 h-8 rounded-full object-cover border border-[#c8c5cd]"
                          />
                        ) : (
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold border border-[#c8c5cd]/40 ${
                              p.isCurrentUser
                                ? 'bg-[#e5e1e3] text-[#1c1b1d]'
                                : 'bg-[#1a1a2e] text-white'
                            }`}
                          >
                            {p.initials}
                          </div>
                        )}
                        <span
                          className={`text-[14px] ${
                            p.isCurrentUser
                              ? 'font-semibold text-[#1c1b1d]'
                              : 'text-[#1c1b1d]'
                          }`}
                        >
                          {p.name}
                        </span>
                      </div>

                      <div className="text-right font-mono-amount text-[13px]">
                        {p.status === 'owes_you' && (
                          <span className="text-[#00C853] font-semibold">
                            Owes you {formatAmount(p.shareAmount)}
                          </span>
                        )}
                        {p.status === 'you_owe' && (
                          <span className="text-[#ba1a1a] font-semibold">
                            You owe {formatAmount(p.shareAmount)}
                          </span>
                        )}
                        {p.status === 'paid' && p.isCurrentUser && (
                          <span className="text-[#78767d]">
                            Your share {formatAmount(p.shareAmount)}
                          </span>
                        )}
                        {p.status === 'paid' && !p.isCurrentUser && (
                          <span className="text-[#78767d]">
                            Paid {formatAmount(p.shareAmount)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
