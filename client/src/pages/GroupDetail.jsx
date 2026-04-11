import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Copy, Users, ArrowRight, Wallet, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AppLayout from "@/components/layout/AppLayout";
import { authApiRequest, getStoredUser } from "@/lib/api";
import { addLocalPendingRequest, getLocalPendingRequests, removeLocalPendingRequest } from "@/lib/api";
import { categoryIcons, expenseCategoryIcons, formatCurrency, getInitials } from "@/lib/mock-data";
import { toast } from "sonner";

function formatDateTime(value) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateOnly(value) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const GroupDetail = () => {
  const { id } = useParams();
  const user = getStoredUser();
  const currentUserId = user?.id;

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleChoiceOpen, setSettleChoiceOpen] = useState(false);
  const [settleChoiceTarget, setSettleChoiceTarget] = useState(null);
  const [settleTarget, setSettleTarget] = useState(null);
  const [settleMethod, setSettleMethod] = useState("upi");
  const [settleForExpense, setSettleForExpense] = useState(null);
  const [settleNotes, setSettleNotes] = useState("");
  const [settling, setSettling] = useState(false);
  const [disabledTargets, setDisabledTargets] = useState([]);
  const [disabledExpenses, setDisabledExpenses] = useState([]);

  useEffect(() => {
    if (!settleOpen) {
      if (settleTarget?.userId) unmarkTargetDisabled(settleTarget.userId);
      if (settleForExpense) unmarkExpenseDisabled(settleForExpense);
      setSettleForExpense(null);
      setSettleTarget(null);
      setSettleNotes("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settleOpen]);

  function unmarkTargetDisabled(id) {
    if (!id) return;
    setDisabledTargets((prev) => prev.filter((x) => x !== id));
  }

  function unmarkExpenseDisabled(id) {
    if (!id) return;
    setDisabledExpenses((prev) => prev.filter((x) => x !== id));
  }

  useEffect(() => {
    async function loadGroupDetail() {
      setLoading(true);
      try {
        const data = await authApiRequest(`/api/groups/${id}`);
        setGroup(data.group);
        setExpenses((data.expenses || []).filter((expense) => expense.category !== "Settlement"));
        setPendingRequests(data.pendingRequests || []);
      } catch (err) {
        toast.error(err.message || "Failed to load group");
        setGroup(null);
        setExpenses([]);
      } finally {
        setLoading(false);
      }
    }

    loadGroupDetail();
  }, [id]);

  const settleTargets = useMemo(() => {
    if (!currentUserId || !group?.members || !expenses.length) return new Map();

    const pairDebts = new Map();

    for (const expense of expenses) {
      const payerId = expense.paidBy?.id;
      if (!payerId) continue;

      for (const split of expense.splits || []) {
        // ignore already-settled splits when calculating outstanding amounts
        if (split.settled) continue;
        const debtorId = split.user?.id;
        if (!debtorId || debtorId === payerId) continue;

        const key = `${debtorId}->${payerId}`;
        pairDebts.set(key, Number(pairDebts.get(key) || 0) + Number(split.amount || 0));
      }
    }

    const targets = new Map();

    for (const member of group.members || []) {
      const memberId = member.user?.id;
      if (!memberId || memberId === currentUserId) continue;

      const iOwe = Number(pairDebts.get(`${currentUserId}->${memberId}`) || 0);
      const theyOwe = Number(pairDebts.get(`${memberId}->${currentUserId}`) || 0);
      const net = Number((iOwe - theyOwe).toFixed(2));

      if (net > 0.01) {
        targets.set(memberId, net);
      }
    }

    return targets;
  }, [currentUserId, expenses, group?.members]);

  // local pending requests to suppress duplicate settle actions
  const localPendingMap = useMemo(() => {
    try {
      const list = getLocalPendingRequests() || [];
      const map = new Map();
      for (const p of list) {
        if (String(p.groupId) !== String(id)) continue;
        if (String(p.from) === String(currentUserId)) {
          map.set(String(p.to), p);
        }
      }
      return map;
    } catch (_e) {
      return new Map();
    }
  }, [id, currentUserId]);

  function hasLocalPendingForExpense(expense) {
    try {
      const list = getLocalPendingRequests() || [];
      return list.some((p) => String(p.groupId) === String(id) && (p.expenseId === expense.id || String(p.to) === String(expense.paidBy?.id)));
    } catch (_e) {
      return false;
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading group...</p>
        </div>
      </AppLayout>
    );
  }

  if (!group) {
    return (
      <AppLayout>
        <p>Group not found</p>
      </AppLayout>
    );
  }

  const myMember = group.members?.find((member) => member.user.id === currentUserId);
  const myBalance = myMember?.balance ?? 0;

  const getMyShare = (expense) =>
    Number((expense.splits || []).find((split) => split.user?.id === currentUserId)?.amount || 0);

  const getOutstandingToPayer = (expense) => {
    if (!expense?.paidBy?.id) return 0;
    return Number(settleTargets.get(expense.paidBy.id) || 0);
  };

  const canPaySpecificExpense = (expense) => {
    if (!expense) return false;
    return (
      expense.category !== "Settlement" &&
      expense.paidBy?.id !== currentUserId &&
      getMyShare(expense) > 0 &&
      !(expense.splits || []).find((split) => split.user?.id === currentUserId)?.settled
    );
  };

  function handleCopyCode() {
    navigator.clipboard.writeText(group.code);
    toast.success("Group code copied!");
  }

  function handleSettle(member, amount) {
    // disable this target to avoid duplicate clicks
    setDisabledTargets((prev) => (prev.includes(member.user.id) ? prev : [...prev, member.user.id]));
    setSettleTarget({
      userId: member.user.id,
      name: member.user.name,
      amount,
    });
    setSettleMethod("upi");
    setSettleNotes("");
    setSettleForExpense(null);
    setSettleOpen(true);
  }

  // open a choice dialog that lets user pick net vs specific expense
  function handleSettleChoice(member, amount) {
    setSettleChoiceTarget({ member, amount });
    setSettleChoiceOpen(true);
  }

  async function confirmMemberSettlement() {
    if (!settleTarget) return;
    const targetId = settleTarget?.userId;
    const expenseId = settleForExpense;

    try {
      setSettling(true);
      // Always create a pending settlement request; recipient must accept to finalize
      const resp = await authApiRequest(`/api/settlements/${id}/requests`, {
        method: "POST",
        body: JSON.stringify({
          toUserId: settleTarget.userId,
          amount: settleTarget.amount,
          notes: settleNotes || `Settlement requested with ${settleTarget.name}`,
          method: settleMethod,
          expenseId: settleForExpense || undefined,
        }),
      });
      toast.success(`Settlement request sent to ${settleTarget.name}`);
      // store a local pending request entry so other pages can reflect pending state
      try {
        addLocalPendingRequest({
          requestId: resp?.requestId || null,
          groupId: id,
          from: getStoredUser()?.id,
          to: settleTarget.userId,
          expenseId: settleForExpense || null,
          amount: settleTarget.amount,
          createdAt: new Date().toISOString(),
        });
      } catch (_e) {}
      setSettleOpen(false);
      setSettleForExpense(null);
      setSettleNotes("");
    } catch (err) {
      toast.error(err.message || "Failed to record settlement");
    } finally {
      setSettling(false);
      // re-enable target/expense after request completes using captured ids
      if (targetId) {
        setDisabledTargets((prev) => prev.filter((x) => x !== targetId));
      }
      if (expenseId) {
        setDisabledExpenses((prev) => prev.filter((x) => x !== expenseId));
      }
    }
  }

  async function refreshGroup() {
    const data = await authApiRequest(`/api/groups/${id}`);
    setGroup(data.group);
    setExpenses((data.expenses || []).filter((expense) => expense.category !== "Settlement"));
    setPendingRequests(data.pendingRequests || []);
  }

  async function acceptPendingRequest(requestId) {
    try {
      setSettling(true);
      await authApiRequest(`/api/settlements/${id}/requests/${requestId}/accept`, { method: "POST" });
      toast.success("Settlement accepted");
      await refreshGroup();
      // remove any matching local pending entries for this group
      try {
        removeLocalPendingRequest((p) => String(p.groupId) === String(id));
      } catch (_e) {}
    } catch (err) {
      toast.error(err.message || "Failed to accept settlement");
    } finally {
      setSettling(false);
    }
  }

  async function paySpecificExpense(expense) {
    // open settle modal pre-filled for this expense so user can choose cash (request) or online (immediate)
    // disable this expense to prevent duplicate clicks
    setDisabledExpenses((prev) => (prev.includes(expense.id) ? prev : [...prev, expense.id]));
    setSettleForExpense(expense.id);
    setSettleTarget({
      userId: expense.paidBy?.id,
      name: expense.paidBy?.name,
      amount: getMyShare(expense),
    });
    setSettleMethod("upi");
    setSettleNotes("");
    setSettleOpen(true);
  }

  async function payNetForExpensePayer(expense) {
    const amount = getOutstandingToPayer(expense);
    if (amount <= 0) {
      toast.error("No outstanding net amount left to settle");
      return;
    }

    // open settle modal instead of immediate settlement so user can choose method and note
    // disable target to avoid duplicates
    if (expense.paidBy?.id) setDisabledTargets((prev) => (prev.includes(expense.paidBy.id) ? prev : [...prev, expense.paidBy.id]));
    setSettleForExpense(null);
    setSettleTarget({ userId: expense.paidBy?.id, name: expense.paidBy?.name, amount });
    setSettleMethod("upi");
    setSettleNotes("");
    setSettleOpen(true);
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{categoryIcons[group.category]}</span>
              <div>
                <h1 className="text-2xl font-bold font-display">{group.name}</h1>
                <p className="text-muted-foreground text-sm">{group.description}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-xl" onClick={handleCopyCode}>
                <Copy className="w-4 h-4 mr-2" /> {group.code}
              </Button>
              <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground rounded-xl">
                <Link to={`/groups/${id}/add-expense`}>
                  <Plus className="w-4 h-4 mr-2" /> Add Expense
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center p-3 rounded-xl bg-secondary/50">
              <p className="text-xs text-muted-foreground">Total Expenses</p>
              <p className="font-display font-bold text-lg">{formatCurrency(group.totalExpenses)}</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-secondary/50">
              <p className="text-xs text-muted-foreground">Your Balance</p>
              <p className={`font-display font-bold text-lg ${myBalance >= 0 ? "text-owed" : "text-owe"}`}>
                {myBalance >= 0 ? "+" : ""}
                {formatCurrency(myBalance)}
              </p>
            </div>
            <div className="text-center p-3 rounded-xl bg-secondary/50">
              <p className="text-xs text-muted-foreground">Members</p>
              <p className="font-display font-bold text-lg">{group.members.length}</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-lg flex items-center gap-2">
                <Users className="w-5 h-5" /> Members
              </h2>
              <div>
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { setSettleChoiceTarget(null); setSettleChoiceOpen(true); }}>
                  Settle
                </Button>
              </div>
            </div>
            {pendingRequests.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold mb-2">Incoming cash settlement requests</p>
                <div className="space-y-2">
                  {pendingRequests.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-background/40">
                      <div>
                        <p className="font-medium">{r.from.name} wants to pay you</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(r.amount)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => acceptPendingRequest(r.id)} disabled={settling}>
                          <Check className="w-4 h-4 mr-1" /> Accept
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-3">
              {group.members.map((member) => (
                <div key={member.user.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {getInitials(member.user.name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {member.user.name}
                        {member.user.id === currentUserId ? " (You)" : ""}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`text-sm font-semibold ${member.balance >= 0 ? "text-owed" : "text-owe"}`}>
                      {member.balance >= 0 ? "+" : ""}
                      {formatCurrency(member.balance)}
                    </p>
                    {settleTargets.has(member.user.id) && !localPendingMap.has(String(member.user.id)) && (
                      <button
                        onClick={() => handleSettleChoice(member, settleTargets.get(member.user.id))}
                        disabled={disabledTargets.includes(member.user.id)}
                        className={`text-xs inline-flex items-center gap-2 ${disabledTargets.includes(member.user.id) ? "text-muted-foreground" : "text-primary hover:underline"}`}
                      >
                        {disabledTargets.includes(member.user.id) ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" /> Processing
                          </>
                        ) : (
                          <>Pay {formatCurrency(settleTargets.get(member.user.id))}</>
                        )}
                      </button>
                    )}
                    {localPendingMap.has(String(member.user.id)) && (
                      <div className="text-xs text-muted-foreground">Pending</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-5">
            <h2 className="font-display font-semibold text-lg mb-4">Expenses</h2>
            <div className="space-y-3">
              {expenses.map((expense) => (
                <motion.button
                  key={expense.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  type="button"
                  onClick={() => setSelectedExpense(expense)}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{expenseCategoryIcons[expense.category] || "ðŸ“¦"}</span>
                    <div>
                      <p className="font-medium">{expense.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {expense.category === "Settlement" ? "Settlement recorded by " : "Paid by "}
                        {expense.paidBy?.name || "Unknown"} · {formatDateOnly(expense.date)}
                      </p>
                      <p className="text-xs text-muted-foreground">Added at {formatDateTime(expense.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold">{formatCurrency(expense.amount)}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      Split between {expense.splits?.length || 0} members
                    </p>
                  </div>
                </motion.button>
              ))}

              {expenses.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No expenses yet</p>
                  <Button asChild variant="link" className="mt-2">
                    <Link to={`/groups/${id}/add-expense`}>
                      Add the first expense <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={Boolean(selectedExpense)} onOpenChange={(open) => !open && setSelectedExpense(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Expense Details</DialogTitle>
            <DialogDescription className="sr-only">
              Detailed breakdown of the selected group expense.
            </DialogDescription>
          </DialogHeader>

          {selectedExpense && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl bg-secondary/40 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Expense</p>
                  <p className="font-medium mt-1">{selectedExpense.title}</p>
                </div>
                <div className="rounded-xl bg-secondary/40 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Amount</p>
                  <p className="font-medium mt-1">{formatCurrency(selectedExpense.amount)}</p>
                </div>
                <div className="rounded-xl bg-secondary/40 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Paid By</p>
                  <p className="font-medium mt-1">{selectedExpense.paidBy?.name || "Unknown"}</p>
                </div>
                <div className="rounded-xl bg-secondary/40 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Date</p>
                  <p className="font-medium mt-1">{formatDateOnly(selectedExpense.date)}</p>
                </div>
                <div className="rounded-xl bg-secondary/40 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Added At</p>
                  <p className="font-medium mt-1">{formatDateTime(selectedExpense.createdAt)}</p>
                </div>
                <div className="rounded-xl bg-secondary/40 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Category</p>
                  <p className="font-medium mt-1">{selectedExpense.category || "Other"}</p>
                </div>
                <div className="rounded-xl bg-secondary/40 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Split Type</p>
                  <p className="font-medium mt-1 capitalize">{selectedExpense.splitType || "equal"}</p>
                </div>
                <div className="rounded-xl bg-secondary/40 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Your Share</p>
                  <p className="font-medium mt-1">{formatCurrency(getMyShare(selectedExpense))}</p>
                </div>
              </div>

              <div className="rounded-xl bg-secondary/40 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Shared With</p>
                <ul className="space-y-2">
                  {selectedExpense.splits?.map((split) => (
                    <li
                      key={split.user?.id || split.user?.name}
                      className="flex items-center justify-between gap-3 rounded-lg bg-background/40 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{split.user?.name || "Unknown"}</p>
                        <p className={`text-xs ${split.settled ? "text-owed" : "text-owe"}`}>
                          {split.settled ? "Settled" : "Not settled"}
                        </p>
                      </div>
                      <span className="shrink-0">{formatCurrency(split.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {selectedExpense.notes ? (
                <div className="rounded-xl border border-border/60 bg-background/40 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Notes</p>
                  <p className="mt-1 break-words">{selectedExpense.notes}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">No notes added for this expense.</p>
              )}

              {(canPaySpecificExpense(selectedExpense) || getOutstandingToPayer(selectedExpense) > 0) && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {hasLocalPendingForExpense(selectedExpense) ? (
                    <div className="text-sm text-muted-foreground">Pending</div>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        disabled={!canPaySpecificExpense(selectedExpense) || disabledExpenses.includes(selectedExpense.id)}
                        onClick={async () => {
                          try {
                            await paySpecificExpense(selectedExpense);
                          } catch (err) {
                            toast.error(err.message || "Failed to settle this expense");
                          }
                        }}
                      >
                        {disabledExpenses.includes(selectedExpense.id) ? (
                          <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Processing</span>
                        ) : (
                          "Settle This Expense"
                        )}
                      </Button>
                      <Button
                        disabled={getOutstandingToPayer(selectedExpense) <= 0 || disabledTargets.includes(selectedExpense.paidBy?.id)}
                        onClick={async () => {
                          try {
                            await payNetForExpensePayer(selectedExpense);
                          } catch (err) {
                            toast.error(err.message || "Failed to settle net amount");
                          }
                        }}
                      >
                        {disabledTargets.includes(selectedExpense.paidBy?.id) ? (
                          <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Processing</span>
                        ) : (
                          "Settle Net Amount"
                        )}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Settle Payment</DialogTitle>
            <DialogDescription className="sr-only">
              Settlement details and payment actions for this group member.
            </DialogDescription>
          </DialogHeader>

          {settleTarget && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-muted-foreground">Pay {settleTarget.name}</p>
                <p className="text-3xl font-display font-bold text-owe mt-2">
                  {formatCurrency(settleTarget.amount)}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <label className={`px-3 py-1 rounded-xl cursor-pointer ${settleMethod === "upi" ? "bg-secondary text-muted-foreground" : "bg-background"}`}>
                  <input
                    type="radio"
                    name="settleMethod"
                    value="upi"
                    checked={settleMethod === "upi"}
                    onChange={() => setSettleMethod("upi")}
                    className="sr-only"
                  />
                  UPI
                </label>
                <label className={`px-3 py-1 rounded-xl cursor-pointer ${settleMethod === "cash" ? "bg-secondary text-muted-foreground" : "bg-background"}`}>
                  <input
                    type="radio"
                    name="settleMethod"
                    value="cash"
                    checked={settleMethod === "cash"}
                    onChange={() => setSettleMethod("cash")}
                    className="sr-only"
                  />
                  Cash
                </label>
                <label className={`px-3 py-1 rounded-xl cursor-pointer ${settleMethod === "other" ? "bg-secondary text-muted-foreground" : "bg-background"}`}>
                  <input
                    type="radio"
                    name="settleMethod"
                    value="other"
                    checked={settleMethod === "other"}
                    onChange={() => setSettleMethod("other")}
                    className="sr-only"
                  />
                  Other
                </label>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Note (optional)</label>
                <textarea
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  rows={3}
                  className="w-full mt-2 p-2 rounded-lg border border-border bg-background text-sm"
                  placeholder="Add a note or payment reference (optional)"
                />
              </div>

              <Button
                onClick={confirmMemberSettlement}
                disabled={settling}
                className="w-full bg-gradient-primary text-primary-foreground rounded-xl h-11 shadow-glow"
              >
                <Wallet className="w-4 h-4 mr-2" /> {settling ? "Saving..." : "Settle Now"}
              </Button>

              <Button
                variant="outline"
                className="w-full rounded-xl"
                onClick={() => setSettleOpen(false)}
              >
                Cancel
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Choice dialog: net vs specific expense */}
      <Dialog open={settleChoiceOpen} onOpenChange={setSettleChoiceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Settle With Member</DialogTitle>
            <DialogDescription className="sr-only">
              Choose between settling net balance or a specific expense.
            </DialogDescription>
          </DialogHeader>

          {!settleChoiceTarget && (
            <div className="space-y-4">
              <div className="text-center py-2">
                <p className="text-muted-foreground">Settle with a member</p>
                <p className="text-sm text-muted-foreground">Choose a member or view outstanding expenses</p>
              </div>

              <div className="space-y-2 max-h-72 overflow-auto">
                {Array.from(settleTargets.entries()).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center">No outstanding balances to settle</p>
                )}
                {Array.from(settleTargets.entries()).map(([memberId, amount]) => {
                  const member = (group.members || []).find((m) => m.user.id === memberId);
                  if (!member) return null;
                  return (
                    <div key={memberId} className="flex items-center justify-between p-2 rounded-lg bg-background/40">
                      <div>
                        <p className="font-medium">{member.user.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(amount)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => { handleSettle(member, amount); setSettleChoiceOpen(false); }}>
                          Settle Net
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setSettleChoiceTarget({ member, amount })}>
                          View
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button variant="outline" className="w-full rounded-xl" onClick={() => setSettleChoiceOpen(false)}>
                Cancel
              </Button>
            </div>
          )}

          {settleChoiceTarget && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-muted-foreground">{settleChoiceTarget.member.user.name}</p>
                <p className="text-3xl font-display font-bold text-owe mt-2">{formatCurrency(settleChoiceTarget.amount)}</p>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => {
                    // settle net balance
                    handleSettle(settleChoiceTarget.member, settleChoiceTarget.amount);
                    setSettleChoiceOpen(false);
                  }}
                  className="w-full bg-gradient-primary text-primary-foreground rounded-xl h-11 shadow-glow"
                >
                  Settle Net Balance
                </Button>

                <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                  <p className="text-sm font-medium mb-2">Outstanding expenses with {settleChoiceTarget.member.user.name}</p>
                  <div className="space-y-2 max-h-56 overflow-auto">
                    {expenses
                      .filter((e) => e.paidBy?.id === settleChoiceTarget.member.user.id)
                      .filter((e) => {
                        const mySplit = (e.splits || []).find((s) => s.user?.id === currentUserId);
                        return mySplit && !mySplit.settled && Number(mySplit.amount) > 0;
                      })
                      .map((e) => (
                        <div key={e.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{e.title}</p>
                            <p className="text-xs text-muted-foreground">{formatCurrency(getMyShare(e))} · {formatDateOnly(e.date)}</p>
                          </div>
                          <div>
                            <Button
                              size="sm"
                              onClick={() => {
                                paySpecificExpense(e);
                                setSettleChoiceOpen(false);
                              }}
                              disabled={disabledExpenses.includes(e.id)}
                            >
                              {disabledExpenses.includes(e.id) ? "Processing" : "Settle This Expense"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    {expenses.filter((e) => e.paidBy?.id === settleChoiceTarget.member.user.id && (e.splits || []).find((s) => s.user?.id === currentUserId && !s.settled)).length === 0 && (
                      <p className="text-xs text-muted-foreground">No outstanding specific expenses</p>
                    )}
                  </div>
                </div>

                <Button variant="outline" className="w-full rounded-xl" onClick={() => setSettleChoiceOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default GroupDetail;
