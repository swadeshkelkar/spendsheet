// One function for every call to a Google API (Drive or Sheets).
// It adds the user's token, turns the reply into an object, and turns
// Google's errors into readable messages.

import { getSession, signOut } from "./auth.js";

// googleFetch(url)                          → reads something (GET)
// googleFetch(url, { method: "POST", body }) → changes something
// `body` is a plain object; it's sent as JSON.
export async function googleFetch(url, { method = "GET", body } = {}) {
  const session = getSession();
  if (session === null) {
    throw new Error("You've been signed out. Please sign in again.");
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
    signOut();
    throw new Error("Your sign-in has expired. Please sign in again.");
  }

  // Google answers with JSON, even for errors. Some replies are empty.
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    // e.g. "Google Sheets API has not been used in project … or it is disabled"
    throw new Error(data?.error?.message || `Google returned error ${response.status}.`);
  }
  return data;
}
