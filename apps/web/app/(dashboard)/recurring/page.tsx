"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatMinor } from "@/lib/money";
import { useAuthStore } from "@/store/authStore";
import { ClassificationBadge } from "@/components/finance/ClassificationBadge";
import { StatusBadge } from "@/components/finance/StatusBadge";
import { StatCard } from "@/components/finance/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { Plus, Pencil, Trash2, Pause, Play, Repeat } from "lucide-react";

const CATEGORIES = ["food","transport","health","entertainment","shopping","utilities","housing","education","personal","other"];

interface RecurringTemplate {
  id: string;
  title: string;
  amount_minor: number;
  currency: string;
  category_id: string;
  classification: "NEED" | "WANT" | "DREAM";
  billing_day: number;
  is_active: boolean;
}

const EMPTY_FORM = {
  title: "",
  amount: "",
  category_id: "other",
  classification: "NEED" as "NEED"|"WANT"|"DREAM",
  billing_day: 1,
};

export default function RecurringPage() {
  const { user } = useAuthStore();
  const currency = user?.currency ?? "INR";

  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<RecurringTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecurringTemplate | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const itemsQuery = useQuery({
    queryKey: ["recurring"],
    queryFn: async () => (await api.get<RecurringTemplate[]>("/recurring")).data ?? [],
  });
  const items = itemsQuery.data ?? [];
  const loading = itemsQuery.isPending;

  const invalidateRecurring = () => {
    queryClient.invalidateQueries({ queryKey: ["recurring"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
  };

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editTarget ? api.put(`/recurring/${editTarget.id}`, payload) : api.post("/recurring", payload),
    onSuccess: () => {
      invalidateRecurring();
      setShowAdd(false);
      setEditTarget(null);
    },
    onError: (err: any) => setFormError(err.response?.data?.detail || "Unable to save. Please try again."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/recurring/${id}`),
    onSuccess: () => {
      invalidateRecurring();
      setDeleteTarget(null);
    },
    onError: () => { setError("Unable to delete. Please try again."); setDeleteTarget(null); },
  });

  const toggleMutation = useMutation({
    mutationFn: (r: RecurringTemplate) => api.post(`/recurring/${r.id}/${r.is_active ? "pause" : "resume"}`),
    onSuccess: invalidateRecurring,
    onError: () => setError("Unable to update status."),
  });

  const submitting = saveMutation.isPending || deleteMutation.isPending;

  const openAdd = () => { setForm(EMPTY_FORM); setFormError(null); setShowAdd(true); };
  const openEdit = (r: RecurringTemplate) => {
    setEditTarget(r);
    setForm({ title: r.title, amount: String(r.amount_minor / 100), category_id: r.category_id, classification: r.classification, billing_day: r.billing_day });
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountMinor = Math.round(parseFloat(form.amount) * 100);
    if (!form.title.trim() || isNaN(amountMinor) || amountMinor <= 0) {
      setFormError("Please enter a valid title and amount."); return;
    }
    setFormError(null);
    saveMutation.mutate({ title: form.title.trim(), amount_minor: amountMinor, currency, category_id: form.category_id, classification: form.classification, billing_day: form.billing_day });
  };

  const handleDelete = () => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); };

  const toggleStatus = (r: RecurringTemplate) => toggleMutation.mutate(r);

  const active = items.filter(r => r.is_active);
  const paused = items.filter(r => !r.is_active);
  const monthlyTotal = active.reduce((s, r) => s + r.amount_minor, 0);

  const FormContent = (
    <>
      {formError && <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />}
      <form id="recurring-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="rec-title">Title</label>
          <input id="rec-title" className={`input ${formError && !form.title.trim() ? "error" : ""}`} required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Netflix" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--space-3)" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="rec-amount">Amount ({currency})</label>
            <input id="rec-amount" className={`input input-amount ${formError && !(form.amount && Math.round(parseFloat(form.amount) * 100) > 0) ? "error" : ""}`} required type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="rec-day">Day of Month</label>
            <input id="rec-day" className="input" type="number" min={1} max={28} value={form.billing_day} onChange={e => setForm(f => ({ ...f, billing_day: Number(e.target.value) }))} />
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
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Recurring</button>
      </div>

      {(error || itemsQuery.isError) && (
        <ErrorBanner message={error ?? "Unable to load recurring templates. Please try again."} onDismiss={() => setError(null)} />
      )}

      {loading ? <LoadingSpinner centered /> : items.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Repeat size={40} />} title="No recurring items" description="Add subscriptions and bills so Suraty can track your monthly obligations." actionLabel="Add Recurring" onAction={openAdd} />
        </div>
      ) : (
        <>
          {/* Summary */}
          {monthlyTotal > 0 && (
            <div style={{ marginBottom: "var(--space-5)" }}>
              <StatCard
                variant="hero"
                label="Total Monthly Commitment"
                value={formatMinor(monthlyTotal, currency)}
                sub={`${active.length} active`}
              />
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
          <StatusBadge status={item.is_active ? "ACTIVE" : "PAUSED"} />
          <ClassificationBadge value={item.classification} />
        </div>
        <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
          <span className="amount">{formatMinor(item.amount_minor, item.currency)}</span>
          <span> / month · Next: day {item.billing_day}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0, flexWrap: "wrap" }}>
        <button className="btn btn-ghost btn-sm" onClick={() => onToggle(item)} aria-label={item.is_active ? "Pause" : "Resume"}>
          {item.is_active ? <Pause size={13} /> : <Play size={13} />}
          {item.is_active ? "Pause" : "Resume"}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(item)}><Pencil size={13} /> Edit</button>
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(item)}><Trash2 size={13} /> Delete</button>
      </div>
    </div>
  );
}
