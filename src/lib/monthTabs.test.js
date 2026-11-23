import { describe, expect, it } from "vitest";
import {
  monthTabFormula,
  monthTabId,
  monthTabIndex,
  monthTabTitle,
  titleToMonthKey,
} from "./monthTabs.js";

describe("month tab names", () => {
  it("turns a month key into a title and back", () => {
    expect(monthTabTitle("2026-11")).toBe("Nov 2026");
    expect(monthTabTitle("2027-01")).toBe("Jan 2027");
    expect(titleToMonthKey("Nov 2026")).toBe("2026-11");
  });

  it("ignores tabs that aren't month tabs", () => {
    expect(titleToMonthKey("Expenses")).toBe(null);
    expect(titleToMonthKey("Foo 2026")).toBe(null);
    expect(titleToMonthKey("Nov 2026 copy")).toBe(null);
  });

  it("gives each month a fixed tab number", () => {
    expect(monthTabId("2026-11")).toBe(202611);
  });
});

describe("monthTabIndex", () => {
  const fixed = [
    { title: "Expenses", index: 0 },
    { title: "Categories", index: 1 },
    { title: "Settings", index: 2 },
  ];

  it("puts the first month tab after the fixed tabs", () => {
    expect(monthTabIndex(fixed, "2026-11")).toBe(3);
  });

  it("keeps month tabs newest first", () => {
    const tabs = [
      ...fixed,
      { title: "Dec 2026", index: 3 },
      { title: "Oct 2026", index: 4 },
      { title: "Sep 2026", index: 5 },
    ];
    expect(monthTabIndex(tabs, "2027-01")).toBe(3); // newest: before Dec
    expect(monthTabIndex(tabs, "2026-11")).toBe(4); // between Dec and Oct
    expect(monthTabIndex(tabs, "2026-04")).toBe(6); // oldest: at the end
  });
});

describe("monthTabFormula", () => {
  it("filters the Expenses tab by month", () => {
    expect(monthTabFormula("2026-11")).toBe(
      '=IFERROR(SORT(FILTER(Expenses!B2:E, TEXT(Expenses!B2:B, "yyyy-mm") = "2026-11"), 1, TRUE), "")',
    );
  });
});
