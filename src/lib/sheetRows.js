// Converting between expense objects and rows in the Expenses tab:
//
//   ID | Date | Amount | Category | Note | Created at
//
// Rows may have been typed or edited by hand in Google Sheets, so reading is
// forgiving: "₹1,240", "24/10/2026" and "food" all work. A row that still
// makes no sense (no usable date or amount) is skipped, never guessed.

// ---------- Dates ----------
// Spreadsheets store a date as a "serial number": the number of days since
// 30 December 1899. So 1 = 31 Dec 1899, and 46325 = 30 Oct 2026.
const SERIAL_START = Date.UTC(1899, 11, 30);
const DAY_MS = 24 * 60 * 60 * 1000;

// 46325 → "2026-10-30"
export function serialToISO(serial) {
  const date = new Date(SERIAL_START + Math.floor(serial) * DAY_MS);
  return date.toISOString().slice(0, 10);
}

// "2026-10-30" → 46325
export function isoToSerial(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return (Date.UTC(year, month - 1, day) - SERIAL_START) / DAY_MS;
}

// Any date we might find in a cell → "YYYY-MM-DD", or null if it isn't one.
// A real date arrives as a serial number. Text that Sheets didn't recognize
// arrives as text: "2026-10-30" or day/month/year like "30/10/2026".
export function parseDate(value) {
  if (typeof value === "number") {
    return value > 0 ? serialToISO(value) : null;
  }

  const text = String(value ?? "").trim();
  let year, month, day;
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); // 2026-10-30
  if (match) {
    [year, month, day] = [match[1], match[2], match[3]].map(Number);
  } else {
    match = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); // 30/10/2026
    if (!match) return null;
    [day, month, year] = [match[1], match[2], match[3]].map(Number);
  }

  // Reject dates that don't exist, like 31/02/2026. Date would quietly roll
  // them over to March, so check that the day and month came out unchanged.
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

// ---------- Amounts ----------

// 1240, "1240", "₹1,240.50", "Rs. 99" → a number above 0, or null.
export function parseAmount(value) {
  let amount;
  if (typeof value === "number") {
    amount = value;
  } else {
    // The first number in the text, with its commas: "Rs. 1,240.50" → "1,240.50".
    // (Not simply "remove everything but digits and dots": the dot in "Rs."
    // would turn 99 into .99.)
    const match = String(value ?? "").match(/\d[\d,]*(\.\d+)?/);
    amount = match ? Number(match[0].replaceAll(",", "")) : NaN;
  }
  // NaN > 0 is false, so this also rejects anything that wasn't a number.
  if (!(amount > 0)) return null;
  return Math.round(amount * 100) / 100; // at most 2 decimals
}

// ---------- Categories ----------

// The cell may hold a category's name ("Food") or ID ("food"), in any case.
// Anything else, including an empty cell, counts as "other".
export function findCategoryId(value, categories) {
  const text = String(value ?? "").trim().toLowerCase();
  const category = categories.find(
    (item) => item.name.toLowerCase() === text || item.id === text,
  );
  return category ? category.id : "other";
}

// ---------- Whole rows ----------

function isBlank(cell) {
  return String(cell ?? "").trim() === "";
}

// A row from the sheet → an expense, or null to skip it.
// The ID may be "" for a row typed by hand; the caller gives it one.
export function rowToExpense(row, categories) {
  const [id, date, amount, category, note, createdAt] = row;
  if (row.every(isBlank)) return null; // an empty row

  const isoDate = parseDate(date);
  const parsedAmount = parseAmount(amount);
  if (isoDate === null || parsedAmount === null) return null; // can't use it

  return {
    id: String(id ?? "").trim(),
    date: isoDate,
    amount: parsedAmount,
    categoryId: findCategoryId(category, categories),
    note: String(note ?? "").trim(),
    createdAt: String(createdAt ?? ""),
  };
}

// An expense → a row to write. The category is written as its name, so the
// sheet is easy to read; the date as a serial number, so it's a real date.
export function expenseToRow(expense, categories) {
  const category = categories.find((item) => item.id === expense.categoryId);
  return [
    expense.id,
    isoToSerial(expense.date),
    expense.amount,
    category ? category.name : "Other",
    expense.note,
    expense.createdAt,
  ];
}
