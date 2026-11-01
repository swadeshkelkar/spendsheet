// Tests for money.js. Run them with:  npm test
//
// describe() groups related tests. Each it() is one test: it calls a function
// and uses expect(...) to say what the answer must be. If any expect is wrong,
// that test fails and Vitest shows what it got instead.

import { describe, expect, it } from "vitest";
import {
  currencySymbol,
  formatAmountInput,
  formatMoney,
  pressKey,
} from "./money.js";

describe("formatMoney", () => {
  it("uses Indian grouping for rupees", () => {
    expect(formatMoney(1240)).toBe("₹1,240");
    expect(formatMoney(100000)).toBe("₹1,00,000");
  });

  it("shows decimals only when there are some", () => {
    expect(formatMoney(1240.5)).toBe("₹1,240.5");
    expect(formatMoney(99.99)).toBe("₹99.99");
  });

  it("uses normal grouping for other currencies", () => {
    expect(formatMoney(100000, "USD")).toBe("$100,000");
  });
});

describe("currencySymbol", () => {
  it("matches the symbol formatMoney shows", () => {
    // Every currency in the list, so a wrong symbol can't slip in.
    for (const code of ["INR", "USD", "EUR", "GBP", "AUD", "CAD"]) {
      expect(formatMoney(5, code).startsWith(currencySymbol(code))).toBe(true);
    }
  });
});

describe("pressKey", () => {
  it("adds digits", () => {
    expect(pressKey("12", "3")).toBe("123");
  });

  it("replaces a leading 0", () => {
    expect(pressKey("0", "5")).toBe("5");
  });

  it("allows only one decimal point", () => {
    expect(pressKey("12.5", ".")).toBe("12.5");
    expect(pressKey("", ".")).toBe("0.");
  });

  it("allows at most 2 decimals", () => {
    expect(pressKey("12.50", "1")).toBe("12.50");
  });

  it("removes the last character on back", () => {
    expect(pressKey("123", "back")).toBe("12");
    expect(pressKey("", "back")).toBe("");
  });
});

describe("formatAmountInput", () => {
  it("groups while typing", () => {
    expect(formatAmountInput("125000")).toBe("1,25,000");
    expect(formatAmountInput("125000", "USD")).toBe("125,000");
    expect(formatAmountInput("1240.")).toBe("1,240.");
    expect(formatAmountInput("")).toBe("0");
  });
});
