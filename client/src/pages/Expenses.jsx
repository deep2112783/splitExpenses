import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApiRequest, readCachedAuthResponse, writeCachedAuthResponse } from "@/lib/api";
import { categoryIcons, expenseCategoryIcons, formatCurrency } from "@/lib/mock-data";
import { toast } from "sonner";

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadExpenses() {
      const cached = readCachedAuthResponse("/api/dashboard/expenses");
      if (cached?.expenses) {
        setExpenses(cached.expenses);
        setIsLoading(false);
      }

      try {
        const response = await authApiRequest("/api/dashboard/expenses");
        setExpenses(response.expenses || []);
        writeCachedAuthResponse("/api/dashboard/expenses", response);
      } catch (err) {
        if (!cached) toast.error(err.message || "Failed to load expenses");
      } finally {
        setIsLoading(false);
      }
    }

    loadExpenses();
  }, []);

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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display">Expenses</h1>
            <p className="text-muted-foreground mt-1">All your expenses across groups</p>
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
              <div
                key={expense.id}
                className="bg-card rounded-2xl border border-border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-xl shrink-0">
                    {expenseCategoryIcons[expense.category] || "📦"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{expense.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Paid by {expense.paidBy?.name || "Unknown"} on{" "}
                      {new Date(expense.date || expense.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    {expense.group?.id ? (
                      <Link to={`/groups/${expense.group.id}`} className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1">
                        <span>{categoryIcons[expense.group.category] || "📋"}</span>
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
      </div>
    </AppLayout>
  );
};

export default Expenses;
