import { describe, expect, it } from "vitest";
import { availableMonths, monthInYear, yearsIn } from "./monthPicker.js";

const files = [
  { first: "2025-04", last: "2026-03" },
  { first: "2026-04", last: "2027-03" },
];

describe("availableMonths", () => {
  it("lists every month in the files, up to this month", () => {
    const months = availableMonths(files, "2026-11");
    expect(months[0]).toBe("2025-04");
    expect(months.at(-1)).toBe("2026-11"); // nothing in the future
    expect(months.length).toBe(20); // Apr 2025 … Nov 2026
  });

  it("always includes this month", () => {
    expect(availableMonths([], "2026-11")).toEqual(["2026-11"]);
  });

  it("doesn't repeat months that two files share", () => {
    const overlapping = [
      { first: "2025-04", last: "2026-03" },
      { first: "2026-01", last: "2026-12" }, // after switching to January years
    ];
    const months = availableMonths(overlapping, "2026-02");
    expect(months.filter((key) => key === "2026-01").length).toBe(1);
  });
});

describe("yearsIn", () => {
  it("lists the years, newest first", () => {
    expect(yearsIn(["2025-04", "2025-12", "2026-01"])).toEqual([
      "2026",
      "2025",
    ]);
  });
});

describe("monthInYear", () => {
  const months = availableMonths(files, "2026-11");

  it("keeps the same month when that year has it", () => {
    expect(monthInYear(months, "2025", "11")).toBe("2025-11");
  });

  it("picks the closest month when it doesn't", () => {
    expect(monthInYear(months, "2025", "01")).toBe("2025-04"); // files start in April
    expect(monthInYear(months, "2026", "12")).toBe("2026-11"); // December is in the future
  });

  it("returns null for a year with no months", () => {
    expect(monthInYear(months, "2020", "05")).toBe(null);
  });
});
