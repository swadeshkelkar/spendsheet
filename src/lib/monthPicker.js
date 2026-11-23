// What History's [Month ▾] [Year ▾] dropdowns can offer.
//
// `files` are your yearly spreadsheets, each with the months it covers:
//   [{ first: "2025-04", last: "2026-03" }, { first: "2026-04", last: "2027-03" }]
// Month keys look like "2026-11", as everywhere else in the app.

import { shiftMonth } from "./dates.js";

// Every month that's in one of your files and isn't in the future, oldest first.
// This month is always included, even before its file is found.
export function availableMonths(files, thisMonth) {
  const months = new Set([thisMonth]); // a Set ignores duplicates
  for (const file of files) {
    // "2026-03" <= "2026-11" compares correctly as text: fixed-shape keys.
    for (
      let key = file.first;
      key <= file.last && key <= thisMonth;
      key = shiftMonth(key, 1)
    ) {
      months.add(key);
    }
  }
  return [...months].sort(); // [...set] turns a Set back into a list
}

// The years those months are in, newest first: ["2026", "2025"]
export function yearsIn(months) {
  const years = new Set(months.map((key) => key.slice(0, 4)));
  return [...years].sort().reverse();
}

// After choosing a different year: the same month in that year if possible
// (March stays March), otherwise the closest month that year has.
// preferredMonth is two digits, e.g. "03".
export function monthInYear(months, year, preferredMonth) {
  const inYear = months.filter((key) => key.startsWith(`${year}-`));
  if (inYear.length === 0) return null;

  const distance = (key) =>
    Math.abs(Number(key.slice(5)) - Number(preferredMonth));
  // reduce keeps whichever month is closer so far.
  return inYear.reduce((best, key) =>
    distance(key) < distance(best) ? key : best,
  );
}
