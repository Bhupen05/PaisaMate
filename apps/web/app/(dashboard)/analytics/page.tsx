"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatMinor } from "@/lib/money";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface MonthlyPoint {
  month: string;
  total_minor: number;
  personal_minor: number;
  shared_minor: number;
}

interface CategoryBreakdown {
  category_id: string;
  total_minor: number;
  count: number;
}

interface ClassificationBreakdown {
  classification: string;
  total_minor: number;
  count: number;
}

interface AnalyticsData {
  total_spending_minor: number;
  average_daily_minor: number;
  monthly_trend: MonthlyPoint[];
  category_breakdown: CategoryBreakdown[];
  classification_breakdown: ClassificationBreakdown[];
  currency: string;
}

const CLASSIFICATION_COLORS = {
  NEED: "var(--color-need)",
  WANT: "var(--color-want)",
  DREAM: "var(--color-dream)",
};

const CHART_COLORS = [
  "#6C63FF",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#8B5CF6",
  "#06B6D4",
  "#14B8A6",
  "#F97316",
];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get("/analytics/summary");
        setData(res.data);
      } catch (err) {
        console.error("Failed to load analytics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

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

  if (!data) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        Failed to load analytics dashboard.
      </div>
    );
  }

  const currency = data.currency;

  // Format Recharts tooltip values — accepts ValueType (unknown) to satisfy recharts Formatter generic
  const tooltipFormatter = (value: unknown): [string, string] => [
    typeof value === "number" ? formatMinor(value, currency) : String(value ?? ""),
    "",
  ];

  // Map classification breakdown for Pie Chart
  const pieData = data.classification_breakdown.map((c) => ({
    name: c.classification,
    value: c.total_minor,
  }));

  // Map category breakdown for Bar Chart
  const categoryData = data.category_breakdown.map((c) => ({
    category: c.category_id.charAt(0).toUpperCase() + c.category_id.slice(1),
    amount: c.total_minor,
  })).sort((a, b) => b.amount - a.amount);

  // Map trend breakdown for stacked trend comparison
  const trendData = data.monthly_trend.map((t) => ({
    month: t.month,
    Personal: t.personal_minor,
    Shared: t.shared_minor,
    Total: t.total_minor,
  }));

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Visual Analytics</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginTop: "4px" }}>
            Analyze your spending distribution and compare monthly trends.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "var(--space-4)",
        marginBottom: "var(--space-6)",
      }}>
        <div className="card" style={{ padding: "var(--space-5)" }}>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>
            Total Tracked Spending
          </div>
          <div className="amount" style={{ fontSize: "var(--text-2xl)", fontWeight: 700, marginTop: "var(--space-2)" }}>
            {formatMinor(data.total_spending_minor, currency)}
          </div>
        </div>

        <div className="card" style={{ padding: "var(--space-5)" }}>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>
            Average Daily Spend
          </div>
          <div className="amount" style={{ fontSize: "var(--text-2xl)", fontWeight: 700, marginTop: "var(--space-2)" }}>
            {formatMinor(data.average_daily_minor, currency)}
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "var(--space-6)",
        marginBottom: "var(--space-6)",
      }} className="analytics-grid">
        {/* Trend Stacked Bar Chart */}
        <div className="card" style={{ padding: "var(--space-5)" }}>
          <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-4)", color: "var(--color-primary)" }}>
            Monthly Spending Trends
          </h3>
          <div style={{ width: "100%", height: 300 }}>
            {trendData.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
                No trend data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }} />
                  <YAxis
                    tickFormatter={(val) => `${(val / 100).toFixed(0)}`}
                    tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={tooltipFormatter}
                    contentStyle={{
                      backgroundColor: "var(--color-surface)",
                      borderColor: "var(--color-border)",
                      color: "var(--color-text)",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Personal" stackId="a" fill="#3B82F6" />
                  <Bar dataKey="Shared" stackId="a" fill="#6C63FF" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Classification Pie Chart */}
        <div className="card" style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column" }}>
          <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-4)", color: "var(--color-primary)" }}>
            Need vs Want vs Dream
          </h3>
          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", minHeight: 300 }} className="pie-container">
            {pieData.length === 0 ? (
              <div style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
                No classification breakdown available.
              </div>
            ) : (
              <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "space-around" }} className="pie-layout">
                <div style={{ width: 200, height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.name === "NEED"
                                ? CLASSIFICATION_COLORS.NEED
                                : entry.name === "WANT"
                                ? CLASSIFICATION_COLORS.WANT
                                : CLASSIFICATION_COLORS.DREAM
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={tooltipFormatter}
                        contentStyle={{
                          backgroundColor: "var(--color-surface)",
                          borderColor: "var(--color-border)",
                          color: "var(--color-text)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom Legend */}
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {pieData.map((p) => {
                    const color = p.name === "NEED"
                      ? CLASSIFICATION_COLORS.NEED
                      : p.name === "WANT"
                      ? CLASSIFICATION_COLORS.WANT
                      : CLASSIFICATION_COLORS.DREAM;
                    return (
                      <div key={p.name} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)" }}>
                        <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: color }} />
                        <span style={{ fontWeight: 600 }}>{p.name}:</span>
                        <span className="amount">{formatMinor(p.value, currency)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Breakdown Bar Chart */}
      <div className="card" style={{ padding: "var(--space-5)", marginBottom: "var(--space-6)" }}>
        <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-4)", color: "var(--color-primary)" }}>
          Spending by Category
        </h3>
        <div style={{ width: "100%", height: 320 }}>
          {categoryData.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
              No category data logged yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  type="number"
                  tickFormatter={(val) => `${(val / 100).toFixed(0)}`}
                  tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
                />
                <YAxis dataKey="category" type="category" tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }} width={90} />
                <Tooltip
                  formatter={tooltipFormatter}
                  contentStyle={{
                    backgroundColor: "var(--color-surface)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text)",
                  }}
                />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          .analytics-grid {
            grid-template-columns: 1fr !important;
            gap: var(--space-4) !important;
          }
          .pie-layout {
            flex-direction: column !important;
            gap: var(--space-4) !important;
          }
        }
      `}</style>
    </div>
  );
}
