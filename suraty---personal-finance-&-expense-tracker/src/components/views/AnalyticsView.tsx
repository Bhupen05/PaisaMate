import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { ShieldCheck, Sparkles, Compass, TrendingUp, Info } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

export const AnalyticsView: React.FC = () => {
  const {
    formatAmount,
    transactions,
    monthlySpending,
    needSpending,
    wantSpending,
    dreamSpending,
    budgetPercentages,
  } = useFinance();

  const totalSpend = monthlySpending > 0 ? monthlySpending : 1;
  const currentNeedPct = Math.round((needSpending / totalSpend) * 100);
  const currentWantPct = Math.round((wantSpending / totalSpend) * 100);
  const currentDreamPct = Math.max(0, 100 - currentNeedPct - currentWantPct);

  // Category breakdown for Pie Chart
  const categoryTotals: Record<string, number> = {};
  transactions.forEach((tx) => {
    categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
  });

  const pieData = Object.entries(categoryTotals).map(([name, value]) => ({
    name,
    value,
  }));

  const PIE_COLORS = [
    '#675df9',
    '#00C853',
    '#FFAB00',
    '#00B0FF',
    '#9c27b0',
    '#ff5722',
    '#607d8b',
    '#e91e63',
  ];

  // Need / Want / Dream Comparison Data
  const comparisonData = [
    {
      name: 'Need',
      Actual: currentNeedPct,
      Target: budgetPercentages.need,
      color: '#00C853',
    },
    {
      name: 'Want',
      Actual: currentWantPct,
      Target: budgetPercentages.want,
      color: '#FFAB00',
    },
    {
      name: 'Dream',
      Actual: currentDreamPct,
      Target: budgetPercentages.dream,
      color: '#00B0FF',
    },
  ];

  return (
    <div id="analytics-view" className="p-4 md:p-6 lg:p-8 max-w-[1200px] mx-auto w-full space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-[32px] md:text-[36px] font-bold text-[#00000b] tracking-tight">
          Financial Analytics
        </h1>
        <p className="text-[14px] text-[#47464c] mt-1">
          Deep insights into your 50/30/20 budget framework & category allocation.
        </p>
      </div>

      {/* 3 Pillars Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Need Card */}
        <div className="bg-white rounded-2xl border border-[#c8c5cd]/60 p-6 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-bold text-[#00C853] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Need (Essentials)
            </span>
            <span className="text-[11px] font-semibold text-[#78767d]">
              Target: {budgetPercentages.need}%
            </span>
          </div>
          <div className="text-[28px] font-mono-amount font-bold text-[#1c1b1d]">
            {formatAmount(needSpending)}
          </div>
          <div className="mt-3 flex items-center justify-between text-[12px]">
            <span className="text-[#47464c]">Share of total:</span>
            <span className="font-bold text-[#00C853]">{currentNeedPct}%</span>
          </div>
          <div className="w-full bg-[#f1edef] h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-[#00C853] h-full"
              style={{ width: `${Math.min(currentNeedPct, 100)}%` }}
            />
          </div>
        </div>

        {/* Want Card */}
        <div className="bg-white rounded-2xl border border-[#c8c5cd]/60 p-6 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-bold text-[#FFAB00] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Want (Lifestyle)
            </span>
            <span className="text-[11px] font-semibold text-[#78767d]">
              Target: {budgetPercentages.want}%
            </span>
          </div>
          <div className="text-[28px] font-mono-amount font-bold text-[#1c1b1d]">
            {formatAmount(wantSpending)}
          </div>
          <div className="mt-3 flex items-center justify-between text-[12px]">
            <span className="text-[#47464c]">Share of total:</span>
            <span className="font-bold text-[#FFAB00]">{currentWantPct}%</span>
          </div>
          <div className="w-full bg-[#f1edef] h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-[#FFAB00] h-full"
              style={{ width: `${Math.min(currentWantPct, 100)}%` }}
            />
          </div>
        </div>

        {/* Dream Card */}
        <div className="bg-white rounded-2xl border border-[#c8c5cd]/60 p-6 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-bold text-[#00B0FF] uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-4 h-4" /> Dream (Future & Goals)
            </span>
            <span className="text-[11px] font-semibold text-[#78767d]">
              Target: {budgetPercentages.dream}%
            </span>
          </div>
          <div className="text-[28px] font-mono-amount font-bold text-[#1c1b1d]">
            {formatAmount(dreamSpending)}
          </div>
          <div className="mt-3 flex items-center justify-between text-[12px]">
            <span className="text-[#47464c]">Share of total:</span>
            <span className="font-bold text-[#00B0FF]">{currentDreamPct}%</span>
          </div>
          <div className="w-full bg-[#f1edef] h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-[#00B0FF] h-full"
              style={{ width: `${Math.min(currentDreamPct, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actual vs Target Bar Chart */}
        <div className="bg-white rounded-2xl border border-[#c8c5cd]/60 p-6 shadow-xs">
          <h3 className="text-[18px] font-bold text-[#00000b] tracking-tight mb-4">
            Actual vs Target Ratio (%)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: '#47464c', fontSize: 12 }} />
                <YAxis unit="%" tick={{ fill: '#47464c', fontSize: 12 }} />
                <Tooltip
                  formatter={(value: any) => [`${value}%`]}
                  contentStyle={{
                    backgroundColor: '#1a1a2e',
                    borderRadius: '8px',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="Actual" fill="#675df9" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Target" fill="#c8c5cd" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-3 text-[12px] font-semibold">
            <span className="flex items-center gap-1.5 text-[#675df9]">
              <span className="w-3 h-3 rounded bg-[#675df9]" /> Current Actual %
            </span>
            <span className="flex items-center gap-1.5 text-[#78767d]">
              <span className="w-3 h-3 rounded bg-[#c8c5cd]" /> Target Rule %
            </span>
          </div>
        </div>

        {/* Category Breakdown Donut */}
        <div className="bg-white rounded-2xl border border-[#c8c5cd]/60 p-6 shadow-xs flex flex-col justify-between">
          <h3 className="text-[18px] font-bold text-[#00000b] tracking-tight mb-2">
            Spending by Category
          </h3>
          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [formatAmount(Number(value))]}
                  contentStyle={{
                    backgroundColor: '#1a1a2e',
                    borderRadius: '8px',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#c8c5cd]/40">
            {pieData.slice(0, 4).map((entry, idx) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-[11px]">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                />
                <span className="text-[#47464c] truncate">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
