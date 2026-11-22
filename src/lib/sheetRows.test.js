import { describe, expect, it } from "vitest";
import {
  expenseToRow,
  isoToSerial,
  parseAmount,
  parseDate,
  rowToExpense,
  serialToISO,
} from "./sheetRows.js";

const categories = [
  { id: "food", name: "Food" },
  { id: "eating-out", name: "Eating out" },
  { id: "other", name: "Other" },
];

describe("serial dates", () => {
  it("converts both ways", () => {
    expect(isoToSerial("2026-10-30")).toBe(46325);
    expect(serialToISO(46325)).toBe("2026-10-30");
    expect(serialToISO(isoToSerial("2028-02-29"))).toBe("2028-02-29");
  });

  it("ignores a time of day", () => {
    expect(serialToISO(46325.75)).toBe("2026-10-30"); // 6 pm the same day
  });
});

describe("parseDate", () => {
  it("reads real dates and text dates", () => {
    expect(parseDate(46325)).toBe("2026-10-30");
    expect(parseDate("2026-10-30")).toBe("2026-10-30");
    expect(parseDate(" 30/10/2026 ")).toBe("2026-10-30");
    expect(parseDate("5.1.2026")).toBe("2026-01-05"); // day first, as in India
  });

  it("rejects things that aren't dates", () => {
    expect(parseDate("31/02/2026")).toBe(null);
    expect(parseDate("yesterday")).toBe(null);
    expect(parseDate("")).toBe(null);
    expect(parseDate(undefined)).toBe(null);
  });
});

describe("parseAmount", () => {
  it("reads numbers and money text", () => {
    expect(parseAmount(1240)).toBe(1240);
    expect(parseAmount("₹1,240.50")).toBe(1240.5);
    expect(parseAmount("Rs. 99")).toBe(99);
    expect(parseAmount(10.456)).toBe(10.46);
  });

  it("rejects empty, zero and negative amounts", () => {
    expect(parseAmount("")).toBe(null);
    expect(parseAmount(0)).toBe(null);
    expect(parseAmount(-5)).toBe(null);
    expect(parseAmount("abc")).toBe(null);
  });
});

describe("rowToExpense", () => {
  it("reads a row the app wrote", () => {
    const row = ["id-1", 46325, 1240, "Food", "Groceries", "2026-10-30T09:00:00Z"];
    expect(rowToExpense(row, categories)).toEqual({
      id: "id-1",
      date: "2026-10-30",
      amount: 1240,
      categoryId: "food",
      note: "Groceries",
      createdAt: "2026-10-30T09:00:00Z",
    });
  });

  it("reads a short row typed by hand", () => {
    const expense = rowToExpense(["", "30/10/2026", "₹250", "eating out"], categories);
    expect(expense.id).toBe(""); // the caller gives it an ID
    expect(expense.categoryId).toBe("eating-out");
    expect(expense.note).toBe("");
  });

  it("uses Other for an unknown or empty category", () => {
    expect(rowToExpense(["a", 46325, 10, "Pets"], categories).categoryId).toBe("other");
    expect(rowToExpense(["a", 46325, 10, ""], categories).categoryId).toBe("other");
  });

  it("skips empty rows and rows without a usable date or amount", () => {
    expect(rowToExpense([], categories)).toBe(null);
    expect(rowToExpense(["", "", ""], categories)).toBe(null);
    expect(rowToExpense(["a", "someday", 10], categories)).toBe(null);
    expect(rowToExpense(["a", 46325, "free"], categories)).toBe(null);
  });
});

describe("expenseToRow", () => {
  it("writes the category name and a serial date", () => {
    const expense = {
      id: "id-1",
      date: "2026-10-30",
      amount: 1240,
      categoryId: "eating-out",
      note: "Dinner",
      createdAt: "2026-10-30T09:00:00Z",
    };
    expect(expenseToRow(expense, categories)).toEqual([
      "id-1",
      46325,
      1240,
      "Eating out",
      "Dinner",
      "2026-10-30T09:00:00Z",
    ]);
  });
});
