import { describe, expect, it } from "vitest";
import { addDays, monthKey, shiftMonth } from "./dates.js";

describe("addDays", () => {
  it("moves within a month", () => {
    expect(addDays("2026-10-24", -3)).toBe("2026-10-21");
  });

  it("crosses month and year boundaries", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("knows about leap years", () => {
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
  });
});

describe("monthKey", () => {
  it("keeps the year and month", () => {
    expect(monthKey("2026-10-24")).toBe("2026-10");
  });
});

describe("shiftMonth", () => {
  it("moves back and forward", () => {
    expect(shiftMonth("2026-10", -1)).toBe("2026-09");
    expect(shiftMonth("2026-10", 1)).toBe("2026-11");
  });

  it("crosses year boundaries", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
});
