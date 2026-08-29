import React, { useState } from 'react';
import {
  Search,
  Plus,
  ShoppingCart,
  Car,
  Plane,
  Utensils,
  Zap,
  Dumbbell,
  Receipt,
  Headphones,
  Home,
  Trash2,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { PriorityClassification, ExpenseCategory, Transaction } from '../../types';

export const TransactionsView: React.FC = () => {
  const {
    transactions,
    deleteTransaction,
    formatAmount,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    selectedClassification,
    setSelectedClassification,
    setIsAddExpenseOpen,
  } = useFinance();

  const [hoveredTxId, setHoveredTxId] = useState<string | null>(null);

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.notes && tx.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'All Categories' || tx.category === selectedCategory;

    const matchesClassification =
      selectedClassification === 'Any Classification' ||
      tx.classification === selectedClassification;

    return matchesSearch && matchesCategory && matchesClassification;
  });

  // Group by dateGroup
  const groupedTransactions: Record<string, Transaction[]> = {};
  filteredTransactions.forEach((tx) => {
    const group = tx.dateGroup || 'Recent';
    if (!groupedTransactions[group]) {
      groupedTransactions[group] = [];
    }
    groupedTransactions[group].push(tx);
  });

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'groceries':
        return <ShoppingCart className="w-5 h-5" />;
      case 'transport':
        return <Car className="w-5 h-5" />;
      case 'travel':
        return <Plane className="w-5 h-5" />;
      case 'dining out':
      case 'dining':
        return <Utensils className="w-5 h-5" />;
      case 'utilities':
        return <Zap className="w-5 h-5" />;
      case 'health':
        return <Dumbbell className="w-5 h-5" />;
      case 'housing':
        return <Home className="w-5 h-5" />;
      case 'shopping':
        return <Headphones className="w-5 h-5" />;
      default:
        return <Receipt className="w-5 h-5" />;
    }
  };

  const getClassificationBadge = (cls: PriorityClassification) => {
    switch (cls) {
      case 'Need':
        return (
          <span className="px-3 py-1 rounded-full bg-[#E8F5E9] text-[#00C853] text-[12px] font-semibold tracking-wide hidden md:inline-block">
            Need
          </span>
        );
      case 'Want':
        return (
          <span className="px-3 py-1 rounded-full bg-[#FFF8E1] text-[#FFAB00] text-[12px] font-semibold tracking-wide hidden md:inline-block">
            Want
          </span>
        );
      case 'Dream':
        return (
          <span className="px-3 py-1 rounded-full bg-[#E1F5FE] text-[#00B0FF] text-[12px] font-semibold tracking-wide hidden md:inline-block">
            Dream
          </span>
        );
    }
  };

  return (
    <div id="transactions-view" className="p-4 md:p-6 lg:p-8 max-w-[1200px] mx-auto w-full space-y-6">
      {/* Page Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#00000b] tracking-tight">
            All Expenses
          </h1>
          <p className="text-[14px] text-[#47464c] mt-1">
            Review and manage your personal spending.
          </p>
        </div>
        <button
          id="add-expense-main-btn"
          onClick={() => setIsAddExpenseOpen(true)}
          className="bg-[#6C63FF] hover:bg-[#5850ee] text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold tracking-wide shadow-xs transition-all flex items-center gap-2 h-11 self-stretch md:self-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          Add Expense
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl border border-[#c8c5cd]/60 shadow-xs p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78767d]" />
          <input
            id="transaction-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search transactions..."
            className="w-full h-[44px] pl-10 pr-4 rounded-xl border border-[#c8c5cd]/60 bg-white focus:border-[#6C63FF] focus:ring-1 focus:ring-[#6C63FF] text-[14px] outline-none transition-colors"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
          <select
            id="category-filter-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-[44px] px-3.5 rounded-xl border border-[#c8c5cd]/60 bg-white text-[14px] outline-none focus:border-[#6C63FF] min-w-[140px] cursor-pointer text-[#1c1b1d]"
          >
            <option>All Categories</option>
            <option>Groceries</option>
            <option>Transport</option>
            <option>Travel</option>
            <option>Dining Out</option>
            <option>Utilities</option>
            <option>Health</option>
            <option>Shopping</option>
            <option>Housing</option>
            <option>Entertainment</option>
          </select>

          <select
            id="classification-filter-select"
            value={selectedClassification}
            onChange={(e) => setSelectedClassification(e.target.value)}
            className="h-[44px] px-3.5 rounded-xl border border-[#c8c5cd]/60 bg-white text-[14px] outline-none focus:border-[#6C63FF] min-w-[150px] cursor-pointer text-[#1c1b1d]"
          >
            <option>Any Classification</option>
            <option>Need</option>
            <option>Want</option>
            <option>Dream</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-2xl border border-[#c8c5cd]/60 shadow-xs overflow-hidden">
        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="p-12 text-center text-[#47464c] space-y-3">
            <Receipt className="w-10 h-10 mx-auto text-[#78767d]/60" />
            <p className="text-[15px] font-medium text-[#1c1b1d]">
              No transactions match your search
            </p>
            <p className="text-[13px]">
              Try adjusting your category or classification filters.
            </p>
          </div>
        ) : (
          Object.entries(groupedTransactions).map(([dateGroup, items]) => (
            <div key={dateGroup} className="border-b border-[#c8c5cd]/60 last:border-b-0">
              {/* Date Group Header */}
              <div className="bg-[#fcf8fa] px-6 py-2.5 border-b border-[#c8c5cd]/40">
                <span className="text-[12px] font-semibold text-[#47464c] tracking-wider uppercase">
                  {dateGroup}
                </span>
              </div>

              {/* Items in date group */}
              <div className="divide-y divide-[#c8c5cd]/40">
                {items.map((tx) => (
                  <div
                    key={tx.id}
                    onMouseEnter={() => setHoveredTxId(tx.id)}
                    onMouseLeave={() => setHoveredTxId(null)}
                    className="flex items-center justify-between p-5 hover:bg-[#f6f2f4]/60 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-[#f1edef] flex items-center justify-center text-[#47464c] group-hover:bg-[#e5e1e3] transition-colors shrink-0">
                        {getCategoryIcon(tx.category)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-medium text-[#1c1b1d] truncate">
                          {tx.title}
                        </h3>
                        <p className="text-[13px] text-[#47464c] flex items-center gap-2">
                          <span>{tx.category}</span>
                          {tx.notes && (
                            <span className="hidden sm:inline text-[#78767d] truncate max-w-[200px]">
                              • {tx.notes}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 md:gap-6 shrink-0">
                      {getClassificationBadge(tx.classification)}
                      <span className="text-[16px] font-mono-amount font-semibold text-[#1c1b1d]">
                        -{formatAmount(tx.amount)}
                      </span>

                      {/* Delete action */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTransaction(tx.id);
                        }}
                        className={`p-1.5 rounded-lg text-[#78767d] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-all ${
                          hoveredTxId === tx.id ? 'opacity-100' : 'opacity-0'
                        }`}
                        title="Delete expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
