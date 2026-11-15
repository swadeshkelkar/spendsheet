import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getSpreadsheet } from "../data/spreadsheet.js";
import { getSession, loadGoogleLibrary, signIn } from "../lib/auth.js";
import "./Welcome.css";

function Welcome() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false); // Google's library has loaded
  // "idle", "signing-in" (Google's popup is open) or "setting-up" (finding or
  // creating the spreadsheet)
  const [step, setStep] = useState("idle");
  const [error, setError] = useState("");
  // Checked once, when the screen opens. (Checking on every draw would leave
  // as soon as sign-in finishes, before the spreadsheet is ready.)
  const [alreadySignedIn] = useState(() => getSession() !== null);

  // Load Google's library as soon as the screen opens, so the button can open
  // the popup immediately when tapped (see signIn in auth.js).
  useEffect(() => {
    loadGoogleLibrary()
      .then(() => setReady(true))
      .catch((problem) => setError(problem.message));
  }, []);

  // Already signed in? Nothing to do here.
  if (alreadySignedIn) {
    return <Navigate to="/history" replace />;
  }

  async function handleSignIn() {
    setError("");
    try {
      // Skip the popup if sign-in worked last time and only the setup failed.
      if (getSession() === null) {
        setStep("signing-in");
        await signIn();
      }
      setStep("setting-up");
      await getSpreadsheet(); // finds your file, or creates it the first time
      navigate("/history", { replace: true });
    } catch (problem) {
      setError(problem.message);
      setStep("idle");
    }
  }

  const buttonLabel = {
    idle: getSession() === null ? "Continue with Google" : "Try again",
    "signing-in": "Waiting for Google…",
    "setting-up": "Setting up your spreadsheet…",
  }[step];

  return (
    <div className="welcome">
      <div className="welcome-box">
        <h1 className="welcome-title">Spendsheet</h1>
        <p className="welcome-tagline">
          Log expenses in seconds. Keep them in your own Google Sheet.
        </p>

        <ul className="welcome-points">
          <li>Your data stays in a spreadsheet in your Google Drive.</li>
          <li>Spendsheet can only see the files it creates, nothing else.</li>
          <li>Open the sheet any time to edit, sort or chart it yourself.</li>
        </ul>

        <button
          type="button"
          className="btn-primary welcome-button"
          disabled={!ready || step !== "idle"}
          onClick={handleSignIn}
        >
          {buttonLabel}
        </button>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default Welcome;
