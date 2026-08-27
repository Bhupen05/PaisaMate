"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatMinor } from "@/lib/money";
import { useAuthStore } from "@/store/authStore";

interface Friend {
  id: string;
  name: string;
  email: string | null;
  status: string;
}

interface ParticipantResponse {
  id: string;
  person_id: string;
  person_type: "USER" | "FRIEND";
  share_amount_minor: number;
  share_percentage: number | null;
  paid_amount_minor: number;
  settled_amount_minor: number;
}

interface SharedExpense {
  id: string;
  title: string;
  total_amount_minor: number;
  currency: string;
  expense_date: string;
  category_id: string | null;
  payer_type: "USER" | "FRIEND";
  payer_id: string;
  split_method: "EQUAL" | "CUSTOM_AMOUNT" | "PERCENTAGE";
  status: string;
  note: string | null;
  participants: ParticipantResponse[];
}

export default function SharedExpensesPage() {
  const { user } = useAuthStore();
  const [sharedExpenses, setSharedExpenses] = useState<SharedExpense[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState("other");
  const [note, setNote] = useState("");

  const [payerType, setPayerType] = useState<"USER" | "FRIEND">("USER");
  const [payerId, setPayerId] = useState("");
  const [splitMethod, setSplitMethod] = useState<"EQUAL" | "CUSTOM_AMOUNT" | "PERCENTAGE">("EQUAL");

  // Selection states for participants
  const [selectedUser, setSelectedUser] = useState(true);
  const [selectedFriends, setSelectedFriends] = useState<Record<string, boolean>>({});

  // Input states for custom split amounts & percentages
  const [customShares, setCustomShares] = useState<Record<string, string>>({}); // id -> text amount
  const [customPercentages, setCustomPercentages] = useState<Record<string, string>>({}); // id -> text percentage

  const [formLoading, setFormLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const fetchSharedExpenses = async () => {
    setLoading(true);
    try {
      const [sharedRes, friendsRes] = await Promise.all([
        api.get("/shared-expenses"),
        api.get("/friends"),
      ]);
      setSharedExpenses(sharedRes.data);
      setFriends(friendsRes.data);
    } catch (err) {
      console.error("Failed to load shared expenses data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedExpenses();
  }, []);

  // Update default payer when user changes payerType
  useEffect(() => {
    if (payerType === "USER" && user) {
      setPayerId(user.id);
    } else if (payerType === "FRIEND" && friends.length > 0) {
      setPayerId(friends[0].id);
    }
  }, [payerType, friends, user]);

  const activeParticipantsList = () => {
    const list: Array<{ id: string; type: "USER" | "FRIEND"; name: string }> = [];
    if (selectedUser && user) {
      list.push({ id: user.id, type: "USER", name: "You" });
    }
    friends.forEach((f) => {
      if (selectedFriends[f.id]) {
        list.push({ id: f.id, type: "FRIEND", name: f.name });
      }
    });
    return list;
  };

  // Split Logic & Validation
  const getSplitState = () => {
    const amountFloat = parseFloat(totalAmount.replace(/[^\d.]/g, ""));
    const totalMinor = isNaN(amountFloat) ? 0 : Math.round(amountFloat * 100);
    const participants = activeParticipantsList();
    const count = participants.length;

    let shareAmounts: Record<string, number> = {}; // key: "type:id" -> minor units
    let isValid = false;
    let detailsText = "";

    if (totalMinor <= 0 || count === 0) {
      return { shareAmounts, isValid, detailsText, totalMinor };
    }

    if (splitMethod === "EQUAL") {
      const base = Math.floor(totalMinor / count);
      const remainder = totalMinor % count;
      participants.forEach((p, idx) => {
        const key = `${p.type}:${p.id}`;
        shareAmounts[key] = base + (idx < remainder ? 1 : 0);
      });
      isValid = true;
      detailsText = "Split matches total amount (₹" + (totalMinor / 100).toFixed(2) + " equally)";
    } else if (splitMethod === "CUSTOM_AMOUNT") {
      let sumMinor = 0;
      participants.forEach((p) => {
        const key = `${p.type}:${p.id}`;
        const inputVal = parseFloat(customShares[key] || "0");
        const valMinor = isNaN(inputVal) ? 0 : Math.round(inputVal * 100);
        shareAmounts[key] = valMinor;
        sumMinor += valMinor;
      });
      const diff = totalMinor - sumMinor;
      isValid = diff === 0;
      if (diff === 0) {
        detailsText = "All shares sum exactly to total.";
      } else {
        detailsText = `Shares sum: ₹${(sumMinor / 100).toFixed(2)}. ${diff > 0 ? "Owed: ₹" + (diff / 100).toFixed(2) : "Overassigned: ₹" + (Math.abs(diff) / 100).toFixed(2)}`;
      }
    } else if (splitMethod === "PERCENTAGE") {
      let sumPct = 0;
      participants.forEach((p) => {
        const key = `${p.type}:${p.id}`;
        const pctInput = parseFloat(customPercentages[key] || "0");
        sumPct += isNaN(pctInput) ? 0 : pctInput;
      });

      const diffPct = 100.0 - sumPct;
      isValid = Math.abs(diffPct) < 0.01;

      if (isValid) {
        // Calculate shares
        let sumAssignedMinor = 0;
        participants.forEach((p, idx) => {
          const key = `${p.type}:${p.id}`;
          const pct = parseFloat(customPercentages[key] || "0") || 0;
          const share = Math.round((totalMinor * pct) / 100);
          shareAmounts[key] = share;
          sumAssignedMinor += share;
        });

        // Rounding difference adjustment
        const diffMinor = totalMinor - sumAssignedMinor;
        if (diffMinor !== 0 && count > 0) {
          const lastKey = `${participants[count - 1].type}:${participants[count - 1].id}`;
          shareAmounts[lastKey] = (shareAmounts[lastKey] || 0) + diffMinor;
        }

        detailsText = "Percentages sum to 100%.";
      } else {
        detailsText = `Percentages sum: ${sumPct.toFixed(2)}% (${diffPct > 0 ? "Remaining: " + diffPct.toFixed(2) + "%" : "Over: " + Math.abs(diffPct).toFixed(2) + "%"})`;
      }
    }

    return { shareAmounts, isValid, detailsText, totalMinor };
  };

  const { shareAmounts, isValid, detailsText, totalMinor } = getSplitState();

  const handleCreateShared = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !title || totalMinor <= 0) return;

    setFormLoading(true);
    setServerError(null);

    const apiParticipants = activeParticipantsList().map((p) => {
      const key = `${p.type}:${p.id}`;
      const amountVal = shareAmounts[key] || 0;
      const pct = splitMethod === "PERCENTAGE" ? parseFloat(customPercentages[key] || "0") : null;
      return {
        person_type: p.type,
        person_id: p.id,
        share_amount_minor: amountVal,
        share_percentage: pct,
      };
    });

    try {
      await api.post("/shared-expenses", {
        title,
        total_amount_minor: totalMinor,
        currency: user?.currency || "INR",
        expense_date: expenseDate,
        category_id: category,
        payer_type: payerType,
        payer_id: payerId,
        participants: apiParticipants,
        split_method: splitMethod,
        note: note || null,
      });

      setShowAddModal(false);
      setTitle("");
      setTotalAmount("");
      setNote("");
      setSelectedFriends({});
      setCustomShares({});
      setCustomPercentages({});
      fetchSharedExpenses();
    } catch (err: any) {
      console.error(err);
      setServerError(err.response?.data?.detail || "Failed to create shared expense.");
    } finally {
      setFormLoading(false);
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends((prev) => ({
      ...prev,
      [friendId]: !prev[friendId],
    }));
  };

  const userCurrency = user?.currency || "INR";

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Shared Expenses</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginTop: "4px" }}>
            Split bills with group members and view debt ledgers.
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          ➕ Split Bill
        </button>
      </div>

      {/* Shared Expenses Grid Log */}
      <div className="card" style={{ padding: "var(--space-4)", overflowX: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <div style={{
              width: "30px",
              height: "30px",
              border: "3px solid var(--color-border)",
              borderTopColor: "var(--color-accent)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }} />
          </div>
        ) : sharedExpenses.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--color-text-muted)" }}>
            No shared expenses created yet.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "var(--text-sm)" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
                <th style={{ padding: "var(--space-3) var(--space-2)" }}>Expense Title</th>
                <th style={{ padding: "var(--space-3) var(--space-2)" }}>Date</th>
                <th style={{ padding: "var(--space-3) var(--space-2)" }}>Payer</th>
                <th style={{ padding: "var(--space-3) var(--space-2)" }}>Participants</th>
                <th style={{ padding: "var(--space-3) var(--space-2)" }}>Split Method</th>
                <th style={{ padding: "var(--space-3) var(--space-2)" }}>Status</th>
                <th style={{ padding: "var(--space-3) var(--space-2)", textAlign: "right" }}>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {sharedExpenses.map((item) => {
                const payerName = item.payer_type === "USER"
                  ? "You"
                  : (friends.find(f => f.id === item.payer_id)?.name || "Unknown");
                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--color-border)" }} className="table-row">
                    <td style={{ padding: "var(--space-3) var(--space-2)", fontWeight: 600 }}>{item.title}</td>
                    <td style={{ padding: "var(--space-3) var(--space-2)" }}>{item.expense_date}</td>
                    <td style={{ padding: "var(--space-3) var(--space-2)" }}>{payerName}</td>
                    <td style={{ padding: "var(--space-3) var(--space-2)" }}>
                      {item.participants.length} people
                    </td>
                    <td style={{ padding: "var(--space-3) var(--space-2)", fontSize: "11px", fontWeight: 600 }}>
                      {item.split_method.replace("_", " ")}
                    </td>
                    <td style={{ padding: "var(--space-3) var(--space-2)" }}>
                      <span className={`badge ${
                        item.status === "SETTLED" ? "badge-need" : "badge-dream"
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: "var(--space-3) var(--space-2)", textAlign: "right", fontWeight: 600 }} className="amount">
                      {formatMinor(item.total_amount_minor, item.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Split Modal Form */}
      {showAddModal && (
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
            maxWidth: "520px",
            maxHeight: "90vh",
            overflowY: "auto",
            padding: "var(--space-6)",
            backgroundColor: "var(--color-surface)",
            borderRadius: "var(--radius-lg)",
          }}>
            <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 700, marginBottom: "var(--space-4)", color: "var(--color-primary)" }}>
              Split a Bill
            </h3>
            <form onSubmit={handleCreateShared}>
              {serverError && (
                <div style={{
                  backgroundColor: "var(--color-danger-bg)",
                  color: "var(--color-danger)",
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-sm)",
                  marginBottom: "var(--space-4)",
                }}>
                  {serverError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Expense Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cafe dinner"
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                <div className="form-group">
                  <label className="form-label">Total Amount</label>
                  <input
                    type="text"
                    required
                    placeholder="0.00"
                    className="input input-amount"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    required
                    className="input"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                {/* Payer selection */}
                <div className="form-group">
                  <label className="form-label">Who Paid?</label>
                  <select
                    className="input"
                    style={{ padding: "0 var(--space-2)" }}
                    value={`${payerType}:${payerId}`}
                    onChange={(e) => {
                      const [type, id] = e.target.value.split(":");
                      setPayerType(type as any);
                      setPayerId(id);
                    }}
                  >
                    <option value={`USER:${user?.id}`}>You (User)</option>
                    {friends.map(f => (
                      <option key={f.id} value={`FRIEND:${f.id}`}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Split Method</label>
                  <select
                    className="input"
                    style={{ padding: "0 var(--space-2)" }}
                    value={splitMethod}
                    onChange={(e) => setSplitMethod(e.target.value as any)}
                  >
                    <option value="EQUAL">Split Equally</option>
                    <option value="CUSTOM_AMOUNT">Custom Share Amounts</option>
                    <option value="PERCENTAGE">Split by Percentage</option>
                  </select>
                </div>
              </div>

              {/* Participant Checklist Selector */}
              <div className="form-group">
                <label className="form-label">Select Participants</label>
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "var(--space-2)",
                  padding: "var(--space-3)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--color-surface-2)",
                  maxHeight: "100px",
                  overflowY: "auto",
                }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "var(--text-sm)", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.checked)}
                    />
                    You
                  </label>
                  {friends.filter(f => f.status === "ACTIVE").map((f) => (
                    <label key={f.id} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "var(--text-sm)", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={!!selectedFriends[f.id]}
                        onChange={() => toggleFriendSelection(f.id)}
                      />
                      {f.name}
                    </label>
                  ))}
                </div>
              </div>

              {/* Split Editor Section */}
              <div style={{
                marginTop: "var(--space-4)",
                padding: "var(--space-4)",
                backgroundColor: "var(--color-surface-2)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
              }}>
                <h4 style={{ fontSize: "var(--text-sm)", fontWeight: 700, marginBottom: "var(--space-3)", color: "var(--color-primary)" }}>
                  Split Share Editor
                </h4>

                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", maxHeight: "160px", overflowY: "auto", paddingRight: "4px" }}>
                  {activeParticipantsList().map((p) => {
                    const key = `${p.type}:${p.id}`;
                    return (
                      <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)" }}>
                        <span style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>{p.name}</span>

                        {splitMethod === "EQUAL" && (
                          <span className="amount" style={{ fontSize: "var(--text-sm)" }}>
                            {formatMinor(shareAmounts[key] || 0, userCurrency)}
                          </span>
                        )}

                        {splitMethod === "CUSTOM_AMOUNT" && (
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>₹</span>
                            <input
                              type="text"
                              placeholder="0.00"
                              className="input input-amount"
                              style={{ width: "90px", height: "30px", fontSize: "var(--text-sm)" }}
                              value={customShares[key] || ""}
                              onChange={(e) => {
                                setCustomShares({ ...customShares, [key]: e.target.value });
                              }}
                            />
                          </div>
                        )}

                        {splitMethod === "PERCENTAGE" && (
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <input
                              type="text"
                              placeholder="0"
                              className="input"
                              style={{ width: "60px", height: "30px", textAlign: "right" }}
                              value={customPercentages[key] || ""}
                              onChange={(e) => {
                                setCustomPercentages({ ...customPercentages, [key]: e.target.value });
                              }}
                            />
                            <span style={{ fontSize: "var(--text-sm)" }}>%</span>
                            <span className="amount" style={{ fontSize: "11px", color: "var(--color-text-secondary)", width: "70px", textAlign: "right" }}>
                              ({formatMinor(shareAmounts[key] || 0, userCurrency)})
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Validation Indicator */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px solid var(--color-border)",
                  marginTop: "var(--space-3)",
                  paddingTop: "var(--space-2)",
                  fontSize: "var(--text-xs)",
                  color: isValid ? "var(--color-success)" : "var(--color-danger)",
                  fontWeight: 600,
                }}>
                  <span>{isValid ? "✅ Reconciled" : "⚠️ Unreconciled"}</span>
                  <span>{detailsText}</span>
                </div>
              </div>

              {/* Submit footer */}
              <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end", marginTop: "var(--space-5)" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={formLoading || !isValid}
                >
                  {formLoading ? "Submitting..." : "Split Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media (max-width: 768px) {
          .friends-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
