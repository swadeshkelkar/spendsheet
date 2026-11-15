import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import { getSpreadsheet, setFyStartMonth } from "../data/spreadsheet.js";
import { getSettings, updateSettings } from "../data/store.js";
import { getSession, signOut } from "../lib/auth.js";
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

  // Currency and financial year are saved with your data, which takes time to
  // load (later from Google Sheets). null means "not loaded yet".
  const [settings, setSettings] = useState(null);

  // Your spreadsheet in Google Drive: { name, url, fyStartMonth, ... }.
  // Loaded separately, so the rest of the screen doesn't wait for Google.
  const [sheet, setSheet] = useState(null);
  const [sheetError, setSheetError] = useState("");
  const [switchingYear, setSwitchingYear] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings);
    getSpreadsheet()
      .then(setSheet)
      .catch((problem) => setSheetError(problem.message));
  }, []);

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
  function changeSettings(changes) {
    setSettings({ ...settings, ...changes }); // show it straight away
    updateSettings(changes); // and save it
  }

  if (settings === null) {
    return (
      <div className="page">
        <p className="muted">Loading…</p>
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
            <div className="segmented" role="radiogroup" aria-labelledby="appearance-label">
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
              <div className="setting-hint">Used for every amount in the app</div>
            </div>
            {/* A plain <select>: phones show their own native picker for it. */}
            <select
              className="select"
              value={settings.currency}
              onChange={(event) => changeSettings({ currency: event.target.value })}
            >
              {CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currencySymbol(currency.code)} {currency.name}
                </option>
              ))}
            </select>
          </label>

          {/* The whole row is a link to the Categories screen. */}
          <Link to="/settings/categories" className="setting setting-row setting-link">
            <div>
              <div className="setting-title">Categories</div>
              <div className="setting-hint">Add or remove spending categories</div>
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

            <div className="segmented" role="radiogroup" aria-labelledby="fy-label">
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

      <section className="settings-group">
        <h2 className="settings-heading">Account</h2>

        <div className="card settings-card">
          <div className="setting setting-row">
            <div>
              <div className="setting-title">Your spreadsheet</div>
              {sheetError ? (
                <div className="setting-hint setting-error">{sheetError}</div>
              ) : (
                <div className="setting-hint">
                  {sheet && !switchingYear ? sheet.name : "Finding your spreadsheet…"}
                </div>
              )}
            </div>
            {/* Opens Google Sheets in a new tab. rel="noreferrer" stops that
                tab from being able to control this one. */}
            {sheet && (
              <a
                href={sheet.url}
                target="_blank"
                rel="noreferrer"
                className="outline-button"
              >
                Open
              </a>
            )}
          </div>

          <div className="setting setting-row">
            <div>
              <div className="setting-title">Google account</div>
              {/* ?. because the session could run out while this screen is open */}
              <div className="setting-hint">{getSession()?.email}</div>
            </div>
            <button type="button" className="signout-button" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Settings;
