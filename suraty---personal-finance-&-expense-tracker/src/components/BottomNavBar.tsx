import React from 'react';
import {
  Home,
  Receipt,
  Users2,
  LineChart,
  Menu,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { NavigationTab } from '../types';

export const BottomNavBar: React.FC = () => {
  const { activeTab, setActiveTab } = useFinance();

  const navItems: { id: NavigationTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: <Home className="w-5 h-5" />,
    },
    {
      id: 'transactions',
      label: 'Activity',
      icon: <Receipt className="w-5 h-5" />,
    },
    {
      id: 'shared',
      label: 'Shared',
      icon: <Users2 className="w-5 h-5" />,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <LineChart className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: 'More',
      icon: <Menu className="w-5 h-5" />,
    },
  ];

  return (
    <nav
      id="bottom-nav-bar"
      className="fixed bottom-0 left-0 w-full flex justify-around items-center h-16 pb-safe bg-[#fcf8fa]/95 backdrop-blur-lg border-t border-[#c8c5cd]/60 lg:hidden z-50 shadow-lg"
    >
      {navItems.map((item) => {
        const isActive =
          activeTab === item.id ||
          (item.id === 'settings' &&
            (activeTab === 'settlements' ||
              activeTab === 'recurring' ||
              activeTab === 'friends'));

        return (
          <button
            key={item.id}
            id={`bottom-nav-${item.id}`}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center transition-all duration-150 w-16 h-full ${
              isActive
                ? 'text-[#675df9] font-bold scale-95'
                : 'text-[#47464c] hover:text-[#1c1b1d]'
            }`}
          >
            <span className="shrink-0">{item.icon}</span>
            <span className="text-[10px] font-semibold tracking-wider mt-0.5 uppercase">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
