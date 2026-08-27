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

const CATEGORIES = ["food", "transport", "health", "entertainment", "shopping", "utilities", "housing", "education", "personal", "other"];

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

interface Balance {
  person_id: string;
  person_name: string;
  net_balance_minor: number;
  currency: string;
}

export default function SharedExpensesPage() {
  const { user } = useAuthStore();
  const userCurrency = user?.currency || "INR";

  const [sharedExpenses, setSharedExpenses] = useState<SharedExpense[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Wizard Modal state
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);

  // Step 1: Expense details
  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState("other");
  const [classification, setClassification] = useState<"NEED" | "WANT" | "DREAM">("WANT");
  const [note, setNote] = useState("");

  // Step 2: Participants
  const [selectedUser, setSelectedUser] = useState(true);
  const [selectedFriends, setSelectedFriends] = useState<Record<string, boolean>>({});

  // Step 3: Who paid?
  const [payerType, setPayerType] = useState<"USER" | "FRIEND">("USER");
  const [payerId, setPayerId] = useState("");

  // Step 4: Split Method & Share Inputs
  const [splitMethod, setSplitMethod] = useState<"EQUAL" | "CUSTOM_AMOUNT" | "PERCENTAGE">("EQUAL");
  const [customShares, setCustomShares] = useState<Record<string, string>>({}); // "type:id" -> string
  const [customPercentages, setCustomPercentages] = useState<Record<string, string>>({}); // "type:id" -> string

  const [submitting, setSubmitting] = useState(false);
  const [wizardError, setWizardError] = useState<string | null>(null);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sharedRes, friendsRes, balancesRes] = await Promise.all([
        api.get("/shared-expenses"),
        api.get("/friends"),
        api.get("/balances"),
      ]);
      setSharedExpenses(sharedRes.data ?? []);
      setFriends(friendsRes.data ?? []);
      setBalances(balancesRes.data ?? []);
    } catch (err) {
      console.error("Failed to load shared expenses data", err);
      setError("Unable to load shared expenses. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Update default payer when user changes payerType or step progress
  useEffect(() => {
    if (payerType === "USER" && user) {
      setPayerId(user.id);
    } else if (payerType === "FRIEND" && friends.length > 0) {
      // Find the first selected friend to be the default payer
      const selectedFriendIds = friends.filter(f => selectedFriends[f.id]).map(f => f.id);
      if (selectedFriendIds.length > 0) {
        setPayerId(selectedFriendIds[0]);
      } else {
        setPayerId(friends[0].id);
      }
    }
  }, [payerType, friends, selectedFriends, user]);

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
      detailsText = `Split matches total amount (${formatMinor(totalMinor, userCurrency)} equally)`;
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
        detailsText = `Shares sum: ${formatMinor(sumMinor, userCurrency)}. ${diff > 0 ? "Owed: " + formatMinor(diff, userCurrency) : "Overassigned: " + formatMinor(Math.abs(diff), userCurrency)}`;
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

        // Rounding difference adjustment (last participant absorbs)
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

  const handleCreateShared = async () => {
    if (!isValid || !title || totalMinor <= 0) return;

    setSubmitting(true);
    setWizardError(null);

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
        currency: userCurrency,
        expense_date: expenseDate,
        category_id: category,
        classification,
        payer_type: payerType,
        payer_id: payerId,
        participants: apiParticipants,
        split_method: splitMethod,
        note: note || null,
      });

      setShowWizard(false);
      setWizardStep(1);
      setTitle("");
      setTotalAmount("");
      setNote("");
      setSelectedFriends({});
      setCustomShares({});
      setCustomPercentages({});
      fetchAllData();
    } catch (err: any) {
      console.error(err);
      setWizardError(err.response?.data?.detail || "Failed to create shared expense.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextStep = () => {
    if (wizardStep === 1) {
      if (!title.trim() || !totalAmount.trim() || parseFloat(totalAmount) <= 0) {
        setWizardError("Title and a valid total amount are required.");
        return;
      }
    }
    if (wizardStep === 2) {
      if (activeParticipantsList().length === 0) {
        setWizardError("You must select at least one participant.");
        return;
      }
    }
    setWizardError(null);
    setWizardStep((curr) => curr + 1);
  };

  const handlePrevStep = () => {
    setWizardError(null);
    setWizardStep((curr) => curr - 1);
  };

  const getPayerName = () => {
    if (payerType === "USER") return "You";
    const match = friends.find((f) => f.id === payerId);
    return match ? match.name : "Unknown Friend";
  };

  const nonZeroBalances = balances.filter((b) => b.net_balance_minor !== 0);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Shared Expenses</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginTop: "4px" }}>
            Who owes whom, and why?
          </p>
        </div>
        <button onClick={() => setShowWizard(true)} className="btn btn-primary">
          ➕ Split Bill
        </button>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* ── Section 1: Outstanding Balances ── */}
      <div className="card" style={{ padding: "var(--space-5)", marginBottom: "var(--space-6)" }}>
        <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-4)", color: "var(--color-primary)" }}>
          Outstanding Balances
        </h2>
        {loading ? (
          <div style={{ padding: "10px 0" }}><LoadingSpinner size={24} /></div>
        ) : nonZeroBalances.length === 0 ? (
          <EmptyState icon="🤝" title="You're all settled" description="No outstanding balances with friends." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {nonZeroBalances.map((b) => {
              const isOwed = b.net_balance_minor > 0;
              return (
                <div key={b.person_id} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "var(--space-3) 0",
                  borderBottom: "1px solid var(--color-border)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    <div style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: "var(--color-accent-light)",
                      color: "var(--color-accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "var(--text-xs)",
                    }}>
                      {b.person_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>{b.person_name}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                      {isOwed ? "Owed to you" : "You owe"}
                    </div>
                    <span className="amount" style={{
                      fontSize: "var(--text-base)",
                      fontWeight: 700,
                      color: isOwed ? "var(--color-success)" : "var(--color-danger)",
                    }}>
                      {formatMinor(Math.abs(b.net_balance_minor), b.currency)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Section 2: Recent Shared Expenses Log ── */}
      <div className="card" style={{ padding: "var(--space-5)" }}>
        <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-4)", color: "var(--color-primary)" }}>
          Recent Shared Expenses
        </h2>
        {loading ? (
          <LoadingSpinner centered />
        ) : sharedExpenses.length === 0 ? (
          <EmptyState icon="📋" title="No shared expenses yet" description="Start tracking bills split with your friends." actionLabel="Split Bill" onAction={() => setShowWizard(true)} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "var(--text-sm)" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
                  <th style={{ padding: "var(--space-3) var(--space-2)" }}>Title</th>
                  <th style={{ padding: "var(--space-3) var(--space-2)" }}>Date</th>
                  <th style={{ padding: "var(--space-3) var(--space-2)" }}>Paid By</th>
                  <th style={{ padding: "var(--space-3) var(--space-2)" }}>Split Details</th>
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
                      <td style={{ padding: "var(--space-3) var(--space-2)", color: "var(--color-text-secondary)" }}>{item.expense_date}</td>
                      <td style={{ padding: "var(--space-3) var(--space-2)", fontWeight: 500 }}>{payerName}</td>
                      <td style={{ padding: "var(--space-3) var(--space-2)", color: "var(--color-text-secondary)" }}>
                        {item.participants.length} participants
                      </td>
                      <td style={{ padding: "var(--space-3) var(--space-2)", fontSize: "11px", fontWeight: 600, color: "var(--color-text-secondary)" }}>
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
          </div>
        )}
      </div>

      {/* ── 5-Step Shared Split Wizard Modal ── */}
      <Modal
        open={showWizard}
        onClose={() => {
          setShowWizard(false);
          setWizardStep(1);
          setWizardError(null);
        }}
        title={`Split Bill — Step ${wizardStep} of 5`}
        footer={
          <div style={{ display: "flex", gap: "var(--space-2)", width: "100%", justifyContent: "flex-end" }}>
            {wizardStep > 1 && (
              <button className="btn btn-secondary" onClick={handlePrevStep} disabled={submitting}>
                ← Back
              </button>
            )}
            {wizardStep < 5 ? (
              <button className="btn btn-primary" onClick={handleNextStep}>
                Next →
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleCreateShared} disabled={submitting || !isValid}>
                {submitting ? "Splitting..." : "Split Expense"}
              </button>
            )}
          </div>
        }
      >
        {wizardError && <ErrorBanner message={wizardError} onDismiss={() => setWizardError(null)} />}

        {/* STEP 1: Expense Details */}
        {wizardStep === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: 0, color: "var(--color-accent)" }}>Expense Information</h3>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Expense Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Pizza dinner"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
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
              <div className="form-group" style={{ marginBottom: 0 }}>
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
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Category</label>
                <select
                  className="input"
                  style={{ padding: "0 var(--space-2)" }}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Classification</label>
                <select
                  className="input"
                  style={{ padding: "0 var(--space-2)" }}
                  value={classification}
                  onChange={(e) => setClassification(e.target.value as any)}
                >
                  <option value="NEED">Need</option>
                  <option value="WANT">Want</option>
                  <option value="DREAM">Dream</option>
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Note (optional)</label>
              <textarea
                className="input"
                style={{ height: "60px", padding: "8px 12px", resize: "none" }}
                placeholder="Add optional notes..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* STEP 2: Select Participants */}
        {wizardStep === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: 0, color: "var(--color-accent)" }}>Select Group Members</h3>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", margin: 0 }}>Who is sharing this expense?</p>
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
              padding: "var(--space-3)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--color-surface-2)",
              maxHeight: "260px",
              overflowY: "auto",
            }}>
              <label style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "8px", borderRadius: "var(--radius-sm)", cursor: "pointer", background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <input
                  type="checkbox"
                  checked={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.checked)}
                  style={{ width: "16px", height: "16px" }}
                />
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>You (Myself)</span>
              </label>
              {friends.map((f) => (
                <label key={f.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "8px", borderRadius: "var(--radius-sm)", cursor: "pointer", background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                  <input
                    type="checkbox"
                    checked={!!selectedFriends[f.id]}
                    onChange={() => setSelectedFriends(prev => ({ ...prev, [f.id]: !prev[f.id] }))}
                    style={{ width: "16px", height: "16px" }}
                  />
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{f.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Who paid? */}
        {wizardStep === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: 0, color: "var(--color-accent)" }}>Who paid the bill?</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <button
                type="button"
                onClick={() => setPayerType("USER")}
                style={{
                  padding: "var(--space-5) var(--space-4)",
                  borderRadius: "var(--radius-md)",
                  border: `2px solid ${payerType === "USER" ? "var(--color-accent)" : "var(--color-border)"}`,
                  background: payerType === "USER" ? "var(--color-accent-light)" : "var(--color-surface)",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "var(--text-base)",
                  color: payerType === "USER" ? "var(--color-accent)" : "var(--color-text)",
                  transition: "all var(--transition-fast)",
                }}
              >
                🙋‍♂️ I paid
              </button>
              <button
                type="button"
                onClick={() => setPayerType("FRIEND")}
                style={{
                  padding: "var(--space-5) var(--space-4)",
                  borderRadius: "var(--radius-md)",
                  border: `2px solid ${payerType === "FRIEND" ? "var(--color-accent)" : "var(--color-border)"}`,
                  background: payerType === "FRIEND" ? "var(--color-accent-light)" : "var(--color-surface)",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "var(--text-base)",
                  color: payerType === "FRIEND" ? "var(--color-accent)" : "var(--color-text)",
                  transition: "all var(--transition-fast)",
                }}
              >
                👥 A friend paid
              </button>
            </div>

            {payerType === "FRIEND" && (
              <div className="form-group" style={{ marginTop: "var(--space-2)" }}>
                <label className="form-label">Select Payer Friend</label>
                <select
                  className="input"
                  style={{ padding: "0 var(--space-3)" }}
                  value={payerId}
                  onChange={(e) => setPayerId(e.target.value)}
                >
                  {friends.filter(f => selectedFriends[f.id]).map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                  {/* Fallback to all friends if none are selected yet in step 2 */}
                  {friends.filter(f => !selectedFriends[f.id]).map(f => (
                    <option key={f.id} value={f.id}>{f.name} (not participant)</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Split Editor */}
        {wizardStep === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: 0, color: "var(--color-accent)" }}>Choose Split Method</h3>
            
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              {(["EQUAL", "CUSTOM_AMOUNT", "PERCENTAGE"] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setSplitMethod(method)}
                  style={{
                    flex: 1,
                    padding: "var(--space-2) var(--space-1)",
                    borderRadius: "var(--radius-sm)",
                    border: `1.5px solid ${splitMethod === method ? "var(--color-accent)" : "var(--color-border)"}`,
                    background: splitMethod === method ? "var(--color-accent-light)" : "var(--color-surface)",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: splitMethod === method ? "var(--color-accent)" : "var(--color-text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {method === "EQUAL" ? "Equally" : method === "CUSTOM_AMOUNT" ? "Amounts" : "Percentage"}
                </button>
              ))}
            </div>

            <div style={{
              padding: "var(--space-4)",
              backgroundColor: "var(--color-surface-2)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
            }}>
              <h4 style={{ fontSize: "var(--text-sm)", fontWeight: 700, marginBottom: "var(--space-3)" }}>
                Adjust Shares
              </h4>

              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", maxHeight: "180px", overflowY: "auto" }}>
                {activeParticipantsList().map((p) => {
                  const key = `${p.type}:${p.id}`;
                  return (
                    <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)" }}>
                      <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{p.name}</span>

                      {splitMethod === "EQUAL" && (
                        <span className="amount" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
                          {formatMinor(shareAmounts[key] || 0, userCurrency)}
                        </span>
                      )}

                      {splitMethod === "CUSTOM_AMOUNT" && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", fontWeight: 600 }}>{userCurrency === "INR" ? "₹" : "$"}</span>
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
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <input
                            type="text"
                            placeholder="0"
                            className="input"
                            style={{ width: "55px", height: "30px", textAlign: "right", fontSize: "var(--text-sm)" }}
                            value={customPercentages[key] || ""}
                            onChange={(e) => {
                              setCustomPercentages({ ...customPercentages, [key]: e.target.value });
                            }}
                          />
                          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>%</span>
                          <span className="amount" style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", width: "75px", textAlign: "right" }}>
                            ({formatMinor(shareAmounts[key] || 0, userCurrency)})
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Status footer */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid var(--color-border)",
                marginTop: "var(--space-3)",
                paddingTop: "var(--space-2)",
                fontSize: "var(--text-xs)",
                color: isValid ? "var(--color-success)" : "var(--color-danger)",
                fontWeight: 700,
              }}>
                <span>{isValid ? "✅ Reconciled" : "⚠️ Unreconciled"}</span>
                <span>{detailsText}</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Review Split Summary */}
        {wizardStep === 5 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: 0, color: "var(--color-accent)" }}>Review Split Details</h3>

            <div style={{
              background: "var(--color-surface-2)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-4)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
              border: "1px solid var(--color-border)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-sm)" }}>
                <span style={{ color: "var(--color-text-secondary)" }}>Title</span>
                <span style={{ fontWeight: 700 }}>{title}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-sm)" }}>
                <span style={{ color: "var(--color-text-secondary)" }}>Payer</span>
                <span style={{ fontWeight: 700 }}>{getPayerName()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-sm)" }}>
                <span style={{ color: "var(--color-text-secondary)" }}>Total Amount</span>
                <span className="amount" style={{ fontWeight: 700, fontSize: "var(--text-base)" }}>
                  {formatMinor(totalMinor, userCurrency)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-sm)" }}>
                <span style={{ color: "var(--color-text-secondary)" }}>Split Method</span>
                <span style={{ fontWeight: 700 }}>{splitMethod.replace("_", " ")}</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Individual Shares</span>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {activeParticipantsList().map((p) => {
                  const key = `${p.type}:${p.id}`;
                  return (
                    <div key={key} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-sm)", padding: "4px 0", borderBottom: "1px dashed var(--color-border)" }}>
                      <span>{p.name}</span>
                      <span className="amount" style={{ fontWeight: 600 }}>{formatMinor(shareAmounts[key] || 0, userCurrency)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "var(--text-xs)",
              color: isValid ? "var(--color-success)" : "var(--color-danger)",
              fontWeight: 700,
              paddingTop: "var(--space-2)",
            }}>
              <span>Status: {isValid ? "Valid ✓" : "Invalid ✗"}</span>
              {!isValid && <span>{detailsText}</span>}
            </div>
          </div>
        )}
      </Modal>

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
