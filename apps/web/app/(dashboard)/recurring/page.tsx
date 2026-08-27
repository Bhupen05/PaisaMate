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

interface Participant {
  id: string;
  person_id: string;
  person_type: "USER" | "FRIEND";
  share_amount_minor: number | null;
  share_percentage: number | null;
}

interface RecurringTemplate {
  id: string;
  title: string;
  amount_minor: number;
  currency: string;
  billing_day: number;
  payer_type: "USER" | "FRIEND";
  payer_id: string;
  split_method: "EQUAL" | "CUSTOM_AMOUNT" | "PERCENTAGE";
  start_date: string;
  end_date: string | null;
  active: boolean;
  participants: Participant[];
}

export default function RecurringPage() {
  const { user } = useAuthStore();
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [billingDay, setBillingDay] = useState(5);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");

  const [payerType, setPayerType] = useState<"USER" | "FRIEND">("USER");
  const [payerId, setPayerId] = useState("");
  const [splitMethod, setSplitMethod] = useState<"EQUAL" | "CUSTOM_AMOUNT" | "PERCENTAGE">("EQUAL");

  // Selection states
  const [selectedUser, setSelectedUser] = useState(true);
  const [selectedFriends, setSelectedFriends] = useState<Record<string, boolean>>({});

  // Input states for split
  const [customShares, setCustomShares] = useState<Record<string, string>>({}); // id -> string
  const [customPercentages, setCustomPercentages] = useState<Record<string, string>>({}); // id -> string

  const [formLoading, setFormLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const [recurringRes, friendsRes] = await Promise.all([
        api.get("/recurring"),
        api.get("/friends"),
      ]);
      setTemplates(recurringRes.data);
      setFriends(friendsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
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

  // Split calculations
  const getSplitState = () => {
    const amountFloat = parseFloat(amount.replace(/[^\d.]/g, ""));
    const totalMinor = isNaN(amountFloat) ? 0 : Math.round(amountFloat * 100);
    const participants = activeParticipantsList();
    const count = participants.length;

    let shareAmounts: Record<string, number> = {};
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
      detailsText = "Split matches total amount equally.";
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
        detailsText = "All custom amounts sum exactly to total.";
      } else {
        detailsText = `Amounts sum: ₹${(sumMinor / 100).toFixed(2)}. ${diff > 0 ? "Owed: ₹" + (diff / 100).toFixed(2) : "Overassigned: ₹" + (Math.abs(diff) / 100).toFixed(2)}`;
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
        let sumAssignedMinor = 0;
        participants.forEach((p) => {
          const key = `${p.type}:${p.id}`;
          const pct = parseFloat(customPercentages[key] || "0") || 0;
          const share = Math.round((totalMinor * pct) / 100);
          shareAmounts[key] = share;
          sumAssignedMinor += share;
        });

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

  const handleCreateTemplate = async (e: React.FormEvent) => {
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
      await api.post("/recurring", {
        title,
        amount_minor: totalMinor,
        currency: user?.currency || "INR",
        billing_day: billingDay,
        payer_type: payerType,
        payer_id: payerId,
        participants: apiParticipants,
        split_method: splitMethod,
        start_date: startDate,
        end_date: endDate || null,
      });

      setShowAddModal(false);
      setTitle("");
      setAmount("");
      setEndDate("");
      setSelectedFriends({});
      setCustomShares({});
      setCustomPercentages({});
      fetchTemplates();
    } catch (err: any) {
      console.error(err);
      setServerError(err.response?.data?.detail || "Failed to create recurring template.");
    } finally {
      setFormLoading(false);
    }
  };

  const handlePause = async (id: string) => {
    try {
      await api.post(`/recurring/${id}/pause`);
      fetchTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResume = async (id: string) => {
    try {
      await api.post(`/recurring/${id}/resume`);
      fetchTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this recurring template? Future monthly expenses will not generate.")) return;
    try {
      await api.delete(`/recurring/${id}`);
      fetchTemplates();
    } catch (err) {
      console.error(err);
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
          <h1 className="page-title">Recurring Expense Templates</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginTop: "4px" }}>
            Automate monthly shared expenses by setting billing templates.
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          ➕ New Template
        </button>
      </div>

      {/* Templates log */}
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
        ) : templates.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--color-text-muted)" }}>
            No recurring templates configured.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "var(--text-sm)" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
                <th style={{ padding: "var(--space-3) var(--space-2)" }}>Title</th>
                <th style={{ padding: "var(--space-3) var(--space-2)" }}>Billing Schedule</th>
                <th style={{ padding: "var(--space-3) var(--space-2)" }}>Payer</th>
                <th style={{ padding: "var(--space-3) var(--space-2)" }}>Split Method</th>
                <th style={{ padding: "var(--space-3) var(--space-2)" }}>Status</th>
                <th style={{ padding: "var(--space-3) var(--space-2)", textAlign: "right" }}>Monthly Amount</th>
                <th style={{ padding: "var(--space-3) var(--space-2)", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((item) => {
                const payerName = item.payer_type === "USER"
                  ? "You"
                  : (friends.find(f => f.id === item.payer_id)?.name || "Unknown");
                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--color-border)" }} className="table-row">
                    <td style={{ padding: "var(--space-3) var(--space-2)", fontWeight: 600 }}>{item.title}</td>
                    <td style={{ padding: "var(--space-3) var(--space-2)" }}>Day {item.billing_day} (Starts {item.start_date})</td>
                    <td style={{ padding: "var(--space-3) var(--space-2)" }}>{payerName}</td>
                    <td style={{ padding: "var(--space-3) var(--space-2)", fontSize: "11px", fontWeight: 600 }}>
                      {item.split_method.replace("_", " ")}
                    </td>
                    <td style={{ padding: "var(--space-3) var(--space-2)" }}>
                      <span className={`badge ${
                        item.active ? "badge-need" : "badge-dream"
                      }`}>
                        {item.active ? "Active" : "Paused"}
                      </span>
                    </td>
                    <td style={{ padding: "var(--space-3) var(--space-2)", textAlign: "right", fontWeight: 600 }} className="amount">
                      {formatMinor(item.amount_minor, item.currency)}
                    </td>
                    <td style={{ padding: "var(--space-3) var(--space-2)", textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "var(--space-1)", justifyContent: "center" }}>
                        {item.active ? (
                          <button
                            onClick={() => handlePause(item.id)}
                            className="btn btn-secondary btn-sm"
                            style={{ height: "26px", fontSize: "10px" }}
                          >
                            ⏸️ Pause
                          </button>
                        ) : (
                          <button
                            onClick={() => handleResume(item.id)}
                            className="btn btn-primary btn-sm"
                            style={{ height: "26px", fontSize: "10px", backgroundColor: "var(--color-success)" }}
                          >
                            ▶️ Resume
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="btn btn-ghost btn-sm"
                          style={{ height: "26px", padding: "0 6px", color: "var(--color-danger)" }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Modal */}
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
              Add Monthly Recurring Bill
            </h3>
            <form onSubmit={handleCreateTemplate}>
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
                <label className="form-label">Template Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WiFi Bill, Netflix subscription"
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                <div className="form-group">
                  <label className="form-label">Monthly Amount</label>
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
                  <label className="form-label">Billing Day (1-28)</label>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    required
                    className="input"
                    value={billingDay}
                    onChange={(e) => setBillingDay(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    required
                    className="input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date (Optional)</label>
                  <input
                    type="date"
                    className="input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                <div className="form-group">
                  <label className="form-label">Who Pays?</label>
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

              {/* Participants selection */}
              <div className="form-group">
                <label className="form-label">Participants</label>
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

              {/* Split editor */}
              <div style={{
                marginTop: "var(--space-4)",
                padding: "var(--space-4)",
                backgroundColor: "var(--color-surface-2)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
              }}>
                <h4 style={{ fontSize: "var(--text-sm)", fontWeight: 700, marginBottom: "var(--space-3)", color: "var(--color-primary)" }}>
                  Template Split Editor
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
                  {formLoading ? "Saving..." : "Configure Recurring"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
