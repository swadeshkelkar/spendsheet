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

// "2026-10-24" → "2026-10" (the month an expense belongs to)
export function monthKey(iso) {
  return iso.slice(0, 7);
}

// "2026-10" → "October 2026"
export function monthLabel(key) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

// A heading for one day in the History list:
// "Today · 24 Oct", "Yesterday · 23 Oct", or "Wed · 21 Oct"
export function dayLabel(iso) {
  const date = parseISODate(iso);
  const dayAndMonth = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const today = todayISO();

  if (iso === today) return `Today · ${dayAndMonth}`;
  if (iso === addDays(today, -1)) return `Yesterday · ${dayAndMonth}`;

  const weekday = date.toLocaleDateString("en-IN", { weekday: "short" });
  return `${weekday} · ${dayAndMonth}`;
}
