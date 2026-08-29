"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatMinor } from "@/lib/money";
import { useAuthStore } from "@/store/authStore";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { ListRow } from "@/components/ui/ListRow";
import { Tile } from "@/components/ui/Tile";
import { MoneyAmount } from "@/components/finance/MoneyAmount";
import { getBalanceStatus } from "@/components/finance/BalanceIndicator";
import { Plus, Trash2, Handshake, ClipboardList } from "lucide-react";

interface Settlement {
  id: string;
  friend_id: string;
  friend_name: string;
  amount_minor: number;
  currency: string;
  direction: "I_PAID" | "THEY_PAID";
  settlement_date: string;
  notes?: string;
}

interface Balance {
  person_id: string;
  person_name: string;
  net_balance_minor: number;
  currency: string;
}

interface Friend {
  id: string;
  name: string;
  status: string;
  linked_user_id: string | null;
}

/**
 * Balance.person_id is a canonical identity: for a friend who's accepted
 * their invite (linked to a real Suraty account), it's that account's user
 * id, not this friend's document id in the caller's own /friends collection.
 * POST /settlements requires the latter, so resolve back to it here —
 * otherwise settling a linked friend's balance 404s as "Friend not found."
 */
function resolveFriendId(balancePersonId: string, friends: Friend[]): string | undefined {
  const direct = friends.find(f => f.id === balancePersonId);
  if (direct) return direct.id;
  const linked = friends.find(f => f.linked_user_id === balancePersonId);
  return linked?.id;
}

function directionLabel(direction: "I_PAID" | "THEY_PAID", friendName: string) {
  return direction === "I_PAID" ? `You paid ${friendName}` : `${friendName} paid you`;
}

export default function SettlementsPage() {
  const { user } = useAuthStore();
  const currency = user?.currency ?? "INR";

  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const settlementsQuery = useQuery({
    queryKey: ["settlements"],
    queryFn: async () => (await api.get<Settlement[]>("/settlements")).data ?? [],
  });
  const balancesQuery = useQuery({
    queryKey: ["balances"],
    queryFn: async () => (await api.get<Balance[]>("/balances")).data ?? [],
  });
  const friendsQuery = useQuery({
    queryKey: ["friends"],
    queryFn: async () => (await api.get<Friend[]>("/friends")).data ?? [],
  });
  const settlements = settlementsQuery.data ?? [];
  const balances = balancesQuery.data ?? [];
  const friends = friendsQuery.data ?? [];
  // Only friends who've accepted their invite can be settled with.
  const activeFriends = friends.filter(f => f.status === "ACTIVE");
  const loading = settlementsQuery.isPending || balancesQuery.isPending || friendsQuery.isPending;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["settlements"] });
    queryClient.invalidateQueries({ queryKey: ["balances"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    queryClient.invalidateQueries({ queryKey: ["analytics-summary"] });
  };

  // Record modal
  const [showRecord, setShowRecord] = useState(false);
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [friendId, setFriendId] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"I_PAID" | "THEY_PAID">("I_PAID");
  const [settleDate, setSettleDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Settlement | null>(null);

  const selectedFriend = friends.find(f => f.id === friendId);
  const amountMinor = Math.round(parseFloat(amount) * 100);

  const handleReview = () => {
    if (!friendId || !amount || isNaN(amountMinor) || amountMinor <= 0) {
      setFormError("Select a friend and enter a valid amount greater than 0.");
      return;
    }
    setFormError(null);
    setStep("confirm");
  };

  const recordMutation = useMutation({
    mutationFn: () => api.post("/settlements", {
      friend_id: friendId,
      amount_minor: amountMinor,
      currency,
      direction,
      settlement_date: settleDate,
      notes,
    }),
    onSuccess: () => {
      invalidateAll();
      setShowRecord(false);
      setStep("form");
      setFriendId(""); setAmount(""); setDirection("I_PAID"); setNotes("");
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.detail || "Unable to record settlement. Please try again.");
      setStep("form");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/settlements/${id}`),
    onSuccess: () => {
      invalidateAll();
      setDeleteTarget(null);
    },
    onError: () => {
      setError("Unable to delete settlement. Please try again.");
      setDeleteTarget(null);
    },
  });

  const submitting = recordMutation.isPending;
  const deleting = deleteMutation.isPending;

  const handleRecord = () => recordMutation.mutate();
  const handleDelete = () => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); };

  const nonZeroBalances = balances.filter(b => b.net_balance_minor !== 0);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settlements</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginTop: 2 }}>
            Record payments and track what you owe or are owed
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowRecord(true); setStep("form"); }}>
          <Plus size={16} /> Record Settlement
        </button>
      </div>

      {(error || settlementsQuery.isError || balancesQuery.isError || friendsQuery.isError) && (
        <ErrorBanner message={error ?? "Unable to load settlements data. Please try again."} onDismiss={() => setError(null)} />
      )}

      {loading ? (
        <LoadingSpinner centered />
      ) : (
        <>
          {/* Outstanding balances */}
          <div className="card" style={{ padding: "var(--space-5)", marginBottom: "var(--space-6)" }}>
            <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-4)" }}>Outstanding Balances</h2>
            {nonZeroBalances.length === 0 ? (
              <EmptyState icon={<Handshake size={40} />} title="You're all settled" description="No outstanding balances with any friends." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {nonZeroBalances.map(b => {
                  const status = getBalanceStatus(b.net_balance_minor);
                  return (
                    <ListRow
                      key={b.person_id}
                      leading={<Avatar name={b.person_name} />}
                      title={b.person_name}
                      subtitle={<span style={{ color: status.color }}>{status.label}</span>}
                      trailing={
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
                          <MoneyAmount
                            amountMinor={b.net_balance_minor}
                            currency={b.currency}
                            variant={b.net_balance_minor > 0 ? "positive" : "negative"}
                            size="lg"
                          />
                          <button className="btn btn-secondary btn-sm" onClick={() => {
                            const resolvedId = resolveFriendId(b.person_id, friends);
                            if (!resolvedId) {
                              setError("Couldn't find that friend's record. Please refresh and try again.");
                              return;
                            }
                            setFriendId(resolvedId); setShowRecord(true); setStep("form");
                            setDirection(status.isOwed ? "THEY_PAID" : "I_PAID");
                          }}>Settle</button>
                        </div>
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Settlement history */}
          <div className="card" style={{ padding: "var(--space-5)" }}>
            <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-4)" }}>Settlement History</h2>
            {settlements.length === 0 ? (
              <EmptyState icon={<ClipboardList size={40} />} title="No settlements recorded" description="Once you record a payment, it will appear here." />
            ) : (
              settlements.map(s => (
                <ListRow
                  key={s.id}
                  title={directionLabel(s.direction, s.friend_name)}
                  subtitle={`${s.settlement_date}${s.notes ? ` · ${s.notes}` : ""}`}
                  trailing={
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
                      <MoneyAmount
                        amountMinor={s.amount_minor}
                        currency={s.currency}
                        variant={s.direction === "I_PAID" ? "negative" : "positive"}
                      />
                      <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(s)} aria-label="Delete settlement"><Trash2 size={14} /></button>
                    </div>
                  }
                />
              ))
            )}
          </div>
        </>
      )}

      {/* Record Settlement Modal */}
      <Modal
        open={showRecord}
        onClose={() => { setShowRecord(false); setStep("form"); setFormError(null); }}
        title="Record Settlement"
        footer={
          step === "form" ? (
            <>
              <button className="btn btn-secondary" onClick={() => setShowRecord(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleReview}>
                Review →
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => setStep("form")}>← Back</button>
              <button className="btn btn-primary" onClick={handleRecord} disabled={submitting}>
                {submitting ? "Saving…" : "Confirm & Save"}
              </button>
            </>
          )
        }
      >
        {formError && <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />}

        {step === "form" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="st-friend">Friend</label>
              <select id="st-friend" className={`input ${formError && !friendId ? "error" : ""}`} value={friendId} onChange={e => setFriendId(e.target.value)} style={{ padding: "0 var(--space-3)" }}>
                <option value="">Select a friend…</option>
                {activeFriends.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              {activeFriends.length === 0 && (
                <span className="form-error" style={{ color: "var(--color-text-muted)" }}>
                  No friends have accepted an invite yet. <Link href="/friends" style={{ fontWeight: 600 }}>Invite a friend →</Link>
                </span>
              )}
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="st-amount">Amount</label>
              <input id="st-amount" className={`input input-amount ${formError && !(amount && amountMinor > 0) ? "error" : ""}`} type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Who paid?</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                {(["I_PAID", "THEY_PAID"] as const).map(d => (
                  <Tile
                    key={d}
                    selected={direction === d}
                    onClick={() => setDirection(d)}
                    label={d === "I_PAID" ? "I paid them" : "They paid me"}
                  />
                ))}
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="st-date">Date</label>
              <input id="st-date" className="input" type="date" value={settleDate} onChange={e => setSettleDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="st-notes">Notes (optional)</label>
              <input id="st-notes" className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Dinner from last week" />
            </div>
          </div>
        ) : (
          <div style={{
            background: "var(--color-surface-2)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-5)",
            display: "flex", flexDirection: "column", gap: "var(--space-3)",
          }}>
            <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700 }}>Confirm Settlement</h3>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-sm)" }}>
              <span style={{ color: "var(--color-text-secondary)" }}>Action</span>
              <span style={{ fontWeight: 600 }}>{direction === "I_PAID" ? `You paid ${selectedFriend?.name}` : `${selectedFriend?.name} paid you`}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-sm)" }}>
              <span style={{ color: "var(--color-text-secondary)" }}>Amount</span>
              <span className="amount" style={{ fontSize: "var(--text-lg)", fontWeight: 700 }}>{formatMinor(amountMinor, currency)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-sm)" }}>
              <span style={{ color: "var(--color-text-secondary)" }}>Date</span>
              <span style={{ fontWeight: 600 }}>{settleDate}</span>
            </div>
            {notes && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-sm)" }}>
                <span style={{ color: "var(--color-text-secondary)" }}>Notes</span>
                <span style={{ fontWeight: 600 }}>{notes}</span>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Settlement"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Yes, Delete"}
            </button>
          </>
        }
      >
        <p style={{ fontSize: "var(--text-base)" }}>
          Delete this settlement of <strong>{deleteTarget && formatMinor(deleteTarget.amount_minor, deleteTarget.currency)}</strong>?
        </p>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginTop: "var(--space-2)" }}>This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
