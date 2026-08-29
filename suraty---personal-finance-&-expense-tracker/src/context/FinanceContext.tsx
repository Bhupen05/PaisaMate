import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Transaction,
  Friend,
  GroupExpense,
  Settlement,
  RecurringItem,
  NotificationItem,
  NavigationTab,
  PriorityClassification,
  ExpenseCategory,
} from '../types';
import {
  INITIAL_USER,
  INITIAL_TRANSACTIONS,
  INITIAL_FRIENDS,
  INITIAL_GROUP_EXPENSES,
  INITIAL_SETTLEMENTS,
  INITIAL_RECURRING,
  INITIAL_NOTIFICATIONS,
} from '../data/mockData';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD';

interface FinanceContextType {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  formatAmount: (amount: number, forceSign?: boolean) => string;

  // Transactions
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;

  // Search & Filters
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedClassification: string;
  setSelectedClassification: (cls: string) => void;

  // Friends & Network
  friends: Friend[];
  addFriend: (name: string, handle: string, initialBalance?: number) => void;
  selectedFriendDetail: Friend | null;
  setSelectedFriendDetail: (friend: Friend | null) => void;

  // Group Expenses & Shared
  groupExpenses: GroupExpense[];
  addGroupExpense: (expense: Omit<GroupExpense, 'id'>) => void;

  // Settlements
  settlements: Settlement[];
  addSettlement: (settlement: Omit<Settlement, 'id'>) => void;

  // Recurring
  recurring: RecurringItem[];
  addRecurring: (item: Omit<RecurringItem, 'id'>) => void;
  toggleRecurringAutoPay: (id: string) => void;

  // Notifications
  notifications: NotificationItem[];
  unreadNotifsCount: number;
  markAllNotifsAsRead: () => void;
  clearNotification: (id: string) => void;

  // Modals
  isAddExpenseOpen: boolean;
  setIsAddExpenseOpen: (open: boolean) => void;
  isNewSharedOpen: boolean;
  setIsNewSharedOpen: (open: boolean) => void;
  isAddFriendOpen: boolean;
  setIsAddFriendOpen: (open: boolean) => void;
  isSettleUpOpen: boolean;
  setIsSettleUpOpen: (open: boolean) => void;
  settleTargetFriend: Friend | null;
  setSettleTargetFriend: (friend: Friend | null) => void;

  // Metrics
  totalBalance: number;
  monthlySpending: number;
  totalOwedToYou: number;
  totalYouOwe: number;
  needSpending: number;
  wantSpending: number;
  dreamSpending: number;

  // Budget Settings
  budgetPercentages: { need: number; want: number; dream: number };
  setBudgetPercentages: (ratios: { need: number; want: number; dream: number }) => void;

  // Toast message
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'CA$',
};

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  // Stored state with local storage support
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('suraty_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [friends, setFriends] = useState<Friend[]>(() => {
    const saved = localStorage.getItem('suraty_friends');
    return saved ? JSON.parse(saved) : INITIAL_FRIENDS;
  });

  const [groupExpenses, setGroupExpenses] = useState<GroupExpense[]>(() => {
    const saved = localStorage.getItem('suraty_group_expenses');
    return saved ? JSON.parse(saved) : INITIAL_GROUP_EXPENSES;
  });

  const [settlements, setSettlements] = useState<Settlement[]>(() => {
    const saved = localStorage.getItem('suraty_settlements');
    return saved ? JSON.parse(saved) : INITIAL_SETTLEMENTS;
  });

  const [recurring, setRecurring] = useState<RecurringItem[]>(() => {
    const saved = localStorage.getItem('suraty_recurring');
    return saved ? JSON.parse(saved) : INITIAL_RECURRING;
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedClassification, setSelectedClassification] = useState('Any Classification');

  // Modals & Active selections
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isNewSharedOpen, setIsNewSharedOpen] = useState(false);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [isSettleUpOpen, setIsSettleUpOpen] = useState(false);
  const [settleTargetFriend, setSettleTargetFriend] = useState<Friend | null>(null);
  const [selectedFriendDetail, setSelectedFriendDetail] = useState<Friend | null>(null);

  // Budget ratios
  const [budgetPercentages, setBudgetPercentages] = useState({ need: 50, want: 30, dream: 20 });

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('suraty_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('suraty_friends', JSON.stringify(friends));
  }, [friends]);

  useEffect(() => {
    localStorage.setItem('suraty_group_expenses', JSON.stringify(groupExpenses));
  }, [groupExpenses]);

  useEffect(() => {
    localStorage.setItem('suraty_settlements', JSON.stringify(settlements));
  }, [settlements]);

  useEffect(() => {
    localStorage.setItem('suraty_recurring', JSON.stringify(recurring));
  }, [recurring]);

  const formatAmount = (amount: number, forceSign = false): string => {
    const symbol = CURRENCY_SYMBOLS[currency] || '$';
    const isNegative = amount < 0;
    const absVal = Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    if (forceSign) {
      if (amount > 0) return `+${symbol}${absVal}`;
      if (amount < 0) return `-${symbol}${absVal}`;
      return `${symbol}0.00`;
    }

    if (isNegative) {
      return `-${symbol}${absVal}`;
    }
    return `${symbol}${absVal}`;
  };

  const addTransaction = (tx: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...tx,
      id: `tx-${Date.now()}`,
    };
    setTransactions((prev) => [newTx, ...prev]);
    showToast(`Added expense "${tx.title}" (${formatAmount(tx.amount)})`);
  };

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    showToast('Transaction deleted');
  };

  const addFriend = (name: string, handle: string, initialBalance = 0) => {
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    const newFriend: Friend = {
      id: `f-${Date.now()}`,
      name,
      handle: handle.startsWith('@') ? handle : `@${handle}`,
      initials,
      netBalance: initialBalance,
      breakdown:
        initialBalance !== 0
          ? [
              {
                id: `bd-${Date.now()}`,
                title: 'Initial Balance',
                amount: initialBalance,
                date: 'Today',
              },
            ]
          : [],
    };
    setFriends((prev) => [newFriend, ...prev]);
    showToast(`Friend ${name} added successfully!`);
  };

  const addGroupExpense = (expense: Omit<GroupExpense, 'id'>) => {
    const newGroup: GroupExpense = {
      ...expense,
      id: `grp-${Date.now()}`,
    };
    setGroupExpenses((prev) => [newGroup, ...prev]);

    // Also add to transactions list as shared expense
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      title: expense.title,
      category: 'Dining Out',
      classification: 'Want',
      amount: expense.totalAmount,
      date: new Date().toISOString().split('T')[0],
      dateGroup: 'Today',
      notes: `Shared with ${expense.participants.length} people (${expense.splitType})`,
      isShared: true,
      sharedWith: expense.participants.map((p) => p.name),
    };
    setTransactions((prev) => [newTx, ...prev]);
    showToast(`Shared expense "${expense.title}" logged!`);
  };

  const addSettlement = (settlement: Omit<Settlement, 'id'>) => {
    const newSet: Settlement = {
      ...settlement,
      id: `set-${Date.now()}`,
    };
    setSettlements((prev) => [newSet, ...prev]);

    // Update friend balance if applicable
    if (settlement.personName) {
      setFriends((prev) =>
        prev.map((f) => {
          if (f.name.toLowerCase() === settlement.personName.toLowerCase()) {
            const adjustment = settlement.type === 'received' ? -settlement.amount : settlement.amount;
            return {
              ...f,
              netBalance: f.netBalance + adjustment,
              breakdown: [
                {
                  id: `bd-${Date.now()}`,
                  title: settlement.categoryNote || 'Settlement Payment',
                  amount: adjustment,
                  date: 'Today',
                },
                ...f.breakdown,
              ],
            };
          }
          return f;
        })
      );
    }
    showToast(`Settlement recorded with ${settlement.personName}`);
  };

  const addRecurring = (item: Omit<RecurringItem, 'id'>) => {
    const newRec: RecurringItem = {
      ...item,
      id: `rec-${Date.now()}`,
    };
    setRecurring((prev) => [...prev, newRec]);
    showToast(`Added recurring bill "${item.name}"`);
  };

  const toggleRecurringAutoPay = (id: string) => {
    setRecurring((prev) =>
      prev.map((r) => (r.id === id ? { ...r, autoPay: !r.autoPay } : r))
    );
  };

  const markAllNotifsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    showToast('All notifications marked as read');
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Metrics computation
  const totalBalance = INITIAL_USER.balance;

  const monthlySpending = transactions.reduce((acc, t) => acc + t.amount, 0);

  const needSpending = transactions
    .filter((t) => t.classification === 'Need')
    .reduce((acc, t) => acc + t.amount, 0);

  const wantSpending = transactions
    .filter((t) => t.classification === 'Want')
    .reduce((acc, t) => acc + t.amount, 0);

  const dreamSpending = transactions
    .filter((t) => t.classification === 'Dream')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalOwedToYou = friends
    .filter((f) => f.netBalance > 0)
    .reduce((acc, f) => acc + f.netBalance, 0);

  const totalYouOwe = friends
    .filter((f) => f.netBalance < 0)
    .reduce((acc, f) => acc + Math.abs(f.netBalance), 0);

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  return (
    <FinanceContext.Provider
      value={{
        activeTab,
        setActiveTab,
        currency,
        setCurrency,
        formatAmount,
        transactions,
        addTransaction,
        deleteTransaction,
        searchTerm,
        setSearchTerm,
        selectedCategory,
        setSelectedCategory,
        selectedClassification,
        setSelectedClassification,
        friends,
        addFriend,
        selectedFriendDetail,
        setSelectedFriendDetail,
        groupExpenses,
        addGroupExpense,
        settlements,
        addSettlement,
        recurring,
        addRecurring,
        toggleRecurringAutoPay,
        notifications,
        unreadNotifsCount,
        markAllNotifsAsRead,
        clearNotification,
        isAddExpenseOpen,
        setIsAddExpenseOpen,
        isNewSharedOpen,
        setIsNewSharedOpen,
        isAddFriendOpen,
        setIsAddFriendOpen,
        isSettleUpOpen,
        setIsSettleUpOpen,
        settleTargetFriend,
        setSettleTargetFriend,
        totalBalance,
        monthlySpending,
        totalOwedToYou,
        totalYouOwe,
        needSpending,
        wantSpending,
        dreamSpending,
        budgetPercentages,
        setBudgetPercentages,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
