import { describe, expect, it } from "vitest";
import { byCategory, groupByDay, inMonth, total } from "./summary.js";

// A few made-up expenses to test with. Tests use small, fixed data like this,
// so the right answer is easy to work out by hand.
const expenses = [
  { id: "a", date: "2026-10-24", amount: 100, categoryId: "food", createdAt: "1" },
  { id: "b", date: "2026-10-24", amount: 50, categoryId: "bills", createdAt: "2" },
  { id: "c", date: "2026-10-20", amount: 250, categoryId: "food", createdAt: "3" },
  { id: "d", date: "2026-09-30", amount: 999, categoryId: "food", createdAt: "4" },
];

const categories = [
  { id: "food", name: "Food", color: "teal" },
  { id: "bills", name: "Bills", color: "blue" },
];

describe("inMonth and total", () => {
  it("keeps one month and adds it up", () => {
    const october = inMonth(expenses, "2026-10");
    expect(october.map((expense) => expense.id)).toEqual(["a", "b", "c"]);
    expect(total(october)).toBe(400);
  });

  it("totals nothing as 0", () => {
    expect(total([])).toBe(0);
  });
});

describe("groupByDay", () => {
  it("puts expenses on the same day together, with a total", () => {
    const days = groupByDay(inMonth(expenses, "2026-10"));
    expect(days.map((day) => [day.date, day.items.length, day.total])).toEqual([
      ["2026-10-24", 2, 150],
      ["2026-10-20", 1, 250],
    ]);
  });
});

describe("byCategory", () => {
  it("adds up per category, biggest first, with percentages", () => {
    const rows = byCategory(inMonth(expenses, "2026-10"), categories);
    expect(rows).toEqual([
      { id: "food", name: "Food", color: "teal", amount: 350, percent: 88 },
      { id: "bills", name: "Bills", color: "blue", amount: 50, percent: 13 },
    ]);
  });

  it("shows a missing category as Unknown", () => {
    const rows = byCategory([{ amount: 10, categoryId: "gone" }], categories);
    expect(rows[0].name).toBe("Unknown");
  });
});
