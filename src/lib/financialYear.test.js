// Tests for YOUR functions in financialYear.js.
// They all fail until you write the code. Run  npm test  and make them pass.

import { describe, expect, it } from "vitest";
import { getFinancialYear, sheetFileName } from "./financialYear.js";

describe("getFinancialYear, April start (India)", () => {
  it("April to December belong to the year that started that April", () => {
    expect(getFinancialYear("2026-10-31", 4)).toBe("FY 2026-27");
    expect(getFinancialYear("2026-04-01", 4)).toBe("FY 2026-27"); // first day
    expect(getFinancialYear("2026-12-31", 4)).toBe("FY 2026-27");
  });

  it("January to March belong to the year that started the April before", () => {
    expect(getFinancialYear("2027-01-01", 4)).toBe("FY 2026-27");
    expect(getFinancialYear("2027-03-31", 4)).toBe("FY 2026-27"); // last day
    expect(getFinancialYear("2026-03-31", 4)).toBe("FY 2025-26");
  });

  it("keeps two digits for the second year", () => {
    expect(getFinancialYear("2008-05-01", 4)).toBe("FY 2008-09"); // not "2008-9"
    expect(getFinancialYear("2099-06-01", 4)).toBe("FY 2099-00"); // not "2099-100"
  });
});

describe("getFinancialYear, January start (calendar year)", () => {
  it("is just the year", () => {
    expect(getFinancialYear("2026-01-01", 1)).toBe("2026");
    expect(getFinancialYear("2026-10-31", 1)).toBe("2026");
    expect(getFinancialYear("2026-12-31", 1)).toBe("2026");
  });
});

describe("sheetFileName", () => {
  it("puts Spendsheet in front of the financial year", () => {
    expect(sheetFileName("2026-10-31", 4)).toBe("Spendsheet FY 2026-27");
    expect(sheetFileName("2027-02-14", 4)).toBe("Spendsheet FY 2026-27");
    expect(sheetFileName("2026-10-31", 1)).toBe("Spendsheet 2026");
  });
});
