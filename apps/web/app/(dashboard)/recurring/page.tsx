"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatMinor } from "@/lib/money";
import { useAuthStore } from "@/store/authStore";
import { ClassificationBadge } from "@/components/finance/ClassificationBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";

const CATEGORIES = ["food","transport","health","entertainment","shopping","utilities","housing","education","personal","other"];

interface RecurringTemplate {
  id: string;
  title: string;
  amount_minor: number;
  currency: string;
  category_id: string;
  classification: "NEED" | "WANT" | "DREAM";
  day_of_month: number;
  is_active: boolean;
  is_shared: boolean;
}

const EMPTY_FORM = {
  title: "",
  amount: "",
  category_id: "other",
  classification: "NEED" as "NEED"|"WANT"|"DREAM",
  day_of_month: 1,
  is_shared: false,
};

export default function RecurringPage() {
  const { user } = useAuthStore();
  const currency = user?.currency ?? "INR";

  const [items, setItems] = useState<RecurringTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<RecurringTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecurringTemplate | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/recurring");
      setItems(res.data ?? []);
    } catch {
      setError("Unable to load recurring templates. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const openAdd = () => { setForm(EMPTY_FORM); setFormError(null); setShowAdd(true); };
  const openEdit = (r: RecurringTemplate) => {
    setEditTarget(r);
    setForm({ title: r.title, amount: String(r.amount_minor / 100), category_id: r.category_id, classification: r.classification, day_of_month: r.day_of_month, is_shared: r.is_shared });
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountMinor = Math.round(parseFloat(form.amount) * 100);
    if (!form.title.trim() || isNaN(amountMinor) || amountMinor <= 0) {
      setFormError("Please enter a valid title and amount."); return;
    }
    setSubmitting(true); setFormError(null);
    const payload = { title: form.title.trim(), amount_minor: amountMinor, currency, category_id: form.category_id, classification: form.classification, day_of_month: form.day_of_month, is_shared: form.is_shared };
    try {
      if (editTarget) { await api.put(`/recurring/${editTarget.id}`, payload); setEditTarget(null); }
      else { await api.post("/recurring", payload); setShowAdd(false); }
      fetchItems();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || "Unable to save. Please try again.");
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await api.delete(`/recurring/${deleteTarget.id}`);
      setDeleteTarget(null); fetchItems();
    } catch { setError("Unable to delete. Please try again."); setDeleteTarget(null); }
    finally { setSubmitting(false); }
  };

  const toggleStatus = async (r: RecurringTemplate) => {
    try {
      await api.post(`/recurring/${r.id}/${r.is_active ? "pause" : "resume"}`);
      fetchItems();
    } catch { setError("Unable to update status."); }
  };

  const active = items.filter(r => r.is_active);
  const paused = items.filter(r => !r.is_active);
  const monthlyTotal = active.reduce((s, r) => s + r.amount_minor, 0);

  const FormContent = (
    <>
      {formError && <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />}
      <form id="recurring-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="rec-title">Title</label>
          <input id="rec-title" className="input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Netflix" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--space-3)" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="rec-amount">Amount ({currency})</label>
            <input id="rec-amount" className="input input-amount" required type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="rec-day">Day of Month</label>
            <input id="rec-day" className="input" type="number" min={1} max={31} value={form.day_of_month} onChange={e => setForm(f => ({ ...f, day_of_month: Number(e.target.value) }))} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="rec-cat">Category</label>
            <select id="rec-cat" className="input" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} style={{ padding: "0 var(--space-3)" }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="rec-class">Classification</label>
            <select id="rec-class" className="input" value={form.classification} onChange={e => setForm(f => ({ ...f, classification: e.target.value as "NEED"|"WANT"|"DREAM" }))} style={{ padding: "0 var(--space-3)" }}>
              <option value="NEED">Need</option>
              <option value="WANT">Want</option>
              <option value="DREAM">Dream</option>
            </select>
          </div>
        </div>
      </form>
    </>
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Recurring</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginTop: 2 }}>Manage your monthly commitments</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Recurring</button>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {loading ? <LoadingSpinner centered /> : items.length === 0 ? (
        <div className="card">
          <EmptyState icon="↻" title="No recurring items" description="Add subscriptions and bills so Suraty can track your monthly obligations." actionLabel="Add Recurring" onAction={openAdd} />
        </div>
      ) : (
        <>
          {/* Summary */}
          {monthlyTotal > 0 && (
            <div className="card" style={{ padding: "var(--space-4) var(--space-5)", marginBottom: "var(--space-5)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>Total monthly commitment ({active.length} active)</span>
              <span className="amount amount-negative" style={{ fontSize: "var(--text-xl)", fontWeight: 700 }}>{formatMinor(monthlyTotal, currency)}</span>
            </div>
          )}

          {/* Active */}
          {active.length > 0 && (
            <div style={{ marginBottom: "var(--space-6)" }}>
              <h2 style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "var(--space-3)" }}>Active</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {active.map(r => <RecurringCard key={r.id} item={r} currency={currency} onEdit={openEdit} onDelete={setDeleteTarget} onToggle={toggleStatus} />)}
              </div>
            </div>
          )}

          {/* Paused */}
          {paused.length > 0 && (
            <div>
              <h2 style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "var(--space-3)" }}>Paused</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {paused.map(r => <RecurringCard key={r.id} item={r} currency={currency} onEdit={openEdit} onDelete={setDeleteTarget} onToggle={toggleStatus} />)}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Recurring"
        footer={<><button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button><button className="btn btn-primary" form="recurring-form" type="submit" disabled={submitting}>{submitting ? "Saving…" : "Add"}</button></>}>
        {FormContent}
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Recurring"
        footer={<><button className="btn btn-secondary" onClick={() => setEditTarget(null)}>Cancel</button><button className="btn btn-primary" form="recurring-form" type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save Changes"}</button></>}>
        {FormContent}
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Recurring"
        footer={<><button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button><button className="btn btn-danger" onClick={handleDelete} disabled={submitting}>{submitting ? "Deleting…" : "Yes, Delete"}</button></>}>
        <p>Delete <strong>{deleteTarget?.title}</strong>? This cannot be undone.</p>
      </Modal>
    </div>
  );
}

function RecurringCard({ item, currency, onEdit, onDelete, onToggle }: {
  item: RecurringTemplate;
  currency: string;
  onEdit: (r: RecurringTemplate) => void;
  onDelete: (r: RecurringTemplate) => void;
  onToggle: (r: RecurringTemplate) => void;
}) {
  return (
    <div className="card" style={{
      padding: "var(--space-4) var(--space-5)",
      borderLeft: item.is_active ? `3px solid var(--color-success)` : `3px solid var(--color-warning)`,
      display: "flex", alignItems: "center", gap: "var(--space-4)",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: "var(--text-base)" }}>{item.title}</span>
          {item.is_active ? (
            <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-success)", background: "var(--color-success-bg)", padding: "2px 8px", borderRadius: "var(--radius-full)" }}>Active</span>
          ) : (
            <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-warning)", background: "var(--color-warning-bg)", padding: "2px 8px", borderRadius: "var(--radius-full)" }}>Paused</span>
          )}
          <ClassificationBadge value={item.classification} />
        </div>
        <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
          <span className="amount">{formatMinor(item.amount_minor, item.currency)}</span>
          <span> / month · Next: day {item.day_of_month}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0, flexWrap: "wrap" }}>
        <button className="btn btn-ghost btn-sm" onClick={() => onToggle(item)} aria-label={item.is_active ? "Pause" : "Resume"}>
          {item.is_active ? "Pause" : "Resume"}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(item)}>Edit</button>
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(item)}>Delete</button>
      </div>
    </div>
  );
}
