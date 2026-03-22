export function isValidUpiId(value) {
  const upiId = String(value || "").trim();
  if (!upiId) return false;

  // Basic UPI shape: local-part@provider
  return /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/i.test(upiId);
}

export function buildUpiPaymentNote({ groupName = "", recipientName = "" } = {}) {
  const parts = ["SplitSmart Settlement"];

  if (groupName) {
    parts.push(groupName);
  }

  if (recipientName) {
    parts.push(`to ${recipientName}`);
  }

  return parts.join(" - ");
}

export function buildUpiPaymentLink({ upiId, recipientName, amount, note }) {
  if (!isValidUpiId(upiId)) {
    return "";
  }

  const params = new URLSearchParams({
    pa: String(upiId).trim(),
    pn: String(recipientName || "").trim(),
    am: Number(amount || 0).toFixed(2),
    cu: "INR",
    tn: String(note || "").trim(),
  });

  return `upi://pay?${params.toString()}`;
}
