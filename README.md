# Spendsheet

Log expenses in seconds, on your phone or computer, and keep them in a Google
Sheet in your own Google Drive.

**Live app:** https://swadeshkelkar.github.io/spendsheet/
· [About](https://swadeshkelkar.github.io/spendsheet/about.html)
· [Privacy policy](https://swadeshkelkar.github.io/spendsheet/privacy.html)

## Features

- Quick add with a keypad: amount, category, date and an optional note
- History for any month, day by day, with the month's total
- Summary by category, compared with the month before, plus the financial year so far
- Your own categories, eight currencies, light and dark mode
- One spreadsheet per financial year (April–March or January–December), with a view tab per month
- Edit the spreadsheet by hand: changes appear in the app, and hand-typed rows are read forgivingly

## How it works

There is no backend. The app is a static site (React + Vite, plain JavaScript)
on GitHub Pages. You sign in with Google Identity Services, and the browser
talks to the Google Drive and Sheets APIs directly.

The app asks only for the `drive.file` permission, so it can see the files it
creates and nothing else in your Drive.

```
src/
  pages/        the screens (History, Summary, Add, Settings, Categories, Welcome)
  components/   shared pieces (Layout, SessionBar, LoadError, ...)
  hooks/        data loading for screens
  data/         Google Drive and Sheets: files, expenses, categories, settings
  lib/          pure helpers (dates, money, sheet rows, financial years), with tests
public/         about, privacy and terms pages (plain HTML)
```

## Development

```
npm install
npm run dev     # http://localhost:5173/spendsheet/
npm test        # Vitest
npm run lint    # ESLint
npm run build   # production build in dist/
```

Every push to `main` runs lint, tests and the build (`.github/workflows/ci.yml`),
and deploys to GitHub Pages (`.github/workflows/deploy.yml`).
