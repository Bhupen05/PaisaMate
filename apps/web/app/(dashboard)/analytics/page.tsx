"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatMinor } from "@/lib/money";
import { useAuthStore } from "@/store/authStore";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, PieChart, Pie, Cell,
} from "recharts";

interface MonthlyPoint { month: string; total_minor: number; personal_minor: number; shared_minor: number; }
interface CategoryBreakdown { category_id: string; total_minor: number; count: number; }
interface ClassificationBreakdown { classification: string; total_minor: number; count: number; }
interface AnalyticsData {
  total_spending_minor: number;
  average_daily_minor: number;
  monthly_trend: MonthlyPoint[];
  category_breakdown: CategoryBreakdown[];
  classification_breakdown: ClassificationBreakdown[];
  currency: string;
}

const CHART_COLORS = ["#6C63FF","#3B82F6","#10B981","#F59E0B","#EF4444","#EC4899","#8B5CF6","#06B6D4","#14B8A6","#F97316"];

function tooltipFmt(value: unknown, currency: string): [string, string] {
  return [typeof value === "number" ? formatMinor(value, currency) : String(value ?? ""), ""];
}

export default function AnalyticsPage() {
  const { user } = useAuthStore();
  const currency = user?.currency ?? "INR";

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get("/analytics/summary")
      .then(r => setData(r.data))
      .catch(() => setError("Unable to load analytics. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  const cur = data?.currency ?? currency;

  // Derived insight
  const topCategory = data?.category_breakdown[0];
  const totalClass = data?.classification_breakdown.reduce((s, c) => s + c.total_minor, 0) ?? 0;
  const wantEntry = data?.classification_breakdown.find(c => c.classification === "WANT");
  const wantPct = totalClass > 0 && wantEntry ? Math.round((wantEntry.total_minor / totalClass) * 100) : null;

  const pieData = (data?.classification_breakdown ?? []).map(c => ({ name: c.classification, value: c.total_minor }));
  const categoryData = (data?.category_breakdown ?? [])
    .map(c => ({ category: c.category_id.charAt(0).toUpperCase() + c.category_id.slice(1), amount: c.total_minor }))
    .sort((a, b) => b.amount - a.amount);
  const trendData = (data?.monthly_trend ?? []).map(t => ({ month: t.month, Personal: t.personal_minor, Shared: t.shared_minor }));

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginTop: 2 }}>
            Understand where your money is going
          </p>
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {loading ? <LoadingSpinner centered /> : !data ? null : (
        <>
          {/* KPI Overview */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
            <div className="card" style={{ padding: "var(--space-5)" }}>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Tracked</div>
              <div className="amount" style={{ fontSize: "var(--text-2xl)", fontWeight: 700, marginTop: "var(--space-2)" }}>{formatMinor(data.total_spending_minor, cur)}</div>
            </div>
            <div className="card" style={{ padding: "var(--space-5)" }}>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Avg per Transaction</div>
              <div className="amount" style={{ fontSize: "var(--text-2xl)", fontWeight: 700, marginTop: "var(--space-2)" }}>{formatMinor(data.average_daily_minor, cur)}</div>
            </div>
          </div>

          {/* Insight cards */}
          {(topCategory || wantPct !== null) && (
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", marginBottom: "var(--space-6)" }}>
              {topCategory && (
                <div style={{
                  flex: "1 1 220px", padding: "var(--space-4) var(--space-5)",
                  background: "var(--color-accent-light)", borderRadius: "var(--radius-md)",
                  borderLeft: "3px solid var(--color-accent)", fontSize: "var(--text-sm)", color: "var(--color-text)",
                }}>
                  💡 <strong style={{ textTransform: "capitalize" }}>{topCategory.category_id}</strong> is your largest spending category.
                </div>
              )}
              {wantPct !== null && (
                <div style={{
                  flex: "1 1 220px", padding: "var(--space-4) var(--space-5)",
                  background: "var(--color-want-bg)", borderRadius: "var(--radius-md)",
                  borderLeft: "3px solid var(--color-want)", fontSize: "var(--text-sm)", color: "var(--color-text)",
                }}>
                  💡 Wants represent <strong>{wantPct}%</strong> of your total spending.
                </div>
              )}
            </div>
          )}

          {/* Monthly trend */}
          <div className="card" style={{ padding: "var(--space-5)", marginBottom: "var(--space-6)" }}>
            <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-1)" }}>Spending Trend</h2>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>Last 6 months · Personal vs Shared</p>
            {trendData.every(t => t.Personal === 0 && t.Shared === 0) ? (
              <EmptyState icon="📈" title="No trend data yet" description="Start tracking expenses to see your monthly trends." />
            ) : (
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="month" tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }} />
                    <YAxis tickFormatter={v => `${Math.round(v / 100)}`} tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }} />
                    <Tooltip formatter={(v: unknown) => tooltipFmt(v, cur)} contentStyle={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Personal" stackId="a" fill="#3B82F6" />
                    <Bar dataKey="Shared" stackId="a" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-6)", marginBottom: "var(--space-6)" }} className="analytics-lower">

            {/* Category breakdown */}
            <div className="card" style={{ padding: "var(--space-5)" }}>
              <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-1)" }}>By Category</h2>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>All time · highest first</p>
              {categoryData.length === 0 ? (
                <EmptyState icon="🏷️" title="No category data" description="Categorise your expenses to see this breakdown." />
              ) : (
                <div style={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis type="number" tickFormatter={v => `${Math.round(v / 100)}`} tick={{ fill: "var(--color-text-secondary)", fontSize: 10 }} />
                      <YAxis dataKey="category" type="category" width={90} tick={{ fill: "var(--color-text-secondary)", fontSize: 10 }} />
                      <Tooltip formatter={(v: unknown) => tooltipFmt(v, cur)} contentStyle={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
                      <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                        {categoryData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Need / Want / Dream */}
            <div className="card" style={{ padding: "var(--space-5)" }}>
              <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-1)" }}>Need / Want / Dream</h2>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>All time · spending classification</p>
              {pieData.length === 0 ? (
                <EmptyState icon="🥧" title="No classification data" description="Classify your expenses as Need, Want, or Dream." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-4)" }}>
                  <div style={{ width: 200, height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.name === "NEED" ? "var(--color-need)" : entry.name === "WANT" ? "var(--color-want)" : "var(--color-dream)"} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: unknown) => tooltipFmt(v, cur)} contentStyle={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text)" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", width: "100%" }}>
                    {pieData.map(p => {
                      const color = p.name === "NEED" ? "var(--color-need)" : p.name === "WANT" ? "var(--color-want)" : "var(--color-dream)";
                      const bg = p.name === "NEED" ? "var(--color-need-bg)" : p.name === "WANT" ? "var(--color-want-bg)" : "var(--color-dream-bg)";
                      const pct = totalClass > 0 ? Math.round((p.value / totalClass) * 100) : 0;
                      return (
                        <div key={p.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                            <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
                            <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color }}>{p.name.charAt(0) + p.name.slice(1).toLowerCase()}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", background: bg, padding: "1px 6px", borderRadius: "var(--radius-full)" }}>{pct}%</span>
                            <span className="amount" style={{ fontSize: "var(--text-sm)" }}>{formatMinor(p.value, cur)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        @media (max-width: 768px) {
          .analytics-lower { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
