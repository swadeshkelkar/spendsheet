// Financial years. Each financial year gets its own spreadsheet, so these
// decide which sheet an expense belongs to, and what that sheet is called.
//
// YOUR TURN: write both functions so that every test in
// financialYear.test.js passes. Run the tests with:  npm test

// Which financial year a date falls in.
//
//   isoDate:    a date as "YYYY-MM-DD", e.g. "2026-10-31"
//   startMonth: the month the financial year starts in: 4 (April) or 1 (January)
//
// Returns:
//   April start:   "FY 2026-27"  (April 2026 to March 2027)
//   January start: "2026"

/*
Get the year and month out of "2026-10-31" the same way shiftMonth does.
With an April start, a date in January to March belongs to the previous year’s FY.
Look closely at the two “two digits” tests. % (remainder) and padStart will help.
sheetFileName can be one line that uses getFinancialYear.
*/
// 2026-10-31", 4 -> FY 2026-27
export function getFinancialYear(isoDate, startMonth) {
  // Delete this line and write your code.
  //console.log(isoDate, startMonth);

  const [year, month] = isoDate.split("-").map(Number);
  if (startMonth === 1) {
    return `${year}`;
  } else if (startMonth === 4) {
    let startYear;
    if (month < startMonth) {
      startYear = year - 1;
      // const secondEntry = year.toString();
      // const result = secondEntry.slice(-2);
      // // console.log(result);
      // return `FY ${year - 1}-${result}`;
    } else {
      startYear = year;
      // const secondEntry = (year + 1).toString();
      // const result = secondEntry.slice(-2);
      // // console.log(result);
      // return `FY ${year}-${result}`;
    }
    const result = (startYear + 1).toString().slice(-2);
    return `FY ${startYear}-${result}`;
  }

  throw new Error(`Unsupported start month: ${startMonth}`);
}

// The spreadsheet's file name: "Spendsheet FY 2026-27" or "Spendsheet 2026".
export function sheetFileName(isoDate, startMonth) {
  const financialYear = getFinancialYear(isoDate, startMonth);
  return `Spendsheet ${financialYear}`;
}
