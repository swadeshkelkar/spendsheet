import { useState } from "react";
import { getThemeChoice, setThemeChoice } from "../lib/theme.js";
import "./Settings.css";

// The three choices for the Appearance control.
const THEME_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

function Settings() {
  // Start with whatever was saved before (or "system").
  const [theme, setTheme] = useState(getThemeChoice);

  function chooseTheme(choice) {
    setTheme(choice); // update the control on screen
    setThemeChoice(choice); // save it and recolor the app
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
        </div>
      </section>

      <p className="muted settings-note">
        Currency and financial year arrive in the next step.
      </p>
    </div>
  );
}

export default Settings;
