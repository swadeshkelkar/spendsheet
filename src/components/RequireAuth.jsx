import { Navigate } from "react-router-dom";
import { getSavedSession } from "../lib/auth.js";
import SessionBar from "./SessionBar.jsx";

// Wrap a screen in this to make it sign-in only:
//   <RequireAuth><History /></RequireAuth>
// Never signed in, or signed out: goes to Welcome.
// Signed in, even if the sign-in has expired: shows the screen, with the
// session bar on top (it only appears once the sign-in has expired).
function RequireAuth({ children }) {
  if (getSavedSession() === null) {
    return <Navigate to="/welcome" replace />;
  }
  return (
    <>
      <SessionBar />
      {children}
    </>
  );
}

export default RequireAuth;
