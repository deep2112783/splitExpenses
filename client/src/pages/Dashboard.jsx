import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import {
  authApiRequest,
  getStoredUser,
  readCachedAuthResponse,
  writeCachedAuthResponse,
} from "@/lib/api";
import { toast } from "sonner";

const categoryIcons = {
  trip: "✈️",
  vacation: "🏖️",
  family: "👨‍👩‍👧‍👦",
  roommates: "🏠",
  friends: "🍕",
  other: "📋",
};

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getExpenseIcon(category) {
  if (category === "Settlement") return "<>";
  if (category === "Food") return "🍽️";
  if (category === "Accommodation") return "🏨";
  if (category === "Transport") return "🚗";
  return "💡";
}

const Dashboard = () => {
  const user = getStoredUser();
  const [data, setData] = useState(null);
  const [payablesByKey, setPayablesByKey] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [payExpense, setPayExpense] = useState(null);

  useEffect(() => {
    async function loadDashboard() {
      const cached = readCachedAuthResponse("/api/dashboard");
      const cachedBalances = readCachedAuthResponse("/api/dashboard/balances");
      if (cached) {
        setData(cached);
        setIsLoading(false);
      }
      if (cachedBalances?.settlements) {
        const nextMap = new Map();
        for (const item of cachedBalances.settlements || []) {
          if (item.direction === "pay") {
            nextMap.set(`${item.groupId}:${item.user.id}`, Number(item.amount || 0));
          }
        }
        setPayablesByKey(nextMap);
      }

      try {
        const [dashboardResponse, balancesResponse] = await Promise.all([
          authApiRequest("/api/dashboard"),
          authApiRequest("/api/dashboard/balances"),
        ]);

        setData(dashboardResponse);
        writeCachedAuthResponse("/api/dashboard", dashboardResponse);
        writeCachedAuthResponse("/api/dashboard/balances", balancesResponse);

        const nextMap = new Map();
        for (const item of balancesResponse.settlements || []) {
          if (item.direction === "pay") {
            nextMap.set(`${item.groupId}:${item.user.id}`, Number(item.amount || 0));
          }
        }
        setPayablesByKey(nextMap);
        setError("");
      } catch (err) {
        if (!cached) {
          setError(err.message || "Failed to load dashboard");
          toast.error("Failed to load dashboard");
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-10 w-72 bg-secondary rounded-xl" />
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="h-72 bg-card border border-border rounded-2xl" />
            <div className="h-72 bg-card border border-border rounded-2xl" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !data) {
    return (
      <AppLayout>
        <div className="text-center py-12 text-destructive">{error}</div>
      </AppLayout>
    );
  }

  const activeGroups = data.groups.filter((group) => group.status === "active");
  const previewExpenses = (data.recentExpenses || []).slice(0, 4);
  const currentUserId = user?.id;

  const getMyShare = (expense) => {
    if (!expense || !Array.isArray(expense.splits)) return 0;
    const split = expense.splits.find((item) => String(item.user?.id) === String(currentUserId));
    return Number(split?.amount || 0);
  };

  const isMyShareSettled = (expense) => {
    if (!expense || !Array.isArray(expense.splits)) return false;
    const split = expense.splits.find((item) => String(item.user?.id) === String(currentUserId));
    return Boolean(split?.settled);
  };

  const getOutstandingToPayer = (expense) => {
    if (!expense?.groupId || !expense?.paidBy?.id) return 0;
    return Number(payablesByKey.get(`${expense.groupId}:${expense.paidBy.id}`) || 0);
  };

  const canPaySpecificExpense = (expense) => {
    if (!expense) return false;
    return (
      expense.category !== "Settlement" &&
      expense.paidBy?.id !== currentUserId &&
      getMyShare(expense) > 0 &&
      !isMyShareSettled(expense)
    );
  };

  const refreshDashboardData = async () => {
    const [dashboardResponse, balancesResponse] = await Promise.all([
      authApiRequest("/api/dashboard"),
      authApiRequest("/api/dashboard/balances"),
    ]);
    setData(dashboardResponse);
    writeCachedAuthResponse("/api/dashboard", dashboardResponse);
    writeCachedAuthResponse("/api/dashboard/balances", balancesResponse);

    const nextMap = new Map();
    for (const item of balancesResponse.settlements || []) {
      if (item.direction === "pay") {
        nextMap.set(`${item.groupId}:${item.user.id}`, Number(item.amount || 0));
      }
    }
    setPayablesByKey(nextMap);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display">
              Welcome back, {user?.name || "User"} 👋
            </h1>
            <p className="text-muted-foreground mt-1">Here's your expense summary</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-lg">Active Groups</h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/groups">
                  View all <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="space-y-3">
              {activeGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active groups yet</p>
              ) : (
                activeGroups.map((group) => (
                  <Link
                    key={group.id}
                    to={`/groups/${group.id}`}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl">{categoryIcons[group.category]}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{group.name}</p>
                        <p className="text-xs text-muted-foreground">{group.members.length} members</p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        group.myBalance >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {group.myBalance >= 0 ? "+" : ""}
                      {formatCurrency(group.myBalance)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-lg">Recent Activity</h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/expenses">
                  View all <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="space-y-3">
              {previewExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              ) : (
                <>
                  {previewExpenses.map((expense) => {
                    const myShare = getMyShare(expense);
                    const settled = isMyShareSettled(expense);
                    const isSettlement = expense.category === "Settlement";
                    const outstandingToPayer = getOutstandingToPayer(expense);
                    const canPayThisExpense = canPaySpecificExpense(expense);
                    const canSettle = canPayThisExpense || outstandingToPayer > 0;

                    return (
                      <div
                        key={expense.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-secondary/30"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg">
                            {getExpenseIcon(expense.category)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{expense.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {isSettlement
                                ? `Settlement recorded by ${expense.paidBy?.name || "Unknown"}`
                                : `Paid by ${expense.paidBy?.name || "Unknown"}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{formatCurrency(expense.amount)}</span>
                          {canSettle && (
                            <Button size="sm" variant="outline" onClick={() => setPayExpense(expense)}>
                              Settle
                            </Button>
                          )}
                          {settled && (
                            <span className="text-xs text-green-600 font-semibold ml-2">Settled</span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {payExpense && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
                        <h3 className="font-display font-semibold text-lg mb-2">Settle Expense</h3>
                        <p className="mb-3 text-sm">
                          Your share in <span className="font-bold">{payExpense.title}</span> is{" "}
                          <span className="font-bold">{formatCurrency(getMyShare(payExpense))}</span>.
                        </p>
                        <p className="mb-3 text-sm">
                          Your current net payable to <span className="font-bold">{payExpense.paidBy?.name || "Unknown"}</span>{" "}
                          in this group is{" "}
                          <span className="font-bold">{formatCurrency(getOutstandingToPayer(payExpense))}</span>.
                        </p>
                        <p className="mb-3 text-xs text-muted-foreground">
                          You can either settle just this expense or clear the full net outstanding amount with this payer.
                        </p>
                        <div className="flex gap-2 mt-4 flex-wrap">
                          <Button variant="secondary" onClick={() => setPayExpense(null)}>
                            Cancel
                          </Button>
                          <Button
                            variant="outline"
                            disabled={!canPaySpecificExpense(payExpense)}
                            onClick={async () => {
                              try {
                                if (getMyShare(payExpense) <= 0) {
                                  toast.error("No payable share left for this expense");
                                  return;
                                }

                                await authApiRequest(
                                  `/api/groups/${payExpense.groupId}/expenses/${payExpense.id}/settle`,
                                  { method: "POST" },
                                );
                                toast.success("Expense settled!");
                                setPayExpense(null);
                                await refreshDashboardData();
                              } catch (err) {
                                toast.error(err.message || "Failed to settle this expense");
                              }
                            }}
                          >
                            Settle This Expense
                          </Button>
                          <Button
                            disabled={getOutstandingToPayer(payExpense) <= 0}
                            onClick={async () => {
                              try {
                                const amountToSettle = getOutstandingToPayer(payExpense);
                                if (amountToSettle <= 0) {
                                  toast.error("No outstanding amount left to settle");
                                  return;
                                }

                                await authApiRequest(`/api/groups/${payExpense.groupId}/settle`, {
                                  method: "POST",
                                  body: JSON.stringify({
                                    toUserId: payExpense.paidBy?.id,
                                    amount: amountToSettle,
                                    notes: `Settled balance related to ${payExpense.title}`,
                                  }),
                                });
                                toast.success("Settlement recorded!");
                                setPayExpense(null);
                                await refreshDashboardData();
                              } catch (err) {
                                toast.error(err.message || "Failed to record settlement");
                              }
                            }}
                          >
                            Settle Net Amount
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
