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
import { DEFAULT_CATEGORIES } from "./store.js";

const DRIVE = "https://www.googleapis.com/drive/v3/files";
const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets";
const FOLDER_TYPE = "application/vnd.google-apps.folder";
const SPREADSHEET_TYPE = "application/vnd.google-apps.spreadsheet";

// The tabs in every year's file, and their header rows.
export const EXPENSE_HEADERS = ["ID", "Date", "Amount", "Category", "Note", "Created at"];
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

async function findOrCreateYearFile(folder, year, name) {
  const existing = await findFile(
    `'${folder.id}' in parents and appProperties has { key='spendsheetYear' and value='${year}' }`,
  );
  if (existing) return existing;

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
            properties: { sheetId: 0, title: "Expenses", gridProperties: frozenHeader },
            fields: "title,gridProperties.frozenRowCount",
          },
        },
        { addSheet: { properties: { ...tabs[1], gridProperties: frozenHeader } } },
        { addSheet: { properties: { ...tabs[2], gridProperties: frozenHeader } } },
        ...tabs.map((tab) => ({
          repeatCell: {
            range: { sheetId: tab.sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true } } },
            fields: "userEnteredFormat.textFormat.bold",
          },
        })),
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
          values: [
            CATEGORY_HEADERS,
            ...DEFAULT_CATEGORIES.map((category) => [
              category.id,
              category.name,
              category.color,
              "TRUE",
            ]),
          ],
        },
        { range: "Settings!A1", values: [SETTINGS_HEADERS, ["Currency", "INR"]] },
      ],
    },
  });

  return file;
}

// ---------- What the rest of the app uses ----------

// Remembered so that screens asking at the same time share one lookup, and
// later asks are instant. It's a promise, so it can be shared before it's done.
let cached = null; // { email, promise }

// This financial year's spreadsheet, created on first use:
// { id, name, url, folderId, fyStartMonth }
export function getSpreadsheet() {
  const email = getSession()?.email;
  // Look again if nothing is remembered yet, or a different person signed in.
  if (cached === null || cached.email !== email) {
    const promise = lookUpSpreadsheet();
    cached = { email, promise };
    // If it fails (say, no connection), forget it so the next call tries again.
    promise.catch(() => {
      if (cached?.promise === promise) cached = null;
    });
  }
  return cached.promise;
}

async function lookUpSpreadsheet() {
  const folder = await findOrCreateFolder();
  const fyStartMonth = Number(folder.appProperties?.fyStartMonth) || 4;
  const today = todayISO();
  const file = await findOrCreateYearFile(
    folder,
    getFinancialYear(today, fyStartMonth),
    sheetFileName(today, fyStartMonth),
  );
  return {
    id: file.id,
    name: file.name,
    url: `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
    folderId: folder.id,
    fyStartMonth,
  };
}

// Changes the financial-year start (4 = April, 1 = January). It's saved on the
// folder, because it decides which file to open, so it can't live in a file.
export async function setFyStartMonth(month) {
  const { folderId } = await getSpreadsheet();
  await googleFetch(`${DRIVE}/${folderId}`, {
    method: "PATCH",
    body: { appProperties: { fyStartMonth: String(month) } },
  });
  cached = null; // the year, and so the file, may have changed
  return getSpreadsheet();
}
