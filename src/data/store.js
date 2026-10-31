// The app's data: expenses and categories.
//
// For now everything is kept in the browser (localStorage) and starts with
// sample data. Later, a Google Sheets version will offer the same functions,
// so the screens won't need to change.
//
// The functions are `async` because reading a Google Sheet takes time. Screens
// already wait for them, so switching to Sheets later is a drop-in change.

import { addDays, parseISODate, todayISO } from "../lib/dates.js";

// The key our data is saved under in localStorage.
const STORAGE_KEY = "spendsheet:data";

// Categories every new user starts with. "Other" is the fallback and stays last.
const DEFAULT_CATEGORIES = [
  { id: "food", name: "Food", color: "teal", active: true },
  { id: "transport", name: "Transport", color: "purple", active: true },
  { id: "shopping", name: "Shopping", color: "orange", active: true },
  { id: "bills", name: "Bills", color: "blue", active: true },
  { id: "health", name: "Health", color: "ochre", active: true },
  { id: "other", name: "Other", color: "gray", active: true },
];

// Sample expenses: [days ago, amount, category id, note].
// Using "days ago" keeps the sample data fresh whenever you first open the app.
const SAMPLE_ROWS = [
  [0, 180, "food", "Lunch at office canteen"],
  [0, 90, "transport", "Auto to station"],
  [1, 1240, "food", "Groceries"],
  [1, 1860, "bills", "Electricity bill"],
  [3, 420, "health", "Pharmacy"],
  [3, 500, "other", "Movie tickets"],
  [4, 2150, "shopping", "Running shoes"],
  [6, 650, "food", "Dinner with friends"],
  [8, 799, "bills", "Mobile recharge"],
  [9, 340, "transport", "Cab to airport"],
  [12, 1580, "food", "Monthly groceries"],
  [15, 999, "shopping", "Phone cover and cable"],
  [19, 2200, "bills", "Internet bill"],
  [24, 260, "food", "Coffee and snacks"],
  [28, 1450, "transport", "Fuel"],
  [33, 3200, "shopping", "Clothes"],
  [36, 1900, "food", "Groceries"],
  [40, 2100, "bills", "Electricity bill"],
  [44, 600, "health", "Doctor visit"],
  [47, 380, "other", "Gift wrap and card"],
];

// A unique ID for each expense. Edits and deletes will find expenses by this ID,
// never by their position in a list (rows in a sheet can be re-sorted).
function newId() {
  return crypto.randomUUID();
}

// Builds a fresh set of sample data.
function createSampleData() {
  const today = todayISO();
  const expenses = SAMPLE_ROWS.map(
    ([daysAgo, amount, categoryId, note], index) => {
      const date = addDays(today, -daysAgo);
      // Pretend each one was logged at 9:00 that day, one minute apart, so
      // expenses on the same day always show in the same order.
      const loggedAt =
        parseISODate(date).getTime() + (9 * 60 + index) * 60 * 1000;
      return {
        id: newId(),
        date,
        amount,
        categoryId,
        note,
        createdAt: new Date(loggedAt).toISOString(),
      };
    },
  );
  return { expenses, categories: DEFAULT_CATEGORIES };
}

// Reads our data from localStorage. The first time, there is nothing saved yet,
// so we create the sample data and save it.
function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    return JSON.parse(saved); // text → JavaScript object
  }
  const data = createSampleData();
  saveData(data);
  return data;
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); // object → text
}

// ---------- What the screens use ----------

export async function getExpenses() {
  return loadData().expenses;
}

export async function getCategories() {
  return loadData().categories;
}

// Throws away saved data so the next read starts again from the samples.
export function resetSampleData() {
  localStorage.removeItem(STORAGE_KEY);
}

// Saves a new expense. `input` has: amount, categoryId, date, note.
// The new expense is added at the end of the list, the same way a new row is
// added at the bottom of a sheet. Screens sort before showing, so order
// doesn't matter here.
export async function addExpense(input) {
  const data = loadData();
  const expense = {
    id: newId(),
    ...input,
    createdAt: new Date().toISOString(),
  };
  data.expenses.push(expense);
  saveData(data);
  return expense;
}

// Changes an existing expense. It's found by its ID, never by its position:
// in a real sheet, rows can be re-sorted or deleted by hand at any time.
export async function updateExpense(id, changes) {
  const data = loadData();
  const expense = data.expenses.find((item) => item.id === id);
  if (!expense) {
    throw new Error("This expense no longer exists. It may have been deleted.");
  }
  Object.assign(expense, changes); // copy the changed fields onto the expense
  saveData(data);
  return expense;
}

// Removes an expense, found by its ID.
export async function deleteExpense(id) {
  const data = loadData();
  const remaining = data.expenses.filter((item) => item.id !== id);
  if (remaining.length === data.expenses.length) {
    throw new Error("This expense no longer exists. It may have been deleted.");
  }
  data.expenses = remaining;
  saveData(data);
}
