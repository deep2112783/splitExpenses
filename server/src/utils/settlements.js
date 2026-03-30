import mongoose from "mongoose";
import { Expense } from "../models/Expense.js";
import { Group } from "../models/Group.js";
import { Notification } from "../models/Notification.js";
import { buildMemberBalances } from "./finance.js";

export class SettlementError extends Error {
  constructor(statusCode, message, code = "SETTLEMENT_ERROR") {
    super(message);
    this.name = "SettlementError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export async function runInTransaction(work) {
  const session = await mongoose.startSession();

  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export async function updateGroupStatus(groupId, session) {
  const group = await Group.findById(groupId, null, { session }).lean();
  if (!group) return;

  const expenses = await Expense.find({ group: groupId }, null, { session }).lean();
  if (expenses.length === 0) {
    if (group.status !== "active") {
      await Group.updateOne({ _id: groupId }, { $set: { status: "active" } }, { session });
    }
    return;
  }

  const balances = buildMemberBalances(group, expenses);
  const isSettled = Array.from(balances.values()).every((balance) => Math.abs(Number(balance || 0)) <= 0.01);
  const nextStatus = isSettled ? "settled" : "active";

  if (group.status !== nextStatus) {
    await Group.updateOne({ _id: groupId }, { $set: { status: nextStatus } }, { session });
  }
}

function appendPaymentReference(baseNotes, reference) {
  const trimmedNotes = String(baseNotes || "").trim();
  const trimmedReference = String(reference || "").trim();

  if (!trimmedReference) return trimmedNotes;
  if (!trimmedNotes) return `Payment reference: ${trimmedReference}`;
  return `${trimmedNotes} | Payment reference: ${trimmedReference}`;
}

export async function settleSpecificExpenseForUser({
  groupId,
  expenseId,
  userId,
  notes,
  paymentReference = "",
  session,
}) {
  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    throw new SettlementError(400, "Invalid group id.", "INVALID_GROUP");
  }

  if (!mongoose.Types.ObjectId.isValid(expenseId)) {
    throw new SettlementError(400, "Invalid expense id.", "INVALID_EXPENSE");
  }

  const group = await Group.findOne({ _id: groupId, "members.user": userId }, null, { session })
    .populate("members.user", "name email upiId");

  if (!group) {
    throw new SettlementError(404, "Group not found", "GROUP_NOT_FOUND");
  }

  const expense = await Expense.findOne({ _id: expenseId, group: group._id }, null, { session })
    .populate("paidBy", "name email upiId")
    .populate("splits.user", "name email upiId");

  if (!expense) {
    throw new SettlementError(404, "Expense not found.", "EXPENSE_NOT_FOUND");
  }

  const payerId = expense.paidBy?._id?.toString() || expense.paidBy?.toString();
  if (!payerId || payerId === userId.toString()) {
    throw new SettlementError(400, "You cannot settle an expense you paid.", "INVALID_PAYER");
  }

  const mySplit = (expense.splits || []).find(
    (split) => (split.user?._id?.toString() || split.user?.toString()) === userId.toString(),
  );

  if (!mySplit) {
    throw new SettlementError(400, "You are not part of this expense split.", "SPLIT_NOT_FOUND");
  }

  if (mySplit.settled) {
    throw new SettlementError(400, "This expense is already settled for you.", "EXPENSE_ALREADY_SETTLED");
  }

  const settlementAmount = Number(mySplit.amount || 0);
  if (!Number.isFinite(settlementAmount) || settlementAmount <= 0) {
    throw new SettlementError(400, "This expense has no payable amount for you.", "INVALID_SETTLEMENT_AMOUNT");
  }

  const updateResult = await Expense.updateOne(
    {
      _id: expense._id,
      group: group._id,
      "splits.user": userId,
      "splits.settled": false,
    },
    {
      $set: {
        "splits.$.settled": true,
      },
    },
    { session },
  );

  if (updateResult.modifiedCount === 0) {
    throw new SettlementError(400, "This expense is already settled for you.", "EXPENSE_ALREADY_SETTLED");
  }

  const settlementDoc = new Expense({
    group: group._id,
    title: `Settlement for ${expense.title}`,
    amount: settlementAmount,
    paidBy: userId,
    date: new Date(),
    category: "Settlement",
    notes: appendPaymentReference(notes || `Direct payment for ${expense.title}`, paymentReference),
    splitType: "custom",
    splits: [
      {
        user: expense.paidBy._id,
        amount: settlementAmount,
        settled: true,
      },
    ],
    createdBy: userId,
  });

  await settlementDoc.save({ session });
  const settlement = settlementDoc;

  await Notification.insertMany(
    [
      {
        user: expense.paidBy._id,
        type: "payment_received",
        message: `${group.members.find((member) => member.user._id.toString() === userId.toString())?.user?.name || "A member"} paid you ${settlementAmount.toFixed(2)} for ${expense.title} in ${group.name}`,
        group: group._id,
        read: false,
      },
      {
        user: userId,
        type: "payment_sent",
        message: `You paid ${expense.paidBy.name} ${settlementAmount.toFixed(2)} for ${expense.title} in ${group.name}`,
        group: group._id,
        read: false,
      },
    ],
    { session },
  );

  await updateGroupStatus(group._id, session);
  return settlement;
}

export async function settleNetBalanceBetweenUsers({
  groupId,
  payerUserId,
  payeeUserId,
  amount,
  notes,
  paymentReference = "",
  session,
}) {
  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    throw new SettlementError(400, "Invalid group id.", "INVALID_GROUP");
  }

  if (!mongoose.Types.ObjectId.isValid(payeeUserId)) {
    throw new SettlementError(400, "A valid recipient is required.", "INVALID_RECIPIENT");
  }

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new SettlementError(400, "A valid settlement amount is required.", "INVALID_AMOUNT");
  }

  if (payeeUserId.toString() === payerUserId.toString()) {
    throw new SettlementError(400, "You cannot settle with yourself.", "SELF_SETTLEMENT");
  }

  const group = await Group.findOne({ _id: groupId, "members.user": payerUserId }, null, { session })
    .populate("members.user", "name email upiId");

  if (!group) {
    throw new SettlementError(404, "Group not found", "GROUP_NOT_FOUND");
  }

  const recipientMember = group.members.find(
    (member) => member.user?._id?.toString() === payeeUserId.toString(),
  );

  if (!recipientMember) {
    throw new SettlementError(400, "Recipient must be a member of this group.", "RECIPIENT_NOT_IN_GROUP");
  }

  const groupExpenses = await Expense.find({ group: group._id }, null, { session }).populate("splits.user", "_id");
  let iOwe = 0;
  let theyOwe = 0;

  for (const expense of groupExpenses) {
    const expensePayerId = expense.paidBy?.toString();
    if (!expensePayerId) continue;

    for (const split of expense.splits || []) {
      const debtorId = split.user?._id?.toString() || split.user?.toString();
      if (!debtorId || debtorId === expensePayerId) continue;

      const splitAmount = Number(split.amount || 0);
      if (debtorId === payerUserId.toString() && expensePayerId === payeeUserId.toString()) {
        iOwe += splitAmount;
      }

      if (debtorId === payeeUserId.toString() && expensePayerId === payerUserId.toString()) {
        theyOwe += splitAmount;
      }
    }
  }

  const netOutstanding = Number((iOwe - theyOwe).toFixed(2));

  if (netOutstanding <= 0) {
    throw new SettlementError(400, "No outstanding amount to settle with this member.", "NO_OUTSTANDING_AMOUNT");
  }

  if (numericAmount - netOutstanding > 0.01) {
    throw new SettlementError(
      400,
      `Settlement exceeds outstanding amount (${netOutstanding.toFixed(2)}).`,
      "SETTLEMENT_TOO_LARGE",
    );
  }

  const settlementDoc = new Expense({
    group: group._id,
    title: "Settlement",
    amount: numericAmount,
    paidBy: payerUserId,
    date: new Date(),
    category: "Settlement",
    notes: appendPaymentReference(String(notes || "").trim() || "Settlement payment", paymentReference),
    splitType: "custom",
    splits: [
      {
        user: recipientMember.user._id,
        amount: numericAmount,
        settled: true,
      },
    ],
    createdBy: payerUserId,
  });

  await settlementDoc.save({ session });
  const settlement = settlementDoc;

  await Notification.insertMany(
    [
      {
        user: recipientMember.user._id,
        type: "payment_received",
        message: `${group.members.find((member) => member.user._id.toString() === payerUserId.toString())?.user?.name || "A member"} paid you ${numericAmount.toFixed(2)} in ${group.name}`,
        group: group._id,
        read: false,
      },
      {
        user: payerUserId,
        type: "payment_sent",
        message: `You paid ${recipientMember.user.name} ${numericAmount.toFixed(2)} in ${group.name}`,
        group: group._id,
        read: false,
      },
    ],
    { session },
  );

  await updateGroupStatus(group._id, session);
  return settlement;
}
