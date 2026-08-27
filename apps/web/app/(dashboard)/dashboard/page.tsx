"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatMinor } from "@/lib/money";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";

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
  description: string;
}

interface RecurringItem {
  id: string;
  title: string;
  amount_minor: number;
  currency: string;
  billing_day: number;
  active: boolean;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [metrics, setMetrics] = useState<DashboardData | null>(null);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [balances, setBalances] = useState<FriendBalance[]>([]);
  const [recurring, setRecurring] = useState<RecurringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Quick Add State
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [classification, setClassification] = useState<"NEED" | "WANT" | "DREAM">("NEED");
  const [category, setCategory] = useState("other");
  const [quickAddLoading, setQuickAddLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [metricsRes, expensesRes, balancesRes, recurringRes] = await Promise.all([
        api.get("/analytics/dashboard"),
        api.get("/expenses?page=1&page_size=5"),
        api.get("/balances"),
        api.get("/recurring"),
      ]);
      setMetrics(metricsRes.data);
      setExpenses(expensesRes.data.items);
      setBalances(balancesRes.data);
      setRecurring(recurringRes.data);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = parseFloat(amount.replace(/[^\d.]/g, ""));
    if (!title || isNaN(cleanAmount) || cleanAmount <= 0) return;

    setQuickAddLoading(true);
    try {
      await api.post("/expenses", {
        title,
        amount_minor: Math.round(cleanAmount * 100),
        currency: metrics?.currency || "INR",
        expense_date: new Date().toISOString().split("T")[0],
        category_id: category,
        classification,
        expense_type: "PERSONAL",
      });
      setTitle("");
      setAmount("");
      setShowQuickAdd(false);
      fetchData();
    } catch (err) {
      console.error("Failed to quick add expense", err);
    } finally {
      setQuickAddLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "100px 0" }}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "3px solid var(--color-border)",
          borderTopColor: "var(--color-accent)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
      </div>
    );
  }

  const userCurrency = metrics?.currency || user?.currency || "INR";

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ fontSize: "var(--text-3xl)", fontWeight: 800 }}>
            Hello, {user?.name}
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginTop: "4px" }}>
            Here is your financial summary for today.
          </p>
        </div>
        <button
          onClick={() => setShowQuickAdd(true)}
          className="btn btn-primary"
        >
          ➕ Quick Add
        </button>
      </div>

      {/* Main KPI Summary Widgets */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "var(--space-4)",
        marginBottom: "var(--space-6)",
      }}>
        {/* Month Spend Card */}
        <div className="card" style={{ padding: "var(--space-5)" }}>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>
            Monthly Spending
          </div>
          <div className="amount" style={{ fontSize: "var(--text-2xl)", fontWeight: 700, margin: "var(--space-2) 0", color: "var(--color-text)" }}>
            {formatMinor(metrics?.month_total_minor || 0, userCurrency)}
          </div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
            Today: {formatMinor(metrics?.today_total_minor || 0, userCurrency)}
          </div>
        </div>

        {/* You Owe Card */}
        <div className="card" style={{ padding: "var(--space-5)" }}>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>
            You Owe
          </div>
          <div className="amount amount-negative" style={{ fontSize: "var(--text-2xl)", fontWeight: 700, margin: "var(--space-2) 0" }}>
            {formatMinor(metrics?.you_owe_minor || 0, userCurrency)}
          </div>
          <Link href="/settlements" style={{ fontSize: "var(--text-xs)", fontWeight: 600 }}>
            Settle balances →
          </Link>
        </div>

        {/* Owed to You Card */}
        <div className="card" style={{ padding: "var(--space-5)" }}>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>
            Owed to You
          </div>
          <div className="amount amount-positive" style={{ fontSize: "var(--text-2xl)", fontWeight: 700, margin: "var(--space-2) 0" }}>
            {formatMinor(metrics?.owed_to_you_minor || 0, userCurrency)}
          </div>
          <Link href="/friends" style={{ fontSize: "var(--text-xs)", fontWeight: 600 }}>
            View friends →
          </Link>
        </div>
      </div>

      {/* Need / Want / Dream Classification Indicators */}
      <div className="card" style={{
        padding: "var(--space-5)",
        marginBottom: "var(--space-6)",
      }}>
        <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-4)", color: "var(--color-primary)" }}>
          Need vs Want vs Dream Breakdown
        </h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "var(--space-4)",
        }}>
          {/* Need */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-1)", fontSize: "var(--text-sm)" }}>
              <span className="badge badge-need">Need</span>
              <span className="amount">{formatMinor(metrics?.need_total_minor || 0, userCurrency)}</span>
            </div>
            <div style={{ height: "6px", backgroundColor: "var(--color-border)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                backgroundColor: "var(--color-need)",
                width: `${metrics?.month_total_minor ? ((metrics.need_total_minor / metrics.month_total_minor) * 100) : 0}%`,
              }} />
            </div>
          </div>
          {/* Want */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-1)", fontSize: "var(--text-sm)" }}>
              <span className="badge badge-want">Want</span>
              <span className="amount">{formatMinor(metrics?.want_total_minor || 0, userCurrency)}</span>
            </div>
            <div style={{ height: "6px", backgroundColor: "var(--color-border)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                backgroundColor: "var(--color-want)",
                width: `${metrics?.month_total_minor ? ((metrics.want_total_minor / metrics.month_total_minor) * 100) : 0}%`,
              }} />
            </div>
          </div>
          {/* Dream */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-1)", fontSize: "var(--text-sm)" }}>
              <span className="badge badge-dream">Dream</span>
              <span className="amount">{formatMinor(metrics?.dream_total_minor || 0, userCurrency)}</span>
            </div>
            <div style={{ height: "6px", backgroundColor: "var(--color-border)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                backgroundColor: "var(--color-dream)",
                width: `${metrics?.month_total_minor ? ((metrics.dream_total_minor / metrics.month_total_minor) * 100) : 0}%`,
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Transactions + Side Information Panel */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr",
        gap: "var(--space-6)",
      }} className="dashboard-grid">
        {/* Left Column: Recent Activity */}
        <div>
          <div className="card" style={{ padding: "var(--space-5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
              <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--color-primary)" }}>Recent Spending</h3>
              <Link href="/transactions" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
                View all
              </Link>
            </div>
            {expenses.length === 0 ? (
              <div style={{ padding: "var(--space-8) 0", textAlign: "center", color: "var(--color-text-muted)" }}>
                No expenses logged yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {expenses.map((item) => (
                  <div key={item.id} style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "var(--space-3)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--color-surface-2)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                      <span style={{ fontSize: "20px" }}>
                        {item.expense_type === "PERSONAL" ? "👤" : "👥"}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--color-text)" }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                          {item.expense_date} • <span style={{ textTransform: "capitalize" }}>{item.category_id || "other"}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                      <span className={`badge ${
                        item.classification === "NEED" ? "badge-need" : item.classification === "WANT" ? "badge-want" : "badge-dream"
                      }`}>
                        {item.classification}
                      </span>
                      <span className="amount" style={{ fontWeight: 600, color: "var(--color-text)" }}>
                        {formatMinor(item.amount_minor, item.currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Friend balances & Upcoming recurring bills */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          {/* Friend Balances Panel */}
          <div className="card" style={{ padding: "var(--space-5)" }}>
            <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-4)", color: "var(--color-primary)" }}>
              Friend Ledgers
            </h3>
            {balances.length === 0 ? (
              <div style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
                No active balances with friends.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {balances.slice(0, 4).map((f) => (
                  <div key={f.person_id} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "var(--text-sm)",
                  }}>
                    <span style={{ fontWeight: 500 }}>{f.person_name}</span>
                    <span className={`amount ${
                      f.net_balance_minor > 0 ? "amount-positive" : f.net_balance_minor < 0 ? "amount-negative" : "amount-zero"
                    }`}>
                      {f.net_balance_minor > 0 ? "+" : ""}
                      {formatMinor(f.net_balance_minor, f.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Bills panel */}
          <div className="card" style={{ padding: "var(--space-5)" }}>
            <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-4)", color: "var(--color-primary)" }}>
              Monthly Commitments
            </h3>
            {recurring.filter(r => r.active).length === 0 ? (
              <div style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
                No active recurring templates.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {recurring.filter(r => r.active).slice(0, 3).map((r) => (
                  <div key={r.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-sm)" }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{r.title}</div>
                      <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Day {r.billing_day} of month</div>
                    </div>
                    <span className="amount" style={{ alignSelf: "center" }}>
                      {formatMinor(r.amount_minor, r.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "var(--space-4)",
        }}>
          <div className="card animate-fade-in" style={{
            width: "100%",
            maxWidth: "400px",
            padding: "var(--space-6)",
            backgroundColor: "var(--color-surface)",
            borderRadius: "var(--radius-lg)",
          }}>
            <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 700, marginBottom: "var(--space-4)", color: "var(--color-primary)" }}>
              Quick Add Personal Expense
            </h3>
            <form onSubmit={handleQuickAdd}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lunch"
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Amount</label>
                <input
                  type="text"
                  required
                  placeholder="₹0.00"
                  className="input input-amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Classification</label>
                <select
                  className="input"
                  style={{ padding: "0 var(--space-3)" }}
                  value={classification}
                  onChange={(e) => setClassification(e.target.value as any)}
                >
                  <option value="NEED">Need</option>
                  <option value="WANT">Want</option>
                  <option value="DREAM">Dream</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: "var(--space-6)" }}>
                <label className="form-label">Category</label>
                <select
                  className="input"
                  style={{ padding: "0 var(--space-3)" }}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="food">Food</option>
                  <option value="transport">Transport</option>
                  <option value="shopping">Shopping</option>
                  <option value="bills">Bills</option>
                  <option value="housing">Housing</option>
                  <option value="health">Health</option>
                  <option value="education">Education</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="work">Work</option>
                  <option value="travel">Travel</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(false)}
                  className="btn btn-secondary"
                  disabled={quickAddLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={quickAddLoading}
                >
                  {quickAddLoading ? "Saving..." : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .dashboard-grid {
            grid-template-columns: 1fr !important;
            gap: var(--space-4) !important;
          }
        }
      `}</style>
    </div>
  );
}
