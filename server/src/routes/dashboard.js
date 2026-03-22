import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { Group } from "../models/Group.js";
import { Expense } from "../models/Expense.js";
import { Notification } from "../models/Notification.js";
import { buildMemberBalances, toExpenseDto, toGroupDto } from "../utils/finance.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const userId = req.user._id;

    const groups = await Group.find({ "members.user": userId })
      .populate("members.user", "name email upiId")
      .sort({ updatedAt: -1 });

    const groupIds = groups.map((group) => group._id);

    const expenses = await Expense.find({ group: { $in: groupIds } })
      .populate("paidBy", "name email upiId")
      .populate("splits.user", "name email upiId")
      .sort({ date: -1, createdAt: -1 });

    const expensesByGroup = new Map();
    for (const expense of expenses) {
      const key = expense.group.toString();
      const arr = expensesByGroup.get(key) || [];
      arr.push(expense);
      expensesByGroup.set(key, arr);
    }

    let totalOwed = 0;
    let totalOwedToYou = 0;

    for (const group of groups) {
      const groupExpenses = expensesByGroup.get(group._id.toString()) || [];
      const balanceMap = buildMemberBalances(group, groupExpenses);
      const myBalance = Number(balanceMap.get(userId.toString()) || 0);
      if (myBalance < 0) totalOwed += Math.abs(myBalance);
      if (myBalance > 0) totalOwedToYou += myBalance;
    }

    const unreadCount = await Notification.countDocuments({ user: userId, read: false });

    return res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        upiId: req.user.upiId || "",
      },
      summary: {
        totalOwed,
        totalOwedToYou,
        totalNet: totalOwedToYou - totalOwed,
        activeGroups: groups.filter((group) => group.status === "active").length,
        unreadNotifications: unreadCount,
      },
      groups: groups.map((group) => toGroupDto(group, expensesByGroup.get(group._id.toString()) || [], userId)),
      recentExpenses: expenses.slice(0, 8).map(toExpenseDto),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load dashboard", error: error.message });
  }
});

router.get("/expenses", async (req, res) => {
  try {
    const userId = req.user._id;
    const groups = await Group.find({ "members.user": userId }).select("name category").lean();
    const groupIds = groups.map((group) => group._id);

    const groupMap = new Map(groups.map((group) => [group._id.toString(), group]));

    const expenses = await Expense.find({ group: { $in: groupIds } })
      .populate("paidBy", "name email upiId")
      .populate("splits.user", "name email upiId")
      .sort({ date: -1, createdAt: -1 });

    const expenseDtos = expenses.map((expense) => {
      const dto = toExpenseDto(expense);
      const group = groupMap.get(dto.groupId);
      return {
        ...dto,
        group: group
          ? {
              id: group._id.toString(),
              name: group.name,
              category: group.category,
            }
          : null,
      };
    });

    return res.json({ expenses: expenseDtos });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load expenses", error: error.message });
  }
});

router.get("/balances", async (req, res) => {
  try {
    const userId = req.user._id;

    const groups = await Group.find({ "members.user": userId })
      .populate("members.user", "name email upiId")
      .lean();
    const groupIds = groups.map((group) => group._id);

    const expenses = await Expense.find({ group: { $in: groupIds } })
      .populate("paidBy", "name email upiId")
      .populate("splits.user", "name email upiId")
      .sort({ date: -1 });

    const expensesByGroup = new Map();
    for (const expense of expenses) {
      const key = expense.group.toString();
      const arr = expensesByGroup.get(key) || [];
      arr.push(expense);
      expensesByGroup.set(key, arr);
    }

    const userBalances = [];
    const settlements = [];
    let youOwe = 0;
    let youAreOwed = 0;

    for (const group of groups) {
      const groupExpenses = expensesByGroup.get(group._id.toString()) || [];
      const balanceMap = buildMemberBalances(group, groupExpenses);
      const myBalance = Number(balanceMap.get(userId.toString()) || 0);

      if (myBalance < 0) {
        youOwe += Math.abs(myBalance);
      } else if (myBalance > 0) {
        youAreOwed += myBalance;
      }

      userBalances.push({
        groupId: group._id.toString(),
        groupName: group.name,
        status: group.status,
        balance: myBalance,
      });

      const memberRows = (group.members || []).map((member) => {
        const memberId = member.user?._id?.toString() || member.user?.toString();
        const balance = Number(balanceMap.get(memberId) || 0);
        return {
          id: memberId,
          name: member.user?.name || "Unknown",
          email: member.user?.email || "",
          upiId: member.user?.upiId || "",
          balance,
        };
      });

      if (myBalance < -0.01) {
        let remainingToPay = Number(Math.abs(myBalance).toFixed(2));
        const creditors = memberRows
          .filter((member) => member.id !== userId.toString() && member.balance > 0.01)
          .sort((a, b) => b.balance - a.balance);

        for (const creditor of creditors) {
          if (remainingToPay <= 0.01) break;
          const amount = Math.min(remainingToPay, Number(creditor.balance.toFixed(2)));
          if (amount <= 0.01) continue;

          settlements.push({
            groupId: group._id.toString(),
            groupName: group.name,
            user: {
              id: creditor.id,
              name: creditor.name,
              email: creditor.email,
              upiId: creditor.upiId,
            },
            amount: Number(amount.toFixed(2)),
            direction: "pay",
          });

          remainingToPay = Number((remainingToPay - amount).toFixed(2));
        }
      }

      if (myBalance > 0.01) {
        let remainingToReceive = Number(myBalance.toFixed(2));
        const debtors = memberRows
          .filter((member) => member.id !== userId.toString() && member.balance < -0.01)
          .sort((a, b) => a.balance - b.balance);

        for (const debtor of debtors) {
          if (remainingToReceive <= 0.01) break;
          const debtorAmount = Number(Math.abs(debtor.balance).toFixed(2));
          const amount = Math.min(remainingToReceive, debtorAmount);
          if (amount <= 0.01) continue;

          settlements.push({
            groupId: group._id.toString(),
            groupName: group.name,
            user: {
              id: debtor.id,
              name: debtor.name,
              email: debtor.email,
              upiId: debtor.upiId,
            },
            amount: Number(amount.toFixed(2)),
            direction: "receive",
          });

          remainingToReceive = Number((remainingToReceive - amount).toFixed(2));
        }
      }
    }

    const monthlyMap = new Map();

    for (const expense of expenses) {
      const monthDate = new Date(expense.date || expense.createdAt);
      const key = `${monthDate.getFullYear()}-${monthDate.getMonth() + 1}`;
      const current = monthlyMap.get(key) || {
        month: monthDate.toLocaleString("en-IN", { month: "long" }),
        year: monthDate.getFullYear(),
        owed: 0,
        owe: 0,
      };

      const paidById = expense.paidBy?._id?.toString() || expense.paidBy?.toString();
      if (paidById === userId.toString()) {
        current.owed += Number(expense.amount || 0);
      }

      const mySplit = (expense.splits || []).find((split) => {
        const splitUserId = split.user?._id?.toString() || split.user?.toString();
        return splitUserId === userId.toString();
      });
      if (mySplit) {
        current.owe += Number(mySplit.amount || 0);
      }

      monthlyMap.set(key, current);
    }

    const monthlyBalances = Array.from(monthlyMap.entries())
      .map(([key, item]) => {
        const [year, month] = key.split("-").map(Number);
        return {
          ...item,
          net: item.owed - item.owe,
          sortKey: year * 100 + month,
        };
      })
      .sort((a, b) => b.sortKey - a.sortKey)
      .map(({ sortKey, ...item }) => item);

    const settlementMap = new Map();
    for (const item of settlements) {
      const key = `${item.groupId}:${item.user.id}:${item.direction}`;
      const existing = settlementMap.get(key);
      if (!existing) {
        settlementMap.set(key, item);
      } else {
        existing.amount = Number((existing.amount + item.amount).toFixed(2));
      }
    }

    return res.json({
      totals: {
        youOwe,
        youAreOwed,
        net: youAreOwed - youOwe,
      },
      groupBalances: userBalances,
      monthlyBalances,
      settlements: Array.from(settlementMap.values()),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load balances", error: error.message });
  }
});

export default router;
