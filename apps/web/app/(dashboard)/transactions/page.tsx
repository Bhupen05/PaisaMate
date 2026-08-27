"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { formatMinor } from "@/lib/money";
import { useAuthStore } from "@/store/authStore";
import { ClassificationBadge } from "@/components/finance/ClassificationBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";

const CATEGORIES = ["food","transport","health","entertainment","shopping","utilities","housing","education","personal","other"];
const CLASSIFICATIONS: Array<"NEED"|"WANT"|"DREAM"> = ["NEED","WANT","DREAM"];

const CATEGORY_ICONS: Record<string, string> = {
  food: "🍔", transport: "🚗", health: "❤️", entertainment: "🎬",
  shopping: "🛍️", utilities: "⚡", housing: "🏠", education: "📚",
  personal: "👤", other: "📦",
};

interface Expense {
  id: string;
  title: string;
  amount_minor: number;
  currency: string;
  expense_date: string;
  category_id: string | null;
  classification: "NEED" | "WANT" | "DREAM";
  notes?: string;
  tags?: string[];
}

const EMPTY_FORM = {
  title: "",
  amount: "",
  currency: "INR",
  expense_date: new Date().toISOString().slice(0, 10),
  category_id: "other",
  classification: "NEED" as "NEED"|"WANT"|"DREAM",
  notes: "",
};

export default function TransactionsPage() {
  const { user } = useAuthStore();
  const currency = user?.currency ?? "INR";

  const [items, setItems] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterClass, setFilterClass] = useState("");

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const PAGE_SIZE = 10;

  const fetchItems = useCallback(async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), page_size: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      if (filterCategory) params.set("category", filterCategory);
      if (filterClass) params.set("classification", filterClass);
      const res = await api.get(`/expenses?${params}`);
      setItems(res.data.items ?? []);
      setTotal(res.data.total ?? 0);
      setTotalPages(Math.max(1, Math.ceil((res.data.total ?? 0) / PAGE_SIZE)));
    } catch {
      setError("Unable to load transactions. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterCategory, filterClass]);

  useEffect(() => { fetchItems(1); setPage(1); }, [search, filterCategory, filterClass]);
  useEffect(() => { fetchItems(page); }, [page]);

  const openAdd = () => { setForm({ ...EMPTY_FORM, currency }); setFormError(null); setShowAdd(true); };
  const openEdit = (exp: Expense) => {
    setEditTarget(exp);
    setForm({
      title: exp.title,
      amount: String(exp.amount_minor / 100),
      currency: exp.currency,
      expense_date: exp.expense_date,
      category_id: exp.category_id ?? "other",
      classification: exp.classification,
      notes: exp.notes ?? "",
    });
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountMinor = Math.round(parseFloat(form.amount) * 100);
    if (!form.title.trim() || isNaN(amountMinor) || amountMinor <= 0) {
      setFormError("Please enter a valid title and amount greater than 0.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    const payload = {
      title: form.title.trim(),
      amount_minor: amountMinor,
      currency: form.currency,
      expense_date: form.expense_date,
      category_id: form.category_id,
      classification: form.classification,
      notes: form.notes,
      tags: [],
    };
    try {
      if (editTarget) {
        await api.put(`/expenses/${editTarget.id}`, payload);
        setEditTarget(null);
      } else {
        await api.post("/expenses", payload);
        setShowAdd(false);
      }
      fetchItems(page);
    } catch (err: any) {
      setFormError(err.response?.data?.detail || "Unable to save expense. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await api.delete(`/expenses/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchItems(page);
    } catch {
      setError("Unable to delete expense. Please try again.");
      setDeleteTarget(null);
    } finally {
      setSubmitting(false);
    }
  };

  const totalMinor = items.reduce((s, e) => s + e.amount_minor, 0);
  const hasFilters = !!(search || filterCategory || filterClass);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginTop: 2 }}>
            Track and manage your personal expenses
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Expense</button>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Filters */}
      <div style={{
        display: "flex",
        gap: "var(--space-3)",
        flexWrap: "wrap",
        marginBottom: "var(--space-4)",
        alignItems: "center",
      }}>
        <input
          className="input"
          style={{ flex: "1 1 200px", maxWidth: 320 }}
          placeholder="Search expenses…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search expenses"
        />
        <select
          className="input"
          style={{ flex: "0 0 160px", padding: "0 var(--space-3)" }}
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <select
          className="input"
          style={{ flex: "0 0 160px", padding: "0 var(--space-3)" }}
          value={filterClass}
          onChange={e => setFilterClass(e.target.value)}
          aria-label="Filter by classification"
        >
          <option value="">All Types</option>
          <option value="NEED">Need</option>
          <option value="WANT">Want</option>
          <option value="DREAM">Dream</option>
        </select>
        {hasFilters && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(""); setFilterCategory(""); setFilterClass(""); }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Summary strip */}
      {!loading && items.length > 0 && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-6)",
          padding: "var(--space-3) var(--space-4)",
          background: "var(--color-surface-2)",
          borderRadius: "var(--radius-md)",
          marginBottom: "var(--space-4)",
          fontSize: "var(--text-sm)",
          color: "var(--color-text-secondary)",
        }}>
          <span>{total} expense{total !== 1 ? "s" : ""} {hasFilters ? "matched" : "total"}</span>
          <span>·</span>
          <span>Showing: <span className="amount" style={{ color: "var(--color-danger)" }}>{formatMinor(totalMinor, currency)}</span></span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="card" style={{ padding: "var(--space-6)" }}>
          <LoadingSpinner centered />
        </div>
      ) : items.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="📭"
            title={hasFilters ? "No matches found" : "No expenses yet"}
            description={hasFilters ? "Try clearing your filters." : "Add your first expense to start tracking your spending."}
            actionLabel={hasFilters ? "Clear filters" : "Add Expense"}
            onAction={hasFilters ? () => { setSearch(""); setFilterCategory(""); setFilterClass(""); } : openAdd}
          />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card" style={{ overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }} className="expense-table">
              <thead>
                <tr style={{ background: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
                  {["Date","Title","Category","Type","Amount",""].map(h => (
                    <th key={h} style={{
                      padding: "var(--space-3) var(--space-4)",
                      textAlign: h === "Amount" ? "right" : "left",
                      fontSize: "var(--text-xs)",
                      fontWeight: 600,
                      color: "var(--color-text-secondary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(exp => (
                  <tr key={exp.id} style={{ borderBottom: "1px solid var(--color-border)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-2)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}>
                    <td style={{ padding: "var(--space-3) var(--space-4)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>{exp.expense_date}</td>
                    <td style={{ padding: "var(--space-3) var(--space-4)", fontWeight: 600, fontSize: "var(--text-sm)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        <span>{CATEGORY_ICONS[exp.category_id ?? "other"] ?? "📦"}</span>
                        {exp.title}
                      </div>
                    </td>
                    <td style={{ padding: "var(--space-3) var(--space-4)", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", textTransform: "capitalize" }}>
                      {exp.category_id ?? "other"}
                    </td>
                    <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                      <ClassificationBadge value={exp.classification} />
                    </td>
                    <td style={{ padding: "var(--space-3) var(--space-4)", textAlign: "right" }}>
                      <span className="amount amount-negative">{formatMinor(exp.amount_minor, exp.currency)}</span>
                    </td>
                    <td style={{ padding: "var(--space-3) var(--space-4)", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(exp)} aria-label={`Edit ${exp.title}`}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(exp)} aria-label={`Delete ${exp.title}`}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="expense-cards" style={{ display: "none", flexDirection: "column", gap: "var(--space-3)" }}>
            {items.map(exp => (
              <div key={exp.id} className="card" style={{ padding: "var(--space-4)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "var(--text-base)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exp.title}</div>
                    <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-1)", alignItems: "center", flexWrap: "wrap" }}>
                      <ClassificationBadge value={exp.classification} />
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", textTransform: "capitalize" }}>{exp.category_id ?? "other"}</span>
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>{exp.expense_date}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "var(--space-2)", flexShrink: 0, marginLeft: "var(--space-3)" }}>
                    <span className="amount amount-negative" style={{ fontSize: "var(--text-lg)" }}>{formatMinor(exp.amount_minor, exp.currency)}</span>
                    <div style={{ display: "flex", gap: "var(--space-2)" }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(exp)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(exp)}>Del</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
              <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>Page {page} of {totalPages}</span>
              <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={showAdd || !!editTarget}
        onClose={() => { setShowAdd(false); setEditTarget(null); setFormError(null); }}
        title={editTarget ? "Edit Expense" : "Add Expense"}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => { setShowAdd(false); setEditTarget(null); }}>Cancel</button>
            <button className="btn btn-primary" form="expense-form" type="submit" disabled={submitting}>
              {submitting ? "Saving…" : editTarget ? "Save Changes" : "Add Expense"}
            </button>
          </>
        }
      >
        {formError && <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />}
        <form id="expense-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="exp-title">Title</label>
            <input id="exp-title" className="input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Groceries" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--space-3)" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="exp-amount">Amount</label>
              <input id="exp-amount" className="input input-amount" required type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="exp-currency">Currency</label>
              <select id="exp-currency" className="input" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} style={{ padding: "0 var(--space-3)" }}>
                {["INR","USD","EUR","GBP","JPY"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="exp-date">Date</label>
            <input id="exp-date" className="input" type="date" required value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="exp-cat">Category</label>
              <select id="exp-cat" className="input" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} style={{ padding: "0 var(--space-3)" }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="exp-class">Classification</label>
              <select id="exp-class" className="input" value={form.classification} onChange={e => setForm(f => ({ ...f, classification: e.target.value as "NEED"|"WANT"|"DREAM" }))} style={{ padding: "0 var(--space-3)" }}>
                <option value="NEED">Need</option>
                <option value="WANT">Want</option>
                <option value="DREAM">Dream</option>
              </select>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="exp-notes">Notes (optional)</label>
            <input id="exp-notes" className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Add a note…" />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Expense"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete} disabled={submitting}>
              {submitting ? "Deleting…" : "Yes, Delete"}
            </button>
          </>
        }
      >
        <p style={{ fontSize: "var(--text-base)", color: "var(--color-text)" }}>
          Are you sure you want to delete <strong>{deleteTarget?.title}</strong>?
        </p>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginTop: "var(--space-2)" }}>
          This action cannot be undone. Your previous data will remain unaffected.
        </p>
      </Modal>

      <style jsx global>{`
        @media (max-width: 768px) {
          .expense-table { display: none !important; }
          .expense-cards { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
