import { useEffect } from "react";
import { onSessionEvent } from "../lib/auth.js";

// Shown when talking to Google fails, with a "Try again" button.
// If it failed because the sign-in expired, the session bar at the top offers
// Continue; once that works, this tries again by itself.
function LoadError({ message, onRetry }) {
  useEffect(() => onSessionEvent("restored", onRetry), [onRetry]);

  return (
    <div className="card load-error" role="alert">
      <p>{message}</p>
      <button type="button" className="btn-primary load-error-button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

export default LoadError;
