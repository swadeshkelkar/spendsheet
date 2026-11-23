import { useEffect, useState } from "react";
import { getExpensesForMonth } from "../data/expenses.js";
import { getYearFiles } from "../data/spreadsheet.js";
import { getCategories, getSettings } from "../data/store.js";

// Loads what History shows for one month, like useSpendingData does for
// Summary: again when the month changes, when you come back to the app, and
// on "Try again".
//
// Returns { data, error, retry }:
//   data: { month, expenses, categories, currency, files }, or null until the
//         first load. `month` says which month it's for: right after you pick
//         another month, data is still the old one until the new one arrives.
//   files: your yearly files, for the dropdowns (see getYearFiles)
export function useMonthData(month) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true; // false once this month's screen is gone (see useSpendingData)

    function load() {
      Promise.all([
        getExpensesForMonth(month),
        getCategories(),
        getSettings(),
        getYearFiles(),
      ])
        .then(([expenses, categories, settings, files]) => {
          if (!active) return;
          setData({
            month,
            expenses,
            categories,
            currency: settings.currency,
            files,
          });
          setError("");
        })
        .catch((problem) => {
          if (active) setError(problem.message);
        });
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") load();
    }

    load();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [month, attempt]); // month: a different month was picked

  return { data, error, retry: () => setAttempt((count) => count + 1) };
}
