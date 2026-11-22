// Starting values, shared by the browser store and the spreadsheet setup.

// Categories every new user starts with. "Other" is the fallback and stays last.
export const DEFAULT_CATEGORIES = [
  { id: "food", name: "Food", color: "teal", active: true },
  { id: "transport", name: "Transport", color: "purple", active: true },
  { id: "shopping", name: "Shopping", color: "orange", active: true },
  { id: "bills", name: "Bills", color: "blue", active: true },
  { id: "health", name: "Health", color: "ochre", active: true },
  { id: "other", name: "Other", color: "gray", active: true },
];

// The colors a category can use. Each one matches --cat-<color> in theme.css.
export const CATEGORY_COLORS = [
  "teal",
  "blue",
  "orange",
  "purple",
  "ochre",
  "rose",
  "cyan",
  "gray",
];

// Settings every new user starts with.
//   currency: an ISO currency code, e.g. "INR" or "USD"
// (The financial-year start is saved in Google Drive; see spreadsheet.js.)
export const DEFAULT_SETTINGS = { currency: "INR" };
