import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import LoadError from "../components/LoadError.jsx";
import {
  getSpreadsheet,
  getYearFiles,
  setFyStartMonth,
} from "../data/spreadsheet.js";
import { getSettings, updateSettings } from "../data/store.js";
import { getSavedSession, onSessionEvent, signOut } from "../lib/auth.js";
import { linkForAccount } from "../lib/google.js";
import { CURRENCIES, currencySymbol } from "../lib/money.js";
import { getThemeChoice, setThemeChoice } from "../lib/theme.js";
import "./Settings.css";

// The three choices for the Appearance control.
const THEME_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

// The two financial years we support. value is the month it starts in.
const FY_OPTIONS = [
  { value: 4, label: "Apr – Mar" },
  { value: 1, label: "Jan – Dec" },
];

function Settings() {
  const navigate = useNavigate();
  // The theme is saved on this device, so it can be read straight away.
  const [theme, setTheme] = useState(getThemeChoice);

  // The currency, from the Settings tab of your spreadsheet.
  // null means "not loaded yet".
  const [settings, setSettings] = useState(null);
  const [loadError, setLoadError] = useState(""); // loading settings failed
  const [saveError, setSaveError] = useState(""); // saving a change failed
  const [attempt, setAttempt] = useState(0); // changing it loads again

  // Your spreadsheet in Google Drive: { name, url, fyStartMonth, ... }.
  // Loaded separately, so the rest of the screen doesn't wait for Google.
  const [sheet, setSheet] = useState(null);
  const [sheetError, setSheetError] = useState("");
  const [switchingYear, setSwitchingYear] = useState(false);
  // All your yearly files, oldest first (see getYearFiles). null = loading.
  const [files, setFiles] = useState(null);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch((problem) => setLoadError(problem.message));
    // This year's file first (it may need creating), then the list of all
    // files, so the list includes it.
    getSpreadsheet()
      .then((found) => {
        setSheet(found);
        return getYearFiles();
      })
      .then(setFiles)
      .catch((problem) => setSheetError(problem.message));
  }, [attempt]);

  // After "Continue" on the session bar, load again (clears any error).
  useEffect(
    () =>
      onSessionEvent("restored", () => {
        setSheetError("");
        setAttempt((count) => count + 1);
      }),
    [],
  );

  function chooseTheme(choice) {
    setTheme(choice); // update the control on screen
    setThemeChoice(choice); // save it and recolor the app
  }

  async function chooseFyStart(month) {
    if (sheet === null || month === sheet.fyStartMonth) return;
    const ok = window.confirm(
      "Switch how financial years are counted? Spendsheet will use a different " +
        "file for this year (and create it if needed). Your current file stays in your Drive.",
    );
    if (!ok) return;

    setSwitchingYear(true);
    setSheetError("");
    try {
      setSheet(await setFyStartMonth(month)); // saves it, then finds or creates the file
      setFiles(await getYearFiles()); // the list may have a new file now
    } catch (problem) {
      setSheetError(problem.message);
    }
    setSwitchingYear(false);
  }

  function handleSignOut() {
    signOut();
    navigate("/welcome", { replace: true });
  }

  // changes is part of the settings, e.g. { currency: "USD" }.
  async function changeSettings(changes) {
    const before = settings;
    setSettings({ ...settings, ...changes }); // show it straight away
    setSaveError("");
    try {
      await updateSettings(changes); // and save it in your sheet
    } catch (problem) {
      setSettings(before); // saving failed: put the control back
      setSaveError(problem.message);
    }
  }

  if (settings === null) {
    return (
      <div className="page">
        {loadError ? (
          <LoadError
            message={loadError}
            onRetry={() => {
              setLoadError("");
              setAttempt((count) => count + 1);
            }}
          />
        ) : (
          <p className="muted">Loading…</p>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Settings</h1>

      <section className="settings-group">
        <h2 className="settings-heading">Preferences</h2>

        <div className="card settings-card">
          <div className="setting">
            <div>
              <div className="setting-title" id="appearance-label">
                Appearance
              </div>
              <div className="setting-hint">
                System follows your device's light or dark setting
              </div>
            </div>

            {/* A segmented control: one of three buttons is selected. */}
            <div
              className="segmented"
              role="radiogroup"
              aria-labelledby="appearance-label"
            >
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={theme === option.value}
                  onClick={() => chooseTheme(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <label className="setting setting-row">
            <div>
              <div className="setting-title">Currency</div>
              <div className="setting-hint">
                Used for every amount in the app
              </div>
            </div>
            {/* A plain <select>: phones show their own native picker for it. */}
            <select
              className="select"
              value={settings.currency}
              onChange={(event) =>
                changeSettings({ currency: event.target.value })
              }
            >
              {CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currencySymbol(currency.code)} {currency.name}
                </option>
              ))}
            </select>
          </label>

          {/* The whole row is a link to the Categories screen. */}
          <Link
            to="/settings/categories"
            className="setting setting-row setting-link"
          >
            <div>
              <div className="setting-title">Categories</div>
              <div className="setting-hint">
                Add or remove spending categories
              </div>
            </div>
            <Icon name="forward" size={18} />
          </Link>

          <div className="setting">
            <div>
              <div className="setting-title" id="fy-label">
                Financial year
              </div>
              <div className="setting-hint">
                Each financial year gets its own spreadsheet
              </div>
            </div>

            <div
              className="segmented"
              role="radiogroup"
              aria-labelledby="fy-label"
            >
              {FY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={sheet?.fyStartMonth === option.value}
                  disabled={sheet === null || switchingYear}
                  onClick={() => chooseFyStart(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {saveError && (
        <p className="form-error" role="alert">
          {saveError}
        </p>
      )}

      <section className="settings-group">
        <h2 className="settings-heading">Your files</h2>

        <div className="card settings-card">
          {sheetError && (
            <div className="setting">
              <div className="setting-hint setting-error">{sheetError}</div>
            </div>
          )}

          {!sheetError && (files === null || switchingYear) && (
            <div className="setting">
              <div className="setting-hint">Finding your files…</div>
            </div>
          )}

          {/* One row per yearly file, newest first. [...files] makes a copy,
              because reverse() would otherwise change the list in state. */}
          {!sheetError &&
            files !== null &&
            !switchingYear &&
            [...files].reverse().map((file) => (
              <div key={file.id} className="setting setting-row">
                <div>
                  <div className="setting-title">{file.name}</div>
                  {file.id === sheet?.id && (
                    <div className="setting-hint">This year</div>
                  )}
                </div>
                {/* target="_blank" opens a new tab. rel="noreferrer" stops that
                    tab from being able to control this one. */}
                <a
                  href={linkForAccount(
                    `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="outline-button"
                >
                  Open
                </a>
              </div>
            ))}

          {sheet && (
            <div className="setting setting-row">
              <div>
                <div className="setting-title">Spendsheet folder</div>
                <div className="setting-hint">
                  All your files, in Google Drive
                </div>
              </div>
              <a
                href={linkForAccount(
                  `https://drive.google.com/drive/folders/${sheet.folderId}`,
                )}
                target="_blank"
                rel="noreferrer"
                className="outline-button"
              >
                Open
              </a>
            </div>
          )}
        </div>
      </section>

      <section className="settings-group">
        <h2 className="settings-heading">Account</h2>

        <div className="card settings-card">
          <div className="setting setting-row">
            <div>
              <div className="setting-title">Google account</div>
              {/* Saved session: the email still shows while the sign-in is expired. */}
              <div className="setting-hint">{getSavedSession()?.email}</div>
            </div>
            <button
              type="button"
              className="signout-button"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Settings;
