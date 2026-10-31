import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import { getSettings, updateSettings } from "../data/store.js";
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
  // The theme is saved on this device, so it can be read straight away.
  const [theme, setTheme] = useState(getThemeChoice);

  // Currency and financial year are saved with your data, which takes time to
  // load (later from Google Sheets). null means "not loaded yet".
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  function chooseTheme(choice) {
    setTheme(choice); // update the control on screen
    setThemeChoice(choice); // save it and recolor the app
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
                  aria-checked={settings.fyStartMonth === option.value}
                  onClick={() => changeSettings({ fyStartMonth: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Settings;
