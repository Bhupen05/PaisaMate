"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatMinor } from "@/lib/money";
import { useAuthStore } from "@/store/authStore";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/finance/StatCard";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, PieChart, Pie, Cell,
} from "recharts";
import {
  TrendingUp,
  AlertTriangle,
  Tag,
  PieChart as PieChartIcon,
} from "lucide-react";

interface MonthlyPoint { month: string; total_minor: number; personal_minor: number; shared_minor: number; }
interface CategoryBreakdown { category_id: string; total_minor: number; count: number; }
interface ClassificationBreakdown { classification: string; total_minor: number; count: number; }
interface AnalyticsData {
  total_spending_minor: number;
  average_per_transaction_minor: number;
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

  const analyticsQuery = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: async () => (await api.get<AnalyticsData>("/analytics/summary")).data,
  });
  const data = analyticsQuery.data ?? null;
  const loading = analyticsQuery.isPending;

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

      {analyticsQuery.isError && <ErrorBanner message="Unable to load analytics. Please try again." />}

      {loading ? <LoadingSpinner centered /> : !data ? null : (
        <>
          {/* KPI Overview */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
            <StatCard label="Total Tracked" value={formatMinor(data.total_spending_minor, cur)} decorColor="var(--color-text)" />
            <StatCard label="Avg per Transaction" value={formatMinor(data.average_per_transaction_minor, cur)} decorColor="var(--color-text)" />
          </div>

          {/* Insight cards */}
          {(topCategory || wantPct !== null) && (
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", marginBottom: "var(--space-6)" }}>
              {topCategory && (
                <div style={{
                  flex: "1 1 220px", padding: "var(--space-4) var(--space-5)",
                  background: "var(--color-accent-light)", borderRadius: "var(--radius-md)",
                  borderLeft: "3px solid var(--color-accent)", fontSize: "var(--text-sm)", color: "var(--color-text)",
                  display: "flex", alignItems: "flex-start", gap: "var(--space-2)",
                }}>
                  <TrendingUp size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span><strong style={{ textTransform: "capitalize" }}>{topCategory.category_id}</strong> is your largest spending category.</span>
                </div>
              )}
              {wantPct !== null && (
                <div style={{
                  flex: "1 1 220px", padding: "var(--space-4) var(--space-5)",
                  background: "var(--color-want-bg)", borderRadius: "var(--radius-md)",
                  borderLeft: "3px solid var(--color-want)", fontSize: "var(--text-sm)", color: "var(--color-text)",
                  display: "flex", alignItems: "flex-start", gap: "var(--space-2)",
                }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>Wants represent <strong>{wantPct}%</strong> of your total spending.</span>
                </div>
              )}
            </div>
          )}

          {/* Monthly trend */}
          <div className="card" style={{ padding: "var(--space-5)", marginBottom: "var(--space-6)" }}>
            <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-1)" }}>Spending Trend</h2>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>Last 6 months · Personal vs Shared</p>
            {trendData.every(t => t.Personal === 0 && t.Shared === 0) ? (
              <EmptyState icon={<TrendingUp size={40} />} title="No trend data yet" description="Start tracking expenses to see your monthly trends." />
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
                <EmptyState icon={<Tag size={40} />} title="No category data" description="Categorise your expenses to see this breakdown." />
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
                <EmptyState icon={<PieChartIcon size={40} />} title="No classification data" description="Classify your expenses as Need, Want, or Dream." />
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
