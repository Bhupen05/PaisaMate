"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatMinor } from "@/lib/money";
import { useAuthStore } from "@/store/authStore";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import Link from "next/link";

interface Friend {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  is_archived: boolean;
  net_balance_minor: number;
  currency: string;
}

interface Activity {
  id: string;
  type: "shared" | "settlement";
  title: string;
  amount_minor: number;
  currency: string;
  date: string;
  direction?: string;
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "var(--color-accent-light)", color: "var(--color-accent)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size < 36 ? "var(--text-xs)" : "var(--text-sm)",
      fontWeight: 700, flexShrink: 0,
    }}>{initials}</div>
  );
}

function balanceLabel(minor: number, currency: string) {
  if (minor === 0) return { text: "Settled", color: "var(--color-text-muted)" };
  if (minor > 0)   return { text: `Owes you ${formatMinor(minor, currency)}`, color: "var(--color-success)" };
  return { text: `You owe ${formatMinor(Math.abs(minor), currency)}`, color: "var(--color-danger)" };
}

export default function FriendsPage() {
  const { user } = useAuthStore();
  const currency = user?.currency ?? "INR";

  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail panel
  const [selected, setSelected] = useState<Friend | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Friend | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Friend | null>(null);
  const [fname, setFname] = useState("");
  const [femail, setFemail] = useState("");
  const [fphone, setFphone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const fetchFriends = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get("/friends");
      setFriends(res.data ?? []);
    } catch { setError("Unable to load friends. Please try again."); }
    finally { setLoading(false); }
  };

  const loadActivity = async (friend: Friend) => {
    setSelected(friend); setActivityLoading(true); setActivity([]);
    try {
      const [seRes, stRes] = await Promise.all([
        api.get(`/shared-expenses?friend_id=${friend.id}&page=1&page_size=10`),
        api.get(`/settlements?friend_id=${friend.id}`),
      ]);
      const shared: Activity[] = (seRes.data?.items ?? []).map((e: any) => ({
        id: e.id, type: "shared" as const, title: e.title,
        amount_minor: e.total_amount_minor, currency: e.currency, date: e.expense_date,
      }));
      const settled: Activity[] = (stRes.data ?? []).map((s: any) => ({
        id: s.id, type: "settlement" as const,
        title: s.direction === "I_PAID" ? `You paid ${friend.name}` : `${friend.name} paid you`,
        amount_minor: s.amount_minor, currency: s.currency, date: s.settlement_date,
      }));
      setActivity([...shared, ...settled].sort((a, b) => b.date.localeCompare(a.date)));
    } catch { /* non-critical */ }
    finally { setActivityLoading(false); }
  };

  useEffect(() => { fetchFriends(); }, []);

  const openAdd = () => { setFname(""); setFemail(""); setFphone(""); setFormError(null); setShowAdd(true); };
  const openEdit = (f: Friend) => { setEditTarget(f); setFname(f.name); setFemail(f.email ?? ""); setFphone(f.phone ?? ""); setFormError(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fname.trim()) { setFormError("Name is required."); return; }
    setSubmitting(true); setFormError(null);
    const payload = { name: fname.trim(), email: femail || undefined, phone: fphone || undefined };
    try {
      if (editTarget) { await api.put(`/friends/${editTarget.id}`, payload); setEditTarget(null); }
      else { await api.post("/friends", payload); setShowAdd(false); }
      fetchFriends();
    } catch (err: any) { setFormError(err.response?.data?.detail || "Unable to save. Please try again."); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await api.delete(`/friends/${deleteTarget.id}`);
      setDeleteTarget(null);
      if (selected?.id === deleteTarget.id) setSelected(null);
      fetchFriends();
    } catch { setError("Unable to delete friend."); setDeleteTarget(null); }
    finally { setSubmitting(false); }
  };

  const toggleArchive = async (f: Friend) => {
    try {
      await api.post(`/friends/${f.id}/archive`);
      fetchFriends();
    } catch { setError("Unable to update archive status."); }
  };

  const visible = friends.filter(f => showArchived ? f.is_archived : !f.is_archived);

  const FormFields = (
    <>
      {formError && <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />}
      <form id="friend-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="f-name">Full Name *</label>
          <input id="f-name" className="input" required value={fname} onChange={e => setFname(e.target.value)} placeholder="Rohan Sharma" />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="f-email">Email (optional)</label>
          <input id="f-email" className="input" type="email" value={femail} onChange={e => setFemail(e.target.value)} placeholder="rohan@example.com" />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="f-phone">Phone (optional)</label>
          <input id="f-phone" className="input" value={fphone} onChange={e => setFphone(e.target.value)} placeholder="+91 98765 43210" />
        </div>
      </form>
    </>
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Friends</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginTop: 2 }}>Manage shared expenses and track balances</p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowArchived(v => !v)}>
            {showArchived ? "Show Active" : "Show Archived"}
          </button>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Friend</button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div style={{ display: "grid", gridTemplateColumns: selected ? "340px 1fr" : "1fr", gap: "var(--space-6)", alignItems: "start" }} className="friends-grid">
        {/* Friend List */}
        <div>
          {loading ? <LoadingSpinner centered /> : visible.length === 0 ? (
            <div className="card">
              <EmptyState
                icon="👥"
                title={showArchived ? "No archived friends" : "No friends yet"}
                description={showArchived ? "No friends have been archived." : "Add a friend to start tracking shared expenses and balances."}
                actionLabel={showArchived ? undefined : "Add Friend"}
                onAction={showArchived ? undefined : openAdd}
              />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {visible.map(f => {
                const bl = balanceLabel(f.net_balance_minor, f.currency);
                const isSelected = selected?.id === f.id;
                return (
                  <div
                    key={f.id}
                    className="card"
                    onClick={() => loadActivity(f)}
                    style={{
                      padding: "var(--space-4)",
                      cursor: "pointer",
                      border: isSelected ? "2px solid var(--color-accent)" : "1px solid var(--color-border)",
                      transition: "all var(--transition-fast)",
                      opacity: f.is_archived ? 0.6 : 1,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                      <Avatar name={f.name} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "var(--text-base)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                        {(f.email || f.phone) && (
                          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {f.email ?? f.phone}
                          </div>
                        )}
                        <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: bl.color, marginTop: 2 }}>
                          {bl.text}
                        </div>
                      </div>
                      {/* Actions */}
                      <div style={{ display: "flex", gap: "var(--space-1)", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(f)} aria-label={`Edit ${f.name}`}>✎</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => toggleArchive(f)} aria-label={f.is_archived ? "Unarchive" : "Archive"}>
                          {f.is_archived ? "↩" : "📦"}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(f)} aria-label={`Delete ${f.name}`}>✕</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="card" style={{ padding: "var(--space-6)" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginBottom: "var(--space-5)" }}>
              <Avatar name={selected.name} size={52} />
              <div>
                <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700 }}>{selected.name}</h2>
                {(selected.email || selected.phone) && (
                  <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>{selected.email ?? selected.phone}</div>
                )}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)} style={{ marginLeft: "auto" }} aria-label="Close detail">✕</button>
            </div>

            {/* Balance headline */}
            {(() => {
              const bl = balanceLabel(selected.net_balance_minor, selected.currency);
              return (
                <div style={{
                  padding: "var(--space-4)", borderRadius: "var(--radius-md)",
                  background: selected.net_balance_minor > 0 ? "var(--color-success-bg)" : selected.net_balance_minor < 0 ? "var(--color-danger-bg)" : "var(--color-surface-2)",
                  marginBottom: "var(--space-5)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: bl.color }}>{bl.text}</span>
                  {selected.net_balance_minor !== 0 && (
                    <span className="amount" style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: bl.color }}>
                      {formatMinor(Math.abs(selected.net_balance_minor), selected.currency)}
                    </span>
                  )}
                </div>
              );
            })()}

            {/* Quick actions */}
            <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-5)", flexWrap: "wrap" }}>
              <Link href="/shared" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>+ Shared Expense</Link>
              <Link href="/settlements" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>Record Settlement</Link>
            </div>

            <div className="divider" />

            {/* Activity */}
            <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "var(--space-3)", marginTop: "var(--space-4)" }}>Activity</h3>
            {activityLoading ? <LoadingSpinner centered /> : activity.length === 0 ? (
              <EmptyState icon="📋" title="No activity yet" description="Shared expenses and settlements with this friend will appear here." />
            ) : (
              activity.map(a => (
                <div key={a.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "var(--space-3) 0", borderBottom: "1px solid var(--color-border)",
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>{a.title}</div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>
                      {a.type === "shared" ? "Shared expense" : "Settlement"} · {a.date}
                    </div>
                  </div>
                  <span className="amount" style={{ fontSize: "var(--text-sm)" }}>{formatMinor(a.amount_minor, a.currency)}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Friend"
        footer={<><button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button><button className="btn btn-primary" form="friend-form" type="submit" disabled={submitting}>{submitting ? "Adding…" : "Add Friend"}</button></>}>
        {FormFields}
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Friend"
        footer={<><button className="btn btn-secondary" onClick={() => setEditTarget(null)}>Cancel</button><button className="btn btn-primary" form="friend-form" type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save Changes"}</button></>}>
        {FormFields}
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove Friend"
        footer={<><button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button><button className="btn btn-danger" onClick={handleDelete} disabled={submitting}>{submitting ? "Removing…" : "Yes, Remove"}</button></>}>
        <p>Remove <strong>{deleteTarget?.name}</strong> from your friends? Shared expense history will be preserved.</p>
      </Modal>

      <style jsx global>{`
        @media (max-width: 900px) {
          .friends-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
