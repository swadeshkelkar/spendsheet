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

import { monthKey, todayISO } from "../lib/dates.js";
import {
  fyMonths,
  getFinancialYear,
  sheetFileName,
} from "../lib/financialYear.js";
import { getSavedSession } from "../lib/auth.js";
import { googleFetch } from "../lib/google.js";
import {
  monthTabFormula,
  monthTabId,
  monthTabIndex,
  monthTabTitle,
} from "../lib/monthTabs.js";
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
// inBin: true looks in the Bin (Drive's trash) instead.
async function findFile(query, { inBin = false } = {}) {
  const params = new URLSearchParams({
    q: `${query} and trashed = ${inBin}`,
    fields: "files(id, name, appProperties)", // only what we need
  });
  const result = await googleFetch(`${DRIVE}?${params}`);
  return result.files[0] || null;
}

// Before creating a folder or file that seems to be missing, check the Bin.
// If it's there, stop with a clear message instead of quietly starting a new,
// empty one (which would look as if your expenses had disappeared).
async function stopIfInBin(query, what) {
  const binned = await findFile(query, { inBin: true });
  if (binned) {
    throw new Error(
      `${what} "${binned.name}" is in the Bin in Google Drive. Restore it there ` +
        "and try again (or delete it for good to start afresh).",
    );
  }
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
  const query = "appProperties has { key='spendsheet' and value='folder' }";
  const existing = await findFile(query);
  if (existing) return existing;
  await stopIfInBin(query, "Your folder");

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
async function startingValues() {
  const defaults = {
    categoryRows: DEFAULT_CATEGORIES.map(categoryToRow),
    currency: DEFAULT_SETTINGS.currency,
  };
  try {
    // Your yearly spreadsheets, newest first. Not only those in the folder:
    // you may have moved one elsewhere in Drive.
    const params = new URLSearchParams({
      q: `mimeType = '${SPREADSHEET_TYPE}' and trashed = false`,
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
  // Searched in all of your Drive, not only in the folder: if you moved the
  // file somewhere else, it's still found instead of a new one being made.
  // (With the drive.file permission, Drive only shows files Spendsheet made,
  // so this never finds anyone else's spreadsheets.)
  const query = `appProperties has { key='spendsheetYear' and value='${year}' }`;
  const existing = await findFile(query);
  if (existing) return existing;
  await stopIfInBin(query, "Your file");

  // Read these before creating the new file, or it would be the "latest" one.
  const starting = await startingValues();

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
// sheetId says which tab; 0 is Expenses.
function formatColumn(column, numberFormat, sheetId = 0) {
  return {
    repeatCell: {
      range: {
        sheetId,
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
//   files:  the list of all yearly files (see getYearFiles)
let cache = null; // { email, folder, years, files }

function getCache() {
  // The saved session, so the cache survives an expired sign-in.
  const email = getSavedSession()?.email;
  if (cache === null || cache.email !== email) {
    cache = { email, folder: null, years: new Map(), files: null };
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
    // Finding a year's file may have created it, so list the files again next
    // time. then() takes a second function for when it fails: without it,
    // that failure would also surface here as an "unhandled" error.
    promise.then(
      () => {
        current.files = null;
      },
      () => {}, // failed: nothing to do here (the catch below handles it)
    );
    promise.catch(() => {
      if (current.years.get(year) === promise) current.years.delete(year);
    });
  }
  return current.years.get(year);
}

// All your yearly files, oldest first, with the months each one covers:
// [{ id, name, year: "FY 2025-26", first: "2025-04", last: "2026-03" }, ...]
// Used by History to know which months and years it can show.
export function getYearFiles() {
  const current = getCache();
  if (current.files === null) {
    const promise = listYearFiles();
    current.files = promise;
    promise.catch(() => {
      if (current.files === promise) current.files = null;
    });
  }
  return current.files;
}

async function listYearFiles() {
  // All of your Spendsheet spreadsheets, wherever they are in your Drive.
  const params = new URLSearchParams({
    q: `mimeType = '${SPREADSHEET_TYPE}' and trashed = false`,
    fields: "files(id, name, appProperties)",
  });
  const { files } = await googleFetch(`${DRIVE}?${params}`);

  const yearFiles = [];
  for (const file of files) {
    const year = file.appProperties?.spendsheetYear;
    const months = year ? fyMonths(year) : null; // null: not one of our year files
    if (months) {
      yearFiles.push({ id: file.id, name: file.name, year, ...months });
    }
  }
  // Oldest first. localeCompare compares text: "2025-04" before "2026-04".
  return yearFiles.sort((a, b) => a.first.localeCompare(b.first));
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
// Every tab in a spreadsheet: [{ sheetId, title, index }, ...]
async function getTabs(spreadsheetId) {
  const result = await googleFetch(
    `${SHEETS}/${spreadsheetId}?fields=sheets.properties(sheetId,title,index)`,
  );
  return result.sheets.map((sheet) => sheet.properties);
}

// The internal number of a tab (needed to delete rows), found by its name.
export async function getTabId(spreadsheetId, title) {
  const tab = (await getTabs(spreadsheetId)).find(
    (item) => item.title === title,
  );
  if (!tab) throw new Error(`Your spreadsheet has no "${title}" tab.`);
  return tab.sheetId;
}

// ---------- Monthly view tabs ----------

// Months already checked, e.g. "<spreadsheet id>:2026-11", so adding more
// expenses in a month doesn't ask the sheet about its tab every time.
const checkedMonths = new Set();

// Makes sure the month a date is in has its view tab ("Nov 2026").
export async function ensureMonthTab(spreadsheetId, isoDate) {
  const key = monthKey(isoDate);
  const remembered = `${spreadsheetId}:${key}`;
  if (checkedMonths.has(remembered)) return;

  const tabs = await getTabs(spreadsheetId);
  const title = monthTabTitle(key);
  if (!tabs.some((tab) => tab.title === title)) {
    const sheetId = monthTabId(key);

    // 1. The tab, in its place among the months, with a bold frozen header,
    //    dates in column A, amounts in column B, and the total in G1.
    await googleFetch(`${SHEETS}/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      body: {
        requests: [
          {
            addSheet: {
              properties: {
                sheetId,
                title,
                index: monthTabIndex(tabs, key),
                gridProperties: { frozenRowCount: 1 },
              },
            },
          },
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: { userEnteredFormat: { textFormat: { bold: true } } },
              fields: "userEnteredFormat.textFormat.bold",
            },
          },
          formatColumn(0, { type: "DATE", pattern: "dd mmm yyyy" }, sheetId),
          formatColumn(1, { type: "NUMBER", pattern: "#,##0.00" }, sheetId),
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 6,
                endColumnIndex: 7,
              },
              cell: {
                userEnteredFormat: {
                  numberFormat: { type: "NUMBER", pattern: "#,##0.00" },
                },
              },
              fields: "userEnteredFormat.numberFormat",
            },
          },
        ],
      },
    });

    // 2. The header, the total, and the formula. "USER_ENTERED" makes Sheets
    //    treat text starting with "=" as a formula, as if you'd typed it.
    //    The quotes in 'Nov 2026'!A1 are needed because the name has a space.
    await googleFetch(`${SHEETS}/${spreadsheetId}/values:batchUpdate`, {
      method: "POST",
      body: {
        valueInputOption: "USER_ENTERED",
        data: [
          {
            range: `'${title}'!A1`,
            values: [
              ["Date", "Amount", "Category", "Note", "", "Total", "=SUM(B2:B)"],
            ],
          },
          { range: `'${title}'!A2`, values: [[monthTabFormula(key)]] },
        ],
      },
    });
  }
  checkedMonths.add(remembered);
}
