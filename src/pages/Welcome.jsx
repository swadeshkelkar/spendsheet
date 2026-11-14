import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getSession, loadGoogleLibrary, signIn } from "../lib/auth.js";
import "./Welcome.css";

function Welcome() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false); // Google's library has loaded
  const [busy, setBusy] = useState(false); // the popup is open
  const [error, setError] = useState("");

  // Load Google's library as soon as the screen opens, so the button can open
  // the popup immediately when tapped (see signIn in auth.js).
  useEffect(() => {
    loadGoogleLibrary()
      .then(() => setReady(true))
      .catch((problem) => setError(problem.message));
  }, []);

  // Already signed in? Nothing to do here.
  if (getSession() !== null) {
    return <Navigate to="/history" replace />;
  }

  async function handleSignIn() {
    setBusy(true);
    setError("");
    try {
      await signIn();
      navigate("/history", { replace: true });
    } catch (problem) {
      setError(problem.message);
      setBusy(false);
    }
  }

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
          disabled={!ready || busy}
          onClick={handleSignIn}
        >
          {busy ? "Waiting for Google…" : "Continue with Google"}
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
