import express from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { PendingSettlement } from "../models/PendingSettlement.js";
import { Group } from "../models/Group.js";
import { Notification } from "../models/Notification.js";
import { runInTransaction, settleNetBalanceBetweenUsers, settleSpecificExpenseForUser } from "../utils/settlements.js";

const router = express.Router();

router.use(requireAuth);

// Create a pending settlement request (cash)
router.post("/:groupId/requests", async (req, res) => {
  try {
    const { toUserId, amount, notes, expenseId, method } = req.body || {};
    const groupId = req.params.groupId;

    if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(toUserId)) {
      return res.status(400).json({ message: "Invalid group or user id" });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const group = await Group.findOne({ _id: groupId, "members.user": req.user._id }).lean();
    if (!group) return res.status(404).json({ message: "Group not found or not a member" });

    const recipientMember = group.members.find((m) => m.user.toString() === toUserId.toString());
    if (!recipientMember) return res.status(400).json({ message: "Recipient not in group" });

    // If expenseId provided, validate it's part of this group and the participants align
    let expenseRef = null;
    if (expenseId) {
      if (!mongoose.Types.ObjectId.isValid(expenseId)) {
        return res.status(400).json({ message: "Invalid expense id" });
      }
      const { Expense } = await import("../models/Expense.js");
      const expense = await Expense.findOne({ _id: expenseId, group: groupId }).populate("paidBy", "_id");
      if (!expense) return res.status(404).json({ message: "Expense not found in group" });

      // payer must match the provided toUserId
      const payerId = expense.paidBy?._id?.toString() || expense.paidBy?.toString();
      if (payerId !== toUserId.toString()) {
        return res.status(400).json({ message: "Recipient must be the payer for this expense" });
      }

      // requester must be part of the expense splits
      const isParticipant = (expense.splits || []).some(
        (s) => (s.user?._id?.toString() || s.user?.toString()) === req.user._id.toString(),
      );
      if (!isParticipant) return res.status(400).json({ message: "You are not part of this expense" });

      expenseRef = expense._id;
    }

    const allowedMethods = new Set(["cash", "upi", "other"]);
    const chosenMethod = String(method || "cash").toLowerCase();
    const methodValue = allowedMethods.has(chosenMethod) ? chosenMethod : "cash";

    // Prevent duplicate pending requests: same group, from, to, expense, amount, method and still pending
    const existing = await PendingSettlement.findOne({
      group: groupId,
      from: req.user._id,
      to: toUserId,
      expense: expenseRef || null,
      amount: numericAmount,
      method: methodValue,
      status: "pending",
    });

    if (existing) {
      return res.status(409).json({ message: "A pending settlement request with the same details already exists.", requestId: existing._id });
    }

    const pending = await PendingSettlement.create({
      group: groupId,
      from: req.user._id,
      to: toUserId,
      expense: expenseRef,
      amount: numericAmount,
      method: methodValue,
      notes: String(notes || "").trim(),
    });

    await Notification.create({
      user: toUserId,
      type: "payment_requested",
      message: `${req.user.name} requested a ${methodValue.toUpperCase()} settlement of ${numericAmount.toFixed(2)} in ${group.name}`,
      group: groupId,
      read: false,
    });

    return res.status(201).json({ message: "Settlement request created", requestId: pending._id });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create settlement request", error: error.message });
  }
});

// Accept a pending settlement request (only recipient can accept)
router.post("/:groupId/requests/:requestId/accept", async (req, res) => {
  try {
    const { groupId, requestId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const pending = await PendingSettlement.findById(requestId);
    if (!pending || pending.group.toString() !== groupId) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (pending.to.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the recipient can accept this request" });
    }

    const result = await runInTransaction(async (session) => {
      let settlement;

      if (pending.expense) {
        // expense-specific settlement: mark the split settled for the requester (pending.from)
        settlement = await settleSpecificExpenseForUser({
          groupId: pending.group,
          expenseId: pending.expense,
          userId: pending.from,
          notes: pending.notes || "Cash settlement",
          session,
        });
      } else {
        // perform net settlement between users
        settlement = await settleNetBalanceBetweenUsers({
          groupId: pending.group,
          payerUserId: pending.from,
          payeeUserId: pending.to,
          amount: pending.amount,
          notes: pending.notes || `Cash settlement requested by ${pending.from}`,
          session,
        });
      }

      pending.status = "accepted";
      await pending.save({ session });

      // load group to get readable names
      const group = await Group.findById(pending.group).populate("members.user", "name");
      const fromName = group?.members.find((m) => m.user._id.toString() === pending.from.toString())?.user?.name || String(pending.from);
      const toName = group?.members.find((m) => m.user._id.toString() === pending.to.toString())?.user?.name || String(pending.to);

      const methodLabel = (pending.method || "cash").toUpperCase();
      await Notification.insertMany(
        [
          {
            user: pending.from,
            type: "payment_sent",
            message: `${toName} accepted your ${methodLabel} settlement of ${pending.amount.toFixed(2)} in ${group?.name || "the group"}`,
            group: pending.group,
            read: false,
          },
          {
            user: pending.to,
            type: "payment_received",
            message: `You accepted a ${methodLabel} settlement of ${pending.amount.toFixed(2)} from ${fromName} in ${group?.name || "the group"}`,
            group: pending.group,
            read: false,
          },
        ],
        { session },
      );

      return settlement;
    });

    return res.status(201).json({ message: "Settlement accepted", settlement: result });
  } catch (error) {
    // Log the full error for server-side debugging
    console.error("Error accepting pending settlement:", error && error.stack ? error.stack : error);

    if (error && error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message, code: error.code || null });
    }

    // Return detailed message where possible to help client surface the reason
    return res.status(500).json({ message: error?.message || "Failed to accept settlement", error: String(error) });
  }
});

export default router;
