import { useEffect, useState } from "react";
import {
  getSavedSession,
  getSession,
  loadGoogleLibrary,
  onSessionEvent,
  signIn,
} from "../lib/auth.js";

// "Your sign-in has expired · Continue", fixed at the top of the screen.
//
// Google's sign-in lasts about an hour. When it runs out, this bar appears
// over whatever you were doing, so nothing is lost (a half-typed expense
// stays on screen). Continue opens Google's popup, which usually closes by
// itself because you've already said yes. Screens then load again.
function SessionBar() {
  // Expired already when the app opens (signed in, but the token ran out)?
  const [expired, setExpired] = useState(
    () => getSavedSession() !== null && getSession() === null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Load Google's library early, so Continue can open the popup at once.
    loadGoogleLibrary().catch(() => {}); // a failure shows up when tapping Continue
    // Show the bar whenever a request finds the sign-in expired.
    return onSessionEvent("expired", () => setExpired(true));
  }, []);

  if (!expired) return null;

  async function handleContinue() {
    setBusy(true);
    setError("");
    try {
      await loadGoogleLibrary();
      await signIn(); // also tells screens to load again
      setExpired(false);
    } catch (problem) {
      setError(problem.message);
    }
    setBusy(false);
  }

  return (
    <div className="session-bar" role="alert">
      <span>{error || "Your sign-in has expired."}</span>
      <button type="button" onClick={handleContinue} disabled={busy}>
        {busy ? "Waiting…" : "Continue"}
      </button>
    </div>
  );
}

export default SessionBar;
