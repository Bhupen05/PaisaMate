export type PriorityClassification = 'Need' | 'Want' | 'Dream';

export type ExpenseCategory =
  | 'Groceries'
  | 'Transport'
  | 'Travel'
  | 'Dining Out'
  | 'Housing'
  | 'Entertainment'
  | 'Utilities'
  | 'Health'
  | 'Shopping'
  | 'Other';

export type NavigationTab =
  | 'dashboard'
  | 'transactions'
  | 'friends'
  | 'shared'
  | 'settlements'
  | 'recurring'
  | 'analytics'
  | 'settings';

export interface Transaction {
  id: string;
  title: string;
  category: ExpenseCategory;
  classification: PriorityClassification;
  amount: number;
  date: string; // YYYY-MM-DD or formatted
  dateGroup: string; // "Today, Oct 24", "Yesterday, Oct 23", etc.
  notes?: string;
  iconName?: string;
  isShared?: boolean;
  sharedWith?: string[];
}

export interface FriendBalanceDetail {
  id: string;
  title: string;
  amount: number; // positive = they owe you, negative = you owe them
  date: string;
}

export interface Friend {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  initials?: string;
  netBalance: number; // positive = owes you, negative = you owe them, 0 = settled
  breakdown: FriendBalanceDetail[];
}

export interface GroupParticipant {
  userId: string;
  name: string;
  initials: string;
  avatarUrl?: string;
  shareAmount: number;
  isCurrentUser: boolean;
  status: 'paid' | 'owes_you' | 'you_owe' | 'settled';
}

export interface GroupExpense {
  id: string;
  title: string;
  totalAmount: number;
  splitType: 'EQUAL SPLIT' | 'CUSTOM' | 'PERCENTAGE';
  createdAt: string;
  paidBy: string; // 'You' or friend's name
  iconType: 'flight' | 'restaurant' | 'hotel' | 'receipt' | 'shopping_bag';
  participants: GroupParticipant[];
}

export interface Settlement {
  id: string;
  title: string;
  type: 'received' | 'paid' | 'group_settled';
  amount: number;
  date: string;
  dateLabel: string;
  personName: string;
  personAvatar?: string;
  personInitials?: string;
  categoryNote: string;
  iconType: 'restaurant' | 'flight' | 'home' | 'coffee' | 'group' | 'receipt';
  quote?: string;
}

export interface RecurringItem {
  id: string;
  name: string;
  category: ExpenseCategory;
  classification: PriorityClassification;
  amount: number;
  frequency: 'Monthly' | 'Yearly' | 'Weekly';
  nextBillingDate: string;
  autoPay: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timeAgo: string;
  read: boolean;
  type: 'settlement' | 'reminder' | 'budget';
}
