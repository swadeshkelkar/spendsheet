import { describe, expect, it } from "vitest";
import {
  categoryToRow,
  expenseToRow,
  isoToSerial,
  parseAmount,
  parseDate,
  rowToExpense,
  rowsToCategories,
  rowsToSettings,
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

describe("rowsToCategories", () => {
  const colors = ["teal", "blue", "gray"];

  it("reads rows the app wrote", () => {
    const rows = [
      ["food", "Food", "teal", "TRUE"],
      ["bills", "Bills", "blue", "FALSE"],
      ["other", "Other", "gray", "TRUE"],
    ];
    expect(rowsToCategories(rows, colors)).toEqual([
      { id: "food", name: "Food", color: "teal", active: true },
      { id: "bills", name: "Bills", color: "blue", active: false },
      { id: "other", name: "Other", color: "gray", active: true },
    ]);
  });

  it("accepts a row with only a name, typed by hand", () => {
    const [pets] = rowsToCategories([["", " Pet care "]], colors);
    expect(pets).toEqual({ id: "pet-care", name: "Pet care", color: "gray", active: true });
  });

  it("reads a FALSE typed into the sheet", () => {
    expect(rowsToCategories([["a", "A", "teal", false]], colors)[0].active).toBe(false);
  });

  it("skips rows without a name, and repeated names", () => {
    const rows = [["x", "", "teal"], ["f1", "Food"], ["f2", "food"]];
    const names = rowsToCategories(rows, colors).map((category) => category.id);
    expect(names).toEqual(["f1", "other"]);
  });

  it("keeps IDs unique", () => {
    const rows = [["", "Eating out"], ["", "Eating-out!"]];
    const ids = rowsToCategories(rows, colors).map((category) => category.id);
    expect(ids).toEqual(["eating-out", "eating-out-2", "other"]);
  });

  it("always has an active Other, last", () => {
    const rows = [["other", "Other", "gray", "FALSE"], ["food", "Food"]];
    const result = rowsToCategories(rows, colors);
    expect(result.map((category) => category.id)).toEqual(["food", "other"]);
    expect(result[1].active).toBe(true);
    expect(rowsToCategories([], colors)).toEqual([
      { id: "other", name: "Other", color: "gray", active: true },
    ]);
  });
});

describe("categoryToRow", () => {
  it("writes Active as text", () => {
    const category = { id: "food", name: "Food", color: "teal", active: false };
    expect(categoryToRow(category)).toEqual(["food", "Food", "teal", "FALSE"]);
  });
});

describe("rowsToSettings", () => {
  const defaults = { currency: "INR" };

  it("reads the currency, in any case", () => {
    expect(rowsToSettings([["currency", " usd "]], defaults, ["INR", "USD"])).toEqual({
      currency: "USD",
    });
  });

  it("keeps the default for an unknown currency or an empty tab", () => {
    expect(rowsToSettings([["Currency", "XYZ"]], defaults, ["INR"])).toEqual(defaults);
    expect(rowsToSettings([], defaults, ["INR"])).toEqual(defaults);
  });
});
