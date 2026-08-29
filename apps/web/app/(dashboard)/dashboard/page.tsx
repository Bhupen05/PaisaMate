"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatMinor } from "@/lib/money";
import { useAuthStore } from "@/store/authStore";
import { format, parseISO } from "date-fns";
import { MoneyAmount } from "@/components/finance/MoneyAmount";
import { ClassificationBadge } from "@/components/finance/ClassificationBadge";
import { getBalanceStatus } from "@/components/finance/BalanceIndicator";
import { ProgressBar } from "@/components/finance/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonCard, SkeletonRow } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { ListRow } from "@/components/ui/ListRow";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  Tooltip,
} from "recharts";
import {
  Plus,
  Handshake,
  Inbox,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  MoreHorizontal,
  PlusCircle,
  Repeat,
  ShoppingCart,
  Car,
  Heart,
  Clapperboard,
  ShoppingBag,
  Zap,
  Home,
  BookOpen,
  User,
  Package,
  type LucideIcon,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  food: ShoppingCart, transport: Car, health: Heart, entertainment: Clapperboard,
  shopping: ShoppingBag, utilities: Zap, housing: Home, education: BookOpen,
  personal: User, other: Package,
};

const CATEGORIES = ["food","transport","health","entertainment","shopping","utilities","housing","education","personal","other"];
const CLASSIFICATIONS: Array<"NEED"|"WANT"|"DREAM"> = ["NEED","WANT","DREAM"];

// ─── Types (mirrors server/app/models/analytics.py + shared_expense.py) ───────

interface DashboardData {
  today_total_minor: number;
  month_total_minor: number;
  need_total_minor: number;
  want_total_minor: number;
  dream_total_minor: number;
  you_owe_minor: number;
  owed_to_you_minor: number;
  currency: string;
}

interface MonthlyPoint {
  month: string; // "2026-08"
  total_minor: number;
  personal_minor: number;
  shared_minor: number;
}

interface AnalyticsSummaryData {
  monthly_trend: MonthlyPoint[];
}

interface ExpenseItem {
  id: string;
  title: string;
  amount_minor: number;
  currency: string;
  expense_date: string;
  category_id: string | null;
  classification: "NEED" | "WANT" | "DREAM";
  expense_type: "PERSONAL" | "SHARED";
}

interface FriendBalance {
  person_type: string;
  person_id: string;
  person_name: string;
  net_balance_minor: number;
  currency: string;
}

interface RecurringItem {
  id: string;
  title: string;
  amount_minor: number;
  currency: string;
  billing_day: number;
  is_active: boolean;
}

function greeting(name: string) {
  const h = new Date().getHours();
  const time = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  return `Good ${time}, ${name.split(" ")[0]}`;
}

function TrendTooltip({ active, payload, currency }: { active?: boolean; payload?: readonly any[]; currency: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--color-hero-bg)",
      color: "var(--color-hero-text)",
      padding: "6px 10px",
      borderRadius: "8px",
      fontSize: "12px",
      fontFamily: "var(--font-mono)",
      boxShadow: "var(--shadow-md)",
      whiteSpace: "nowrap",
    }}>
      {formatMinor(payload[0].value, currency)}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const currency = user?.currency ?? "INR";

  const dashboardQuery = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => (await api.get<DashboardData>("/analytics/dashboard")).data,
  });
  const expensesQuery = useQuery({
    queryKey: ["expenses", { scope: "dashboard-recent" }],
    queryFn: async () => (await api.get("/expenses?page=1&page_size=6")).data.items as ExpenseItem[] ?? [],
  });
  const balancesQuery = useQuery({
    queryKey: ["balances"],
    queryFn: async () => (await api.get<FriendBalance[]>("/balances")).data ?? [],
  });
  const recurringQuery = useQuery({
    queryKey: ["recurring"],
    queryFn: async () => (await api.get<RecurringItem[]>("/recurring")).data ?? [],
  });
  const analyticsQuery = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: async () => (await api.get<AnalyticsSummaryData>("/analytics/summary")).data,
  });

  const metrics = dashboardQuery.data;
  const expenses = expensesQuery.data ?? [];
  const balances = balancesQuery.data ?? [];
  const recurring = (recurringQuery.data ?? []).filter((r) => r.is_active).slice(0, 4);
  const trend = analyticsQuery.data?.monthly_trend ?? [];

  const loading = dashboardQuery.isPending || expensesQuery.isPending || balancesQuery.isPending || recurringQuery.isPending;
  const anyError = dashboardQuery.isError || expensesQuery.isError || balancesQuery.isError || recurringQuery.isError;

  // Quick Add modal
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [qaTitle, setQaTitle] = useState("");
  const [qaAmount, setQaAmount] = useState("");
  const [qaClassification, setQaClassification] = useState<"NEED"|"WANT"|"DREAM">("NEED");
  const [qaCategory, setQaCategory] = useState("other");
  const [qaError, setQaError] = useState<string | null>(null);

  const addExpense = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post("/expenses", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-summary"] });
      setShowQuickAdd(false);
      setQaTitle(""); setQaAmount(""); setQaClassification("NEED"); setQaCategory("other");
    },
    onError: () => setQaError("Unable to save expense. Please try again."),
  });

  // Net balance derived from live /balances data
  const owedToYou = balances.filter(b => b.net_balance_minor > 0).reduce((s, b) => s + b.net_balance_minor, 0);
  const youOwe    = balances.filter(b => b.net_balance_minor < 0).reduce((s, b) => s + Math.abs(b.net_balance_minor), 0);
  const netBalance = owedToYou - youOwe;
  const activeFriendCount = balances.filter(b => b.net_balance_minor !== 0).length;

  const recurringTotal = recurring.reduce((s, r) => s + r.amount_minor, 0);

  // Need/Want/Dream split for the monthly spending card
  const nwdTotal = (metrics?.need_total_minor ?? 0) + (metrics?.want_total_minor ?? 0) + (metrics?.dream_total_minor ?? 0);
  const needPct = nwdTotal > 0 ? Math.round(((metrics?.need_total_minor ?? 0) / nwdTotal) * 100) : 0;
  const wantPct = nwdTotal > 0 ? Math.round(((metrics?.want_total_minor ?? 0) / nwdTotal) * 100) : 0;
  const dreamPct = nwdTotal > 0 ? Math.max(0, 100 - needPct - wantPct) : 0;

  // Month-over-month spending change, from real trend data (last 6 months)
  const currentMonthPoint = trend[trend.length - 1];
  const prevMonthPoint = trend[trend.length - 2];
  const momChangePct = prevMonthPoint && prevMonthPoint.total_minor > 0 && currentMonthPoint
    ? Math.round(((currentMonthPoint.total_minor - prevMonthPoint.total_minor) / prevMonthPoint.total_minor) * 100)
    : null;

  const chartData = trend.map((p, i) => ({
    label: format(parseISO(`${p.month}-01`), "MMM"),
    total: p.total_minor,
    isCurrent: i === trend.length - 1,
  }));

  // Friends split into who-owes-you / you-owe, top 3 each
  const friendsWhoOweYou = [...balances].filter(b => b.net_balance_minor > 0)
    .sort((a, b) => b.net_balance_minor - a.net_balance_minor).slice(0, 3);
  const friendsYouOwe = [...balances].filter(b => b.net_balance_minor < 0)
    .sort((a, b) => a.net_balance_minor - b.net_balance_minor).slice(0, 3);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const amountMinor = Math.round(parseFloat(qaAmount) * 100);
    if (!qaTitle.trim() || isNaN(amountMinor) || amountMinor <= 0) {
      setQaError("Please enter a valid title and amount.");
      return;
    }
    setQaError(null);
    addExpense.mutate({
      title: qaTitle.trim(),
      amount_minor: amountMinor,
      currency,
      expense_date: new Date().toISOString().slice(0, 10),
      category_id: qaCategory,
      classification: qaClassification,
      notes: "",
      tags: [],
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <div>
          <h1 className="page-title">{user ? greeting(user.name) : "Dashboard"}</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginTop: 2 }}>
            Your financial snapshot
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowQuickAdd(true)}>
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {anyError && <ErrorBanner message="Unable to load some dashboard data. Please refresh." />}

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "24px" }}>
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} lines={2} />)}
        </div>
      ) : (
        <section className="dashboard-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "24px" }}>
          {/* Net Balance — hero card */}
          <div className="card stat-card-hero" style={{ padding: "24px", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "150px" }}>
            <div className="stat-card-decor" style={{ color: "var(--color-accent)", opacity: 0.25, width: "140px", height: "140px", top: "-40px", right: "-40px" }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "14px", color: "rgba(255,255,255,0.7)", fontWeight: 500, marginBottom: "6px" }}>
                <span>Net Balance</span>
                <Users size={16} />
              </div>
              <div className="amount" style={{ fontSize: "30px", fontWeight: 700, color: netBalance === 0 ? "#FFFFFF" : netBalance > 0 ? "var(--color-success)" : "var(--color-danger)", letterSpacing: "-0.02em" }}>
                {formatMinor(Math.abs(netBalance), currency)}
              </div>
            </div>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)", marginTop: "12px" }}>
              {netBalance > 0 ? "Owed to you" : netBalance < 0 ? "You owe" : "All settled"}
              {activeFriendCount > 0 ? ` · across ${activeFriendCount} friend${activeFriendCount === 1 ? "" : "s"}` : ""}
            </p>
          </div>

          {/* Monthly Spending + Need/Want/Dream bar */}
          <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "150px" }}>
            <div>
              <h2 style={{ fontSize: "14px", color: "var(--color-text-secondary)", fontWeight: 500, marginBottom: "6px" }}>Monthly Spending</h2>
              <div className="amount" style={{ fontSize: "28px", fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.02em" }}>
                {formatMinor(metrics?.month_total_minor ?? 0, currency)}
              </div>
              {momChangePct !== null && (
                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px", fontSize: "12px", fontWeight: 600, color: momChangePct <= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
                  {momChangePct <= 0 ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
                  <span className="amount">{momChangePct > 0 ? "+" : ""}{momChangePct}% vs last month</span>
                </div>
              )}
            </div>
            <div style={{ marginTop: "12px" }}>
              <div style={{ height: "8px", width: "100%", background: "var(--color-surface-2)", borderRadius: "999px", overflow: "hidden", display: "flex" }}>
                <div style={{ width: `${needPct}%`, background: "var(--color-need)" }} title={`Need: ${needPct}%`} />
                <div style={{ width: `${wantPct}%`, background: "var(--color-want)" }} title={`Want: ${wantPct}%`} />
                <div style={{ width: `${dreamPct}%`, background: "var(--color-dream)" }} title={`Dream: ${dreamPct}%`} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 600, marginTop: "8px" }}>
                <span style={{ color: "var(--color-need)", display: "flex", alignItems: "center", gap: "4px" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-need)" }} /> Need</span>
                <span style={{ color: "var(--color-want)", display: "flex", alignItems: "center", gap: "4px" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-want)" }} /> Want</span>
                <span style={{ color: "var(--color-dream)", display: "flex", alignItems: "center", gap: "4px" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-dream)" }} /> Dream</span>
              </div>
            </div>
          </div>

          {/* Recurring commitment */}
          <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "150px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "14px", color: "var(--color-text-secondary)", fontWeight: 500, marginBottom: "6px" }}>
                <span>Recurring This Month</span>
                <Repeat size={16} style={{ color: "var(--color-text-muted)" }} />
              </div>
              <div className="amount" style={{ fontSize: "28px", fontWeight: 700, color: "var(--color-accent)", letterSpacing: "-0.02em" }}>
                {formatMinor(recurringTotal, currency)}
              </div>
            </div>
            <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginTop: "12px" }}>
              {recurring.length > 0 ? `${recurring.length} active subscription${recurring.length === 1 ? "" : "s"}` : "No active recurring expenses"}
            </p>
          </div>
        </section>
      )}

      <section className="dashboard-bento-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Spending Trend */}
          <div className="card" style={{ padding: "24px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.01em", marginBottom: "16px" }}>
              Spending Trend
            </h2>
            {loading ? (
              <SkeletonCard lines={3} />
            ) : chartData.length === 0 ? (
              <EmptyState title="No spending yet" description="Add an expense to see your trend over time." />
            ) : (
              <div style={{ height: "220px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--color-surface-2)" }}
                      content={(props) => <TrendTooltip {...props} currency={currency} />}
                    />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={40}>
                      {chartData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.isCurrent ? "var(--color-accent)" : "var(--color-surface-2)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.01em" }}>Recent Activity</h2>
              <Link href="/transactions" style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-accent)", display: "flex", alignItems: "center", gap: "4px" }}>
                View All <ArrowRight size={13} />
              </Link>
            </div>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
            ) : expenses.length === 0 ? (
              <EmptyState icon={<Inbox size={40} />} title="No expenses yet" description="Add your first expense to start tracking." actionLabel="Add Expense" onAction={() => setShowQuickAdd(true)} />
            ) : (
              expenses.map(exp => {
                const CategoryIcon = CATEGORY_ICONS[exp.category_id ?? "other"] ?? Package;
                return (
                  <ListRow
                    key={exp.id}
                    leading={<div className="list-row-icon"><CategoryIcon size={16} /></div>}
                    title={exp.title}
                    subtitle={
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <ClassificationBadge value={exp.classification} />
                        <span>{exp.expense_date}</span>
                      </span>
                    }
                    trailing={<MoneyAmount amountMinor={exp.amount_minor} currency={exp.currency} variant="negative" size="sm" />}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Friends Summary */}
          <div className="card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.01em" }}>Friends Summary</h2>
              <Link href="/friends" style={{ color: "var(--color-text-muted)", display: "flex" }} title="View all friends">
                <MoreHorizontal size={18} />
              </Link>
            </div>

            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
            ) : friendsWhoOweYou.length === 0 && friendsYouOwe.length === 0 ? (
              <EmptyState icon={<Handshake size={36} />} title="All settled" description="No outstanding balances with friends." />
            ) : (
              <>
                {friendsWhoOweYou.length > 0 && (
                  <div style={{ marginBottom: "16px" }}>
                    <h3 style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Owes You</h3>
                    {friendsWhoOweYou.map((f) => (
                      <ListRow
                        key={f.person_id}
                        leading={<Avatar name={f.person_name} size={32} />}
                        title={f.person_name}
                        trailing={<span className="amount" style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-success)" }}>+{formatMinor(f.net_balance_minor, currency)}</span>}
                      />
                    ))}
                  </div>
                )}
                {friendsYouOwe.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>You Owe</h3>
                    {friendsYouOwe.map((f) => (
                      <ListRow
                        key={f.person_id}
                        leading={<Avatar name={f.person_name} size={32} />}
                        title={f.person_name}
                        trailing={<span className="amount" style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-danger)" }}>-{formatMinor(Math.abs(f.net_balance_minor), currency)}</span>}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            <Link href="/settlements" className="btn btn-secondary" style={{ width: "100%", marginTop: "20px", textDecoration: "none" }}>
              Settle Up
            </Link>
          </div>

          {/* Quick New Expense promo */}
          <div
            onClick={() => setShowQuickAdd(true)}
            className="card"
            style={{
              position: "relative",
              overflow: "hidden",
              padding: "24px",
              cursor: "pointer",
              background: "linear-gradient(135deg, var(--color-surface), var(--color-bg-secondary))",
            }}
          >
            <PlusCircle size={64} style={{ position: "absolute", top: "12px", right: "12px", color: "var(--color-accent)", opacity: 0.12 }} />
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.01em", marginBottom: "4px" }}>New Expense</h3>
            <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginBottom: "20px", maxWidth: "220px" }}>
              Quickly log a new transaction or split costs with friends.
            </p>
            <span className="btn btn-primary" style={{ display: "inline-flex" }}>
              <Plus size={16} /> Log Expense
            </span>
          </div>
        </div>
      </section>

      {/* Quick Add Modal */}
      <Modal
        open={showQuickAdd}
        onClose={() => { setShowQuickAdd(false); setQaError(null); }}
        title="Add Expense"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowQuickAdd(false)}>Cancel</button>
            <button className="btn btn-primary" form="quick-add-form" type="submit" disabled={addExpense.isPending}>
              {addExpense.isPending ? "Saving…" : "Save Expense"}
            </button>
          </>
        }
      >
        {qaError && <ErrorBanner message={qaError} onDismiss={() => setQaError(null)} />}
        <form id="quick-add-form" onSubmit={handleQuickAdd} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Title</label>
            <input className={`input ${qaError && !qaTitle.trim() ? "error" : ""}`} required value={qaTitle} onChange={e => setQaTitle(e.target.value)} placeholder="e.g. Groceries" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Amount ({currency})</label>
            <input className={`input input-amount ${qaError && !(qaAmount && Math.round(parseFloat(qaAmount) * 100) > 0) ? "error" : ""}`} required type="number" min="0.01" step="0.01" value={qaAmount} onChange={e => setQaAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Category</label>
              <select className="input" value={qaCategory} onChange={e => setQaCategory(e.target.value)} style={{ padding: "0 12px" }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Classification</label>
              <select className="input" value={qaClassification} onChange={e => setQaClassification(e.target.value as "NEED"|"WANT"|"DREAM")} style={{ padding: "0 12px" }}>
                {CLASSIFICATIONS.map(c => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
          </div>
        </form>
      </Modal>

      <style jsx global>{`
        @media (max-width: 1024px) {
          .dashboard-bento-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          .dashboard-kpi-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
