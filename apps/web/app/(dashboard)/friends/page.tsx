"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatMinor } from "@/lib/money";
import { useAuthStore } from "@/store/authStore";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SuccessBanner } from "@/components/ui/SuccessBanner";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { ListRow } from "@/components/ui/ListRow";
import { MoneyAmount } from "@/components/finance/MoneyAmount";
import { StatusBadge } from "@/components/finance/StatusBadge";
import { getBalanceStatus } from "@/components/finance/BalanceIndicator";
import Link from "next/link";
import {
  UserPlus,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  X,
  Users,
  ClipboardList,
  Receipt,
  Handshake,
  Copy,
  Check,
  Send,
  Clock,
} from "lucide-react";

interface Friend {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: "PENDING" | "ACTIVE" | "ARCHIVED";
  is_archived: boolean;
  is_pending: boolean;
  invite_token: string | null;
  invited_at: string | null;
  accepted_at: string | null;
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

function balanceLabel(minor: number, currency: string) {
  const status = getBalanceStatus(minor);
  if (minor === 0) return { text: status.label, color: status.color };
  return { text: `${status.label} ${formatMinor(Math.abs(minor), currency)}`, color: status.color };
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function FriendsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  // Detail panel — selection is an id, resolved against live query data so
  // edits to the selected friend are reflected without re-selecting.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Modals
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [editTarget, setEditTarget] = useState<Friend | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Friend | null>(null);
  const [fname, setFname] = useState("");
  const [femail, setFemail] = useState("");
  const [fphone, setFphone] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Brief "Copied!" confirmation shown on the row whose link was just copied.
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current); }, []);

  const friendsQuery = useQuery({
    queryKey: ["friends"],
    // Fetch everything once (active, pending, archived) — the archived
    // toggle below filters client-side instead of re-fetching.
    queryFn: async () => (await api.get<Friend[]>("/friends?include_archived=true")).data ?? [],
  });
  const friends = friendsQuery.data ?? [];
  const loading = friendsQuery.isPending;
  const selected = friends.find(f => f.id === selectedId) ?? null;

  const activityQuery = useQuery({
    queryKey: ["friend-activity", selectedId],
    enabled: !!selectedId && selected?.status === "ACTIVE",
    queryFn: async () => {
      const friend = friends.find(f => f.id === selectedId)!;
      const [seRes, stRes] = await Promise.all([
        api.get(`/shared-expenses?friend_id=${friend.id}`),
        api.get(`/settlements?friend_id=${friend.id}`),
      ]);
      const shared: Activity[] = (seRes.data ?? []).map((e: any) => ({
        id: e.id, type: "shared" as const, title: e.title,
        amount_minor: e.total_amount_minor, currency: e.currency, date: e.expense_date,
      }));
      const settled: Activity[] = (stRes.data ?? []).map((s: any) => ({
        id: s.id, type: "settlement" as const,
        title: s.direction === "I_PAID" ? `You paid ${friend.name}` : `${friend.name} paid you`,
        amount_minor: s.amount_minor, currency: s.currency, date: s.settlement_date,
      }));
      return [...shared, ...settled].sort((a, b) => b.date.localeCompare(a.date));
    },
  });
  const activity = activityQuery.data ?? [];
  const activityLoading = activityQuery.isPending && !!selectedId && selected?.status === "ACTIVE";

  const openInvite = () => { setInviteEmail(""); setFormError(null); setShowInvite(true); };
  const openEdit = (f: Friend) => { setEditTarget(f); setFname(f.name); setFemail(f.email ?? ""); setFphone(f.phone ?? ""); setFormError(null); };

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editTarget ? api.put(`/friends/${editTarget.id}`, payload) : api.post("/friends", payload),
    onSuccess: (res) => {
      const wasInvite = !editTarget;
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      setShowInvite(false);
      setEditTarget(null);
      if (wasInvite && res?.data?.invite_token) {
        setInviteLink(`${window.location.origin}/invite/${res.data.invite_token}`);
      }
    },
    onError: (err: any) => setFormError(err.response?.data?.detail || "Unable to save. Please try again."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/friends/${id}`),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["balances"] });
      setDeleteTarget(null);
      if (selectedId === id) setSelectedId(null);
    },
    onError: () => { setError("Unable to remove friend."); setDeleteTarget(null); },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/friends/${id}/archive`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friends"] }),
    onError: () => setError("Unable to update archive status."),
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/friends/${id}/resend-invite`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      if (res?.data?.invite_token) {
        setInviteLink(`${window.location.origin}/invite/${res.data.invite_token}`);
      }
    },
    onError: () => setError("Unable to resend invite. Please try again."),
  });

  const submitting = saveMutation.isPending || deleteMutation.isPending;

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) { setFormError("Email is required — we use it to find their Suraty account."); return; }
    setFormError(null);
    saveMutation.mutate({ email: inviteEmail.trim() });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fname.trim()) { setFormError("Name is required."); return; }
    setFormError(null);
    saveMutation.mutate({ name: fname.trim(), email: femail.trim() || undefined, phone: fphone || undefined });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
  };

  const toggleArchive = (f: Friend) => archiveMutation.mutate(f.id);

  const copyInviteLink = async (f: Friend) => {
    if (!f.invite_token) return;
    const link = `${window.location.origin}/invite/${f.invite_token}`;
    try { await navigator.clipboard.writeText(link); } catch { /* clipboard unavailable — link still shown below */ }
    setInviteLink(link);
    setCopiedId(f.id);
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    copiedTimeoutRef.current = setTimeout(() => setCopiedId(null), 1800);
  };

  const visible = friends.filter(f => showArchived ? f.is_archived : !f.is_archived);
  const isPendingDelete = deleteTarget?.status === "PENDING";

  const InviteFormFields = (
    <>
      {formError && <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />}
      <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", margin: "0 0 var(--space-1)" }}>
        They need an existing Suraty account — enter their email and we'll generate a link for them to accept. Their name comes from their account.
      </p>
      <form id="invite-form" onSubmit={handleInviteSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="inv-email">Email *</label>
          <input id="inv-email" className={`input ${formError && !inviteEmail.trim() ? "error" : ""}`} type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="rohan@example.com" />
        </div>
      </form>
    </>
  );

  const EditFormFields = (
    <>
      {formError && <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />}
      <form id="friend-form" onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="f-name">Full Name *</label>
          <input id="f-name" className={`input ${formError && !fname.trim() ? "error" : ""}`} required value={fname} onChange={e => setFname(e.target.value)} placeholder="Rohan Sharma" />
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
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginTop: 2 }}>Invite friends to share expenses and track balances</p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowArchived(v => !v)}>
            {showArchived ? "Show Active" : "Show Archived"}
          </button>
          <button className="btn btn-primary" onClick={openInvite}><UserPlus size={16} /> Invite Friend</button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      {inviteLink && (
        <SuccessBanner
          onDismiss={() => setInviteLink(null)}
          message={
            <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
              <span>Invite link ready — share it so they can join:</span>
              <code style={{
                background: "var(--color-surface)", padding: "2px 8px", borderRadius: "var(--radius-sm)",
                fontSize: "var(--text-xs)", wordBreak: "break-all", color: "var(--color-text)",
              }}>{inviteLink}</code>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={async () => { try { await navigator.clipboard.writeText(inviteLink); } catch { /* ignore */ } }}
              ><Copy size={12} /> Copy</button>
            </span>
          }
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: selected ? "340px 1fr" : "1fr", gap: "var(--space-6)", alignItems: "start" }} className="friends-grid">
        {/* Friend List */}
        <div>
          {loading ? <LoadingSpinner centered /> : visible.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<Users size={40} />}
                title={showArchived ? "No archived friends" : "No friends yet"}
                description={showArchived ? "No friends have been archived." : "Invite a friend to start splitting expenses and tracking balances together."}
                actionLabel={showArchived ? undefined : "Invite Friend"}
                onAction={showArchived ? undefined : openInvite}
              />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {visible.map(f => {
                const bl = balanceLabel(f.net_balance_minor, f.currency);
                const isSelected = selected?.id === f.id;
                const isPending = f.status === "PENDING";
                return (
                  <div
                    key={f.id}
                    className="card"
                    onClick={() => setSelectedId(f.id)}
                    style={{
                      padding: "var(--space-4)",
                      cursor: "pointer",
                      border: isSelected ? "2px solid var(--color-accent)" : "1px solid var(--color-border)",
                      transition: "all var(--transition-fast)",
                      opacity: f.is_archived ? 0.6 : 1,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                      <Avatar name={f.name} size={40} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                          <span style={{ fontWeight: 700, fontSize: "var(--text-base)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                          {isPending && <StatusBadge status="PENDING" />}
                        </div>
                        {(f.email || f.phone) && (
                          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {f.email ?? f.phone}
                          </div>
                        )}
                        {isPending ? (
                          <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-warning)", marginTop: 2 }}>
                            Invite sent{f.invited_at ? ` · ${formatDate(f.invited_at)}` : ""}
                          </div>
                        ) : (
                          <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: bl.color, marginTop: 2 }}>
                            {bl.text}
                          </div>
                        )}
                      </div>
                      {/* Actions */}
                      <div style={{ display: "flex", gap: "var(--space-1)", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        {isPending ? (
                          <>
                            <button className="btn btn-ghost btn-sm" onClick={() => copyInviteLink(f)} aria-label="Copy invite link">
                              {copiedId === f.id ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => resendMutation.mutate(f.id)} aria-label="Resend invite" disabled={resendMutation.isPending}><Send size={14} /></button>
                          </>
                        ) : (
                          <button className="btn btn-ghost btn-sm" onClick={() => toggleArchive(f)} aria-label={f.is_archived ? "Unarchive" : "Archive"}>
                            {f.is_archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                          </button>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(f)} aria-label={`Edit ${f.name}`}><Pencil size={14} /></button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(f)} aria-label={isPending ? "Cancel invite" : `Remove ${f.name}`}><Trash2 size={14} /></button>
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
                <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700, display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  {selected.name}
                  {selected.status === "PENDING" && <StatusBadge status="PENDING" />}
                </h2>
                {(selected.email || selected.phone) && (
                  <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>{selected.email ?? selected.phone}</div>
                )}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedId(null)} style={{ marginLeft: "auto" }} aria-label="Close detail"><X size={14} /></button>
            </div>

            {selected.status === "PENDING" ? (
              <>
                {/* Pending invite state */}
                <div style={{
                  padding: "var(--space-4)", borderRadius: "var(--radius-md)",
                  background: "var(--color-warning-bg)", marginBottom: "var(--space-5)",
                  display: "flex", alignItems: "flex-start", gap: "var(--space-3)",
                }}>
                  <Clock size={20} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--color-warning)" }}>Invite pending</div>
                    <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: 2 }}>
                      Sent {formatDate(selected.invited_at)}. Share the link so {selected.name.split(" ")[0]} can accept and join.
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-5)", flexWrap: "wrap" }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => copyInviteLink(selected)}>
                    {copiedId === selected.id ? <Check size={14} /> : <Copy size={14} />} {copiedId === selected.id ? "Copied!" : "Copy Invite Link"}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => resendMutation.mutate(selected.id)} disabled={resendMutation.isPending}>
                    <Send size={14} /> {resendMutation.isPending ? "Resending…" : "Resend Invite"}
                  </button>
                </div>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                  Once accepted, you'll be able to split bills and settle up with {selected.name}.
                </p>
              </>
            ) : (
              <>
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
                        <MoneyAmount
                          amountMinor={selected.net_balance_minor}
                          currency={selected.currency}
                          variant={selected.net_balance_minor > 0 ? "positive" : "negative"}
                          size="xl"
                        />
                      )}
                    </div>
                  );
                })()}

                {/* Quick actions */}
                <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-5)", flexWrap: "wrap" }}>
                  <Link href="/shared" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}><Receipt size={14} /> Shared Expense</Link>
                  <Link href="/settlements" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}><Handshake size={14} /> Record Settlement</Link>
                </div>

                <div className="divider" />

                {/* Activity */}
                <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "var(--space-3)", marginTop: "var(--space-4)" }}>Activity</h3>
                {activityLoading ? <LoadingSpinner centered /> : activity.length === 0 ? (
                  <EmptyState icon={<ClipboardList size={40} />} title="No activity yet" description="Shared expenses and settlements with this friend will appear here." />
                ) : (
                  activity.map(a => (
                    <ListRow
                      key={a.id}
                      leading={
                        <div className="list-row-icon">
                          {a.type === "shared" ? <Receipt size={16} /> : <Handshake size={16} />}
                        </div>
                      }
                      title={a.title}
                      subtitle={`${a.type === "shared" ? "Shared expense" : "Settlement"} · ${a.date}`}
                      trailing={<MoneyAmount amountMinor={a.amount_minor} currency={a.currency} variant="neutral" size="sm" />}
                    />
                  ))
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invite a Friend"
        footer={<><button className="btn btn-secondary" onClick={() => setShowInvite(false)}>Cancel</button><button className="btn btn-primary" form="invite-form" type="submit" disabled={submitting}>{submitting ? "Sending…" : "Send Invite"}</button></>}>
        {InviteFormFields}
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Friend"
        footer={<><button className="btn btn-secondary" onClick={() => setEditTarget(null)}>Cancel</button><button className="btn btn-primary" form="friend-form" type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save Changes"}</button></>}>
        {EditFormFields}
      </Modal>

      {/* Delete/Cancel Confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={isPendingDelete ? "Cancel Invite" : "Remove Friend"}
        footer={<><button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button><button className="btn btn-danger" onClick={handleDelete} disabled={submitting}>{submitting ? (isPendingDelete ? "Cancelling…" : "Removing…") : (isPendingDelete ? "Yes, Cancel Invite" : "Yes, Remove")}</button></>}>
        {isPendingDelete ? (
          <p>Cancel the invite to <strong>{deleteTarget?.name}</strong>? The invite link will stop working.</p>
        ) : (
          <p>Remove <strong>{deleteTarget?.name}</strong> from your friends? Shared expense history will be preserved.</p>
        )}
      </Modal>

      <style jsx global>{`
        @media (max-width: 900px) {
          .friends-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
