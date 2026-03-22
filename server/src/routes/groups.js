import express from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { Group } from "../models/Group.js";
import { Expense } from "../models/Expense.js";
import { Notification } from "../models/Notification.js";
import { toExpenseDto, toGroupDto } from "../utils/finance.js";

const router = express.Router();

router.use(requireAuth);

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function generateUniqueGroupCode() {
  for (let i = 0; i < 10; i += 1) {
    const code = randomCode();
    const exists = await Group.exists({ code });
    if (!exists) return code;
  }
  return `${Date.now().toString(36).slice(-6)}`.toUpperCase();
}

async function findGroupForUser(groupId, userId) {
  if (!mongoose.Types.ObjectId.isValid(groupId)) return null;
  return Group.findOne({ _id: groupId, "members.user": userId }).populate("members.user", "name email upiId");
}

router.get("/", async (req, res) => {
  try {
    const groups = await Group.find({ "members.user": req.user._id })
      .populate("members.user", "name email upiId")
      .sort({ updatedAt: -1 });

    const groupIds = groups.map((group) => group._id);
    const expenses = await Expense.find({ group: { $in: groupIds } }).sort({ date: -1 });

    const expensesByGroup = new Map();
    for (const expense of expenses) {
      const key = expense.group.toString();
      const arr = expensesByGroup.get(key) || [];
      arr.push(expense);
      expensesByGroup.set(key, arr);
    }

    const payload = groups.map((group) => toGroupDto(group, expensesByGroup.get(group._id.toString()) || [], req.user._id));

    return res.json({ groups: payload });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load groups", error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, groupName, description, category } = req.body || {};
    const resolvedName = String(name || groupName || "").trim();

    if (!resolvedName) {
      return res.status(400).json({ message: "Group name is required." });
    }

    const code = await generateUniqueGroupCode();

    const group = await Group.create({
      name: resolvedName,
      description: (description || "").trim(),
      category: category || "other",
      code,
      status: "active",
      createdBy: req.user._id,
      members: [{ user: req.user._id, role: "admin" }],
    });

    const fullGroup = await Group.findById(group._id).populate("members.user", "name email upiId");

    return res.status(201).json({ group: toGroupDto(fullGroup, [], req.user._id) });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create group", error: error.message });
  }
});

router.post("/join", async (req, res) => {
  try {
    const { groupId, code } = req.body || {};
    const normalizedCode = String(code || "").trim().toUpperCase();
    const normalizedGroupId = String(groupId || "").trim();

    if (!normalizedCode && !normalizedGroupId) {
      return res.status(400).json({ message: "Group code or group id is required." });
    }

    let group = null;
    if (normalizedCode) {
      group = await Group.findOne({ code: normalizedCode });
    }

    if (!group && normalizedGroupId && mongoose.Types.ObjectId.isValid(normalizedGroupId)) {
      group = await Group.findById(normalizedGroupId);
    }

    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    const alreadyMember = (group.members || []).some(
      (member) => member.user.toString() === req.user._id.toString(),
    );

    if (alreadyMember) {
      const fullGroup = await Group.findById(group._id).populate("members.user", "name email upiId");
      return res.status(200).json({
        message: "You are already a member of this group.",
        group: toGroupDto(fullGroup, [], req.user._id),
      });
    }

    const existingMemberIds = (group.members || []).map((member) => member.user.toString());

    group.members.push({ user: req.user._id, role: "member" });
    await group.save();

    const fullGroup = await Group.findById(group._id).populate("members.user", "name email upiId");

    const joinNotifications = existingMemberIds.map((userId) => ({
      user: userId,
      type: "group_joined",
      message: `${req.user.name} joined ${fullGroup.name}`,
      group: fullGroup._id,
      read: false,
    }));

    joinNotifications.push({
      user: req.user._id,
      type: "added_to_group",
      message: `You joined ${fullGroup.name}`,
      group: fullGroup._id,
      read: false,
    });

    if (joinNotifications.length > 0) {
      await Notification.insertMany(joinNotifications);
    }

    return res.status(200).json({
      message: `Joined ${fullGroup.name} successfully.`,
      group: toGroupDto(fullGroup, [], req.user._id),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to join group", error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const group = await findGroupForUser(req.params.id, req.user._id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const expenses = await Expense.find({ group: group._id })
      .populate("paidBy", "name email upiId")
      .populate("splits.user", "name email upiId")
      .sort({ date: -1, createdAt: -1 });

    return res.json({
      group: toGroupDto(group, expenses, req.user._id),
      expenses: expenses.map(toExpenseDto),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load group", error: error.message });
  }
});

router.post("/:id/expenses", async (req, res) => {
  try {
    const group = await findGroupForUser(req.params.id, req.user._id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const { title, amount, paidBy, date, category, notes, splitType = "equal", customSplits = {} } = req.body;

    if (!title || !amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "Valid title and amount are required." });
    }

    const memberIds = group.members.map((member) => member.user._id.toString());
    const paidById = paidBy || req.user._id.toString();

    if (!memberIds.includes(paidById.toString())) {
      return res.status(400).json({ message: "Payer must be a group member." });
    }

    let splits = [];
    const numericAmount = Number(amount);

    if (splitType === "custom") {
      splits = memberIds.map((userId) => ({
        user: userId,
        amount: Number(customSplits?.[userId] || 0),
        settled: false,
      }));

      const totalSplit = splits.reduce((sum, split) => sum + split.amount, 0);
      if (Math.abs(totalSplit - numericAmount) > 0.01) {
        return res.status(400).json({ message: "Custom split total must match expense amount." });
      }
    } else {
      const perPerson = numericAmount / memberIds.length;
      splits = memberIds.map((userId) => ({
        user: userId,
        amount: Number(perPerson.toFixed(2)),
        settled: false,
      }));

      const diff = numericAmount - splits.reduce((sum, split) => sum + split.amount, 0);
      if (splits.length > 0 && Math.abs(diff) > 0) {
        splits[0].amount = Number((splits[0].amount + diff).toFixed(2));
      }
    }

    const expense = await Expense.create({
      group: group._id,
      title: title.trim(),
      amount: numericAmount,
      paidBy: paidById,
      date: date ? new Date(date) : new Date(),
      category: category || "Other",
      notes: notes || "",
      splitType,
      splits,
      createdBy: req.user._id,
    });

    const payer = group.members.find((member) => member.user._id.toString() === paidById)?.user;

    const notifications = group.members
      .filter((member) => member.user._id.toString() !== req.user._id.toString())
      .map((member) => ({
        user: member.user._id,
        type: "expense_added",
        message: `${req.user.name} added '${title}' (${numericAmount}) in ${group.name}`,
        group: group._id,
        read: false,
      }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    const created = await Expense.findById(expense._id)
      .populate("paidBy", "name email upiId")
      .populate("splits.user", "name email upiId");

    return res.status(201).json({
      expense: toExpenseDto(created),
      payer: payer
        ? {
            id: payer._id,
            name: payer.name,
          }
        : null,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to add expense", error: error.message });
  }
});

router.post("/:id/settle", async (req, res) => {
  try {
    const group = await findGroupForUser(req.params.id, req.user._id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const { toUserId, amount, notes } = req.body || {};
    const normalizedToUserId = String(toUserId || "").trim();
    const numericAmount = Number(amount);

    if (!mongoose.Types.ObjectId.isValid(normalizedToUserId)) {
      return res.status(400).json({ message: "A valid recipient is required." });
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: "A valid settlement amount is required." });
    }

    if (normalizedToUserId === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot settle with yourself." });
    }

    const recipientMember = group.members.find(
      (member) => member.user._id.toString() === normalizedToUserId,
    );

    if (!recipientMember) {
      return res.status(400).json({ message: "Recipient must be a member of this group." });
    }

    const groupExpenses = await Expense.find({ group: group._id }).populate("splits.user", "_id");
    let iOwe = 0;
    let theyOwe = 0;

    for (const expense of groupExpenses) {
      const payerId = expense.paidBy?.toString();
      if (!payerId) continue;

      for (const split of expense.splits || []) {
        const debtorId = split.user?._id?.toString() || split.user?.toString();
        if (!debtorId || debtorId === payerId) continue;

        const splitAmount = Number(split.amount || 0);
        if (debtorId === req.user._id.toString() && payerId === normalizedToUserId) {
          iOwe += splitAmount;
        }

        if (debtorId === normalizedToUserId && payerId === req.user._id.toString()) {
          theyOwe += splitAmount;
        }
      }
    }

    const netOutstanding = Number((iOwe - theyOwe).toFixed(2));

    if (netOutstanding <= 0) {
      return res.status(400).json({ message: "No outstanding amount to settle with this member." });
    }

    if (numericAmount - netOutstanding > 0.01) {
      return res.status(400).json({
        message: `Settlement exceeds outstanding amount (${netOutstanding.toFixed(2)}).`,
      });
    }

    const settlement = await Expense.create({
      group: group._id,
      title: "Settlement",
      amount: numericAmount,
      paidBy: req.user._id,
      date: new Date(),
      category: "Settlement",
      notes: String(notes || "").trim() || "Settlement payment",
      splitType: "custom",
      splits: [
        {
          user: recipientMember.user._id,
          amount: numericAmount,
          settled: true,
        },
      ],
      createdBy: req.user._id,
    });

    await Notification.insertMany([
      {
        user: recipientMember.user._id,
        type: "payment_received",
        message: `${req.user.name} paid you ${numericAmount.toFixed(2)} in ${group.name}`,
        group: group._id,
        read: false,
      },
      {
        user: req.user._id,
        type: "payment_sent",
        message: `You paid ${recipientMember.user.name} ${numericAmount.toFixed(2)} in ${group.name}`,
        group: group._id,
        read: false,
      },
    ]);

    const created = await Expense.findById(settlement._id)
      .populate("paidBy", "name email upiId")
      .populate("splits.user", "name email upiId");

    return res.status(201).json({
      message: "Settlement recorded",
      expense: toExpenseDto(created),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to settle payment", error: error.message });
  }
});

export default router;
