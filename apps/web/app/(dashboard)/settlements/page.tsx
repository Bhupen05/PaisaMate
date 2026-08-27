"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatMinor } from "@/lib/money";
import { useAuthStore } from "@/store/authStore";

interface Friend {
  id: string;
  name: string;
  email: string | null;
}

interface Balance {
  person_type: "USER" | "FRIEND";
  person_id: string;
  person_name: string;
  net_balance_minor: number;
  currency: string;
  description: string;
}

interface Settlement {
  id: string;
  from_person_type: "USER" | "FRIEND";
  from_person_id: string;
  to_person_type: "USER" | "FRIEND";
  to_person_id: string;
  amount_minor: number;
  currency: string;
  settlement_date: string;
  note: string | null;
  reference: string | null;
}

export default function SettlementsPage() {
  const { user } = useAuthStore();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showFormModal, setShowFormModal] = useState(false);
  const [fromPerson, setFromPerson] = useState(""); // "USER:id" or "FRIEND:id"
  const [toPerson, setToPerson] = useState(""); // "USER:id" or "FRIEND:id"
  const [amount, setAmount] = useState("");
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [reference, setReference] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [balancesRes, settlementsRes, friendsRes] = await Promise.all([
        api.get("/balances"),
        api.get("/settlements"),
        api.get("/friends"),
      ]);
      setBalances(balancesRes.data);
      setSettlements(settlementsRes.data);
      setFriends(friendsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRecordSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = parseFloat(amount.replace(/[^\d.]/g, ""));
    if (isNaN(cleanAmount) || cleanAmount <= 0 || !fromPerson || !toPerson) return;
    if (fromPerson === toPerson) {
      setServerError("Source and destination cannot be the same.");
      return;
    }

    setFormLoading(true);
    setServerError(null);

    const [fromType, fromId] = fromPerson.split(":");
    const [toType, toId] = toPerson.split(":");

    try {
      await api.post("/settlements", {
        from_person_type: fromType,
        from_person_id: fromId,
        to_person_type: toType,
        to_person_id: toId,
        amount_minor: Math.round(cleanAmount * 100),
        currency: user?.currency || "INR",
        settlement_date: settlementDate,
        note: note || null,
        reference: reference || null,
      });

      setShowFormModal(false);
      setAmount("");
      setNote("");
      setReference("");
      fetchData();
    } catch (err: any) {
      setServerError(err.response?.data?.detail || "Failed to record settlement.");
    } finally {
      setFormLoading(false);
    }
  };

  const initSettlementForm = (bal: Balance) => {
    if (!user) return;
    if (bal.net_balance_minor > 0) {
      // They owe you money: repayment from FRIEND to USER
      setFromPerson(`FRIEND:${bal.person_id}`);
      setToPerson(`USER:${user.id}`);
      setAmount((bal.net_balance_minor / 100).toString());
    } else if (bal.net_balance_minor < 0) {
      // You owe them money: repayment from USER to FRIEND
      setFromPerson(`USER:${user.id}`);
      setToPerson(`FRIEND:${bal.person_id}`);
      setAmount((Math.abs(bal.net_balance_minor) / 100).toString());
    } else {
      // Settled
      setFromPerson(`USER:${user.id}`);
      setToPerson(`FRIEND:${bal.person_id}`);
      setAmount("");
    }
    setSettlementDate(new Date().toISOString().split("T")[0]);
    setNote("Settling ledger");
    setReference("");
    setShowFormModal(true);
  };

  const getPersonName = (type: string, id: string) => {
    if (type === "USER") return "You";
    return friends.find(f => f.id === id)?.name || "Unknown";
  };

  const userCurrency = user?.currency || "INR";

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settlements</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginTop: "4px" }}>
            Record debt repayments and view full settlement logs.
          </p>
        </div>
        <button
          onClick={() => {
            if (user) {
              setFromPerson(`USER:${user.id}`);
              setToPerson("");
              setAmount("");
              setNote("");
              setReference("");
              setShowFormModal(true);
            }
          }}
          className="btn btn-primary"
        >
          ➕ Record Settlement
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
          <div style={{
            width: "30px",
            height: "30px",
            border: "3px solid var(--color-border)",
            borderTopColor: "var(--color-accent)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: "var(--space-6)",
        }} className="settlements-grid">
          {/* Left Column: Outstanding Balances */}
          <div>
            <div className="card" style={{ padding: "var(--space-4)" }}>
              <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-4)" }}>
                Outstanding Balances
              </h3>
              {balances.filter(b => b.net_balance_minor !== 0).length === 0 ? (
                <p style={{ textAlign: "center", padding: "20px 0", color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
                  All group balances are settled! 🎉
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  {balances.filter(b => b.net_balance_minor !== 0).map((bal) => (
                    <div key={bal.person_id} style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-2)",
                      padding: "var(--space-3)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--color-surface-2)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>{bal.person_name}</span>
                        <span className={`amount ${
                          bal.net_balance_minor > 0 ? "amount-positive" : "amount-negative"
                        }`} style={{ fontWeight: 700 }}>
                          {bal.net_balance_minor > 0 ? "+" : ""}
                          {formatMinor(bal.net_balance_minor, bal.currency)}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "10px", color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                          {bal.description}
                        </span>
                        <button
                          onClick={() => initSettlementForm(bal)}
                          className="btn btn-secondary btn-sm"
                          style={{ height: "26px", fontSize: "10px" }}
                        >
                          Settle
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Settlement History Logs */}
          <div>
            <div className="card" style={{ padding: "var(--space-5)" }}>
              <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-4)" }}>
                Repayment Logs (Auditable)
              </h3>
              {settlements.length === 0 ? (
                <p style={{ textAlign: "center", padding: "40px 0", color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
                  No settlement records found.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  {settlements.map((s) => {
                    const fromName = getPersonName(s.from_person_type, s.from_person_id);
                    const toName = getPersonName(s.to_person_type, s.to_person_id);

                    return (
                      <div key={s.id} style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "var(--space-3)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-md)",
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>
                            💸 {fromName} paid {toName}
                          </div>
                          {s.note && (
                            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginTop: "2px" }}>
                              Note: {s.note}
                            </div>
                          )}
                          <div style={{ fontSize: "10px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                            {s.settlement_date} {s.reference && `• UPI Ref: ${s.reference}`}
                          </div>
                        </div>
                        <span className="amount" style={{ fontWeight: 700, fontSize: "var(--text-base)" }}>
                          {formatMinor(s.amount_minor, s.currency)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Record Settlement Modal */}
      {showFormModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "var(--space-4)",
        }}>
          <div className="card animate-fade-in" style={{
            width: "100%",
            maxWidth: "400px",
            padding: "var(--space-6)",
            backgroundColor: "var(--color-surface)",
            borderRadius: "var(--radius-lg)",
          }}>
            <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 700, marginBottom: "var(--space-4)", color: "var(--color-primary)" }}>
              Record a Repayment
            </h3>
            <form onSubmit={handleRecordSettlement}>
              {serverError && (
                <div style={{
                  backgroundColor: "var(--color-danger-bg)",
                  color: "var(--color-danger)",
                  padding: "var(--space-2) var(--space-3)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "var(--text-sm)",
                  marginBottom: "var(--space-4)",
                }}>
                  {serverError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Who Paid?</label>
                <select
                  className="input"
                  style={{ padding: "0 var(--space-2)" }}
                  value={fromPerson}
                  onChange={(e) => setFromPerson(e.target.value)}
                >
                  <option value={`USER:${user?.id}`}>You (User)</option>
                  {friends.map(f => (
                    <option key={f.id} value={`FRIEND:${f.id}`}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Who Received?</label>
                <select
                  className="input"
                  style={{ padding: "0 var(--space-2)" }}
                  value={toPerson}
                  onChange={(e) => setToPerson(e.target.value)}
                >
                  <option value="">Select recipient...</option>
                  <option value={`USER:${user?.id}`}>You (User)</option>
                  {friends.map(f => (
                    <option key={f.id} value={`FRIEND:${f.id}`}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input
                    type="text"
                    required
                    placeholder="0.00"
                    className="input input-amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    required
                    className="input"
                    value={settlementDate}
                    onChange={(e) => setSettlementDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">UPI Reference / Ref ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. UPI-12345"
                  className="input"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "var(--space-6)" }}>
                <label className="form-label">Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. dinner share repayment"
                  className="input"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="btn btn-secondary"
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={formLoading}
                >
                  {formLoading ? "Recording..." : "Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media (max-width: 768px) {
          .settlements-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
