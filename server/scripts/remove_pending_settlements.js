import dotenv from "dotenv";
import { connectDatabase } from "../src/config/db.js";
import mongoose from "mongoose";
import { User } from "../src/models/User.js";
import { Group } from "../src/models/Group.js";
import { PendingSettlement } from "../src/models/PendingSettlement.js";

dotenv.config({ path: new URL("../.env", import.meta.url).pathname });

async function main() {
  await connectDatabase();

  const targetEmail = process.argv[2] || "deepika12@gmail.com";
  const groupName = process.argv[3] || "outing";
  const amountArg = process.argv[4] || "150";
  const action = process.argv[5] || "delete"; // 'delete' or 'reject'
  const amount = Number(amountArg);

  if (!targetEmail || !groupName || !Number.isFinite(amount)) {
    console.error("Usage: node scripts/remove_pending_settlements.js <toEmail> <groupName> <amount>");
    process.exit(1);
  }

  console.log(`Searching pending settlements TO=${targetEmail} GROUP='${groupName}' AMOUNT=${amount}`);

  const toUser = await User.findOne({ email: targetEmail.toLowerCase() }).lean();
  if (!toUser) {
    console.error(`Recipient user not found for email: ${targetEmail}`);
    process.exit(1);
  }

  const group = await Group.findOne({ name: { $regex: `^${groupName}$`, $options: "i" } }).lean();
  if (!group) {
    console.error(`Group not found with name: ${groupName}`);
    process.exit(1);
  }

  // optional from filter: look for a user named 'joshna'
  const fromUser = await User.findOne({ name: { $regex: "^joshna$", $options: "i" } }).lean();

  const query = {
    group: group._id,
    to: toUser._id,
    amount: amount,
    status: "pending",
  };

  if (fromUser) query.from = fromUser._id;

  const matches = await PendingSettlement.find(query).populate("from", "name email").populate("to", "name email");

  if (!matches || matches.length === 0) {
    console.log("No matching pending settlement requests found.");
    process.exit(0);
  }

  console.log(`Found ${matches.length} pending request(s):`);
  for (const m of matches) {
    console.log(`- id=${m._id} from=${m.from?.name || m.from} to=${m.to?.email || m.to} amount=${m.amount} notes=${m.notes}`);
  }

  const ids = matches.map((m) => m._id);
  if (action === "reject") {
    const result = await PendingSettlement.updateMany({ _id: { $in: ids } }, { $set: { status: "rejected" } });
    console.log(`Marked ${result.modifiedCount} pending settlement(s) as rejected.`);
    // Also remove related "payment_requested" notifications for the recipient in this group
    const Notification = (await import("../src/models/Notification.js")).Notification;
    const amountStr = amount.toFixed ? amount.toFixed(2) : String(amount);
    const notifQuery = {
      user: toUser._id,
      group: group._id,
      type: "payment_requested",
      message: { $regex: amountStr },
    };
    const notifDelete = await Notification.deleteMany(notifQuery);
    console.log(`Deleted ${notifDelete.deletedCount || 0} matching notification(s).`);
  } else {
    const result = await PendingSettlement.deleteMany({ _id: { $in: ids } });
    console.log(`Deleted ${result.deletedCount} pending settlement(s).`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(2);
});
