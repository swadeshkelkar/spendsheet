// Categories and settings, kept in the browser (localStorage) for now.
// Step 13c moves them into the spreadsheet too. Expenses already live in
// the spreadsheet: see expenses.js.
//
// The functions are `async` because reading a Google Sheet takes time, so
// moving these to Sheets won't change the screens.

import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from "./defaults.js";

// Re-exported so screens can keep importing them from here.
export { CATEGORY_COLORS, DEFAULT_CATEGORIES } from "./defaults.js";

// The key our data is saved under in localStorage.
const STORAGE_KEY = "spendsheet:data";

// Reads our data from localStorage, starting from the defaults the first time.
// (Older versions also saved sample expenses here; they're simply ignored.)
function loadData() {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  return {
    // Copies, so changing a category never changes the defaults themselves.
    categories:
      saved.categories || DEFAULT_CATEGORIES.map((category) => ({ ...category })),
    settings: { ...DEFAULT_SETTINGS, ...saved.settings },
  };
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); // object → text
}

// ---------- What the screens use ----------

export async function getCategories() {
  return loadData().categories;
}

// "Eating out" → "eating-out". Lowercase letters and digits, joined by "-".
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // anything else becomes "-"
    .replace(/^-|-$/g, ""); // no "-" at the start or end
}

// Adds a category, e.g. addCategory({ name: "Eating out", color: "rose" }).
// Its ID is made from the name, so it stays readable in the sheet.
export async function addCategory({ name, color }) {
  const data = loadData();
  const cleanName = name.trim();
  if (cleanName === "") {
    throw new Error("Give the category a name.");
  }

  // Names are compared ignoring case: "food" and "Food" are the same.
  const sameName = data.categories.find(
    (category) => category.name.toLowerCase() === cleanName.toLowerCase(),
  );
  if (sameName && sameName.active) {
    throw new Error(`You already have a category called ${sameName.name}.`);
  }
  if (sameName) {
    // It was removed before. Bring it back, so its old expenses rejoin it.
    sameName.active = true;
    sameName.color = color;
    saveData(data);
    return sameName;
  }

  // Make sure the ID isn't taken: "gifts", then "gifts-2", "gifts-3", ...
  const base = slugify(cleanName) || "category"; // e.g. a name with no a–z letters
  let id = base;
  let number = 2;
  while (data.categories.some((category) => category.id === id)) {
    id = `${base}-${number}`;
    number += 1;
  }

  const category = { id, name: cleanName, color, active: true };
  // Insert it just before "Other", so Other stays last.
  const otherIndex = data.categories.findIndex((item) => item.id === "other");
  const position = otherIndex === -1 ? data.categories.length : otherIndex;
  data.categories.splice(position, 0, category);
  saveData(data);
  return category;
}

// Removes a category from the choices. It isn't deleted: past expenses still
// point to it and keep showing its name and color. "Other" can't be removed,
// because it's where anything without a valid category ends up.
export async function removeCategory(id) {
  if (id === "other") {
    throw new Error("Other can't be removed.");
  }
  const data = loadData();
  const category = data.categories.find((item) => item.id === id);
  if (!category) {
    throw new Error("This category no longer exists.");
  }
  category.active = false;
  saveData(data);
}

export async function getSettings() {
  return loadData().settings;
}

// Changes some settings, e.g. updateSettings({ currency: "USD" }).
// Settings not mentioned stay as they were.
export async function updateSettings(changes) {
  const data = loadData();
  data.settings = { ...data.settings, ...changes };
  saveData(data);
  return data.settings;
}
