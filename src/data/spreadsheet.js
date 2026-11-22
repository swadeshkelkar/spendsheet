// Finding (or creating) the user's Spendsheet files in Google Drive:
//
//   My Drive
//   └─ Spendsheet                 (folder; also remembers the financial-year start)
//      ├─ Spendsheet FY 2025-26
//      └─ Spendsheet FY 2026-27   ← this year's file: the app reads and writes here
//
// We find our files by hidden labels Drive lets apps attach ("appProperties"),
// not by name, so renaming or moving them in Drive doesn't confuse the app.
// And with the drive.file permission, Drive only ever shows us files we made.

import { todayISO } from "../lib/dates.js";
import { getFinancialYear, sheetFileName } from "../lib/financialYear.js";
import { getSession } from "../lib/auth.js";
import { googleFetch } from "../lib/google.js";
import { CURRENCIES } from "../lib/money.js";
import {
  categoryToRow,
  rowsToCategories,
  rowsToSettings,
} from "../lib/sheetRows.js";
import {
  CATEGORY_COLORS,
  DEFAULT_CATEGORIES,
  DEFAULT_SETTINGS,
} from "./defaults.js";

const DRIVE = "https://www.googleapis.com/drive/v3/files";
export const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets";
const FOLDER_TYPE = "application/vnd.google-apps.folder";
const SPREADSHEET_TYPE = "application/vnd.google-apps.spreadsheet";

// The tabs in every year's file, and their header rows.
export const EXPENSE_HEADERS = [
  "ID",
  "Date",
  "Amount",
  "Category",
  "Note",
  "Created at",
];
const CATEGORY_HEADERS = ["ID", "Name", "Color", "Active"];
const SETTINGS_HEADERS = ["Setting", "Value"];

// ---------- Small Drive helpers ----------

// The first file matching a Drive search, or null.
// `query` uses Drive's search language, e.g. "appProperties has { key='a' and value='b' }".
async function findFile(query) {
  const params = new URLSearchParams({
    q: `${query} and trashed = false`,
    fields: "files(id, name, appProperties)", // only what we need
  });
  const result = await googleFetch(`${DRIVE}?${params}`);
  return result.files[0] || null;
}

// Creates a file or folder in Drive and returns { id, name, appProperties }.
function createFile(details) {
  return googleFetch(`${DRIVE}?fields=id,name,appProperties`, {
    method: "POST",
    body: details,
  });
}

// ---------- The folder ----------

async function findOrCreateFolder() {
  const existing = await findFile(
    "appProperties has { key='spendsheet' and value='folder' }",
  );
  if (existing) return existing;

  return createFile({
    name: "Spendsheet",
    mimeType: FOLDER_TYPE,
    // Hidden labels: "this is our folder", and the default financial year (April).
    appProperties: { spendsheet: "folder", fyStartMonth: "4" },
  });
}

// ---------- A year's spreadsheet ----------

// What a new year's file starts with: the categories and currency from your
// latest file, so a new year doesn't make you set them up again. Your very
// first file starts from the defaults.
async function startingValues(folderId) {
  const defaults = {
    categoryRows: DEFAULT_CATEGORIES.map(categoryToRow),
    currency: DEFAULT_SETTINGS.currency,
  };
  try {
    // Spreadsheets in our folder, newest first.
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and mimeType = '${SPREADSHEET_TYPE}' and trashed = false`,
      orderBy: "createdTime desc",
      fields: "files(id, appProperties)",
    });
    const { files } = await googleFetch(`${DRIVE}?${params}`);
    const latest = files.find((file) => file.appProperties?.spendsheetYear);
    if (!latest) return defaults;

    const ranges = new URLSearchParams({
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    ranges.append("ranges", "Categories!A:D");
    ranges.append("ranges", "Settings!A:B");
    const { valueRanges } = await googleFetch(
      `${SHEETS}/${latest.id}/values:batchGet?${ranges}`,
    );
    const categories = rowsToCategories(
      (valueRanges[0].values || []).slice(1),
      CATEGORY_COLORS,
    );
    const settings = rowsToSettings(
      (valueRanges[1].values || []).slice(1),
      DEFAULT_SETTINGS,
      CURRENCIES.map((currency) => currency.code),
    );
    return {
      categoryRows: categories.map(categoryToRow),
      currency: settings.currency,
    };
  } catch {
    return defaults; // can't read the old file (say its tabs were deleted): start fresh
  }
}

async function findOrCreateYearFile(folder, year, name) {
  const existing = await findFile(
    `'${folder.id}' in parents and appProperties has { key='spendsheetYear' and value='${year}' }`,
  );
  if (existing) return existing;

  // Read these before creating the new file, or it would be the "latest" one.
  const starting = await startingValues(folder.id);

  // 1. An empty spreadsheet inside our folder, labelled with its year.
  const file = await createFile({
    name,
    mimeType: SPREADSHEET_TYPE,
    parents: [folder.id],
    appProperties: { spendsheetYear: year },
  });

  // 2. Set up the tabs. A new spreadsheet has one tab ("Sheet1", id 0):
  //    rename it to Expenses and add Categories (id 1) and Settings (id 2).
  //    Each tab keeps its header row in place while scrolling ("frozen"),
  //    and the header text is bold.
  const tabs = [
    { sheetId: 0, title: "Expenses" },
    { sheetId: 1, title: "Categories" },
    { sheetId: 2, title: "Settings" },
  ];
  const frozenHeader = { frozenRowCount: 1 };
  await googleFetch(`${SHEETS}/${file.id}:batchUpdate`, {
    method: "POST",
    body: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId: 0,
              title: "Expenses",
              gridProperties: frozenHeader,
            },
            fields: "title,gridProperties.frozenRowCount",
          },
        },
        {
          addSheet: {
            properties: { ...tabs[1], gridProperties: frozenHeader },
          },
        },
        {
          addSheet: {
            properties: { ...tabs[2], gridProperties: frozenHeader },
          },
        },
        ...tabs.map((tab) => ({
          repeatCell: {
            range: { sheetId: tab.sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true } } },
            fields: "userEnteredFormat.textFormat.bold",
          },
        })),
        // Expenses, from row 2 down: column B shows dates as "30 Oct 2026",
        // column C shows amounts as "1,240.00".
        formatColumn(1, { type: "DATE", pattern: "dd mmm yyyy" }),
        formatColumn(2, { type: "NUMBER", pattern: "#,##0.00" }),
        // Column D gets a dropdown of the names in the Categories tab. Not
        // strict: you can still type something else, and the app reads it as Other.
        {
          setDataValidation: {
            range: {
              sheetId: 0,
              startRowIndex: 1,
              startColumnIndex: 3,
              endColumnIndex: 4,
            },
            rule: {
              condition: {
                type: "ONE_OF_RANGE",
                values: [{ userEnteredValue: "=Categories!$B$2:$B" }],
              },
              strict: false,
              showCustomUi: true,
            },
          },
        },
      ],
    },
  });

  // 3. Header rows, plus the starting categories and settings.
  //    "RAW" stores exactly what we send, without Sheets reinterpreting it.
  await googleFetch(`${SHEETS}/${file.id}/values:batchUpdate`, {
    method: "POST",
    body: {
      valueInputOption: "RAW",
      data: [
        { range: "Expenses!A1", values: [EXPENSE_HEADERS] },
        {
          range: "Categories!A1",
          values: [CATEGORY_HEADERS, ...starting.categoryRows],
        },
        {
          range: "Settings!A1",
          values: [SETTINGS_HEADERS, ["Currency", starting.currency]],
        },
      ],
    },
  });

  return file;
}

// A number format for one column of the Expenses tab (column 0 is A), from
// row 2 down. No end row means "to the bottom".
function formatColumn(column, numberFormat) {
  return {
    repeatCell: {
      range: {
        sheetId: 0,
        startRowIndex: 1,
        startColumnIndex: column,
        endColumnIndex: column + 1,
      },
      cell: { userEnteredFormat: { numberFormat } },
      fields: "userEnteredFormat.numberFormat",
    },
  };
}

// ---------- What the rest of the app uses ----------

// Lookups are remembered so screens asking at the same time share one, and
// later asks are instant. They're promises, so they can be shared before
// they finish. Everything is per person: a new sign-in starts afresh.
//   folder: the lookup of the Spendsheet folder
//   years:  one lookup per year's file, e.g. "FY 2026-27" → promise
let cache = null; // { email, folder, years }

function getCache() {
  const email = getSession()?.email;
  if (cache === null || cache.email !== email) {
    cache = { email, folder: null, years: new Map() };
  }
  return cache;
}

function getFolder() {
  const current = getCache();
  if (current.folder === null) {
    const promise = findOrCreateFolder();
    current.folder = promise;
    // If it fails (say, no connection), forget it so the next call tries again.
    promise.catch(() => {
      if (current.folder === promise) current.folder = null;
    });
  }
  return current.folder;
}

// The spreadsheet for the financial year a date falls in, created on first use:
// { id, name, url, year, folderId, fyStartMonth }
export async function getSpreadsheetForDate(isoDate) {
  const folder = await getFolder();
  const fyStartMonth = Number(folder.appProperties?.fyStartMonth) || 4;
  const year = getFinancialYear(isoDate, fyStartMonth); // e.g. "FY 2026-27"

  const current = getCache();
  if (!current.years.has(year)) {
    const promise = findOrCreateYearFile(
      folder,
      year,
      sheetFileName(isoDate, fyStartMonth),
    ).then((file) => ({
      id: file.id,
      name: file.name,
      url: `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
      year,
      folderId: folder.id,
      fyStartMonth,
    }));
    current.years.set(year, promise);
    promise.catch(() => {
      if (current.years.get(year) === promise) current.years.delete(year);
    });
  }
  return current.years.get(year);
}

// This financial year's spreadsheet.
export function getSpreadsheet() {
  return getSpreadsheetForDate(todayISO());
}

// Changes the financial-year start (4 = April, 1 = January). It's saved on the
// folder, because it decides which file to open, so it can't live in a file.
export async function setFyStartMonth(month) {
  const { folderId } = await getSpreadsheet();
  await googleFetch(`${DRIVE}/${folderId}`, {
    method: "PATCH",
    body: { appProperties: { fyStartMonth: String(month) } },
  });
  cache = null; // the folder's details, and so every year's file, may change
  return getSpreadsheet();
}

// The internal number of a tab (needed to delete rows), found by its name.
export async function getTabId(spreadsheetId, title) {
  const result = await googleFetch(
    `${SHEETS}/${spreadsheetId}?fields=sheets.properties(sheetId,title)`,
  );
  const tab = result.sheets.find((sheet) => sheet.properties.title === title);
  if (!tab) throw new Error(`Your spreadsheet has no "${title}" tab.`);
  return tab.properties.sheetId;
}
