"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatMinor } from "@/lib/money";
import { useAuthStore } from "@/store/authStore";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";

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
}

function directionLabel(direction: "I_PAID" | "THEY_PAID", friendName: string) {
  return direction === "I_PAID" ? `You paid ${friendName}` : `${friendName} paid you`;
}

export default function SettlementsPage() {
  const { user } = useAuthStore();
  const currency = user?.currency ?? "INR";

  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Record modal
  const [showRecord, setShowRecord] = useState(false);
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [friendId, setFriendId] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"I_PAID" | "THEY_PAID">("I_PAID");
  const [settleDate, setSettleDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Settlement | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sRes, bRes, fRes] = await Promise.all([
        api.get("/settlements"),
        api.get("/balances"),
        api.get("/friends"),
      ]);
      setSettlements(sRes.data ?? []);
      setBalances(bRes.data ?? []);
      setFriends(fRes.data ?? []);
    } catch {
      setError("Unable to load settlements data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const selectedFriend = friends.find(f => f.id === friendId);
  const amountMinor = Math.round(parseFloat(amount) * 100);

  const handleRecord = async () => {
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post("/settlements", {
        friend_id: friendId,
        amount_minor: amountMinor,
        currency,
        direction,
        settlement_date: settleDate,
        notes,
      });
      setShowRecord(false);
      setStep("form");
      setFriendId(""); setAmount(""); setDirection("I_PAID"); setNotes("");
      fetchAll();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || "Unable to record settlement. Please try again.");
      setStep("form");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/settlements/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchAll();
    } catch {
      setError("Unable to delete settlement. Please try again.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

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
          + Record Settlement
        </button>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {loading ? (
        <LoadingSpinner centered />
      ) : (
        <>
          {/* Outstanding balances */}
          <div className="card" style={{ padding: "var(--space-5)", marginBottom: "var(--space-6)" }}>
            <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-4)" }}>Outstanding Balances</h2>
            {nonZeroBalances.length === 0 ? (
              <EmptyState icon="🤝" title="You're all settled" description="No outstanding balances with any friends." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {nonZeroBalances.map(b => {
                  const isOwed = b.net_balance_minor > 0;
                  return (
                    <div key={b.person_id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "var(--space-4) 0",
                      borderBottom: "1px solid var(--color-border)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                        <Avatar name={b.person_name} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>{b.person_name}</div>
                          <div style={{ fontSize: "var(--text-xs)", color: isOwed ? "var(--color-success)" : "var(--color-danger)", fontWeight: 500 }}>
                            {isOwed ? "Owes you" : "You owe"}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
                        <span className="amount" style={{ fontSize: "var(--text-lg)", color: isOwed ? "var(--color-success)" : "var(--color-danger)" }}>
                          {formatMinor(Math.abs(b.net_balance_minor), b.currency)}
                        </span>
                        <button className="btn btn-secondary btn-sm" onClick={() => {
                          setFriendId(b.person_id); setShowRecord(true); setStep("form");
                          setDirection(isOwed ? "THEY_PAID" : "I_PAID");
                        }}>Settle</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Settlement history */}
          <div className="card" style={{ padding: "var(--space-5)" }}>
            <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-4)" }}>Settlement History</h2>
            {settlements.length === 0 ? (
              <EmptyState icon="📋" title="No settlements recorded" description="Once you record a payment, it will appear here." />
            ) : (
              settlements.map(s => (
                <div key={s.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "var(--space-4) 0",
                  borderBottom: "1px solid var(--color-border)",
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>
                      {directionLabel(s.direction, s.friend_name)}
                    </div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>
                      {s.settlement_date}{s.notes ? ` · ${s.notes}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
                    <span className={`amount ${s.direction === "I_PAID" ? "amount-negative" : "amount-positive"}`} style={{ fontSize: "var(--text-base)" }}>
                      {formatMinor(s.amount_minor, s.currency)}
                    </span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(s)} aria-label="Delete settlement">✕</button>
                  </div>
                </div>
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
              <button
                className="btn btn-primary"
                disabled={!friendId || !amount || isNaN(amountMinor) || amountMinor <= 0}
                onClick={() => { setFormError(null); setStep("confirm"); }}
              >
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
              <select id="st-friend" className="input" value={friendId} onChange={e => setFriendId(e.target.value)} style={{ padding: "0 var(--space-3)" }}>
                <option value="">Select a friend…</option>
                {friends.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="st-amount">Amount</label>
              <input id="st-amount" className="input input-amount" type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Who paid?</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                {(["I_PAID", "THEY_PAID"] as const).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDirection(d)}
                    style={{
                      padding: "var(--space-3)",
                      borderRadius: "var(--radius-md)",
                      border: `2px solid ${direction === d ? "var(--color-accent)" : "var(--color-border)"}`,
                      background: direction === d ? "var(--color-accent-light)" : "var(--color-surface-2)",
                      cursor: "pointer", fontWeight: 600, fontSize: "var(--text-sm)",
                      color: direction === d ? "var(--color-accent)" : "var(--color-text)",
                      transition: "all var(--transition-fast)",
                    }}
                    aria-pressed={direction === d}
                  >
                    {d === "I_PAID" ? "I paid them" : "They paid me"}
                  </button>
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

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: 36, height: 36, borderRadius: "50%",
      background: "var(--color-accent-light)", color: "var(--color-accent)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "var(--text-xs)", fontWeight: 700, flexShrink: 0,
    }}>{initials}</div>
  );
}
