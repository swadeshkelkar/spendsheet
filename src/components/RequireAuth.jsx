import { Navigate } from "react-router-dom";
import { getSession } from "../lib/auth.js";

// Wrap a screen in this to make it sign-in only:
//   <RequireAuth><History /></RequireAuth>
// Signed in: shows the screen. Signed out (or the token ran out): goes to Welcome.
function RequireAuth({ children }) {
  if (getSession() === null) {
    return <Navigate to="/welcome" replace />;
  }
  return children;
}

export default RequireAuth;
