export function asId(value) {
  if (!value) return undefined;

  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);

  if (typeof value === "object") {
    if (value._id) return value._id.toString();
    if (value.id) return value.id.toString();
  }

  return value.toString();
}

export function buildMemberBalances(group, expenses) {
  const balanceMap = new Map();

  for (const member of group.members || []) {
    balanceMap.set(asId(member.user), 0);
  }

  for (const expense of expenses || []) {
    const payerId = asId(expense.paidBy);
    const current = balanceMap.get(payerId) || 0;
    balanceMap.set(payerId, current + Number(expense.amount || 0));

    for (const split of expense.splits || []) {
      const splitUserId = asId(split.user);
      const splitCurrent = balanceMap.get(splitUserId) || 0;
      balanceMap.set(splitUserId, splitCurrent - Number(split.amount || 0));
    }
  }

  return balanceMap;
}

export function toGroupDto(group, expenses, currentUserId) {
  const balances = buildMemberBalances(group, expenses);
  const currentUserBalance = balances.get(asId(currentUserId)) || 0;

  return {
    id: asId(group._id),
    name: group.name,
    description: group.description,
    category: group.category,
    code: group.code,
    status: group.status,
    totalExpenses: expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    members: (group.members || []).map((member) => {
      const memberId = asId(member.user?._id || member.user);
      const user = member.user?._id
        ? {
            id: asId(member.user._id),
            name: member.user.name,
            email: member.user.email,
            upiId: member.user.upiId || "",
          }
        : { id: memberId };

      return {
        user,
        role: member.role,
        balance: balances.get(memberId) || 0,
      };
    }),
    myBalance: currentUserBalance,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

export function toExpenseDto(expense) {
  return {
    id: asId(expense._id),
    groupId: asId(expense.group?._id || expense.group),
    title: expense.title,
    amount: Number(expense.amount || 0),
    paidBy: expense.paidBy?._id
      ? {
          id: asId(expense.paidBy._id),
          name: expense.paidBy.name,
          email: expense.paidBy.email,
          upiId: expense.paidBy.upiId || "",
        }
      : { id: asId(expense.paidBy) },
    date: expense.date,
    category: expense.category,
    notes: expense.notes || "",
    splitType: expense.splitType,
    splits: (expense.splits || []).map((split) => ({
      user: split.user?._id
        ? {
            id: asId(split.user._id),
            name: split.user.name,
            email: split.user.email,
            upiId: split.user.upiId || "",
          }
        : { id: asId(split.user) },
      amount: Number(split.amount || 0),
      settled: Boolean(split.settled),
    })),
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  };
}
