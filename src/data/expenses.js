// Expenses, stored in the Expenses tab of each year's spreadsheet.
//
//   ID | Date | Amount | Category | Note | Created at
//
// Rows can be in any order and may be typed, edited or deleted by hand in
// Google Sheets. So we always read fresh, and find a row by its ID, never by
// where it was last time.

import { googleFetch } from "../lib/google.js";
import { expenseToRow, rowToExpense } from "../lib/sheetRows.js";
import {
  SHEETS,
  ensureMonthTab,
  getSpreadsheet,
  getSpreadsheetForDate,
  getTabId,
} from "./spreadsheet.js";
import { getCategories } from "./store.js";

const MISSING = "This expense no longer exists. It may have been deleted.";

// Ask for raw values: numbers as numbers, dates as serial numbers, so we
// don't have to undo the sheet's formatting ("1,240.00", "30 Oct 2026").
const RAW_VALUES = "valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER";

// The address for a range of cells, e.g. valuesUrl(id, "Expenses!A2:F").
// encodeURIComponent makes "!" and ":" safe to put in a URL.
function valuesUrl(spreadsheetId, range) {
  return `${SHEETS}/${spreadsheetId}/values/${encodeURIComponent(range)}`;
}

function newId() {
  return crypto.randomUUID();
}

// Adds the month's view tab if it's missing. Not waited for: the expense is
// already saved, so a problem here only means the tab appears another time.
function addMonthTab(spreadsheetId, isoDate) {
  ensureMonthTab(spreadsheetId, isoDate).catch((problem) => {
    console.warn("Couldn't add the month's tab:", problem.message);
  });
}

// Every row of the Expenses tab, including the header, as arrays of cells.
async function readRows(spreadsheetId) {
  const result = await googleFetch(
    `${valuesUrl(spreadsheetId, "Expenses!A:F")}?${RAW_VALUES}`,
  );
  return result.values || []; // "values" is missing when the tab is empty
}

// ---------- Reading ----------

// This financial year's expenses.
//
// If a load is already running, everyone asking gets that same one instead of
// starting another. Two loads at once would each give hand-typed rows a
// different new ID, and the second write would undo the first.
let loading = null;

export function getExpenses() {
  if (loading === null) {
    // finally runs when it's done, whether it worked or not.
    loading = loadExpenses().finally(() => {
      loading = null;
    });
  }
  return loading;
}

async function loadExpenses() {
  const [sheet, categories] = await Promise.all([getSpreadsheet(), getCategories()]);
  const rows = await readRows(sheet.id);

  const expenses = [];
  const seenIds = new Set();
  const newIds = []; // cells to fill in: rows typed by hand have no ID yet

  // slice(1) skips the header. Row numbers in a sheet start at 1, and the
  // header is row 1, so rows[i] is row i + 1.
  rows.slice(1).forEach((row, index) => {
    const expense = rowToExpense(row, categories);
    if (expense === null) return; // blank or unreadable: skip it

    // No ID, or a copy of another row's ID (from copy-pasting a row)?
    // Give it a fresh one, and write that into the sheet below.
    if (expense.id === "" || seenIds.has(expense.id)) {
      expense.id = newId();
      newIds.push({ range: `Expenses!A${index + 2}`, values: [[expense.id]] });
    }
    seenIds.add(expense.id);
    expenses.push(expense);
  });

  if (newIds.length > 0) {
    await googleFetch(`${SHEETS}/${sheet.id}/values:batchUpdate`, {
      method: "POST",
      body: { valueInputOption: "RAW", data: newIds },
    });
  }
  return expenses;
}

// ---------- Writing ----------

// Adds a row at the bottom of the Expenses tab of the year the date is in.
async function appendRow(spreadsheetId, row) {
  await googleFetch(
    `${valuesUrl(spreadsheetId, "Expenses!A:F")}:append?valueInputOption=RAW`,
    { method: "POST", body: { values: [row] } },
  );
}

// Finds an expense's row by ID: { rowNumber, expense }.
async function findExpense(spreadsheetId, id, categories) {
  const rows = await readRows(spreadsheetId);
  const index = rows.findIndex((row) => String(row[0] ?? "").trim() === id);
  if (index < 1) throw new Error(MISSING); // not found (index 0 is the header)
  return { rowNumber: index + 1, expense: rowToExpense(rows[index], categories) };
}

async function deleteRow(spreadsheetId, rowNumber) {
  const tabId = await getTabId(spreadsheetId, "Expenses");
  await googleFetch(`${SHEETS}/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    body: {
      requests: [
        {
          deleteDimension: {
            // Rows counted from 0 here, and the end is not included:
            // row 5 in the sheet is start 4, end 5.
            range: {
              sheetId: tabId,
              dimension: "ROWS",
              startIndex: rowNumber - 1,
              endIndex: rowNumber,
            },
          },
        },
      ],
    },
  });
}

// Saves a new expense. `input` has: amount, categoryId, date, note.
export async function addExpense(input) {
  const categories = await getCategories();
  const expense = {
    id: newId(),
    ...input,
    createdAt: new Date().toISOString(),
  };
  const sheet = await getSpreadsheetForDate(expense.date);
  await appendRow(sheet.id, expenseToRow(expense, categories));
  addMonthTab(sheet.id, expense.date);
  return expense;
}

// Changes an existing expense from this year's sheet.
export async function updateExpense(id, changes) {
  const [sheet, categories] = await Promise.all([getSpreadsheet(), getCategories()]);
  const { rowNumber, expense } = await findExpense(sheet.id, id, categories);
  const updated = { ...expense, ...changes };
  const row = expenseToRow(updated, categories);

  // The new date may be in a different financial year, which is a different file.
  const target = await getSpreadsheetForDate(updated.date);
  if (target.id === sheet.id) {
    await googleFetch(
      `${valuesUrl(sheet.id, `Expenses!A${rowNumber}:F${rowNumber}`)}?valueInputOption=RAW`,
      { method: "PUT", body: { values: [row] } },
    );
  } else {
    // Move it: add it to that year's file first, then remove it here. In that
    // order, a failure halfway leaves a copy rather than losing the expense.
    await appendRow(target.id, row);
    await deleteRow(sheet.id, rowNumber);
  }
  addMonthTab(target.id, updated.date); // the date may now be in a new month
  return updated;
}

// Removes an expense from this year's sheet, found by its ID.
export async function deleteExpense(id) {
  const [sheet, categories] = await Promise.all([getSpreadsheet(), getCategories()]);
  const { rowNumber } = await findExpense(sheet.id, id, categories);
  await deleteRow(sheet.id, rowNumber);
}
