import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Copy, Users, ArrowRight, Wallet, Check } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleTarget, setSettleTarget] = useState(null);
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    async function loadGroupDetail() {
      setLoading(true);
      try {
        const data = await authApiRequest(`/api/groups/${id}`);
        setGroup(data.group);
        setExpenses((data.expenses || []).filter((expense) => expense.category !== "Settlement"));
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
    setSettleTarget({
      userId: member.user.id,
      name: member.user.name,
      amount,
    });
    setSettleOpen(true);
  }

  async function confirmMemberSettlement() {
    if (!settleTarget) return;

    try {
      setSettling(true);
      await authApiRequest(`/api/groups/${id}/settle`, {
        method: "POST",
        body: JSON.stringify({
          toUserId: settleTarget.userId,
          amount: settleTarget.amount,
          notes: `Settled with ${settleTarget.name}`,
        }),
      });
      toast.success(`Settlement recorded with ${settleTarget.name}`);
      setSettleOpen(false);
      await refreshGroup();
    } catch (err) {
      toast.error(err.message || "Failed to record settlement");
    } finally {
      setSettling(false);
    }
  }

  async function refreshGroup() {
    const data = await authApiRequest(`/api/groups/${id}`);
    setGroup(data.group);
    setExpenses((data.expenses || []).filter((expense) => expense.category !== "Settlement"));
  }

  async function paySpecificExpense(expense) {
    await authApiRequest(`/api/groups/${id}/expenses/${expense.id}/settle`, {
      method: "POST",
    });
    toast.success("Expense settled!");
    setSelectedExpense(null);
    await refreshGroup();
  }

  async function payNetForExpensePayer(expense) {
    const amount = getOutstandingToPayer(expense);
    if (amount <= 0) {
      toast.error("No outstanding net amount left to settle");
      return;
    }

    await authApiRequest(`/api/groups/${id}/settle`, {
      method: "POST",
      body: JSON.stringify({
        toUserId: expense.paidBy?.id,
        amount,
        notes: `Settled balance related to ${expense.title}`,
      }),
    });
    toast.success("Settlement recorded!");
    setSelectedExpense(null);
    await refreshGroup();
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
            <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" /> Members
            </h2>
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
                    {settleTargets.has(member.user.id) && (
                      <button
                        onClick={() => handleSettle(member, settleTargets.get(member.user.id))}
                        className="text-xs text-primary hover:underline"
                      >
                        Pay {formatCurrency(settleTargets.get(member.user.id))}
                      </button>
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
                  <Button
                    variant="outline"
                    disabled={!canPaySpecificExpense(selectedExpense)}
                    onClick={async () => {
                      try {
                        await paySpecificExpense(selectedExpense);
                      } catch (err) {
                        toast.error(err.message || "Failed to settle this expense");
                      }
                    }}
                  >
                    Settle This Expense
                  </Button>
                  <Button
                    disabled={getOutstandingToPayer(selectedExpense) <= 0}
                    onClick={async () => {
                      try {
                        await payNetForExpensePayer(selectedExpense);
                      } catch (err) {
                        toast.error(err.message || "Failed to settle net amount");
                      }
                    }}
                  >
                    Settle Net Amount
                  </Button>
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
    </AppLayout>
  );
};

export default GroupDetail;
