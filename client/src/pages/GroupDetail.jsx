import { useState, useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Copy, Users, ArrowRight, Wallet, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AppLayout from "@/components/layout/AppLayout";
import { formatCurrency, categoryIcons, getInitials, expenseCategoryIcons } from "@/lib/mock-data";
import { authApiRequest, getStoredUser } from "@/lib/api";
import { toast } from "sonner";import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";

const GroupDetail = () => {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleTarget, setSettleTarget] = useState(null);
  const [settling, setSettling] = useState(false);
  const user = getStoredUser();
  const currentUserId = user?.id;

  useEffect(() => {
    const loadGroupDetail = async () => {
      setLoading(true);
      try {
        const data = await authApiRequest(`/api/groups/${id}`);
        setGroup(data.group);
        setExpenses(data.expenses || []);
      } catch (err) {
        console.error("Error loading group:", err);
        toast.error(err.message || "Failed to load group");
        setGroup(null);
        setExpenses([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadGroupDetail();
  }, [id]);

  if (loading) {
    return /*#__PURE__*/_jsx(AppLayout, { children: /*#__PURE__*/_jsx("div", { className: "flex items-center justify-center py-12", children: /*#__PURE__*/_jsx("p", { className: "text-muted-foreground", children: "Loading group..." }) }) });
  }

  if (!group) {
    return /*#__PURE__*/_jsx(AppLayout, { children: /*#__PURE__*/_jsx("p", { children: "Group not found" }) });
  }

  const myMember = group.members?.find((m) => m.user.id === currentUserId);
  const myBalance = myMember?.balance ?? 0;

  const settleTargets = useMemo(() => {
    if (!currentUserId || !group?.members || !expenses?.length) return new Map();

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
    for (const member of group.members) {
      const memberId = member.user.id;
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

  const handleCopyCode = () => {
    navigator.clipboard.writeText(group.code);
    toast.success("Group code copied!");
  };

  const handleSettle = (member, amount) => {
    setSettleTarget({
      userId: member.user.id,
      name: member.user.name,
      amount,
      upiId: member.user.upiId || "",
    });
    setSettleOpen(true);
  };

  const handlePayViaUPI = () => {
    if (!settleTarget) return;
    const upiLink = `upi://pay?pa=${settleTarget.upiId}&pn=${settleTarget.name}&am=${settleTarget.amount}&cu=INR&tn=SplitSmart Settlement`;
    window.open(upiLink, "_blank");
    toast.success("Payment initiated! Mark as settled once done.");
    setSettleOpen(false);
  };

  return (/*#__PURE__*/
    _jsxs(AppLayout, { children: [/*#__PURE__*/
      _jsxs("div", { className: "space-y-6", children: [/*#__PURE__*/

        _jsxs("div", { className: "bg-card rounded-2xl border border-border p-6", children: [/*#__PURE__*/
          _jsxs("div", { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4", children: [/*#__PURE__*/
            _jsxs("div", { className: "flex items-center gap-4", children: [/*#__PURE__*/
              _jsx("span", { className: "text-4xl", children: categoryIcons[group.category] }), /*#__PURE__*/
              _jsxs("div", { children: [/*#__PURE__*/
                _jsx("h1", { className: "text-2xl font-bold font-display", children: group.name }), /*#__PURE__*/
                _jsx("p", { className: "text-muted-foreground text-sm", children: group.description })] }
              )] }
            ), /*#__PURE__*/
            _jsxs("div", { className: "flex gap-2", children: [/*#__PURE__*/
              _jsxs(Button, { variant: "outline", size: "sm", className: "rounded-xl", onClick: handleCopyCode, children: [/*#__PURE__*/
                _jsx(Copy, { className: "w-4 h-4 mr-2" }), " ", group.code] }
              ), /*#__PURE__*/
              _jsx(Button, { asChild: true, size: "sm", className: "bg-gradient-primary text-primary-foreground rounded-xl", children: /*#__PURE__*/
                _jsxs(Link, { to: `/groups/${id}/add-expense`, children: [/*#__PURE__*/_jsx(Plus, { className: "w-4 h-4 mr-2" }), " Add Expense"] }) }
              )] }
            )] }
          ), /*#__PURE__*/

          _jsxs("div", { className: "grid grid-cols-3 gap-4 mt-6", children: [/*#__PURE__*/
            _jsxs("div", { className: "text-center p-3 rounded-xl bg-secondary/50", children: [/*#__PURE__*/
              _jsx("p", { className: "text-xs text-muted-foreground", children: "Total Expenses" }), /*#__PURE__*/
              _jsx("p", { className: "font-display font-bold text-lg", children: formatCurrency(group.totalExpenses) })] }
            ), /*#__PURE__*/
            _jsxs("div", { className: "text-center p-3 rounded-xl bg-secondary/50", children: [/*#__PURE__*/
              _jsx("p", { className: "text-xs text-muted-foreground", children: "Your Balance" }), /*#__PURE__*/
              _jsxs("p", { className: `font-display font-bold text-lg ${myBalance >= 0 ? "text-owed" : "text-owe"}`, children: [
                myBalance >= 0 ? "+" : "", formatCurrency(myBalance)] }
              )] }
            ), /*#__PURE__*/
            _jsxs("div", { className: "text-center p-3 rounded-xl bg-secondary/50", children: [/*#__PURE__*/
              _jsx("p", { className: "text-xs text-muted-foreground", children: "Members" }), /*#__PURE__*/
              _jsx("p", { className: "font-display font-bold text-lg", children: group.members.length })] }
            )] }
          )] }
        ), /*#__PURE__*/

        _jsxs("div", { className: "grid lg:grid-cols-3 gap-6", children: [/*#__PURE__*/

          _jsxs("div", { className: "bg-card rounded-2xl border border-border p-5", children: [/*#__PURE__*/
            _jsxs("h2", { className: "font-display font-semibold text-lg mb-4 flex items-center gap-2", children: [/*#__PURE__*/
              _jsx(Users, { className: "w-5 h-5" }), " Members"] }
            ), /*#__PURE__*/
            _jsx("div", { className: "space-y-3", children:
              group.members.map((member) => /*#__PURE__*/
              _jsxs("div", { className: "flex items-center justify-between", children: [/*#__PURE__*/
                _jsxs("div", { className: "flex items-center gap-3", children: [/*#__PURE__*/
                  _jsx("div", { className: "w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary", children:
                    getInitials(member.user.name) }
                  ), /*#__PURE__*/
                  _jsxs("div", { children: [/*#__PURE__*/
                    _jsxs("p", { className: "text-sm font-medium", children: [
                      member.user.name, member.user.id === currentUserId ? " (You)" : ""] }
                    ), /*#__PURE__*/
                    _jsx("p", { className: "text-xs text-muted-foreground capitalize", children: member.role })] }
                  )] }
                ), /*#__PURE__*/
                _jsxs("div", { className: "text-right", children: [/*#__PURE__*/
                  _jsxs("p", { className: `text-sm font-semibold ${member.balance >= 0 ? "text-owed" : "text-owe"}`, children: [
                    member.balance >= 0 ? "+" : "", formatCurrency(member.balance)] }
                  ),
                  settleTargets.has(member.user.id) && /*#__PURE__*/
                  _jsx("button", {
                    onClick: () => handleSettle(member, settleTargets.get(member.user.id)),
                    className: "text-xs text-primary hover:underline",
                    children: `Pay ${formatCurrency(settleTargets.get(member.user.id))}`,
                  }

                  )] }

                )] }, member.user.id
              )
              ) }
            )] }
          ), /*#__PURE__*/


          _jsxs("div", { className: "lg:col-span-2 bg-card rounded-2xl border border-border p-5", children: [/*#__PURE__*/
            _jsx("h2", { className: "font-display font-semibold text-lg mb-4", children: "Expenses" }), /*#__PURE__*/
            _jsxs("div", { className: "space-y-3", children: [
              expenses.map((expense) => /*#__PURE__*/
              _jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 },
                className: "flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors", children: [/*#__PURE__*/
                _jsxs("div", { className: "flex items-center gap-3", children: [/*#__PURE__*/
                  _jsx("span", { className: "text-2xl", children: expenseCategoryIcons[expense.category] || "📦" }), /*#__PURE__*/
                  _jsxs("div", { children: [/*#__PURE__*/
                    _jsx("p", { className: "font-medium", children: expense.title }), /*#__PURE__*/
                    _jsxs("p", { className: "text-xs text-muted-foreground", children: ["Paid by ",
                      expense.paidBy?.name || "Unknown", " \xB7 ", new Date(expense.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })] }
                    )] }
                  )] }
                ), /*#__PURE__*/
                _jsxs("div", { className: "text-right", children: [/*#__PURE__*/
                  _jsx("p", { className: "font-display font-bold", children: formatCurrency(expense.amount) }), /*#__PURE__*/
                  _jsxs("p", { className: "text-xs text-muted-foreground capitalize", children: ["Split between ", expense.splits?.length || 0, " members"] })] }
                )] }, expense.id
              )
              ),
              expenses.length === 0 && /*#__PURE__*/
              _jsxs("div", { className: "text-center py-12 text-muted-foreground", children: [/*#__PURE__*/
                _jsx("p", { children: "No expenses yet" }), /*#__PURE__*/
                _jsx(Button, { asChild: true, variant: "link", className: "mt-2", children: /*#__PURE__*/
                  _jsxs(Link, { to: `/groups/${id}/add-expense`, children: ["Add the first expense ", /*#__PURE__*/_jsx(ArrowRight, { className: "w-4 h-4 ml-1" })] }) }
                )] }
              )] }

            )] }
          )] }
        )] }
      ), /*#__PURE__*/


      _jsx(Dialog, { open: settleOpen, onOpenChange: setSettleOpen, children: /*#__PURE__*/
        _jsxs(DialogContent, { className: "sm:max-w-md", children: [/*#__PURE__*/
          _jsx(DialogHeader, { children: /*#__PURE__*/
            _jsx(DialogTitle, { className: "font-display", children: "Settle Payment" }) }
          ),
          settleTarget && /*#__PURE__*/
          _jsxs("div", { className: "space-y-4", children: [/*#__PURE__*/
            _jsxs("div", { className: "text-center py-4", children: [/*#__PURE__*/
              _jsxs("p", { className: "text-muted-foreground", children: ["Pay ", settleTarget.name] }), /*#__PURE__*/
              _jsx("p", { className: "text-3xl font-display font-bold text-owe mt-2", children: formatCurrency(settleTarget.amount) })] }
            ), /*#__PURE__*/
            _jsxs("div", { className: "bg-secondary/50 rounded-xl p-4", children: [/*#__PURE__*/
              _jsx("p", { className: "text-sm text-muted-foreground mb-1", children: "UPI ID" }), /*#__PURE__*/
              _jsx("p", { className: "font-medium font-mono", children: settleTarget.upiId })] }
            ), /*#__PURE__*/
            _jsxs(Button, { onClick: handlePayViaUPI, className: "w-full bg-gradient-primary text-primary-foreground rounded-xl h-11 shadow-glow", children: [/*#__PURE__*/
              _jsx(Wallet, { className: "w-4 h-4 mr-2" }), " Pay via UPI"] }
            ), /*#__PURE__*/
            _jsxs(Button, {
              variant: "outline",
              className: "w-full rounded-xl",
              onClick: async () => {
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

                  const data = await authApiRequest(`/api/groups/${id}`);
                  setGroup(data.group);
                  setExpenses(data.expenses || []);
                } catch (err) {
                  toast.error(err.message || "Failed to record settlement");
                } finally {
                  setSettling(false);
                }
              }, children: [/*#__PURE__*/

              _jsx(Check, { className: "w-4 h-4 mr-2" }), settling ? "Saving..." : " Mark as Settled"] }
            )] }
          )] }

        ) }
      )] }
    ));

};

export default GroupDetail;