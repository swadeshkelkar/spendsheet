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
