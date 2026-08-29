"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatMinor } from "@/lib/money";
import { useAuthStore } from "@/store/authStore";
import { ClassificationBadge } from "@/components/finance/ClassificationBadge";
import { StatusBadge } from "@/components/finance/StatusBadge";
import { MoneyAmount } from "@/components/finance/MoneyAmount";
import { getBalanceStatus } from "@/components/finance/BalanceIndicator";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { ListRow } from "@/components/ui/ListRow";
import { Tile } from "@/components/ui/Tile";
import {
  Plus,
  Pencil,
  Trash2,
  Handshake,
  ClipboardList,
  User,
  Users,
  CheckCircle2,
  AlertTriangle,
  Check,
} from "lucide-react";

const WIZARD_STEP_LABELS = ["Details", "Members", "Payer", "Split", "Review"];

function WizardSteps({ step, onJump }: { step: number; onJump: (n: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: "var(--space-5)" }}>
      {WIZARD_STEP_LABELS.map((label, idx) => {
        const n = idx + 1;
        const isDone = n < step;
        const isCurrent = n === step;
        const reachable = n <= step;
        return (
          <div key={n} style={{ display: "flex", alignItems: "center", flex: n < WIZARD_STEP_LABELS.length ? 1 : "0 0 auto" }}>
            <button
              type="button"
              onClick={() => reachable && onJump(n)}
              disabled={!reachable}
              aria-label={`Step ${n}: ${label}`}
              aria-current={isCurrent ? "step" : undefined}
              title={label}
              style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "var(--text-xs)", fontWeight: 700,
                border: isCurrent ? "2px solid var(--color-accent)" : "none",
                background: isDone ? "var(--color-accent)" : isCurrent ? "var(--color-accent-light)" : "var(--color-surface-2)",
                color: isDone ? "#fff" : isCurrent ? "var(--color-accent)" : "var(--color-text-muted)",
                cursor: reachable ? "pointer" : "default",
              }}
            >
              {isDone ? <Check size={13} /> : n}
            </button>
            {n < WIZARD_STEP_LABELS.length && (
              <div style={{ flex: 1, height: 2, background: isDone ? "var(--color-accent)" : "var(--color-border)", margin: "0 4px" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

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
  your_share_minor: number;
  currency: string;
  expense_date: string;
  category_id: string | null;
  classification: "NEED" | "WANT" | "DREAM";
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

const TODAY = () => new Date().toISOString().split("T")[0];

export default function SharedExpensesPage() {
  const { user } = useAuthStore();
  const userCurrency = user?.currency || "INR";

  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const sharedQuery = useQuery({
    queryKey: ["shared-expenses"],
    queryFn: async () => (await api.get<SharedExpense[]>("/shared-expenses")).data ?? [],
  });
  const friendsQuery = useQuery({
    queryKey: ["friends"],
    queryFn: async () => (await api.get<Friend[]>("/friends")).data ?? [],
  });
  const balancesQuery = useQuery({
    queryKey: ["balances"],
    queryFn: async () => (await api.get<Balance[]>("/balances")).data ?? [],
  });
  const sharedExpenses = sharedQuery.data ?? [];
  const friends = friendsQuery.data ?? [];
  // Only friends who've accepted their invite can be split with — pending
  // invites aren't real collaborators yet.
  const activeFriends = friends.filter((f) => f.status === "ACTIVE");
  const balances = balancesQuery.data ?? [];
  const loading = sharedQuery.isPending || friendsQuery.isPending || balancesQuery.isPending;

  const invalidateShared = () => {
    queryClient.invalidateQueries({ queryKey: ["shared-expenses"] });
    queryClient.invalidateQueries({ queryKey: ["balances"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    queryClient.invalidateQueries({ queryKey: ["analytics-summary"] });
  };

  // Wizard Modal state
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [editTarget, setEditTarget] = useState<SharedExpense | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<SharedExpense | null>(null);

  // Step 1: Expense details
  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(TODAY());
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

  const [wizardError, setWizardError] = useState<string | null>(null);

  // Update default payer when user changes payerType or step progress
  useEffect(() => {
    if (payerType === "USER" && user) {
      setPayerId(user.id);
    } else if (payerType === "FRIEND" && activeFriends.length > 0 && !payerId) {
      // Find the first selected friend to be the default payer
      const selectedFriendIds = activeFriends.filter(f => selectedFriends[f.id]).map(f => f.id);
      if (selectedFriendIds.length > 0) {
        setPayerId(selectedFriendIds[0]);
      } else {
        setPayerId(activeFriends[0].id);
      }
    }
  }, [payerType, activeFriends, selectedFriends, user]);

  const activeParticipantsList = () => {
    const list: Array<{ id: string; type: "USER" | "FRIEND"; name: string }> = [];
    if (selectedUser && user) {
      list.push({ id: user.id, type: "USER", name: "You" });
    }
    activeFriends.forEach((f) => {
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

  const resetWizardFields = () => {
    setWizardStep(1);
    setWizardError(null);
    setEditTarget(null);
    setTitle("");
    setTotalAmount("");
    setExpenseDate(TODAY());
    setCategory("other");
    setClassification("WANT");
    setNote("");
    setSelectedUser(true);
    setSelectedFriends({});
    setPayerType("USER");
    setPayerId("");
    setSplitMethod("EQUAL");
    setCustomShares({});
    setCustomPercentages({});
  };

  const openCreate = () => {
    resetWizardFields();
    setShowWizard(true);
  };

  const openEdit = (item: SharedExpense) => {
    setEditTarget(item);
    setTitle(item.title);
    setTotalAmount(String(item.total_amount_minor / 100));
    setExpenseDate(item.expense_date);
    setCategory(item.category_id ?? "other");
    setClassification(item.classification);
    setNote(item.note ?? "");

    setSelectedUser(item.participants.some((p) => p.person_type === "USER"));
    const friendMap: Record<string, boolean> = {};
    item.participants
      .filter((p) => p.person_type === "FRIEND")
      .forEach((p) => { friendMap[p.person_id] = true; });
    setSelectedFriends(friendMap);

    setPayerType(item.payer_type);
    setPayerId(item.payer_id);
    setSplitMethod(item.split_method);

    const shares: Record<string, string> = {};
    const pcts: Record<string, string> = {};
    item.participants.forEach((p) => {
      const key = `${p.person_type}:${p.person_id}`;
      shares[key] = String(p.share_amount_minor / 100);
      if (p.share_percentage != null) pcts[key] = String(p.share_percentage);
    });
    setCustomShares(shares);
    setCustomPercentages(pcts);

    setWizardStep(1);
    setWizardError(null);
    setShowWizard(true);
  };

  const closeWizard = () => {
    setShowWizard(false);
    resetWizardFields();
  };

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editTarget ? api.put(`/shared-expenses/${editTarget.id}`, payload) : api.post("/shared-expenses", payload),
    onSuccess: () => {
      invalidateShared();
      closeWizard();
    },
    onError: (err: any) => setWizardError(err.response?.data?.detail || "Failed to save shared expense."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/shared-expenses/${id}`),
    onSuccess: () => {
      invalidateShared();
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || "Unable to delete shared expense.");
      setDeleteTarget(null);
    },
  });

  const submitting = saveMutation.isPending;
  const deleting = deleteMutation.isPending;

  const handleSubmitShared = () => {
    if (!isValid || !title || totalMinor <= 0) return;
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

    saveMutation.mutate({
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
  };

  const handleDeleteShared = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
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
        <button onClick={openCreate} className="btn btn-primary">
          <Plus size={16} /> Split Bill
        </button>
      </div>

      {(error || sharedQuery.isError || friendsQuery.isError || balancesQuery.isError) && (
        <ErrorBanner message={error ?? "Unable to load shared expenses. Please try again."} onDismiss={() => setError(null)} />
      )}

      {/* ── Section 1: Outstanding Balances ── */}
      <div className="card" style={{ padding: "var(--space-5)", marginBottom: "var(--space-6)" }}>
        <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-4)", color: "var(--color-primary)" }}>
          Outstanding Balances
        </h2>
        {loading ? (
          <div style={{ padding: "10px 0" }}><LoadingSpinner size={24} /></div>
        ) : nonZeroBalances.length === 0 ? (
          <EmptyState icon={<Handshake size={40} />} title="You're all settled" description="No outstanding balances with friends." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
            {nonZeroBalances.map((b) => {
              const status = getBalanceStatus(b.net_balance_minor);
              return (
                <ListRow
                  key={b.person_id}
                  leading={<Avatar name={b.person_name} size={32} />}
                  title={b.person_name}
                  subtitle={<span style={{ color: status.color }}>{status.label}</span>}
                  trailing={
                    <MoneyAmount
                      amountMinor={b.net_balance_minor}
                      currency={b.currency}
                      variant={b.net_balance_minor > 0 ? "positive" : "negative"}
                    />
                  }
                />
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
          <EmptyState icon={<ClipboardList size={40} />} title="No shared expenses yet" description="Start tracking bills split with your friends." actionLabel="Split Bill" onAction={openCreate} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "var(--text-sm)" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
                  <th style={{ padding: "var(--space-3) var(--space-2)" }}>Title</th>
                  <th style={{ padding: "var(--space-3) var(--space-2)" }}>Date</th>
                  <th style={{ padding: "var(--space-3) var(--space-2)" }}>Type</th>
                  <th style={{ padding: "var(--space-3) var(--space-2)" }}>Paid By</th>
                  <th style={{ padding: "var(--space-3) var(--space-2)" }}>Split Details</th>
                  <th style={{ padding: "var(--space-3) var(--space-2)" }}>Status</th>
                  <th style={{ padding: "var(--space-3) var(--space-2)", textAlign: "right" }}>Your Share</th>
                  <th style={{ padding: "var(--space-3) var(--space-2)", textAlign: "right" }}>Total</th>
                  <th style={{ padding: "var(--space-3) var(--space-2)" }}></th>
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
                      <td style={{ padding: "var(--space-3) var(--space-2)" }}>
                        <ClassificationBadge value={item.classification} />
                      </td>
                      <td style={{ padding: "var(--space-3) var(--space-2)", fontWeight: 500 }}>{payerName}</td>
                      <td style={{ padding: "var(--space-3) var(--space-2)", color: "var(--color-text-secondary)" }}>
                        {item.participants.length} participants · {item.split_method.replace("_", " ")}
                      </td>
                      <td style={{ padding: "var(--space-3) var(--space-2)" }}>
                        <StatusBadge status={item.status} />
                      </td>
                      <td style={{ padding: "var(--space-3) var(--space-2)", textAlign: "right" }}>
                        <MoneyAmount amountMinor={item.your_share_minor} currency={item.currency} variant="neutral" />
                      </td>
                      <td style={{ padding: "var(--space-3) var(--space-2)", textAlign: "right", color: "var(--color-text-secondary)" }} className="amount">
                        {formatMinor(item.total_amount_minor, item.currency)}
                      </td>
                      <td style={{ padding: "var(--space-3) var(--space-2)", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)} aria-label={`Edit ${item.title}`}><Pencil size={13} /> Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(item)} aria-label={`Delete ${item.title}`}><Trash2 size={13} /> Delete</button>
                        </div>
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
        onClose={closeWizard}
        title={`${editTarget ? "Edit Split" : "Split Bill"} — Step ${wizardStep} of 5`}
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
              <button className="btn btn-primary" onClick={handleSubmitShared} disabled={submitting || !isValid}>
                {submitting ? "Saving…" : editTarget ? "Save Changes" : "Split Expense"}
              </button>
            )}
          </div>
        }
      >
        <WizardSteps step={wizardStep} onJump={(n) => { setWizardError(null); setWizardStep(n); }} />

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
                className={`input ${wizardError && !title.trim() ? "error" : ""}`}
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
                  className={`input input-amount ${wizardError && !(totalAmount.trim() && parseFloat(totalAmount) > 0) ? "error" : ""}`}
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
              {activeFriends.map((f) => (
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
            {activeFriends.length === 0 && (
              <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", margin: 0 }}>
                No friends have accepted an invite yet.{" "}
                <Link href="/friends" style={{ fontWeight: 600 }}>Invite a friend →</Link>
              </p>
            )}
          </div>
        )}

        {/* STEP 3: Who paid? */}
        {wizardStep === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: 0, color: "var(--color-accent)" }}>Who paid the bill?</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <Tile
                selected={payerType === "USER"}
                onClick={() => setPayerType("USER")}
                icon={User}
                label="I paid"
              />
              <Tile
                selected={payerType === "FRIEND"}
                onClick={() => setPayerType("FRIEND")}
                icon={Users}
                label="A friend paid"
              />
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
                  {activeFriends.filter(f => selectedFriends[f.id]).map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                  {/* Fallback to all active friends if none are selected yet in step 2 */}
                  {activeFriends.filter(f => !selectedFriends[f.id]).map(f => (
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
                <div key={method} style={{ flex: 1 }}>
                  <Tile
                    selected={splitMethod === method}
                    onClick={() => setSplitMethod(method)}
                    label={method === "EQUAL" ? "Equally" : method === "CUSTOM_AMOUNT" ? "Amounts" : "Percentage"}
                  />
                </div>
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
                <span style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
                  {isValid ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                  {isValid ? "Reconciled" : "Unreconciled"}
                </span>
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
              <span style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
                {isValid ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                Status: {isValid ? "Valid" : "Invalid"}
              </span>
              {!isValid && <span>{detailsText}</span>}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Shared Expense"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDeleteShared} disabled={deleting}>
              {deleting ? "Deleting…" : "Yes, Delete"}
            </button>
          </>
        }
      >
        <p style={{ fontSize: "var(--text-base)", color: "var(--color-text)" }}>
          Delete <strong>{deleteTarget?.title}</strong>? This removes it from everyone's balances too.
        </p>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginTop: "var(--space-2)" }}>This action cannot be undone.</p>
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
