import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  authApiRequest,
  getStoredUser,
  readCachedAuthResponse,
  writeCachedAuthResponse,
} from "@/lib/api";
import { addLocalPendingRequest, getLocalPendingRequests } from "@/lib/api";
import { categoryIcons, expenseCategoryIcons, formatCurrency } from "@/lib/mock-data";
import { toast } from "sonner";

function isExpenseRelevantToCurrentUser(expense, currentUserId) {
  if (expense.category === "Settlement") return false;

  const mySplits = (expense.splits || []).filter((split) => split.user?.id === currentUserId);
  const myShare = mySplits.reduce((sum, split) => sum + Number(split.amount || 0), 0);
  return myShare > 0;
}

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

const Expenses = () => {
  const user = getStoredUser();
  const currentUserId = user?.id;
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [settlingExpenseId, setSettlingExpenseId] = useState("");

  const loadExpenses = useCallback(async () => {
    const cached = readCachedAuthResponse("/api/dashboard/expenses");

    if (cached?.expenses) {
      setExpenses(cached.expenses.filter((expense) => isExpenseRelevantToCurrentUser(expense, currentUserId)));
      setIsLoading(false);
    }

    try {
      const response = await authApiRequest("/api/dashboard/expenses");
      const relevantExpenses = (response.expenses || []).filter((expense) =>
        isExpenseRelevantToCurrentUser(expense, currentUserId),
      );
      setExpenses(relevantExpenses);
      writeCachedAuthResponse("/api/dashboard/expenses", {
        ...response,
        expenses: relevantExpenses,
      });
    } catch (err) {
      if (!cached) toast.error(err.message || "Failed to load expenses");
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return expenses;

    return expenses.filter((expense) => {
      const title = expense.title?.toLowerCase() || "";
      const payer = expense.paidBy?.name?.toLowerCase() || "";
      const groupName = expense.group?.name?.toLowerCase() || "";
      return title.includes(query) || payer.includes(query) || groupName.includes(query);
    });
  }, [expenses, search]);

  const getMyShare = (expense) =>
    Number((expense.splits || []).find((split) => split.user?.id === currentUserId)?.amount || 0);

  const isSettledForCurrentUser = (expense) =>
    Boolean((expense.splits || []).find((split) => split.user?.id === currentUserId)?.settled);

  const canSettleExpense = (expense) =>
    expense?.category !== "Settlement" &&
    expense?.paidBy?.id !== currentUserId &&
    getMyShare(expense) > 0 &&
    !isSettledForCurrentUser(expense) &&
    expense?.group?.id;

  // consider local pending requests to suppress duplicate cash requests
  const localPending = getLocalPendingRequests();
  function hasLocalPendingForExpense(expense) {
    try {
      return localPending.some((p) => String(p.groupId) === String(expense.group.id) && (p.expenseId === expense.id || String(p.to) === String(expense.paidBy.id)));
    } catch (_e) {
      return false;
    }
  }

  async function settleExpense(expense) {
    if (!canSettleExpense(expense)) return;

    try {
      setSettlingExpenseId(expense.id);
      const useCash = window.confirm(
        "Settle via cash request? OK = send cash request to payer, Cancel = settle immediately via app.",
      );
      if (useCash) {
        const myShare = getMyShare(expense);
        const resp = await authApiRequest(`/api/settlements/${expense.group.id}/requests`, {
          method: "POST",
          body: JSON.stringify({
            toUserId: expense.paidBy.id,
            amount: myShare,
            notes: `Cash settlement for ${expense.title}`,
            expenseId: expense.id,
          }),
        });
        toast.success("Cash settlement request sent to payer");
        try {
          addLocalPendingRequest({
            requestId: resp?.requestId || null,
            groupId: expense.group.id,
            from: getStoredUser()?.id,
            to: expense.paidBy.id,
            expenseId: expense.id,
            amount: myShare,
            createdAt: new Date().toISOString(),
          });
        } catch (_e) {}
      } else {
        await authApiRequest(`/api/groups/${expense.group.id}/expenses/${expense.id}/settle`, {
          method: "POST",
        });
        toast.success("Expense settled!");
        await loadExpenses();
        if (selectedExpense?.id === expense.id) setSelectedExpense(null);
      }
    } catch (err) {
      toast.error(err.message || "Failed to settle expense");
    } finally {
      setSettlingExpenseId("");
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display">Expenses</h1>
            <p className="text-muted-foreground mt-1">All group expenses that affect your balances</p>
          </div>
          <Input
            placeholder="Search expense, payer, or group..."
            className="sm:w-80"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-24 bg-card border border-border rounded-2xl" />
            <div className="h-24 bg-card border border-border rounded-2xl" />
            <div className="h-24 bg-card border border-border rounded-2xl" />
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No expenses found</div>
        ) : (
          <div className="space-y-3">
            {filteredExpenses.map((expense) => (
              <div key={expense.id} className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div />
                  {isSettledForCurrentUser(expense) ? (
                    <div className="text-[11px] uppercase tracking-wide text-owed font-semibold">Settled</div>
                  ) : (
                    <div className="text-[11px] uppercase tracking-wide text-owe font-semibold">Pending</div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-xl shrink-0">
                      {expenseCategoryIcons[expense.category] || "ðŸ“¦"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{expense.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        Paid by {expense.paidBy?.name || "Unknown"} on {formatDateOnly(expense.date)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">Added at {formatDateTime(expense.createdAt)}</p>
                      {expense.group?.id ? (
                        <Link
                          to={`/groups/${expense.group.id}`}
                          className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                        >
                          <span>{categoryIcons[expense.group.category] || "ðŸ“‹"}</span>
                          <span>{expense.group.name}</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:block sm:text-right">
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="font-display font-bold text-base">{formatCurrency(expense.amount)}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedExpense(expense)}
                  className="w-full text-left rounded-xl border border-dashed border-border/70 bg-secondary/20 px-3 py-2 hover:bg-secondary/35 transition-colors"
                >
                  <p className="text-sm">
                    Payment details available: <span className="text-primary font-medium">Click to view</span>
                  </p>
                </button>

                {canSettleExpense(expense) ? (
                  hasLocalPendingForExpense(expense) ? (
                    <div className="text-sm text-muted-foreground">Pending</div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full rounded-xl"
                      onClick={() => settleExpense(expense)}
                      disabled={settlingExpenseId === expense.id}
                    >
                      {settlingExpenseId === expense.id ? "Settling..." : "Settle"}
                    </Button>
                  )
                ) : null}
              </div>
            ))}
          </div>
        )}

        {!isLoading && filteredExpenses.length > 0 ? (
          <div className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total listed expenses</p>
            <p className="font-display font-bold text-lg">
              {formatCurrency(filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0))}
            </p>
          </div>
        ) : null}

        <Dialog open={Boolean(selectedExpense)} onOpenChange={(open) => !open && setSelectedExpense(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Payment Details</DialogTitle>
              <DialogDescription className="sr-only">
                Complete payment information for the selected expense.
              </DialogDescription>
            </DialogHeader>

            {selectedExpense ? (
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
                  <div className="rounded-xl bg-secondary/40 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Status</p>
                    <p className={`font-medium mt-1 ${isSettledForCurrentUser(selectedExpense) ? "text-owed" : "text-owe"}`}>
                      {isSettledForCurrentUser(selectedExpense) ? "Settled" : "Pending"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-secondary/40 p-3 mt-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Shared With</p>
                  <ul className="list-disc pl-5">
                    {selectedExpense.splits?.map((split) => (
                      <li key={split.user?.id || split.user?.name} className="flex justify-between">
                        <span>{split.user?.name || "Unknown"}</span>
                        <span>{formatCurrency(split.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {selectedExpense.notes ? (
                  <div className="rounded-xl border border-border/60 bg-background/40 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Payment Notes</p>
                    <p className="mt-1 break-words">{selectedExpense.notes}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No payment notes added for this expense.</p>
                )}

                {canSettleExpense(selectedExpense) ? (
                  <Button
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => settleExpense(selectedExpense)}
                    disabled={settlingExpenseId === selectedExpense.id}
                  >
                    {settlingExpenseId === selectedExpense.id ? "Settling..." : "Settle This Expense"}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Expenses;
