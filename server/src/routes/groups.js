import express from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { Group } from "../models/Group.js";
import { Expense } from "../models/Expense.js";
import { Notification } from "../models/Notification.js";
import { buildMemberBalances, toExpenseDto, toGroupDto } from "../utils/finance.js";
import { PendingSettlement } from "../models/PendingSettlement.js";
import {
  runInTransaction,
  settleNetBalanceBetweenUsers,
  settleSpecificExpenseForUser,
  SettlementError,
  updateGroupStatus,
} from "../utils/settlements.js";

const router = express.Router();

const GROUP_CATEGORIES = new Set(["trip", "vacation", "family", "roommates", "friends", "other"]);
const EXPENSE_SPLIT_TYPES = new Set(["equal", "custom"]);

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

function parseExpenseDate(value) {
  if (!value) return new Date();

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function sanitizeCustomSplits(memberIds, customSplits) {
  return memberIds.map((userId) => {
    const rawValue = customSplits?.[userId];
    const amount = Number(rawValue || 0);
    return {
      user: userId,
      amount,
      settled: false,
    };
  });
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
    const normalizedCategory = String(category || "other").trim().toLowerCase();

    if (!resolvedName) {
      return res.status(400).json({ message: "Group name is required." });
    }

    if (!GROUP_CATEGORIES.has(normalizedCategory)) {
      return res.status(400).json({ message: "Invalid group category." });
    }

    const code = await generateUniqueGroupCode();

    const group = await Group.create({
      name: resolvedName,
      description: (description || "").trim(),
      category: normalizedCategory,
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

    const existingMemberIds = (group.members || []).map((member) => member.user.toString());
    const alreadyMember = existingMemberIds.includes(req.user._id.toString());

    if (alreadyMember) {
      const fullGroup = await Group.findById(group._id).populate("members.user", "name email upiId");
      return res.status(200).json({
        message: "You are already a member of this group.",
        group: toGroupDto(fullGroup, [], req.user._id),
      });
    }

    await runInTransaction(async (session) => {
      const updateResult = await Group.updateOne(
        {
          _id: group._id,
          "members.user": { $ne: req.user._id },
        },
        {
          $push: {
            members: { user: req.user._id, role: "member" },
          },
        },
        { session },
      );

      if (updateResult.modifiedCount === 0) {
        throw new Error("ALREADY_MEMBER");
      }

      const joinNotifications = existingMemberIds.map((userId) => ({
        user: userId,
        type: "group_joined",
        message: `${req.user.name} joined ${group.name}`,
        group: group._id,
        read: false,
      }));

      joinNotifications.push({
        user: req.user._id,
        type: "added_to_group",
        message: `You joined ${group.name}`,
        group: group._id,
        read: false,
      });

      await Notification.insertMany(joinNotifications, { session });
      await updateGroupStatus(group._id, session);
    });

    const fullGroup = await Group.findById(group._id).populate("members.user", "name email upiId");

    return res.status(200).json({
      message: `Joined ${fullGroup.name} successfully.`,
      group: toGroupDto(fullGroup, [], req.user._id),
    });
  } catch (error) {
    if (error.message === "ALREADY_MEMBER") {
      const requestedCode = String(req.body?.code || "").trim().toUpperCase();
      const requestedGroupId = String(req.body?.groupId || "").trim();
      const fullGroup = requestedCode
        ? await Group.findOne({ code: requestedCode }).populate("members.user", "name email upiId")
        : mongoose.Types.ObjectId.isValid(requestedGroupId)
          ? await Group.findById(requestedGroupId).populate("members.user", "name email upiId")
          : null;

      return res.status(200).json({
        message: "You are already a member of this group.",
        group: fullGroup ? toGroupDto(fullGroup, [], req.user._id) : undefined,
      });
    }
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

    const visibleExpenses = expenses.filter((expense) => expense.category !== "Settlement");

    // Include pending cash settlement requests that are addressed to the current user
    const pendingRequests = await PendingSettlement.find({ group: group._id, status: "pending", to: req.user._id })
      .populate("from", "name");

    return res.json({
      group: toGroupDto(group, expenses, req.user._id),
      expenses: visibleExpenses.map(toExpenseDto),
      pendingRequests: pendingRequests.map((r) => ({
        id: r._id,
        from: { id: r.from._id, name: r.from.name },
        amount: r.amount,
        notes: r.notes,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load group", error: error.message });
  }
});

router.post("/:id/expenses", async (req, res) => {
  try {
    const group = await findGroupForUser(req.params.id, req.user._id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const { title, amount, date, category, notes, splitType = "equal", customSplits = {} } = req.body;
    const normalizedSplitType = String(splitType || "equal").trim().toLowerCase();
    const parsedDate = parseExpenseDate(date);

    if (!title || !amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "Valid title and amount are required." });
    }

    if (!EXPENSE_SPLIT_TYPES.has(normalizedSplitType)) {
      return res.status(400).json({ message: "Invalid split type." });
    }

    if (!parsedDate) {
      return res.status(400).json({ message: "Invalid expense date." });
    }

    const memberIds = group.members.map((member) => member.user._id.toString());
    // Always treat the authenticated user as the payer when they add an expense.
    // This prevents clients from incorrectly (or maliciously) setting another member as payer.
    const paidById = req.user._id.toString();

    if (!memberIds.includes(paidById.toString())) {
      return res.status(400).json({ message: "Payer must be a group member." });
    }

    let splits = [];
    const numericAmount = Number(amount);

    if (normalizedSplitType === "custom") {
      splits = sanitizeCustomSplits(memberIds, customSplits);

      if (splits.some((split) => !Number.isFinite(split.amount) || split.amount < 0)) {
        return res.status(400).json({ message: "Custom split amounts must be valid positive numbers or zero." });
      }

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

    const createdExpense = await runInTransaction(async (session) => {
      const expenseDoc = new Expense({
        group: group._id,
        title: title.trim(),
        amount: numericAmount,
        paidBy: paidById,
        date: parsedDate,
        category: category || "Other",
        notes: notes || "",
        splitType: normalizedSplitType,
        splits,
        createdBy: req.user._id,
      });

      await expenseDoc.save({ session });
      const expense = expenseDoc;

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
        await Notification.insertMany(notifications, { session });
      }

      await updateGroupStatus(group._id, session);
      return expense;
    });

    const payer = group.members.find((member) => member.user._id.toString() === paidById)?.user;

    const created = await Expense.findById(createdExpense._id)
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

router.post("/:id/expenses/:expenseId/settle", async (req, res) => {
  try {
    const createdSettlement = await runInTransaction(async (session) => {
      return settleSpecificExpenseForUser({
        groupId: req.params.id,
        expenseId: req.params.expenseId,
        userId: req.user._id,
        session,
      });
    });

    const created = await Expense.findById(createdSettlement._id)
      .populate("paidBy", "name email upiId")
      .populate("splits.user", "name email upiId");

    return res.status(201).json({
      message: "Expense settled",
      expense: toExpenseDto(created),
    });
  } catch (error) {
    if (error instanceof SettlementError) {
      return res.status(error.statusCode).json({ message: error.message, code: error.code });
    }

    return res.status(500).json({ message: "Failed to settle expense", error: error.message });
  }
});

router.post("/:id/settle", async (req, res) => {
  try {
    const { toUserId, amount, notes } = req.body || {};
    const createdSettlement = await runInTransaction(async (session) => {
      return settleNetBalanceBetweenUsers({
        groupId: req.params.id,
        payerUserId: req.user._id,
        payeeUserId: String(toUserId || "").trim(),
        amount,
        notes,
        session,
      });
    });

    const created = await Expense.findById(createdSettlement._id)
      .populate("paidBy", "name email upiId")
      .populate("splits.user", "name email upiId");

    return res.status(201).json({
      message: "Settlement recorded",
      expense: toExpenseDto(created),
    });
  } catch (error) {
    if (error instanceof SettlementError) {
      return res.status(error.statusCode).json({ message: error.message, code: error.code });
    }
    return res.status(500).json({ message: "Failed to settle payment", error: error.message });
  }
});

export default router;
