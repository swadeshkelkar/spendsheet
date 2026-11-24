// One function for every call to a Google API (Drive or Sheets).
// It adds the user's token, turns the reply into an object, and turns
// Google's errors into readable messages.

import { expireSession, getSavedSession, getSession } from "./auth.js";

const EXPIRED =
  "Your sign-in has expired. Tap Continue at the top to carry on.";

// googleFetch(url)                          → reads something (GET)
// googleFetch(url, { method: "POST", body }) → changes something
// `body` is a plain object; it's sent as JSON.
export async function googleFetch(url, { method = "GET", body } = {}) {
  const session = getSession();
  if (session === null) {
    if (getSavedSession() === null) {
      throw new Error("You've been signed out. Please sign in again.");
    }
    expireSession(); // the token ran out: show the "Continue" bar
    throw new Error(EXPIRED);
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${session.token}`, // the proof that the user said yes
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // 401 means Google no longer accepts the token (expired or withdrawn).
  if (response.status === 401) {
    expireSession();
    throw new Error(EXPIRED);
  }

  // Google answers with JSON, even for errors. Some replies are empty.
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    // e.g. "Google Sheets API has not been used in project … or it is disabled"
    throw new Error(
      data?.error?.message || `Google returned error ${response.status}.`,
    );
  }
  return data;
}

// A link to a Google page (a sheet, a Drive folder) that opens in the account
// you signed in to Spendsheet with. Without it, Google uses the browser's
// default account, which may be a different one, and says you have no access.
// authuser=<email> is how Google's own sites choose the account.
export function linkForAccount(url) {
  const email = getSavedSession()?.email;
  if (!email) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}authuser=${encodeURIComponent(email)}`;
}
