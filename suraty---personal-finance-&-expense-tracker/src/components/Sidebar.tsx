import React from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  Users,
  Wallet,
  Handshake,
  Repeat,
  BarChart3,
  Settings,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { NavigationTab } from '../types';
import { INITIAL_USER } from '../data/mockData';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab } = useFinance();

  const navItems: {
    id: NavigationTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: <ReceiptText className="w-5 h-5" />,
    },
    {
      id: 'friends',
      label: 'Friends',
      icon: <Users className="w-5 h-5" />,
    },
    {
      id: 'shared',
      label: 'Shared',
      icon: <Wallet className="w-5 h-5" />,
    },
    {
      id: 'settlements',
      label: 'Settlements',
      icon: <Handshake className="w-5 h-5" />,
    },
    {
      id: 'recurring',
      label: 'Recurring',
      icon: <Repeat className="w-5 h-5" />,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <aside
      id="main-sidebar"
      className="w-[240px] h-screen fixed left-0 top-0 hidden lg:flex flex-col border-r border-[#c8c5cd]/60 bg-[#fcf8fa] z-50 select-none"
    >
      {/* Brand Header */}
      <div className="p-4 flex items-center gap-3 border-b border-[#c8c5cd]/40">
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuB7YwjfDSYZ-fg--E60wScj_n1Mt5_1uDRyf_O_3dsZ88Fyot7FvQU-2RBAcN2CgENr8TV7t7w_r6_I85Mzcby4VCB3eT5nCsd8HSj-gTSw-h9x4ZbkNU_vmcVSOHx9L4FoyfQJPWs_GvtkGfJjtpXsrGq0W9AYVORitm7T5xWAQieLE2fW2k46gOe_cVz5PrWtvX901RMihmlGZIDdzdk91tGeUwisgZLCJYCbqSuSK6BR6kMIIkDl"
          alt="Suraty Logo"
          className="w-9 h-9 rounded-lg object-cover border border-[#c8c5cd]/60 shadow-xs"
        />
        <div>
          <h1 className="text-[20px] leading-[24px] font-bold text-[#00000b] tracking-tight">
            Suraty
          </h1>
          <p className="text-[11px] font-semibold text-[#47464c] tracking-wider uppercase">
            Personal Finance
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto custom-scrollbar">
        {navItems.slice(0, 7).map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-link-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 text-[13px] font-medium ${
                isActive
                  ? 'bg-[#675df9] text-white font-semibold shadow-xs'
                  : 'text-[#47464c] hover:bg-[#e5e1e3] hover:text-[#1c1b1d]'
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="tracking-wide">{item.label}</span>
              {item.badge && (
                <span className="ml-auto bg-[#ba1a1a] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Settings pinned toward bottom */}
        <div className="mt-auto pt-2 border-t border-[#c8c5cd]/40">
          <button
            id="nav-link-settings"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 text-[13px] font-medium w-full ${
              activeTab === 'settings'
                ? 'bg-[#675df9] text-white font-semibold'
                : 'text-[#47464c] hover:bg-[#e5e1e3] hover:text-[#1c1b1d]'
            }`}
          >
            <Settings className="w-5 h-5 shrink-0" />
            <span className="tracking-wide">Settings</span>
          </button>
        </div>
      </nav>

      {/* User profile card at bottom */}
      <div className="p-3 border-t border-[#c8c5cd]/60 bg-[#f6f2f4]/60 flex items-center gap-3">
        <img
          src={INITIAL_USER.avatar}
          alt={INITIAL_USER.name}
          className="w-10 h-10 rounded-full object-cover border border-[#c8c5cd]"
        />
        <div className="flex flex-col min-w-0">
          <span className="text-[13px] font-semibold text-[#1c1b1d] truncate">
            {INITIAL_USER.name}
          </span>
          <span className="text-[11px] text-[#47464c] uppercase tracking-wider font-medium">
            {INITIAL_USER.role}
          </span>
        </div>
      </div>
    </aside>
  );
};
