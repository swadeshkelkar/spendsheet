// Categories and settings, stored in the Categories and Settings tabs of this
// year's spreadsheet (expenses are in expenses.js).
//
//   Categories:  ID | Name | Color | Active
//   Settings:    Setting | Value
//
// Both tabs may be edited by hand, so we always read fresh, and find rows by
// name rather than by where they were last time.

import { googleFetch } from "../lib/google.js";
import { CURRENCIES } from "../lib/money.js";
import {
  categoryToRow,
  rowsToCategories,
  rowsToSettings,
  slugify,
  uniqueId,
} from "../lib/sheetRows.js";
import { CATEGORY_COLORS, DEFAULT_SETTINGS } from "./defaults.js";
import { SHEETS, getSpreadsheet } from "./spreadsheet.js";

// Re-exported so screens can keep importing them from here.
export { CATEGORY_COLORS, DEFAULT_CATEGORIES } from "./defaults.js";

const CURRENCY_CODES = CURRENCIES.map((currency) => currency.code);

function valuesUrl(spreadsheetId, range) {
  return `${SHEETS}/${spreadsheetId}/values/${encodeURIComponent(range)}`;
}

// ---------- Reading ----------

// Reads both tabs in one request (batchGet = several ranges at once), and
// shares a read that's already running, the same way getExpenses does.
// Returns { categories, settings, categoryRows, settingRows }; the raw rows
// are kept so the functions below can find which row to change.
let loading = null;

function loadBasics() {
  if (loading === null) {
    loading = readBasics().finally(() => {
      loading = null;
    });
  }
  return loading;
}

async function readBasics() {
  const sheet = await getSpreadsheet();
  const params = new URLSearchParams({ valueRenderOption: "UNFORMATTED_VALUE" });
  params.append("ranges", "Categories!A:D");
  params.append("ranges", "Settings!A:B");
  const result = await googleFetch(`${SHEETS}/${sheet.id}/values:batchGet?${params}`);

  // One entry per range, in the order asked. slice(1) skips each header row.
  const [categoryRange, settingRange] = result.valueRanges;
  const categoryRows = (categoryRange.values || []).slice(1);
  const settingRows = (settingRange.values || []).slice(1);
  return {
    sheet,
    categoryRows,
    settingRows,
    categories: rowsToCategories(categoryRows, CATEGORY_COLORS),
    settings: rowsToSettings(settingRows, DEFAULT_SETTINGS, CURRENCY_CODES),
  };
}

export async function getCategories() {
  return (await loadBasics()).categories;
}

export async function getSettings() {
  return (await loadBasics()).settings;
}

// ---------- Categories ----------

// The sheet row of a category, found by name (case ignored), or null.
// categoryRows has no header, so categoryRows[i] is sheet row i + 2.
function findCategoryRow(categoryRows, name) {
  const index = categoryRows.findIndex(
    (row) => String(row[1] ?? "").trim().toLowerCase() === name.toLowerCase(),
  );
  return index === -1 ? null : index + 2;
}

// Adds a category, e.g. addCategory({ name: "Eating out", color: "rose" }).
export async function addCategory({ name, color }) {
  const cleanName = name.trim();
  if (cleanName === "") {
    throw new Error("Give the category a name.");
  }

  const { sheet, categories, categoryRows } = await loadBasics();
  const sameName = categories.find(
    (category) => category.name.toLowerCase() === cleanName.toLowerCase(),
  );
  if (sameName && sameName.active) {
    throw new Error(`You already have a category called ${sameName.name}.`);
  }

  if (sameName) {
    // It was removed before. Bring it back, so its old expenses rejoin it:
    // change its Color and Active cells (columns C and D) in place.
    const row = findCategoryRow(categoryRows, sameName.name);
    await googleFetch(`${valuesUrl(sheet.id, `Categories!C${row}:D${row}`)}?valueInputOption=RAW`, {
      method: "PUT",
      body: { values: [[color, "TRUE"]] },
    });
    return { ...sameName, color, active: true };
  }

  const category = {
    id: uniqueId(slugify(cleanName), categories),
    name: cleanName,
    color,
    active: true,
  };
  // Added at the bottom of the tab. The app still shows Other last.
  await googleFetch(`${valuesUrl(sheet.id, "Categories!A:D")}:append?valueInputOption=RAW`, {
    method: "POST",
    body: { values: [categoryToRow(category)] },
  });
  return category;
}

// Removes a category from the choices by setting Active to FALSE. Its row
// stays, so past expenses keep their category. "Other" can't be removed,
// because it's where anything without a valid category ends up.
export async function removeCategory(id) {
  if (id === "other") {
    throw new Error("Other can't be removed.");
  }
  const { sheet, categories, categoryRows } = await loadBasics();
  const category = categories.find((item) => item.id === id);
  const row = category ? findCategoryRow(categoryRows, category.name) : null;
  if (row === null) {
    throw new Error("This category no longer exists.");
  }
  await googleFetch(`${valuesUrl(sheet.id, `Categories!D${row}`)}?valueInputOption=RAW`, {
    method: "PUT",
    body: { values: [["FALSE"]] },
  });
}

// ---------- Settings ----------

// The label each setting has in column A of the Settings tab.
const SETTING_LABELS = { currency: "Currency" };

// Changes some settings, e.g. updateSettings({ currency: "USD" }).
export async function updateSettings(changes) {
  const { sheet, settings, settingRows } = await loadBasics();

  for (const [key, value] of Object.entries(changes)) {
    const label = SETTING_LABELS[key];
    const index = settingRows.findIndex(
      (row) => String(row[0] ?? "").trim().toLowerCase() === label.toLowerCase(),
    );
    if (index === -1) {
      // No row for it yet (say it was deleted by hand): add one.
      await googleFetch(`${valuesUrl(sheet.id, "Settings!A:B")}:append?valueInputOption=RAW`, {
        method: "POST",
        body: { values: [[label, value]] },
      });
    } else {
      const row = index + 2; // + 1 for the header, + 1 because rows count from 1
      await googleFetch(`${valuesUrl(sheet.id, `Settings!B${row}`)}?valueInputOption=RAW`, {
        method: "PUT",
        body: { values: [[value]] },
      });
    }
  }
  return { ...settings, ...changes };
}
