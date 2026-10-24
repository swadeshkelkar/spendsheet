// Small helpers for calendar dates written as "YYYY-MM-DD" strings.
//
// Why strings and not Date objects? A Date is a moment in time, and turning it
// into a day depends on the time zone. For example, new Date().toISOString()
// uses UTC, so before 5:30 AM in India it would give *yesterday's* date.
// These helpers always use the local calendar day.

// Adds a leading zero: 7 → "07"
function pad(n) {
  return String(n).padStart(2, "0");
}

// Date object → "2026-10-24" (local day)
export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Today's date, e.g. "2026-10-24"
export function todayISO() {
  return toISODate(new Date());
}

// "2026-10-24" → a Date at local midnight
export function parseISODate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day); // months are 0-based in JavaScript
}

// addDays("2026-10-24", -3) → "2026-10-21"
export function addDays(iso, days) {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days); // handles month and year boundaries for us
  return toISODate(date);
}
