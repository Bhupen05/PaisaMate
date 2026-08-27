"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatMinor } from "@/lib/money";
import { useAuthStore } from "@/store/authStore";
import { MoneyAmount } from "@/components/finance/MoneyAmount";
import { ClassificationBadge } from "@/components/finance/ClassificationBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonCard, SkeletonRow } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting(name: string) {
  const h = new Date().getHours();
  const time = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  return `Good ${time}, ${name.split(" ")[0]}`;
}

function balanceLabel(minor: number, currency: string) {
  if (minor === 0) return { text: "Settled", color: "var(--color-text-muted)" };
  if (minor > 0) return {
    text: `Owes you ${formatMinor(minor, currency)}`,
    color: "var(--color-success)",
  };
  return {
    text: `You owe ${formatMinor(Math.abs(minor), currency)}`,
    color: "var(--color-danger)",
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

const CATEGORIES = ["food","transport","health","entertainment","shopping","utilities","housing","education","personal","other"];
const CLASSIFICATIONS: Array<"NEED"|"WANT"|"DREAM"> = ["NEED","WANT","DREAM"];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [metrics, setMetrics] = useState<DashboardData | null>(null);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [balances, setBalances] = useState<FriendBalance[]>([]);
  const [recurring, setRecurring] = useState<RecurringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Add modal
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [qaTitle, setQaTitle] = useState("");
  const [qaAmount, setQaAmount] = useState("");
  const [qaClassification, setQaClassification] = useState<"NEED"|"WANT"|"DREAM">("NEED");
  const [qaCategory, setQaCategory] = useState("other");
  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);

  const currency = user?.currency ?? "INR";

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const [metricsRes, expensesRes, balancesRes, recurringRes] = await Promise.all([
        api.get("/analytics/dashboard"),
        api.get("/expenses?page=1&page_size=6"),
        api.get("/balances"),
        api.get("/recurring"),
      ]);
      setMetrics(metricsRes.data);
      setExpenses(expensesRes.data.items ?? []);
      setBalances(balancesRes.data ?? []);
      setRecurring((recurringRes.data ?? []).filter((r: RecurringItem) => r.is_active).slice(0, 4));
    } catch {
      setError("Unable to load dashboard data. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Net balance derived from live /balances data
  const owedToYou = balances.filter(b => b.net_balance_minor > 0).reduce((s, b) => s + b.net_balance_minor, 0);
  const youOwe    = balances.filter(b => b.net_balance_minor < 0).reduce((s, b) => s + Math.abs(b.net_balance_minor), 0);
  const netBalance = owedToYou - youOwe;

  // Recurring total this month
  const recurringTotal = recurring.reduce((s, r) => s + r.amount_minor, 0);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountMinor = Math.round(parseFloat(qaAmount) * 100);
    if (!qaTitle.trim() || isNaN(amountMinor) || amountMinor <= 0) {
      setQaError("Please enter a valid title and amount.");
      return;
    }
    setQaLoading(true);
    setQaError(null);
    try {
      await api.post("/expenses", {
        title: qaTitle.trim(),
        amount_minor: amountMinor,
        currency,
        expense_date: new Date().toISOString().slice(0, 10),
        category_id: qaCategory,
        classification: qaClassification,
        notes: "",
        tags: [],
      });
      setShowQuickAdd(false);
      setQaTitle(""); setQaAmount(""); setQaClassification("NEED"); setQaCategory("other");
      fetchAll();
    } catch {
      setQaError("Unable to save expense. Please try again.");
    } finally {
      setQaLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in">
      {/* ── Header ── */}
      <div className="page-header" style={{ marginBottom: "var(--space-4)" }}>
        <div>
          <h1 className="page-title">{user ? greeting(user.name) : "Dashboard"}</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginTop: 2 }}>
            Your financial snapshot
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowQuickAdd(true)}>
          + Add Expense
        </button>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* ── KPI Cards ── */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} lines={2} />)}
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "var(--space-4)",
          marginBottom: "var(--space-6)",
        }}>
          <KpiCard label="Spent Today" value={formatMinor(metrics?.today_total_minor ?? 0, currency)} color="var(--color-text)" />
          <KpiCard label="Spent This Month" value={formatMinor(metrics?.month_total_minor ?? 0, currency)} color="var(--color-text)" />
          <KpiCard
            label="Net Balance"
            value={formatMinor(Math.abs(netBalance), currency)}
            sub={netBalance > 0 ? "Owed to you" : netBalance < 0 ? "You owe" : "All settled"}
            color={netBalance > 0 ? "var(--color-success)" : netBalance < 0 ? "var(--color-danger)" : "var(--color-text-muted)"}
          />
          <KpiCard
            label="Owed to You"
            value={formatMinor(owedToYou, currency)}
            color={owedToYou > 0 ? "var(--color-success)" : "var(--color-text-muted)"}
          />
          <KpiCard
            label="You Owe"
            value={formatMinor(youOwe, currency)}
            color={youOwe > 0 ? "var(--color-danger)" : "var(--color-text-muted)"}
          />
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div style={{
        display: "flex",
        gap: "var(--space-3)",
        marginBottom: "var(--space-6)",
        flexWrap: "wrap",
      }}>
        <QuickAction label="Add Expense" icon="+" onClick={() => setShowQuickAdd(true)} />
        <Link href="/shared" style={{ textDecoration: "none" }}>
          <QuickAction label="Shared Expense" icon="⚖" onClick={() => {}} />
        </Link>
        <Link href="/settlements" style={{ textDecoration: "none" }}>
          <QuickAction label="Record Settlement" icon="✓" onClick={() => {}} />
        </Link>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "var(--space-6)",
      }} className="dashboard-grid">

        {/* ── Friend Balances ── */}
        <div className="card" style={{ padding: "var(--space-5)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
            <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700 }}>Friend Balances</h2>
            <Link href="/settlements" style={{ fontSize: "var(--text-xs)", color: "var(--color-accent)" }}>Settle up →</Link>
          </div>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
          ) : balances.filter(b => b.net_balance_minor !== 0).length === 0 ? (
            <EmptyState icon="🤝" title="All settled" description="No outstanding balances with friends." />
          ) : (
            balances.filter(b => b.net_balance_minor !== 0).slice(0, 6).map(b => {
              const bl = balanceLabel(b.net_balance_minor, currency);
              return (
                <div key={b.person_id} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  padding: "var(--space-3) 0",
                  borderBottom: "1px solid var(--color-border)",
                }}>
                  <Avatar name={b.person_name} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "var(--text-sm)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {b.person_name}
                    </div>
                    <div style={{ fontSize: "var(--text-xs)", color: bl.color, fontWeight: 500 }}>
                      {bl.text}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Recent Transactions ── */}
        <div className="card" style={{ padding: "var(--space-5)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
            <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700 }}>Recent Transactions</h2>
            <Link href="/transactions" style={{ fontSize: "var(--text-xs)", color: "var(--color-accent)" }}>View all →</Link>
          </div>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
          ) : expenses.length === 0 ? (
            <EmptyState icon="📭" title="No expenses yet" description="Add your first expense to start tracking." actionLabel="Add Expense" onAction={() => setShowQuickAdd(true)} />
          ) : (
            expenses.map(exp => (
              <div key={exp.id} style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                padding: "var(--space-3) 0",
                borderBottom: "1px solid var(--color-border)",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "var(--radius-md)",
                  background: "var(--color-surface-2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, flexShrink: 0,
                }}>
                  {categoryIcon(exp.category_id)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "var(--text-sm)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {exp.title}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginTop: 2 }}>
                    <ClassificationBadge value={exp.classification} />
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                      {exp.expense_date}
                    </span>
                  </div>
                </div>
                <MoneyAmount amountMinor={exp.amount_minor} currency={exp.currency} variant="negative" size="sm" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Spending Breakdown ── */}
      {!loading && metrics && (metrics.need_total_minor + metrics.want_total_minor + metrics.dream_total_minor) > 0 && (
        <div className="card" style={{ padding: "var(--space-5)", marginTop: "var(--space-6)" }}>
          <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-4)" }}>This Month's Breakdown</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {([["NEED", metrics.need_total_minor, "var(--color-need)"],
               ["WANT", metrics.want_total_minor, "var(--color-want)"],
               ["DREAM", metrics.dream_total_minor, "var(--color-dream)"]] as const).map(([label, val, color]) => {
              const total = metrics.need_total_minor + metrics.want_total_minor + metrics.dream_total_minor;
              const pct = total > 0 ? Math.round((val / total) * 100) : 0;
              return (
                <div key={label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-1)", fontSize: "var(--text-sm)" }}>
                    <span style={{ fontWeight: 600, color }}>{label.charAt(0) + label.slice(1).toLowerCase()}</span>
                    <span className="amount">{formatMinor(val, currency)} <span style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-body)", fontSize: "var(--text-xs)" }}>({pct}%)</span></span>
                  </div>
                  <div style={{ height: 6, borderRadius: "var(--radius-full)", background: "var(--color-surface-2)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "var(--radius-full)", transition: "width 0.6s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Upcoming Recurring ── */}
      {!loading && recurring.length > 0 && (
        <div className="card" style={{ padding: "var(--space-5)", marginTop: "var(--space-6)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
            <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700 }}>Upcoming Recurring</h2>
            <Link href="/recurring" style={{ fontSize: "var(--text-xs)", color: "var(--color-accent)" }}>Manage →</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "var(--space-3)" }}>
            {recurring.map(r => (
              <div key={r.id} style={{
                background: "var(--color-surface-2)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-3) var(--space-4)",
                display: "flex", flexDirection: "column", gap: "var(--space-1)",
              }}>
                <div style={{ fontWeight: 600, fontSize: "var(--text-sm)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</div>
                <div className="amount" style={{ fontSize: "var(--text-base)", color: "var(--color-accent)" }}>{formatMinor(r.amount_minor, r.currency)}</div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Day {r.billing_day} / month</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "var(--space-3)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
            Monthly commitment: <span className="amount">{formatMinor(recurringTotal, currency)}</span>
          </div>
        </div>
      )}

      {/* ── Quick Add Modal ── */}
      <Modal
        open={showQuickAdd}
        onClose={() => { setShowQuickAdd(false); setQaError(null); }}
        title="Add Expense"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowQuickAdd(false)}>Cancel</button>
            <button className="btn btn-primary" form="quick-add-form" type="submit" disabled={qaLoading}>
              {qaLoading ? "Saving…" : "Save Expense"}
            </button>
          </>
        }
      >
        {qaError && <ErrorBanner message={qaError} onDismiss={() => setQaError(null)} />}
        <form id="quick-add-form" onSubmit={handleQuickAdd} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Title</label>
            <input className="input" required value={qaTitle} onChange={e => setQaTitle(e.target.value)} placeholder="e.g. Groceries" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Amount ({currency})</label>
            <input className="input input-amount" required type="number" min="0.01" step="0.01" value={qaAmount} onChange={e => setQaAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Category</label>
              <select className="input" value={qaCategory} onChange={e => setQaCategory(e.target.value)} style={{ padding: "0 var(--space-3)" }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Classification</label>
              <select className="input" value={qaClassification} onChange={e => setQaClassification(e.target.value as "NEED"|"WANT"|"DREAM")} style={{ padding: "0 var(--space-3)" }}>
                {CLASSIFICATIONS.map(c => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
          </div>
        </form>
      </Modal>

      <style jsx global>{`
        @media (max-width: 768px) {
          .dashboard-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="card" style={{ padding: "var(--space-5)" }}>
      <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
      <div className="amount" style={{ fontSize: "var(--text-2xl)", fontWeight: 700, color, marginTop: "var(--space-2)" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function QuickAction({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="card"
      style={{
        display: "flex", alignItems: "center", gap: "var(--space-2)",
        padding: "var(--space-3) var(--space-4)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        background: "var(--color-surface)",
        color: "var(--color-text)",
        cursor: "pointer",
        fontSize: "var(--text-sm)",
        fontWeight: 600,
        transition: "all var(--transition-fast)",
        textDecoration: "none",
      }}
    >
      <span style={{ fontSize: 18, color: "var(--color-accent)" }}>{icon}</span>
      {label}
    </button>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: 36, height: 36, borderRadius: "50%",
      background: "var(--color-accent-light)",
      color: "var(--color-accent)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "var(--text-xs)", fontWeight: 700, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function categoryIcon(cat: string | null) {
  const map: Record<string, string> = {
    food: "🍔", transport: "🚗", health: "❤️", entertainment: "🎬",
    shopping: "🛍️", utilities: "⚡", housing: "🏠", education: "📚",
    personal: "👤", other: "📦",
  };
  return map[cat ?? "other"] ?? "📦";
}
