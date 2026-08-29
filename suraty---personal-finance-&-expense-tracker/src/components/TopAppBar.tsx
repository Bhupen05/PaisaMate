import React, { useState, useRef, useEffect } from 'react';
import { Bell, ChevronDown, CheckCheck, Trash2, X, Plus } from 'lucide-react';
import { useFinance, CurrencyCode } from '../context/FinanceContext';
import { INITIAL_USER } from '../data/mockData';

interface TopAppBarProps {
  onOpenNotifications?: () => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = () => {
  const {
    activeTab,
    currency,
    setCurrency,
    notifications,
    unreadNotifsCount,
    markAllNotifsAsRead,
    clearNotification,
    setIsAddExpenseOpen,
  } = useFinance();

  const [isCurrencyMenuOpen, setIsCurrencyMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const currencyRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const currencies: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'CAD'];

  const tabTitles: Record<string, string> = {
    dashboard: 'Dashboard',
    transactions: 'Transactions',
    friends: 'Friends',
    shared: 'Shared Expenses',
    settlements: 'Settlements',
    recurring: 'Recurring Expenses',
    analytics: 'Analytics',
    settings: 'Settings',
  };

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        currencyRef.current &&
        !currencyRef.current.contains(event.target as Node)
      ) {
        setIsCurrencyMenuOpen(false);
      }
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target as Node)
      ) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      id="top-app-bar"
      className="sticky top-0 z-40 bg-[#fcf8fa]/90 backdrop-blur-md border-b border-[#c8c5cd]/40 w-full"
    >
      <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-[1200px] mx-auto w-full">
        {/* Left: Mobile brand / Desktop active section title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 lg:hidden">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuB7YwjfDSYZ-fg--E60wScj_n1Mt5_1uDRyf_O_3dsZ88Fyot7FvQU-2RBAcN2CgENr8TV7t7w_r6_I85Mzcby4VCB3eT5nCsd8HSj-gTSw-h9x4ZbkNU_vmcVSOHx9L4FoyfQJPWs_GvtkGfJjtpXsrGq0W9AYVORitm7T5xWAQieLE2fW2k46gOe_cVz5PrWtvX901RMihmlGZIDdzdk91tGeUwisgZLCJYCbqSuSK6BR6kMIIkDl"
              alt="Logo"
              className="w-7 h-7 rounded-md"
            />
            <span className="text-[18px] font-bold text-[#00000b] tracking-tight">
              Suraty
            </span>
          </div>

          <h2 className="hidden lg:block text-[20px] font-bold text-[#1c1b1d] tracking-tight">
            {tabTitles[activeTab] || 'Suraty'}
          </h2>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* Quick Expense Mobile Action */}
          <button
            id="topbar-quick-add-btn"
            onClick={() => setIsAddExpenseOpen(true)}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-full bg-[#6C63FF] text-white shadow-xs"
            title="Add Expense"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Currency Dropdown */}
          <div className="relative" ref={currencyRef}>
            <button
              id="currency-selector-btn"
              onClick={() => setIsCurrencyMenuOpen(!isCurrencyMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f1edef] hover:bg-[#e5e1e3] border border-[#c8c5cd]/60 text-[13px] font-mono-amount font-semibold text-[#1c1b1d] transition-colors"
            >
              <span>{currency}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#47464c]" />
            </button>

            {isCurrencyMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-32 bg-white rounded-xl shadow-lg border border-[#c8c5cd]/60 py-1 z-50 animate-in fade-in zoom-in-95">
                {currencies.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setCurrency(c);
                      setIsCurrencyMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-[13px] font-mono-amount flex items-center justify-between hover:bg-[#f1edef] transition-colors ${
                      currency === c
                        ? 'font-bold text-[#675df9] bg-[#f1edef]/60'
                        : 'text-[#1c1b1d]'
                    }`}
                  >
                    <span>{c}</span>
                    {currency === c && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#675df9]"></span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications button & popover */}
          <div className="relative" ref={notifRef}>
            <button
              id="notifications-bell-btn"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-2 rounded-full text-[#47464c] hover:text-[#1c1b1d] hover:bg-[#f1edef] transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifsCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#ba1a1a] rounded-full ring-2 ring-[#fcf8fa]" />
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-xl shadow-xl border border-[#c8c5cd]/60 overflow-hidden z-50">
                <div className="p-3.5 bg-[#f6f2f4] border-b border-[#c8c5cd]/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-[#1c1b1d]">
                      Notifications
                    </span>
                    {unreadNotifsCount > 0 && (
                      <span className="bg-[#675df9] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {unreadNotifsCount} new
                      </span>
                    )}
                  </div>
                  {unreadNotifsCount > 0 && (
                    <button
                      onClick={markAllNotifsAsRead}
                      className="text-[11px] font-semibold text-[#675df9] hover:underline flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-[320px] overflow-y-auto divide-y divide-[#c8c5cd]/30 custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-[13px] text-[#47464c]">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3.5 transition-colors flex items-start justify-between gap-3 ${
                          n.read ? 'bg-white' : 'bg-[#e1f5fe]/30'
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-[#1c1b1d]">
                              {n.title}
                            </span>
                            <span className="text-[10px] text-[#78767d]">
                              {n.timeAgo}
                            </span>
                          </div>
                          <p className="text-[12px] text-[#47464c] leading-relaxed">
                            {n.message}
                          </p>
                        </div>
                        <button
                          onClick={() => clearNotification(n.id)}
                          className="text-[#78767d] hover:text-[#ba1a1a] p-1 transition-colors"
                          title="Dismiss"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Avatar */}
          <div className="flex items-center">
            <img
              src={INITIAL_USER.avatar}
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover border border-[#c8c5cd] cursor-pointer hover:ring-2 hover:ring-[#675df9] transition-all"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
