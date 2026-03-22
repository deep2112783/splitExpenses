import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import { authApiRequest, getStoredUser, readCachedAuthResponse, writeCachedAuthResponse } from "@/lib/api";
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

const Dashboard = () => {
  const user = getStoredUser();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      const cached = readCachedAuthResponse("/api/dashboard");
      if (cached) {
        setData(cached);
        setIsLoading(false);
      }

      try {
        const response = await authApiRequest("/api/dashboard");
        setData(response);
        writeCachedAuthResponse("/api/dashboard", response);
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

  const activeGroups = data.groups.filter((g) => g.status === "active");
  const firstGroup = activeGroups[0];
  const addExpenseUrl = firstGroup ? `/groups/${firstGroup.id}/add-expense` : "/groups";
  const previewExpenses = (data.recentExpenses || []).slice(0, 4);

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
          <Button
            asChild
            className="bg-gradient-primary text-primary-foreground rounded-xl shadow-glow"
          >
            <Link to={addExpenseUrl}>
              <Plus className="w-4 h-4 mr-2" /> Add Expense
            </Link>
          </Button>
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
              <h2 className="font-display font-semibold text-lg">Recent Expenses</h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/expenses">
                  View all <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="space-y-3">
              {previewExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent expenses</p>
              ) : (
                previewExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-secondary/30"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg">
                        {expense.category === "Food"
                          ? "🍽️"
                          : expense.category === "Accommodation"
                            ? "🏨"
                            : expense.category === "Transport"
                              ? "🚗"
                              : "💡"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{expense.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          Paid by {expense.paidBy?.name || "Unknown"}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold text-sm">{formatCurrency(expense.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;