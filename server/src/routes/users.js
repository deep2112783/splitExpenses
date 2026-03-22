import express from "express";
import bcrypt from "bcryptjs";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { Group } from "../models/Group.js";
import { Expense } from "../models/Expense.js";
import { buildMemberBalances } from "../utils/finance.js";

const router = express.Router();

router.use(requireAuth);

router.get("/me", async (req, res) => {
  try {
    const user = req.user;

    const groups = await Group.find({ "members.user": user._id }).lean();
    const groupIds = groups.map((group) => group._id);

    const expenses = await Expense.find({ group: { $in: groupIds } }).lean();
    const expensesByGroup = new Map();

    for (const expense of expenses) {
      const key = expense.group.toString();
      const arr = expensesByGroup.get(key) || [];
      arr.push(expense);
      expensesByGroup.set(key, arr);
    }

    let totalYouOwe = 0;
    let totalYouAreOwed = 0;

    for (const group of groups) {
      const groupExpenses = expensesByGroup.get(group._id.toString()) || [];
      const balanceMap = buildMemberBalances(group, groupExpenses);
      const myBalance = Number(balanceMap.get(user._id.toString()) || 0);
      if (myBalance < 0) totalYouOwe += Math.abs(myBalance);
      if (myBalance > 0) totalYouAreOwed += myBalance;
    }

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        upiId: user.upiId || "",
        createdAt: user.createdAt,
      },
      stats: {
        groups: groups.length,
        youOwe: totalYouOwe,
        youAreOwed: totalYouAreOwed,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load profile", error: error.message });
  }
});

router.put("/me", async (req, res) => {
  try {
    const { name, email, upiId, password } = req.body;
    const updates = {};

    if (name) updates.name = name.trim();
    if (email) updates.email = email.trim().toLowerCase();
    if (typeof upiId === "string") updates.upiId = upiId.trim();

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters." });
      }
      updates.password = await bcrypt.hash(password, 10);
    }

    if (updates.email) {
      const existing = await User.findOne({ email: updates.email, _id: { $ne: req.user._id } });
      if (existing) {
        return res.status(409).json({ message: "Email already registered." });
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select("-password");

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        upiId: user.upiId || "",
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update profile", error: error.message });
  }
});

export default router;
