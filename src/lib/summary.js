// Calculations on lists of expenses. These are "pure" functions: they only
// look at what you pass in and return a new result, without changing anything.
// That makes them easy to understand and to test.

import { monthKey } from "./dates.js";

// Only the expenses in one month. monthKeyToKeep looks like "2026-10".
export function inMonth(expenses, monthKeyToKeep) {
  return expenses.filter(
    (expense) => monthKey(expense.date) === monthKeyToKeep,
  );
}

// Adds up the amounts.
export function total(expenses) {
  return expenses.reduce((sum, expense) => sum + expense.amount, 0);
}

// Newest date first. For two expenses on the same day, the one logged later
// comes first. Expenses are stored in the order they were added (like rows
// in a sheet), so we always sort before showing them.
export function sortNewestFirst(expenses) {
  return [...expenses].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.createdAt.localeCompare(a.createdAt);
  });
}

// Groups expenses by day, newest day first:
// [{ date: "2026-10-24", total: 270, items: [...] }, ...]
export function groupByDay(expenses) {
  const groups = [];
  for (const expense of sortNewestFirst(expenses)) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.date === expense.date) {
      lastGroup.items.push(expense); // same day as the previous one
    } else {
      groups.push({ date: expense.date, items: [expense] }); // a new day starts
    }
  }
  return groups.map((group) => ({ ...group, total: total(group.items) }));
}

// Spending per category, biggest first:
// [{ id: "food", name: "Food", color: "teal", amount: 3650, percent: 34 }, ...]
export function byCategory(expenses, categories) {
  const monthTotal = total(expenses);

  // Add up the amounts per category ID, e.g. { food: 3650, bills: 2659 }
  const amounts = {};
  for (const expense of expenses) {
    const soFar = amounts[expense.categoryId] || 0; // 0 the first time we see it
    amounts[expense.categoryId] = soFar + expense.amount;
  }

  // Turn { food: 3650, ... } into a list with names, colors and percentages.
  // Object.entries(amounts) gives [["food", 3910], ["bills", 4859]]
  const rows = Object.entries(amounts).map(([categoryId, amount]) => {
    const category = categories.find((item) => item.id === categoryId);
    return {
      id: categoryId,
      name: category ? category.name : "Unknown",
      color: category ? category.color : "gray",
      amount,
      percent: monthTotal > 0 ? Math.round((amount / monthTotal) * 100) : 0,
    };
  });

  return rows.sort((a, b) => b.amount - a.amount); // biggest first
}
