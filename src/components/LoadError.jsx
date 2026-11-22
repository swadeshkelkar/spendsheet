import { Link } from "react-router-dom";
import { getSession } from "../lib/auth.js";

// Shown when talking to Google fails. If the failure signed you out (an
// expired sign-in), it offers to sign in again; otherwise, to try again.
function LoadError({ message, onRetry }) {
  return (
    <div className="card load-error" role="alert">
      <p>{message}</p>
      {getSession() === null ? (
        <Link to="/welcome" className="btn-primary load-error-button">
          Sign in again
        </Link>
      ) : (
        <button type="button" className="btn-primary load-error-button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export default LoadError;
