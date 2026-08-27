"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatMinor } from "@/lib/money";
import { useAuthStore } from "@/store/authStore";

interface Friend {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: "ACTIVE" | "ARCHIVED";
}

interface SharedExpense {
  id: string;
  title: string;
  total_amount_minor: number;
  currency: string;
  expense_date: string;
  payer_type: string;
  payer_id: string;
  participants: Array<{
    person_id: string;
    person_type: string;
    share_amount_minor: number;
    paid_amount_minor: number;
  }>;
}

interface Settlement {
  id: string;
  from_person_id: string;
  from_person_type: string;
  to_person_id: string;
  to_person_type: string;
  amount_minor: number;
  currency: string;
  settlement_date: string;
  note: string | null;
}

interface Balance {
  person_id: string;
  net_balance_minor: number;
  currency: string;
  description: string;
}

export default function FriendsPage() {
  const { user } = useAuthStore();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [balances, setBalances] = useState<Record<string, Balance>>({});
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [sharedExpenses, setSharedExpenses] = useState<SharedExpense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modals / forms state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const [friendsRes, balancesRes] = await Promise.all([
        api.get(`/friends?include_archived=${includeArchived}`),
        api.get("/balances"),
      ]);

      setFriends(friendsRes.data);

      const balMap: Record<string, Balance> = {};
      balancesRes.data.forEach((b: any) => {
        balMap[b.person_id] = {
          person_id: b.person_id,
          net_balance_minor: b.net_balance_minor,
          currency: b.currency,
          description: b.description,
        };
      });
      setBalances(balMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLedger = async (friendId: string) => {
    try {
      const [sharedRes, settlementsRes] = await Promise.all([
        api.get("/shared-expenses"),
        api.get("/settlements"),
      ]);
      // Filter shared expenses involving this friend
      const filteredShared = sharedRes.data.filter((se: SharedExpense) =>
        se.participants.some(p => p.person_id === friendId)
      );
      // Filter settlements involving this friend
      const filteredSettlements = settlementsRes.data.filter((s: Settlement) =>
        s.from_person_id === friendId || s.to_person_id === friendId
      );
      setSharedExpenses(filteredShared);
      setSettlements(filteredSettlements);
    } catch (err) {
      console.error("Failed to load friend ledger", err);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, [includeArchived]);

  useEffect(() => {
    if (selectedFriend) {
      fetchLedger(selectedFriend.id);
    }
  }, [selectedFriend]);

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setFormLoading(true);
    setServerError(null);
    try {
      await api.post("/friends", {
        name,
        email: email || null,
        phone: phone || null,
      });
      setShowAddModal(false);
      setName("");
      setEmail("");
      setPhone("");
      fetchFriends();
    } catch (err: any) {
      setServerError(err.response?.data?.detail || "Failed to add friend.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFriend || !name) return;
    setFormLoading(true);
    setServerError(null);
    try {
      await api.patch(`/friends/${selectedFriend.id}`, {
        name,
        email: email || null,
        phone: phone || null,
      });
      setShowEditModal(false);
      setSelectedFriend(prev => prev ? { ...prev, name, email: email || null, phone: phone || null } : null);
      fetchFriends();
    } catch (err: any) {
      setServerError(err.response?.data?.detail || "Failed to update friend.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleArchiveFriend = async (friendId: string) => {
    if (!confirm("Are you sure you want to archive this friend? Active balances remain active.")) return;
    try {
      await api.post(`/friends/${friendId}/archive`);
      if (selectedFriend?.id === friendId) {
        setSelectedFriend(null);
      }
      fetchFriends();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFriend = async (friendId: string) => {
    if (!confirm("Are you sure you want to permanently delete this friend? This is only possible if you share no financial history.")) return;
    try {
      await api.delete(`/friends/${friendId}`);
      if (selectedFriend?.id === friendId) {
        setSelectedFriend(null);
      }
      fetchFriends();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Cannot delete friend. They might have transaction history; archive them instead.");
    }
  };

  const openEditModal = (friend: Friend) => {
    setName(friend.name);
    setEmail(friend.email || "");
    setPhone(friend.phone || "");
    setShowEditModal(true);
  };

  const userCurrency = user?.currency || "INR";

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Friend Ledgers</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginTop: "4px" }}>
            Add friends, view balances, and check sharing history.
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          ➕ Add Friend
        </button>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 2fr",
        gap: "var(--space-6)",
      }} className="friends-grid">
        {/* Left Column: Friend list */}
        <div>
          <div className="card" style={{ padding: "var(--space-4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
              <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700 }}>Friends List</h3>
              <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={(e) => setIncludeArchived(e.target.checked)}
                />
                Show Archived
              </label>
            </div>

            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
                <div style={{
                  width: "24px",
                  height: "24px",
                  border: "2.5px solid var(--color-border)",
                  borderTopColor: "var(--color-accent)",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }} />
              </div>
            ) : friends.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "20px 0", fontSize: "var(--text-sm)" }}>
                No friends added yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {friends.map((f) => {
                  const bal = balances[f.id];
                  const isSelected = selectedFriend?.id === f.id;
                  return (
                    <div
                      key={f.id}
                      onClick={() => setSelectedFriend(f)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "var(--space-3)",
                        border: isSelected ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border)",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: isSelected ? "var(--color-accent-light)" : "var(--color-surface-2)",
                        cursor: "pointer",
                        transition: "all var(--transition-fast)",
                      }}
                      className="friend-list-item"
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--color-text)" }}>
                          {f.name} {f.status === "ARCHIVED" && <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>(Archived)</span>}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>
                          {f.email || "No email"}
                        </div>
                      </div>
                      <span className={`amount ${
                        bal && bal.net_balance_minor > 0 ? "amount-positive" : bal && bal.net_balance_minor < 0 ? "amount-negative" : "amount-zero"
                      }`} style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
                        {bal && bal.net_balance_minor !== 0
                          ? `${bal.net_balance_minor > 0 ? "+" : ""}${formatMinor(bal.net_balance_minor, bal.currency)}`
                          : "Settled"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Friend detail ledger */}
        <div>
          {selectedFriend ? (
            <div className="card" style={{ padding: "var(--space-5)" }}>
              {/* Ledger Header */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                borderBottom: "1px solid var(--color-border)",
                paddingBottom: "var(--space-4)",
                marginBottom: "var(--space-4)",
              }}>
                <div>
                  <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700 }}>{selectedFriend.name}</h2>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "2px" }}>
                    {selectedFriend.email && `Email: ${selectedFriend.email} `}
                    {selectedFriend.phone && `• Phone: ${selectedFriend.phone}`}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  <button onClick={() => openEditModal(selectedFriend)} className="btn btn-secondary btn-sm">
                    ✏️ Edit
                  </button>
                  {selectedFriend.status === "ACTIVE" ? (
                    <button onClick={() => handleArchiveFriend(selectedFriend.id)} className="btn btn-danger btn-sm" style={{ backgroundColor: "transparent" }}>
                      🗄️ Archive
                    </button>
                  ) : (
                    <button onClick={() => handleDeleteFriend(selectedFriend.id)} className="btn btn-danger btn-sm">
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Status Balance */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                backgroundColor: "var(--color-surface-2)",
                padding: "var(--space-4)",
                borderRadius: "var(--radius-md)",
                marginBottom: "var(--space-5)",
              }}>
                <span style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>Net Balance:</span>
                <span className={`amount ${
                  balances[selectedFriend.id]?.net_balance_minor > 0 ? "amount-positive" : balances[selectedFriend.id]?.net_balance_minor < 0 ? "amount-negative" : "amount-zero"
                }`} style={{ fontSize: "var(--text-lg)", fontWeight: 700 }}>
                  {balances[selectedFriend.id]
                    ? `${balances[selectedFriend.id].net_balance_minor > 0 ? "+" : ""}${formatMinor(balances[selectedFriend.id].net_balance_minor, balances[selectedFriend.id].currency)}`
                    : "Settled"}
                </span>
              </div>

              {/* Shared Expenses & Settlements Tabs */}
              <div>
                <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-3)" }}>Ledger Activity</h3>
                {sharedExpenses.length === 0 && settlements.length === 0 ? (
                  <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", textAlign: "center", padding: "20px 0" }}>
                    No shared transactions logged with this friend.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                    {/* List transactions sorted by date */}
                    {[
                      ...sharedExpenses.map(se => ({ ...se, type: "EXPENSE" })),
                      ...settlements.map(s => ({ ...s, type: "SETTLEMENT" }))
                    ].sort((a: any, b: any) => b.expense_date?.localeCompare(a.settlement_date) || b.settlement_date?.localeCompare(a.expense_date)).map((activity: any, index) => {
                      const isExpense = activity.type === "EXPENSE";
                      const activityDate = isExpense ? activity.expense_date : activity.settlement_date;

                      return (
                        <div key={activity.id + "-" + index} style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "var(--space-3)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius-md)",
                        }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>
                              {isExpense ? `⚖️ Shared: ${activity.title}` : `💳 Settlement: ${activity.note || "Repayment"}`}
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                              {activityDate} {activity.reference && `• Ref: ${activity.reference}`}
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div className="amount" style={{ fontWeight: 600 }}>
                              {formatMinor(isExpense ? activity.total_amount_minor : activity.amount_minor, activity.currency)}
                            </div>
                            <div style={{ fontSize: "10px", color: "var(--color-text-secondary)" }}>
                              {isExpense
                                ? (activity.payer_id === user?.id ? "You paid" : `${selectedFriend.name} paid`)
                                : (activity.from_person_id === user?.id ? "You paid" : "You received")
                              }
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card" style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              padding: "40px",
              color: "var(--color-text-muted)",
              fontSize: "var(--text-sm)",
              minHeight: "300px",
            }}>
              Select a friend from the list to view their sharing ledger.
            </div>
          )}
        </div>
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
            maxWidth: "400px",
            padding: "var(--space-6)",
            backgroundColor: "var(--color-surface)",
            borderRadius: "var(--radius-lg)",
          }}>
            <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 700, marginBottom: "var(--space-4)", color: "var(--color-primary)" }}>
              Add New Friend
            </h3>
            <form onSubmit={handleAddFriend}>
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
                <label className="form-label">Name</label>
                <input
                  type="text"
                  required
                  placeholder="Friend name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email (Optional)</label>
                <input
                  type="email"
                  placeholder="friend@example.com"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "var(--space-6)" }}>
                <label className="form-label">Phone Number (Optional)</label>
                <input
                  type="text"
                  placeholder="+91 XXXXX XXXXX"
                  className="input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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
                  {formLoading ? "Adding..." : "Add Friend"}
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
            maxWidth: "400px",
            padding: "var(--space-6)",
            backgroundColor: "var(--color-surface)",
            borderRadius: "var(--radius-lg)",
          }}>
            <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 700, marginBottom: "var(--space-4)", color: "var(--color-primary)" }}>
              Edit Friend Details
            </h3>
            <form onSubmit={handleEditFriend}>
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
                <label className="form-label">Name</label>
                <input
                  type="text"
                  required
                  placeholder="Friend name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email (Optional)</label>
                <input
                  type="email"
                  placeholder="friend@example.com"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "var(--space-6)" }}>
                <label className="form-label">Phone (Optional)</label>
                <input
                  type="text"
                  placeholder="Phone number"
                  className="input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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
        .friend-list-item:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm);
        }
        @media (max-width: 768px) {
          .friends-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
