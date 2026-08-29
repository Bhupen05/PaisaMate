import React, { useState } from 'react';
import {
  TrendingUp,
  Users,
  Plus,
  ArrowRight,
  MoreHorizontal,
  ShoppingCart,
  Car,
  Plane,
  Utensils,
  Zap,
  Dumbbell,
  Receipt,
  PlusCircle,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { PriorityClassification } from '../../types';

export const DashboardView: React.FC = () => {
  const {
    formatAmount,
    totalBalance,
    monthlySpending,
    needSpending,
    wantSpending,
    dreamSpending,
    totalOwedToYou,
    totalYouOwe,
    friends,
    transactions,
    setActiveTab,
    setIsAddExpenseOpen,
    setIsSettleUpOpen,
    setSettleTargetFriend,
  } = useFinance();

  const [trendTimeframe, setTrendTimeframe] = useState<'month' | 'last_month' | 'ytd'>('month');

  // Compute percentages for monthly spending bar
  const totalSpend = monthlySpending > 0 ? monthlySpending : 1;
  const needPercent = Math.round((needSpending / totalSpend) * 100) || 50;
  const wantPercent = Math.round((wantSpending / totalSpend) * 100) || 30;
  const dreamPercent = 100 - needPercent - wantPercent;

  // Net shared balance
  const netSharedBalance = totalOwedToYou - totalYouOwe;

  // Friends who owe you vs you owe
  const friendsWhoOweYou = friends.filter((f) => f.netBalance > 0).slice(0, 2);
  const friendsYouOwe = friends.filter((f) => f.netBalance < 0).slice(0, 1);

  // Category icon helper
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'groceries':
        return <ShoppingCart className="w-5 h-5" />;
      case 'transport':
        return <Car className="w-5 h-5" />;
      case 'travel':
        return <Plane className="w-5 h-5" />;
      case 'dining out':
        return <Utensils className="w-5 h-5" />;
      case 'utilities':
        return <Zap className="w-5 h-5" />;
      case 'health':
        return <Dumbbell className="w-5 h-5" />;
      default:
        return <Receipt className="w-5 h-5" />;
    }
  };

  const getClassificationBadge = (cls: PriorityClassification) => {
    switch (cls) {
      case 'Need':
        return (
          <span className="px-2 py-0.5 rounded-full bg-[#E8F5E9] text-[#00C853] text-[10px] font-bold tracking-wider uppercase">
            Need
          </span>
        );
      case 'Want':
        return (
          <span className="px-2 py-0.5 rounded-full bg-[#FFF8E1] text-[#FFAB00] text-[10px] font-bold tracking-wider uppercase">
            Want
          </span>
        );
      case 'Dream':
        return (
          <span className="px-2 py-0.5 rounded-full bg-[#E1F5FE] text-[#00B0FF] text-[10px] font-bold tracking-wider uppercase">
            Dream
          </span>
        );
    }
  };

  // Bar chart weeks data based on timeframe
  const weeklyData =
    trendTimeframe === 'month'
      ? [
          { label: 'W1', amount: 450, heightPercent: 40, highlight: false },
          { label: 'W2', amount: 680, heightPercent: 60, highlight: false },
          { label: 'W3', amount: 920, heightPercent: 85, highlight: true },
          { label: 'W4', amount: 310, heightPercent: 30, highlight: false },
        ]
      : trendTimeframe === 'last_month'
      ? [
          { label: 'W1', amount: 520, heightPercent: 50, highlight: false },
          { label: 'W2', amount: 790, heightPercent: 75, highlight: true },
          { label: 'W3', amount: 610, heightPercent: 55, highlight: false },
          { label: 'W4', amount: 440, heightPercent: 42, highlight: false },
        ]
      : [
          { label: 'Q1', amount: 3200, heightPercent: 65, highlight: false },
          { label: 'Q2', amount: 4100, heightPercent: 80, highlight: true },
          { label: 'Q3', amount: 2900, heightPercent: 55, highlight: false },
          { label: 'Q4', amount: 1800, heightPercent: 35, highlight: false },
        ];

  return (
    <div id="dashboard-view" className="p-4 md:p-6 lg:p-8 max-w-[1200px] mx-auto w-full space-y-6 md:space-y-8">
      {/* Top 3 KPI Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {/* Total Balance Card */}
        <div className="bg-[#1a1a2e] text-white p-6 rounded-2xl shadow-sm border border-[#1a1a2e] relative overflow-hidden flex flex-col justify-between min-h-[150px]">
          <div className="absolute -right-10 -top-10 w-36 h-36 bg-[#675df9] opacity-25 rounded-full blur-2xl pointer-events-none" />
          <div>
            <h2 className="text-[14px] text-white/70 font-medium mb-1.5">
              Total Balance
            </h2>
            <div className="text-[28px] md:text-[32px] font-mono-amount font-bold text-white tracking-tight">
              {formatAmount(totalBalance)}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[#00C853] text-[13px] font-medium mt-3">
            <TrendingUp className="w-4 h-4" />
            <span className="font-mono-amount">+2.4% this month</span>
          </div>
        </div>

        {/* Monthly Spending Card with 50/30/20 Stacked Bar */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-[#c8c5cd]/60 flex flex-col justify-between min-h-[150px]">
          <div>
            <h2 className="text-[14px] text-[#47464c] font-medium mb-1.5">
              Monthly Spending
            </h2>
            <div className="text-[26px] md:text-[28px] font-mono-amount font-bold text-[#1c1b1d]">
              {formatAmount(monthlySpending)}
            </div>
          </div>

          <div className="space-y-2 mt-3">
            {/* Multi-segment progress bar */}
            <div className="h-2 w-full bg-[#f1edef] rounded-full overflow-hidden flex">
              <div
                className="bg-[#00C853] h-full transition-all duration-500"
                style={{ width: `${needPercent}%` }}
                title={`Need: ${needPercent}%`}
              />
              <div
                className="bg-[#FFAB00] h-full transition-all duration-500"
                style={{ width: `${wantPercent}%` }}
                title={`Want: ${wantPercent}%`}
              />
              <div
                className="bg-[#00B0FF] h-full transition-all duration-500"
                style={{ width: `${dreamPercent}%` }}
                title={`Dream: ${dreamPercent}%`}
              />
            </div>

            {/* Legend */}
            <div className="flex justify-between items-center text-[12px] pt-1">
              <span className="text-[#00C853] font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#00C853]" /> Need
              </span>
              <span className="text-[#FFAB00] font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#FFAB00]" /> Want
              </span>
              <span className="text-[#00B0FF] font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#00B0FF]" /> Dream
              </span>
            </div>
          </div>
        </div>

        {/* Net Shared Balance Card */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-[#c8c5cd]/60 flex flex-col justify-between min-h-[150px]">
          <div>
            <div className="flex items-center justify-between text-[14px] text-[#47464c] font-medium mb-1.5">
              <span>Net Shared Balance</span>
              <Users className="w-4 h-4 text-[#78767d]" />
            </div>
            <div
              className={`text-[26px] md:text-[28px] font-mono-amount font-bold ${
                netSharedBalance >= 0 ? 'text-[#00C853]' : 'text-[#ba1a1a]'
              }`}
            >
              {formatAmount(netSharedBalance, true)}
            </div>
          </div>
          <p className="text-[13px] text-[#47464c] mt-2">
            {netSharedBalance >= 0
              ? 'You are owed more than you owe.'
              : 'You owe more than you are owed.'}
          </p>
        </div>
      </section>

      {/* Main Bento Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols on Desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Spending Trend Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-[#c8c5cd]/60 flex flex-col min-h-[300px]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[18px] font-bold text-[#1c1b1d] tracking-tight">
                Spending Trend
              </h2>
              <select
                value={trendTimeframe}
                onChange={(e) => setTrendTimeframe(e.target.value as any)}
                className="bg-[#f1edef] text-[#1c1b1d] text-[13px] font-medium rounded-lg border-none px-3 py-1.5 focus:ring-2 focus:ring-[#675df9] outline-none cursor-pointer"
              >
                <option value="month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="ytd">Year to Date</option>
              </select>
            </div>

            {/* Custom Bar Visualization */}
            <div className="flex-1 relative flex items-end justify-between px-6 pb-6 pt-8">
              {weeklyData.map((bar) => (
                <div
                  key={bar.label}
                  className="flex-1 flex flex-col items-center group relative max-w-[80px]"
                >
                  {/* Floating tooltip */}
                  <div className="absolute -top-9 bg-[#1a1a2e] text-white text-[11px] font-mono-amount font-semibold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none z-10">
                    {formatAmount(bar.amount)}
                  </div>

                  {/* Bar */}
                  <div
                    className={`w-10 rounded-t-lg transition-all duration-300 ${
                      bar.highlight
                        ? 'bg-[#675df9] shadow-[0_0_15px_rgba(103,93,249,0.35)]'
                        : 'bg-[#675df9]/30 hover:bg-[#675df9]/50'
                    }`}
                    style={{ height: `${bar.heightPercent * 1.8}px` }}
                  />

                  {/* Label */}
                  <span
                    className={`text-[12px] font-mono-amount mt-3 ${
                      bar.highlight
                        ? 'font-bold text-[#1c1b1d]'
                        : 'text-[#78767d]'
                    }`}
                  >
                    {bar.label}
                  </span>
                </div>
              ))}
              <div className="absolute left-0 bottom-6 w-full h-[1px] bg-[#c8c5cd]/60" />
            </div>
          </div>

          {/* Recent Activity List */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-[#c8c5cd]/60 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-[18px] font-bold text-[#1c1b1d] tracking-tight">
                Recent Activity
              </h2>
              <button
                onClick={() => setActiveTab('transactions')}
                className="text-[13px] font-semibold text-[#675df9] hover:underline flex items-center gap-1"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-[#c8c5cd]/40">
              {transactions.slice(0, 4).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-3.5 hover:bg-[#f6f2f4]/60 px-2 rounded-xl transition-colors cursor-pointer group"
                  onClick={() => setActiveTab('transactions')}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-[#f1edef] flex items-center justify-center text-[#47464c] group-hover:bg-[#e5e1e3] transition-colors">
                      {getCategoryIcon(tx.category)}
                    </div>
                    <div>
                      <div className="text-[14px] font-medium text-[#1c1b1d]">
                        {tx.title}
                      </div>
                      <div className="text-[12px] text-[#47464c]">
                        {tx.category} • {tx.dateGroup}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <div className="text-[15px] font-mono-amount font-semibold text-[#1c1b1d]">
                      -{formatAmount(tx.amount)}
                    </div>
                    {getClassificationBadge(tx.classification)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col on Desktop) */}
        <div className="space-y-6">
          {/* Friends Summary Card */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-[#c8c5cd]/60">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-[18px] font-bold text-[#1c1b1d] tracking-tight">
                Friends Summary
              </h2>
              <button
                onClick={() => setActiveTab('friends')}
                className="p-1 rounded-full text-[#78767d] hover:bg-[#f1edef] transition-colors"
                title="View Network"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>

            {/* Owes You */}
            <div className="mb-5">
              <h3 className="text-[11px] font-semibold text-[#78767d] uppercase tracking-wider mb-3">
                Owes You
              </h3>
              <div className="space-y-2.5">
                {friendsWhoOweYou.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-[#f1edef]/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      {f.avatarUrl ? (
                        <img
                          src={f.avatarUrl}
                          alt={f.name}
                          className="w-8 h-8 rounded-full object-cover border border-[#c8c5cd]"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#675df9] text-white flex items-center justify-center font-bold text-[11px]">
                          {f.initials || 'FD'}
                        </div>
                      )}
                      <span className="text-[13px] font-medium text-[#1c1b1d]">
                        {f.name}
                      </span>
                    </div>
                    <span className="text-[13px] font-mono-amount font-semibold text-[#00C853]">
                      +{formatAmount(f.netBalance)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* You Owe */}
            <div>
              <h3 className="text-[11px] font-semibold text-[#78767d] uppercase tracking-wider mb-3">
                You Owe
              </h3>
              <div className="space-y-2.5">
                {friendsYouOwe.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-[#f1edef]/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      {f.avatarUrl ? (
                        <img
                          src={f.avatarUrl}
                          alt={f.name}
                          className="w-8 h-8 rounded-full object-cover border border-[#c8c5cd]"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#f1edef] text-[#1c1b1d] flex items-center justify-center font-bold text-[11px]">
                          {f.initials || 'FD'}
                        </div>
                      )}
                      <span className="text-[13px] font-medium text-[#1c1b1d]">
                        {f.name}
                      </span>
                    </div>
                    <span className="text-[13px] font-mono-amount font-semibold text-[#ba1a1a]">
                      -{formatAmount(Math.abs(f.netBalance))}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Settle Up Button */}
            <button
              id="dashboard-settle-up-btn"
              onClick={() => {
                setSettleTargetFriend(friends[0] || null);
                setIsSettleUpOpen(true);
              }}
              className="w-full mt-6 py-2.5 border border-[#c8c5cd] text-[#1c1b1d] hover:bg-[#f1edef] hover:border-[#78767d] rounded-xl text-[13px] font-semibold transition-colors shadow-2xs"
            >
              Settle Up
            </button>
          </div>

          {/* Quick New Expense Promo Card */}
          <div
            onClick={() => setIsAddExpenseOpen(true)}
            className="relative overflow-hidden rounded-2xl p-6 border border-[#c8c5cd]/60 bg-gradient-to-br from-white to-[#f6f2f4] shadow-xs group cursor-pointer hover:shadow-md transition-all duration-200"
          >
            <div className="absolute top-3 right-3 text-[#675df9]/10 group-hover:text-[#675df9]/20 transition-colors">
              <PlusCircle className="w-16 h-16" />
            </div>
            <h3 className="text-[18px] font-bold text-[#1c1b1d] tracking-tight mb-1">
              New Expense
            </h3>
            <p className="text-[13px] text-[#47464c] mb-5 max-w-[200px]">
              Quickly log a new transaction or split costs with friends.
            </p>
            <button className="inline-flex items-center gap-2 bg-[#675df9] hover:bg-[#4d41df] text-white px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors shadow-xs">
              <Plus className="w-4 h-4" /> Log Expense
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
