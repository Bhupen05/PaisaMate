"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatMinor } from "@/lib/money";
import { useAuthStore } from "@/store/authStore";

interface ExpenseItem {
  id: string;
  title: string;
  amount_minor: number;
  currency: string;
  expense_date: string;
  category_id: string | null;
  classification: "NEED" | "WANT" | "DREAM";
  expense_type: "PERSONAL" | "SHARED";
  payment_method: string | null;
  note: string | null;
}

export default function TransactionsPage() {
  const { user } = useAuthStore();
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState("");
  const [expenseType, setExpenseType] = useState<string>(""); // All, PERSONAL, SHARED
  const [classification, setClassification] = useState(""); // All, NEED, WANT, DREAM
  const [category, setCategory] = useState("");

  // CRUD Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeExpense, setActiveExpense] = useState<ExpenseItem | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [formCategory, setFormCategory] = useState("other");
  const [formClassification, setFormClassification] = useState<"NEED" | "WANT" | "DREAM">("NEED");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [note, setNote] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      let url = `/expenses?page=${page}&page_size=${pageSize}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (expenseType) url += `&expense_type=${expenseType}`;
      if (classification) url += `&classification=${classification}`;
      if (category) url += `&category_id=${category}`;

      const res = await api.get(url);
      setExpenses(res.data.items);
      setTotalItems(res.data.total);
    } catch (err) {
      console.error("Failed to load transactions", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [page, search, expenseType, classification, category]);

  const openAddModal = () => {
    setTitle("");
    setAmount("");
    setExpenseDate(new Date().toISOString().split("T")[0]);
    setFormCategory("other");
    setFormClassification("NEED");
    setPaymentMethod("UPI");
    setNote("");
    setShowAddModal(true);
  };

  const openEditModal = (expense: ExpenseItem) => {
    setActiveExpense(expense);
    setTitle(expense.title);
    setAmount((expense.amount_minor / 100).toString());
    setExpenseDate(expense.expense_date);
    setFormCategory(expense.category_id || "other");
    setFormClassification(expense.classification);
    setPaymentMethod(expense.payment_method || "UPI");
    setNote(expense.note || "");
    setShowEditModal(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = parseFloat(amount.replace(/[^\d.]/g, ""));
    if (!title || isNaN(cleanAmount) || cleanAmount <= 0) return;

    setFormLoading(true);
    try {
      await api.post("/expenses", {
        title,
        amount_minor: Math.round(cleanAmount * 100),
        currency: user?.currency || "INR",
        expense_date: expenseDate,
        category_id: formCategory,
        classification: formClassification,
        expense_type: "PERSONAL",
        payment_method: paymentMethod || null,
        note: note || null,
      });
      setShowAddModal(false);
      fetchExpenses();
    } catch (err) {
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeExpense) return;
    const cleanAmount = parseFloat(amount.replace(/[^\d.]/g, ""));
    if (!title || isNaN(cleanAmount) || cleanAmount <= 0) return;

    setFormLoading(true);
    try {
      await api.patch(`/expenses/${activeExpense.id}`, {
        title,
        amount_minor: Math.round(cleanAmount * 100),
        expense_date: expenseDate,
        category_id: formCategory,
        classification: formClassification,
        payment_method: paymentMethod || null,
        note: note || null,
      });
      setShowEditModal(false);
      fetchExpenses();
    } catch (err) {
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      await api.delete(`/expenses/${id}`);
      fetchExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const userCurrency = user?.currency || "INR";

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Transaction Log</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginTop: "4px" }}>
            Track and search all your personal transactions.
          </p>
        </div>
        <button onClick={openAddModal} className="btn btn-primary">
          ➕ Log Expense
        </button>
      </div>

      {/* Filtering and Search Controls */}
      <div className="card" style={{ padding: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "var(--space-3)",
        }}>
          {/* Search */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Search</label>
            <input
              type="text"
              placeholder="Search title..."
              className="input"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {/* Type */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Type</label>
            <select
              className="input"
              style={{ padding: "0 var(--space-3)" }}
              value={expenseType}
              onChange={(e) => { setExpenseType(e.target.value); setPage(1); }}
            >
              <option value="">All Types</option>
              <option value="PERSONAL">Personal Only</option>
              <option value="SHARED">Shared Only</option>
            </select>
          </div>

          {/* Classification */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Classification</label>
            <select
              className="input"
              style={{ padding: "0 var(--space-3)" }}
              value={classification}
              onChange={(e) => { setClassification(e.target.value); setPage(1); }}
            >
              <option value="">All Classifications</option>
              <option value="NEED">Need</option>
              <option value="WANT">Want</option>
              <option value="DREAM">Dream</option>
            </select>
          </div>

          {/* Category */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Category</label>
            <select
              className="input"
              style={{ padding: "0 var(--space-3)" }}
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            >
              <option value="">All Categories</option>
              <option value="food">Food</option>
              <option value="transport">Transport</option>
              <option value="shopping">Shopping</option>
              <option value="bills">Bills</option>
              <option value="housing">Housing</option>
              <option value="health">Health</option>
              <option value="education">Education</option>
              <option value="entertainment">Entertainment</option>
              <option value="work">Work</option>
              <option value="travel">Travel</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
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
        ) : expenses.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--color-text-muted)" }}>
            No matching transactions found.
          </div>
        ) : (
          <div>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "var(--text-sm)" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
                  <th style={{ padding: "var(--space-3) var(--space-2)" }}>Title</th>
                  <th style={{ padding: "var(--space-3) var(--space-2)" }}>Date</th>
                  <th style={{ padding: "var(--space-3) var(--space-2)" }}>Category</th>
                  <th style={{ padding: "var(--space-3) var(--space-2)" }}>Classification</th>
                  <th style={{ padding: "var(--space-3) var(--space-2)" }}>Type</th>
                  <th style={{ padding: "var(--space-3) var(--space-2)", textAlign: "right" }}>Amount</th>
                  <th style={{ padding: "var(--space-3) var(--space-2)", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--color-border)" }} className="table-row">
                    <td style={{ padding: "var(--space-3) var(--space-2)", fontWeight: 600 }}>{item.title}</td>
                    <td style={{ padding: "var(--space-3) var(--space-2)" }}>{item.expense_date}</td>
                    <td style={{ padding: "var(--space-3) var(--space-2)", textTransform: "capitalize" }}>{item.category_id || "other"}</td>
                    <td style={{ padding: "var(--space-3) var(--space-2)" }}>
                      <span className={`badge ${
                        item.classification === "NEED" ? "badge-need" : item.classification === "WANT" ? "badge-want" : "badge-dream"
                      }`}>
                        {item.classification}
                      </span>
                    </td>
                    <td style={{ padding: "var(--space-3) var(--space-2)" }}>
                      <span style={{
                        fontSize: "var(--text-xs)",
                        fontWeight: 600,
                        padding: "2px 6px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: item.expense_type === "PERSONAL" ? "var(--color-surface-2)" : "var(--color-accent-light)",
                        color: item.expense_type === "PERSONAL" ? "var(--color-text-secondary)" : "var(--color-accent)",
                      }}>
                        {item.expense_type}
                      </span>
                    </td>
                    <td style={{ padding: "var(--space-3) var(--space-2)", textAlign: "right", fontWeight: 600 }} className="amount">
                      {formatMinor(item.amount_minor, item.currency)}
                    </td>
                    <td style={{ padding: "var(--space-3) var(--space-2)", textAlign: "center" }}>
                      {item.expense_type === "PERSONAL" ? (
                        <div style={{ display: "flex", gap: "var(--space-1)", justifyContent: "center" }}>
                          <button
                            onClick={() => openEditModal(item)}
                            className="btn btn-ghost btn-sm"
                            style={{ height: "26px", padding: "0 6px" }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="btn btn-ghost btn-sm"
                            style={{ height: "26px", padding: "0 6px", color: "var(--color-danger)" }}
                          >
                            🗑️
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>View Only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "var(--space-4)",
              paddingTop: "var(--space-3)",
              borderTop: "1px solid var(--color-border)",
            }}>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                Showing page {page} of {totalPages} ({totalItems} total items)
              </span>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="btn btn-secondary btn-sm"
                >
                  ◀ Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="btn btn-secondary btn-sm"
                >
                  Next ▶
                </button>
              </div>
            </div>
          </div>
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
            maxWidth: "420px",
            padding: "var(--space-6)",
            backgroundColor: "var(--color-surface)",
            borderRadius: "var(--radius-lg)",
          }}>
            <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 700, marginBottom: "var(--space-4)", color: "var(--color-primary)" }}>
              Log Personal Expense
            </h3>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Rent, Groceries, Fuel"
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
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
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                <div className="form-group">
                  <label className="form-label">Classification</label>
                  <select
                    className="input"
                    style={{ padding: "0 var(--space-3)" }}
                    value={formClassification}
                    onChange={(e) => setFormClassification(e.target.value as any)}
                  >
                    <option value="NEED">Need</option>
                    <option value="WANT">Want</option>
                    <option value="DREAM">Dream</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="input"
                    style={{ padding: "0 var(--space-3)" }}
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  >
                    <option value="food">Food</option>
                    <option value="transport">Transport</option>
                    <option value="shopping">Shopping</option>
                    <option value="bills">Bills</option>
                    <option value="housing">Housing</option>
                    <option value="health">Health</option>
                    <option value="education">Education</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="work">Work</option>
                    <option value="travel">Travel</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <input
                  type="text"
                  placeholder="UPI, Cash, Card"
                  className="input"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "var(--space-6)" }}>
                <label className="form-label">Notes</label>
                <textarea
                  className="input"
                  style={{ height: "60px", padding: "var(--space-2) var(--space-3)", resize: "none" }}
                  placeholder="Optional details..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
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
                  disabled={formLoading}
                >
                  {formLoading ? "Saving..." : "Log Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
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
            maxWidth: "420px",
            padding: "var(--space-6)",
            backgroundColor: "var(--color-surface)",
            borderRadius: "var(--radius-lg)",
          }}>
            <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 700, marginBottom: "var(--space-4)", color: "var(--color-primary)" }}>
              Edit Personal Expense
            </h3>
            <form onSubmit={handleEdit}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Rent, Groceries, Fuel"
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
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
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                <div className="form-group">
                  <label className="form-label">Classification</label>
                  <select
                    className="input"
                    style={{ padding: "0 var(--space-3)" }}
                    value={formClassification}
                    onChange={(e) => setFormClassification(e.target.value as any)}
                  >
                    <option value="NEED">Need</option>
                    <option value="WANT">Want</option>
                    <option value="DREAM">Dream</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="input"
                    style={{ padding: "0 var(--space-3)" }}
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  >
                    <option value="food">Food</option>
                    <option value="transport">Transport</option>
                    <option value="shopping">Shopping</option>
                    <option value="bills">Bills</option>
                    <option value="housing">Housing</option>
                    <option value="health">Health</option>
                    <option value="education">Education</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="work">Work</option>
                    <option value="travel">Travel</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <input
                  type="text"
                  placeholder="UPI, Cash, Card"
                  className="input"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "var(--space-6)" }}>
                <label className="form-label">Notes</label>
                <textarea
                  className="input"
                  style={{ height: "60px", padding: "var(--space-2) var(--space-3)", resize: "none" }}
                  placeholder="Optional details..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
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
                  {formLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .table-row:hover {
          background-color: var(--color-surface-2);
        }
      `}</style>
    </div>
  );
}
