// The monthly view tabs in each year's spreadsheet: "Nov 2026", "Oct 2026", ...
//
// Each one is a live view of the Expenses tab: a formula picks that month's
// rows and sorts them by date, so editing Expenses updates it automatically.
// Month keys look like "2026-11", as everywhere else in the app.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-11" → "Nov 2026"
export function monthTabTitle(key) {
  const [year, month] = key.split("-").map(Number);
  return `${MONTHS[month - 1]} ${year}`;
}

// "Nov 2026" → "2026-11", or null if the title isn't a month tab's.
export function titleToMonthKey(title) {
  const match = title.match(/^([A-Z][a-z]{2}) (\d{4})$/);
  const month = match ? MONTHS.indexOf(match[1]) + 1 : 0; // indexOf gives -1 if not found
  if (month === 0) return null;
  return `${match[2]}-${String(month).padStart(2, "0")}`;
}

// Each tab has an internal number. Giving a month's tab a fixed one,
// "2026-11" → 202611, means we know it without asking the sheet.
export function monthTabId(key) {
  const [year, month] = key.split("-").map(Number);
  return year * 100 + month;
}

// Where a new month's tab goes, so month tabs stay newest first after the
// Expenses, Categories and Settings tabs. `tabs` is [{ title, index }, ...].
export function monthTabIndex(tabs, key) {
  // Month tabs older than the new one, leftmost first. "2026-09" < "2026-11"
  // compares correctly as text, because the keys have a fixed shape.
  const older = tabs
    .filter((tab) => {
      const tabKey = titleToMonthKey(tab.title);
      return tabKey !== null && tabKey < key;
    })
    .sort((a, b) => a.index - b.index);
  // Just before the newest of the older months; or, if there's none, at the end.
  return older.length > 0 ? older[0].index : tabs.length;
}

// The formula that fills a month's tab, from cell A2 down:
//   FILTER keeps the Expenses rows (columns B to E: Date, Amount, Category,
//   Note) whose date is in that month. SORT orders them by the first of those
//   columns (the date), oldest first. IFERROR shows nothing instead of an
//   error when the month has no expenses (say, after deleting them all).
export function monthTabFormula(key) {
  return `=IFERROR(SORT(FILTER(Expenses!B2:E, TEXT(Expenses!B2:B, "yyyy-mm") = "${key}"), 1, TRUE), "")`;
}
