import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Plus,
  Utensils,
  Plane,
  Home,
  Coffee,
  Users,
  CheckCircle,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Settlement } from '../../types';

export const SettlementsView: React.FC = () => {
  const { settlements, formatAmount, setIsSettleUpOpen } = useFinance();
  const [filterType, setFilterType] = useState<'all' | 'paid' | 'received'>('all');

  const filteredSettlements = settlements.filter((s) => {
    if (filterType === 'paid') return s.type === 'paid';
    if (filterType === 'received') return s.type === 'received';
    return true;
  });

  const getSettlementIcon = (iconType: string) => {
    switch (iconType) {
      case 'restaurant':
        return <Utensils className="w-4 h-4" />;
      case 'flight':
        return <Plane className="w-4 h-4" />;
      case 'home':
        return <Home className="w-4 h-4" />;
      case 'coffee':
        return <Coffee className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  return (
    <div id="settlements-view" className="p-4 md:p-6 lg:p-8 max-w-[1200px] mx-auto w-full space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-[32px] md:text-[36px] font-bold text-[#00000b] tracking-tight">
            Settlements
          </h2>
          <p className="text-[14px] text-[#47464c] mt-1">
            History of payments with friends and groups.
          </p>
        </div>
        <button
          id="new-settlement-btn"
          onClick={() => setIsSettleUpOpen(true)}
          className="bg-[#675df9] hover:bg-[#4d41df] text-white text-[13px] font-semibold tracking-wide px-5 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> New Settlement
        </button>
      </div>

      {/* Stats Overview Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-[#c8c5cd]/60 shadow-xs flex flex-col justify-between h-36 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-28 h-28 bg-[#00C853]/5 rounded-full blur-xl group-hover:bg-[#00C853]/10 transition-all pointer-events-none" />
          <div className="text-[12px] font-semibold text-[#47464c] uppercase tracking-wider flex items-center gap-2">
            <ArrowDownLeft className="w-4 h-4 text-[#00C853]" /> Total Received
          </div>
          <div>
            <div className="text-[28px] font-mono-amount font-bold text-[#00000b]">
              {formatAmount(1245.5)}
            </div>
            <div className="text-[13px] text-[#47464c] mt-0.5">
              From 12 settlements
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-[#c8c5cd]/60 shadow-xs flex flex-col justify-between h-36 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-28 h-28 bg-[#ba1a1a]/5 rounded-full blur-xl group-hover:bg-[#ba1a1a]/10 transition-all pointer-events-none" />
          <div className="text-[12px] font-semibold text-[#47464c] uppercase tracking-wider flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-[#ba1a1a]" /> Total Paid
          </div>
          <div>
            <div className="text-[28px] font-mono-amount font-bold text-[#00000b]">
              {formatAmount(850.0)}
            </div>
            <div className="text-[13px] text-[#47464c] mt-0.5">
              In 8 settlements
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-[#c8c5cd]/60 shadow-xs flex flex-col justify-between h-36 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-28 h-28 bg-[#FFAB00]/5 rounded-full blur-xl group-hover:bg-[#FFAB00]/10 transition-all pointer-events-none" />
          <div className="text-[12px] font-semibold text-[#47464c] uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#FFAB00]" /> Pending Requests
          </div>
          <div>
            <div className="text-[28px] font-mono-amount font-bold text-[#FFAB00]">
              {formatAmount(120.0)}
            </div>
            <div className="text-[13px] text-[#47464c] mt-0.5">
              2 requests awaiting payment
            </div>
          </div>
        </div>
      </div>

      {/* Content Split: History Cards + Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Settlement History (Main Column) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[20px] font-bold text-[#00000b] tracking-tight">
              Recent History
            </h3>
            <div className="flex bg-[#f1edef] p-1 rounded-xl gap-1 border border-[#c8c5cd]/40">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-all ${
                  filterType === 'all'
                    ? 'bg-white text-[#1c1b1d] shadow-2xs'
                    : 'text-[#47464c] hover:text-[#1c1b1d]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('paid')}
                className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-all ${
                  filterType === 'paid'
                    ? 'bg-white text-[#1c1b1d] shadow-2xs'
                    : 'text-[#47464c] hover:text-[#1c1b1d]'
                }`}
              >
                Paid
              </button>
              <button
                onClick={() => setFilterType('received')}
                className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-all ${
                  filterType === 'received'
                    ? 'bg-white text-[#1c1b1d] shadow-2xs'
                    : 'text-[#47464c] hover:text-[#1c1b1d]'
                }`}
              >
                Received
              </button>
            </div>
          </div>

          {/* History Cards */}
          <div className="space-y-3">
            {filteredSettlements.map((set) => (
              <div
                key={set.id}
                className="bg-white rounded-2xl border border-[#c8c5cd]/60 shadow-xs p-5 hover:shadow-md transition-shadow relative overflow-hidden"
              >
                {/* Left color bar indicator */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    set.type === 'received'
                      ? 'bg-[#00C853]'
                      : set.type === 'group_settled'
                      ? 'bg-[#675df9]'
                      : 'bg-[#47464c]'
                  }`}
                />

                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {set.personAvatar ? (
                      <img
                        src={set.personAvatar}
                        alt={set.personName}
                        className="w-12 h-12 rounded-full object-cover border border-[#c8c5cd]"
                      />
                    ) : set.type === 'group_settled' ? (
                      <div className="w-12 h-12 rounded-full bg-[#675df9] text-white flex items-center justify-center border border-[#c8c5cd]/60">
                        <Users className="w-6 h-6" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#f1edef] flex items-center justify-center border border-[#c8c5cd]/60 text-[#1c1b1d] font-bold text-[15px]">
                        {set.personInitials || 'ST'}
                      </div>
                    )}

                    <div>
                      <h4 className="text-[16px] font-bold text-[#00000b] leading-tight">
                        {set.title}
                      </h4>
                      <p className="text-[13px] text-[#47464c] flex items-center gap-1.5 mt-1">
                        {getSettlementIcon(set.iconType)}
                        <span>{set.categoryNote}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-[17px] font-mono-amount font-bold ${
                        set.type === 'received'
                          ? 'text-[#00C853]'
                          : set.type === 'group_settled'
                          ? 'text-[#1c1b1d]'
                          : 'text-[#1c1b1d]'
                      }`}
                    >
                      {set.type === 'received' && `+${formatAmount(set.amount)}`}
                      {set.type === 'paid' && `-${formatAmount(set.amount)}`}
                      {set.type === 'group_settled' && 'Closed'}
                    </div>
                    <div className="text-[11px] font-semibold text-[#78767d] uppercase tracking-wider mt-0.5">
                      {set.dateLabel}
                    </div>
                  </div>
                </div>

                {set.quote && (
                  <div className="mt-3.5 pt-3 border-t border-[#c8c5cd]/40 text-[13px] text-[#47464c] italic">
                    "{set.quote}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Visual Timeline (Side Column) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-[#c8c5cd]/60 shadow-xs p-6 sticky top-24 space-y-5">
            <h3 className="text-[18px] font-bold text-[#00000b] tracking-tight">
              Activity Timeline
            </h3>

            <div className="relative border-l-2 border-[#c8c5cd]/50 ml-3 pl-6 space-y-6">
              {/* Item 1 */}
              <div className="relative">
                <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-[#00C853] ring-4 ring-white" />
                <p className="text-[11px] font-semibold text-[#78767d] uppercase tracking-wider mb-0.5">
                  Oct 24 • Today
                </p>
                <p className="text-[14px] font-semibold text-[#1c1b1d]">
                  Received $45.00
                </p>
                <p className="text-[12px] text-[#47464c] mt-0.5">
                  From Sarah J. for Dinner
                </p>
              </div>

              {/* Item 2 */}
              <div className="relative">
                <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-[#78767d] ring-4 ring-white" />
                <p className="text-[11px] font-semibold text-[#78767d] uppercase tracking-wider mb-0.5">
                  Oct 22
                </p>
                <p className="text-[14px] font-semibold text-[#1c1b1d]">
                  Paid $32.50
                </p>
                <p className="text-[12px] text-[#47464c] mt-0.5">
                  To Mike R. for Gas
                </p>
              </div>

              {/* Item 3 */}
              <div className="relative">
                <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-[#00C853] ring-4 ring-white" />
                <p className="text-[11px] font-semibold text-[#78767d] uppercase tracking-wider mb-0.5">
                  Oct 15
                </p>
                <p className="text-[14px] font-semibold text-[#1c1b1d]">
                  Received $85.20
                </p>
                <p className="text-[12px] text-[#47464c] mt-0.5">
                  From David K. for Utilities
                </p>
              </div>

              {/* Item 4 */}
              <div className="relative">
                <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-[#675df9] ring-4 ring-white" />
                <p className="text-[11px] font-semibold text-[#78767d] uppercase tracking-wider mb-0.5">
                  Oct 10
                </p>
                <p className="text-[14px] font-semibold text-[#1c1b1d]">
                  Group Settled
                </p>
                <p className="text-[12px] text-[#47464c] mt-0.5">
                  Ski Trip expenses finalized
                </p>
              </div>

              {/* Item 5 */}
              <div className="relative">
                <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-[#78767d] ring-4 ring-white" />
                <p className="text-[11px] font-semibold text-[#78767d] uppercase tracking-wider mb-0.5">
                  Oct 02
                </p>
                <p className="text-[14px] font-semibold text-[#1c1b1d]">
                  Paid $15.00
                </p>
                <p className="text-[12px] text-[#47464c] mt-0.5">
                  To Anna L. for Coffee
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
