import { useEffect, useState } from "react";
import { getExpenses } from "../data/expenses.js";
import { getSpreadsheet } from "../data/spreadsheet.js";
import { getCategories, getSettings } from "../data/store.js";

// A custom hook: a function that uses React's hooks, so screens can share it.
// It loads what History and Summary show, and loads again whenever you come
// back to the app, so changes you made in the spreadsheet appear.
//
// Returns { data, error, retry }:
//   data:  { expenses, categories, currency, sheet }, or null until the first load
//          (sheet is this year's spreadsheet: { year, fyStartMonth, ... })
//   error: a message if the last load failed, otherwise ""
//   retry: a function that loads again (for a "Try again" button)
export function useSpendingData() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  // Changing this number re-runs the effect below, which loads again.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Set to false when the screen closes. A load that finishes after that
    // is ignored, instead of updating a screen that's gone.
    let active = true;

    function load() {
      // getSpreadsheet() is remembered after the first time, so it's instant here.
      Promise.all([getExpenses(), getCategories(), getSettings(), getSpreadsheet()])
        .then(([expenses, categories, settings, sheet]) => {
          if (!active) return;
          setData({ expenses, categories, currency: settings.currency, sheet });
          setError("");
        })
        .catch((problem) => {
          if (active) setError(problem.message);
        });
    }

    // "visibilitychange" fires when you switch tabs or apps; "visible" means
    // you've just come back to Spendsheet.
    function handleVisibility() {
      if (document.visibilityState === "visible") load();
    }

    load();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [attempt]);

  return { data, error, retry: () => setAttempt((count) => count + 1) };
}
