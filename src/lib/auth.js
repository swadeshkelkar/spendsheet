// Signing in with Google.
//
// We use Google's "token" sign-in: a popup asks the user to allow Spendsheet,
// and Google hands back an access token. Every request to Google Sheets or
// Drive carries that token to prove the user said yes. A token lasts about an
// hour; after that the user signs in again (one tap, no new questions).
//
// The token is kept in localStorage so a reload doesn't sign you out.

import { GOOGLE_CLIENT_ID } from "../config.js";

const STORAGE_KEY = "spendsheet:auth";
const LAST_EMAIL_KEY = "spendsheet:last-email";

// What we ask permission for:
//   drive.file: only files Spendsheet creates (never the rest of your Drive)
//   email:      your email address, to show "Signed in as …"
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const SCOPES = `${DRIVE_SCOPE} email`;

// ---------- Google's sign-in library ----------
// It's a script from Google. We add it to the page once, the first time
// something needs it, and remember the promise so it never loads twice.
let libraryPromise = null;

export function loadGoogleLibrary() {
  if (!libraryPromise) {
    libraryPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.onload = resolve;
      script.onerror = () => {
        libraryPromise = null; // let the next attempt try again
        reject(new Error("Couldn't reach Google. Check your connection."));
      };
      document.head.appendChild(script);
    });
  }
  return libraryPromise;
}

// ---------- The saved session ----------

// The saved session, even if its token has run out, or null if signed out.
// A session looks like: { token: "ya29…", expiresAt: 1793520000000, email: "…" }
// "Signed in but expired" still counts as signed in: the app keeps your place
// and asks you to tap Continue, instead of sending you back to Welcome.
export function getSavedSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)); // null if nothing saved
  } catch {
    return null; // damaged: same as signed out
  }
}

// The session if its token still works, otherwise null.
export function getSession() {
  const session = getSavedSession();
  // Treat it as expired a minute early, so a request never starts with a
  // token that runs out halfway.
  if (session && session.expiresAt - 60 * 1000 > Date.now()) {
    return session;
  }
  return null;
}

export function signOut() {
  localStorage.removeItem(STORAGE_KEY);
}

// ---------- Telling the app when sign-in expires or comes back ----------
// An EventTarget is the browser's built-in "noticeboard": code can post an
// event on it, and anything listening hears about it. The session bar listens
// for "expired"; screens listen for "restored" to load again.
const sessionEvents = new EventTarget();

// Marks the saved token as used up (keeping the email), and tells listeners.
export function expireSession() {
  const session = getSavedSession();
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...session, expiresAt: 0 }));
  }
  sessionEvents.dispatchEvent(new Event("expired"));
}

// onSessionEvent("expired", listener) or onSessionEvent("restored", listener).
// Returns a function that stops listening, handy as a useEffect cleanup.
export function onSessionEvent(name, listener) {
  sessionEvents.addEventListener(name, listener);
  return () => sessionEvents.removeEventListener(name, listener);
}

// ---------- Signing in ----------

// Opens Google's popup and resolves with the new session.
//
// Must be called straight from a click: browsers only allow popups that the
// user asked for. That's why the Welcome screen loads the library first and
// only enables its button once it's ready.
export function signIn() {
  return new Promise((resolve, reject) => {
    const lastEmail = localStorage.getItem(LAST_EMAIL_KEY) || "";

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      login_hint: lastEmail, // skips the account picker for a returning user

      // Called when the user finishes in the popup.
      callback: async (response) => {
        console.log(response);
        if (response.error) {
          reject(new Error("Sign-in didn't work. Please try again."));
          console.log(new Error("Sign-in didn't work. Please try again."));
          return;
        }

        // Google shows each permission as a checkbox, and the user may untick
        // Drive. Without it we can't create the spreadsheet, so stop here.
        const allowed = window.google.accounts.oauth2.hasGrantedAllScopes(
          response,
          DRIVE_SCOPE,
        );
        if (!allowed) {
          reject(
            new Error(
              "Spendsheet needs permission to create its spreadsheet. Please sign in again and tick that box.",
            ),
          );
          return;
        }

        try {
          const email = await fetchEmail(response.access_token);
          const session = {
            token: response.access_token,
            // expires_in is in seconds from now
            expiresAt: Date.now() + Number(response.expires_in) * 1000,
            email,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
          localStorage.setItem(LAST_EMAIL_KEY, email);
          sessionEvents.dispatchEvent(new Event("restored"));
          resolve(session);
        } catch (problem) {
          reject(problem);
        }
      },

      // Called if the popup couldn't open or was closed without finishing.
      error_callback: (problem) => {
        reject(
          new Error(
            problem.type === "popup_closed"
              ? "Sign-in was cancelled."
              : "The sign-in window couldn't open. Allow popups for this site and try again.",
          ),
        );
      },
    });

    client.requestAccessToken();
  });
}

// Asks Google whose token this is. The "email" permission allows exactly this.
async function fetchEmail(token) {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!response.ok) {
    throw new Error("Couldn't read your Google account. Please try again.");
  }
  const info = await response.json();
  return info.email;
}
