import mongoose from "mongoose";

const pendingSettlementSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    expense: { type: mongoose.Schema.Types.ObjectId, ref: "Expense", default: null },
    amount: { type: Number, required: true },
    method: { type: String, enum: ["cash", "upi", "other"], default: "cash" },
    notes: { type: String, default: "" },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  },
  { timestamps: true },
);

export const PendingSettlement = mongoose.model("PendingSettlement", pendingSettlementSchema);
