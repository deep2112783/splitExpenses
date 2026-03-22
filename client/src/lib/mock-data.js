















































export const currentUser = {
  id: "u1",
  name: "Arjun Sharma",
  email: "arjun@example.com",
  upiId: "arjun@upi"
};

const users = [
currentUser,
{ id: "u2", name: "Priya Patel", email: "priya@example.com", upiId: "priya@upi" },
{ id: "u3", name: "Rahul Kumar", email: "rahul@example.com", upiId: "rahul@upi" },
{ id: "u4", name: "Sneha Gupta", email: "sneha@example.com", upiId: "sneha@upi" },
{ id: "u5", name: "Amit Singh", email: "amit@example.com", upiId: "amit@upi" }];


export const mockGroups = [
{
  id: "g1",
  name: "Goa Trip 2026",
  description: "Annual friends trip to Goa",
  category: "trip",
  code: "GOA2026",
  status: "active",
  createdAt: "2026-02-15",
  totalExpenses: 24500,
  members: [
  { user: users[0], role: "admin", balance: -1200 },
  { user: users[1], role: "member", balance: 800 },
  { user: users[2], role: "member", balance: -600 },
  { user: users[3], role: "member", balance: 500 },
  { user: users[4], role: "member", balance: 500 }]

},
{
  id: "g2",
  name: "Flat 302 Expenses",
  description: "Monthly roommate expenses",
  category: "roommates",
  code: "FLAT302",
  status: "active",
  createdAt: "2026-01-01",
  totalExpenses: 18200,
  members: [
  { user: users[0], role: "admin", balance: 2400 },
  { user: users[2], role: "member", balance: -1200 },
  { user: users[4], role: "member", balance: -1200 }]

},
{
  id: "g3",
  name: "Family Dinner",
  description: "Weekend family dinner",
  category: "family",
  code: "FAMDNR",
  status: "settled",
  createdAt: "2026-02-28",
  totalExpenses: 4800,
  members: [
  { user: users[0], role: "admin", balance: 0 },
  { user: users[1], role: "member", balance: 0 },
  { user: users[3], role: "member", balance: 0 }]

}];


export const mockExpenses = [
{
  id: "e1",
  groupId: "g1",
  title: "Hotel Booking",
  amount: 12000,
  paidBy: users[1],
  date: "2026-03-01",
  category: "Accommodation",
  splitType: "equal",
  splits: users.map((u) => ({ user: u, amount: 2400, settled: false }))
},
{
  id: "e2",
  groupId: "g1",
  title: "Dinner at Fisherman's Wharf",
  amount: 5500,
  paidBy: users[0],
  date: "2026-03-02",
  category: "Food",
  splitType: "equal",
  splits: users.map((u) => ({ user: u, amount: 1100, settled: false }))
},
{
  id: "e3",
  groupId: "g1",
  title: "Scooter Rental",
  amount: 3000,
  paidBy: users[3],
  date: "2026-03-02",
  category: "Transport",
  notes: "3 scooters for 2 days",
  splitType: "equal",
  splits: users.map((u) => ({ user: u, amount: 600, settled: false }))
},
{
  id: "e4",
  groupId: "g2",
  title: "Electricity Bill - Feb",
  amount: 3200,
  paidBy: users[0],
  date: "2026-03-01",
  category: "Bills",
  splitType: "equal",
  splits: [users[0], users[2], users[4]].map((u) => ({ user: u, amount: 1066.67, settled: false }))
},
{
  id: "e5",
  groupId: "g2",
  title: "Groceries",
  amount: 2800,
  paidBy: users[0],
  date: "2026-03-05",
  category: "Food",
  splitType: "equal",
  splits: [users[0], users[2], users[4]].map((u) => ({ user: u, amount: 933.33, settled: false }))
}];


export const mockNotifications = [
{ id: "n1", type: "expense_added", message: "Priya added 'Hotel Booking' (₹12,000) in Goa Trip 2026", read: false, createdAt: "2026-03-08T10:30:00", groupId: "g1" },
{ id: "n2", type: "payment_requested", message: "Rahul requested ₹600 for Scooter Rental", read: false, createdAt: "2026-03-08T09:15:00", groupId: "g1" },
{ id: "n3", type: "added_to_group", message: "You were added to 'Weekend Brunch' by Sneha", read: true, createdAt: "2026-03-07T14:00:00" },
{ id: "n4", type: "payment_received", message: "Amit paid you ₹1,200 for Flat 302 Expenses", read: true, createdAt: "2026-03-06T16:45:00", groupId: "g2" },
{ id: "n5", type: "leave_request", message: "Rahul requested to leave 'Goa Trip 2026'", read: false, createdAt: "2026-03-05T11:20:00", groupId: "g1" }];


export const categoryIcons = {
  trip: "✈️",
  vacation: "🏖️",
  family: "👨‍👩‍👧‍👦",
  roommates: "🏠",
  friends: "🍕",
  other: "📋"
};

export const expenseCategoryIcons = {
  Accommodation: "🏨",
  Food: "🍽️",
  Transport: "🚗",
  Bills: "💡",
  Entertainment: "🎉",
  Shopping: "🛍️",
  Other: "📦"
};

export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function getInitials(name) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}