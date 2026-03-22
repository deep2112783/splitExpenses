import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, Calendar, Wallet, Check, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AppLayout from "@/components/layout/AppLayout";
import { formatCurrency, getInitials } from "@/lib/mock-data";
import { authApiRequest, readCachedAuthResponse, writeCachedAuthResponse } from "@/lib/api";
import { toast } from "sonner";

const Balances = () => {
  const [totals, setTotals] = useState({ youOwe: 0, youAreOwed: 0, net: 0 });
  const [monthlyBalances, setMonthlyBalances] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleTarget, setSettleTarget] = useState(null);
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    loadBalanceData();
  }, []);

  async function loadBalanceData() {
    const cached = readCachedAuthResponse("/api/dashboard/balances");
    if (cached) {
      setTotals(cached.totals || { youOwe: 0, youAreOwed: 0, net: 0 });
      setMonthlyBalances(cached.monthlyBalances || []);
      setSettlements((cached.settlements || []).filter((item) => item.direction === "pay"));
      setLoading(false);
    }

    try {
      const data = await authApiRequest("/api/dashboard/balances");
      setTotals(data.totals || { youOwe: 0, youAreOwed: 0, net: 0 });
      setMonthlyBalances(data.monthlyBalances || []);
      setSettlements((data.settlements || []).filter((item) => item.direction === "pay"));
      writeCachedAuthResponse("/api/dashboard/balances", data);
    } catch (err) {
      if (!cached) {
        toast.error(err.message || "Failed to load balance data");
        setTotals({ youOwe: 0, youAreOwed: 0, net: 0 });
        setMonthlyBalances([]);
        setSettlements([]);
      }
    } finally {
      setLoading(false);
    }
  }

  const totalOwed = useMemo(() => Number(totals.youAreOwed || 0), [totals.youAreOwed]);
  const totalOwe = useMemo(() => Number(totals.youOwe || 0), [totals.youOwe]);
  const totalNet = useMemo(() => Number(totals.net || 0), [totals.net]);

  const handleSettle = (target) => {
    setSettleTarget(target);
    setSettleOpen(true);
  };

  const handlePayViaUPI = () => {
    if (!settleTarget) return;
    if (!settleTarget.user?.upiId) {
      toast.error("Recipient UPI ID not available");
      return;
    }

    const upiLink = `upi://pay?pa=${settleTarget.user.upiId}&pn=${settleTarget.user.name}&am=${settleTarget.amount}&cu=INR&tn=SplitSmart+Settlement+-+${settleTarget.groupName}`;
    window.open(upiLink, "_blank");
    toast.success("Payment initiated. Click 'Mark as Settled' after payment.");
  };

  async function confirmSettlement() {
    if (!settleTarget) return;

    try {
      setSettling(true);
      await authApiRequest(`/api/groups/${settleTarget.groupId}/settle`, {
        method: "POST",
        body: JSON.stringify({
          toUserId: settleTarget.user.id,
          amount: settleTarget.amount,
          notes: `Settled with ${settleTarget.user.name}`,
        }),
      });
      toast.success(`Settlement recorded with ${settleTarget.user.name}`);
      setSettleOpen(false);
      setSettleTarget(null);
      await loadBalanceData();
    } catch (err) {
      toast.error(err.message || "Failed to record settlement");
    } finally {
      setSettling(false);
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display">Balances</h1>
          <p className="text-muted-foreground mt-1">Track what you owe and settle up</p>
        </div>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="h-28 bg-card border border-border rounded-2xl" />
              <div className="h-28 bg-card border border-border rounded-2xl" />
              <div className="h-28 bg-card border border-border rounded-2xl" />
            </div>
            <div className="h-56 bg-card border border-border rounded-2xl" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card rounded-2xl border border-border p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-owed" />
                  </div>
                  <span className="text-sm text-muted-foreground">You are owed</span>
                </div>
                <p className="text-2xl font-bold font-display text-owed">{formatCurrency(totalOwed)}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card rounded-2xl border border-border p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-owe" />
                  </div>
                  <span className="text-sm text-muted-foreground">You owe</span>
                </div>
                <p className="text-2xl font-bold font-display text-owe">{formatCurrency(totalOwe)}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-card rounded-2xl border border-border p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">Net balance</span>
                </div>
                <p className={`text-2xl font-bold font-display ${totalNet >= 0 ? "text-owed" : "text-owe"}`}>
                  {totalNet >= 0 ? "+" : ""}
                  {formatCurrency(totalNet)}
                </p>
              </motion.div>
            </div>

            {settlements.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-card rounded-2xl border border-border p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-semibold text-lg flex items-center gap-2">
                    <Send className="w-5 h-5 text-primary" /> Settle Up
                  </h2>
                  <span className="text-xs text-muted-foreground bg-destructive/10 text-owe px-2.5 py-1 rounded-full font-medium">
                    {settlements.length} pending
                  </span>
                </div>
                <div className="space-y-3">
                  {settlements.map((s, i) => (
                    <motion.div
                      key={`${s.groupId}-${s.user.id}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i }}
                      className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {getInitials(s.user.name)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{s.user.name}</p>
                          <p className="text-xs text-muted-foreground">{s.groupName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-owe">{formatCurrency(s.amount)}</span>
                        <Button
                          size="sm"
                          className="bg-gradient-primary text-primary-foreground rounded-xl h-8 px-3 text-xs shadow-glow"
                          onClick={() => handleSettle(s)}
                        >
                          <Wallet className="w-3.5 h-3.5 mr-1" /> Pay
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card rounded-2xl border border-border p-5"
            >
              <h2 className="font-display font-semibold text-lg mb-4">Monthly Breakdown</h2>
              <div className="space-y-3">
                {monthlyBalances.map((b, i) => (
                  <motion.div
                    key={`${b.month}-${b.year}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{b.month} {b.year}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="text-owed">+{formatCurrency(b.owed)}</span>
                          <span className="text-owe">-{formatCurrency(b.owe)}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${b.net >= 0 ? "text-owed" : "text-owe"}`}>
                      {b.net >= 0 ? "+" : ""}
                      {formatCurrency(b.net)}
                    </span>
                  </motion.div>
                ))}
                {monthlyBalances.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">No balance history yet</div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </div>

      <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Settle Payment</DialogTitle>
          </DialogHeader>
          {settleTarget && (
            <div className="space-y-5">
              <div className="text-center py-6 bg-secondary/30 rounded-2xl">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary mx-auto mb-3">
                  {getInitials(settleTarget.user.name)}
                </div>
                <p className="text-sm text-muted-foreground">Pay {settleTarget.user.name}</p>
                <p className="text-3xl font-display font-bold text-owe mt-1">{formatCurrency(settleTarget.amount)}</p>
                <p className="text-xs text-muted-foreground mt-1">for {settleTarget.groupName}</p>
              </div>

              <div className="bg-secondary/30 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">UPI ID</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(settleTarget.user.upiId || "");
                      toast.success("UPI ID copied");
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Copy
                  </button>
                </div>
                <p className="font-medium font-mono text-sm">{settleTarget.user.upiId || "Not available"}</p>
              </div>

              <div className="space-y-2.5">
                <Button
                  onClick={handlePayViaUPI}
                  className="w-full bg-gradient-primary text-primary-foreground rounded-xl h-12 shadow-glow text-sm font-semibold"
                  disabled={!settleTarget.user.upiId}
                >
                  <Wallet className="w-4 h-4 mr-2" /> Pay via UPI
                </Button>
                <Button
                  variant="outline"
                  className="w-full rounded-xl h-11"
                  onClick={confirmSettlement}
                  disabled={settling}
                >
                  <Check className="w-4 h-4 mr-2" /> {settling ? "Saving..." : "Mark as Settled"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Balances;
