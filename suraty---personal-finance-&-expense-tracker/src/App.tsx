/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Sidebar } from './components/Sidebar';
import { TopAppBar } from './components/TopAppBar';
import { BottomNavBar } from './components/BottomNavBar';
import { Toast } from './components/Toast';

// Views
import { DashboardView } from './components/views/DashboardView';
import { TransactionsView } from './components/views/TransactionsView';
import { SharedView } from './components/views/SharedView';
import { FriendsView } from './components/views/FriendsView';
import { SettlementsView } from './components/views/SettlementsView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { RecurringView } from './components/views/RecurringView';
import { SettingsView } from './components/views/SettingsView';

// Modals
import { AddExpenseModal } from './components/modals/AddExpenseModal';
import { NewSharedExpenseModal } from './components/modals/NewSharedExpenseModal';
import { AddFriendModal } from './components/modals/AddFriendModal';
import { SettleUpModal } from './components/modals/SettleUpModal';
import { FriendDetailModal } from './components/modals/FriendDetailModal';

const AppContent: React.FC = () => {
  const { activeTab } = useFinance();

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView key="dashboard" />;
      case 'transactions':
        return <TransactionsView key="transactions" />;
      case 'friends':
        return <FriendsView key="friends" />;
      case 'shared':
        return <SharedView key="shared" />;
      case 'settlements':
        return <SettlementsView key="settlements" />;
      case 'analytics':
        return <AnalyticsView key="analytics" />;
      case 'recurring':
        return <RecurringView key="recurring" />;
      case 'settings':
        return <SettingsView key="settings" />;
      default:
        return <DashboardView key="default" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#fcf8fa] text-[#1c1b1d] flex flex-col antialiased">
      {/* Sidebar for Desktop */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-[240px] pb-20 lg:pb-8 w-full min-w-0">
        <TopAppBar />

        <main className="flex-1 w-full overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full"
            >
              {renderActiveView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNavBar />

      {/* Modals & Dialogs */}
      <AddExpenseModal />
      <NewSharedExpenseModal />
      <AddFriendModal />
      <SettleUpModal />
      <FriendDetailModal />

      {/* Toast Notification */}
      <Toast />
    </div>
  );
};

export default function App() {
  return (
    <FinanceProvider>
      <AppContent />
    </FinanceProvider>
  );
}
