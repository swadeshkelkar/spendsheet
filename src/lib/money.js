// Formats an amount as money: 1240 → "₹1,240", 1240.5 → "₹1,240.5",
// 100000 → "₹1,00,000" (Indian grouping).
//
// Intl.NumberFormat is built into every browser and knows each currency's
// symbol and grouping rules, so we don't have to.
export function formatMoney(amount, currency = "INR") {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0, // no ".00" on whole amounts
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
}

// ---------- The amount keypad ----------
// While typing, the amount is kept as text ("1240.5"), not a number. Text can
// hold in-between states a number can't, like "12." right after pressing ".".

// Applies one keypad press to the text and returns the new text.
// key is "0"–"9", "." or "back".
export function pressKey(text, key) {
  if (key === "back") {
    return text.slice(0, -1); // remove the last character
  }

  if (key === ".") {
    if (text.includes(".")) return text; // only one decimal point
    return text === "" ? "0." : text + ".";
  }

  // A digit
  const [whole, decimals] = text.split(".");
  if (decimals !== undefined) {
    // After the point: at most 2 digits (paise / cents)
    return decimals.length >= 2 ? text : text + key;
  }
  if (whole.length >= 9) return text; // up to 99,99,99,999 is plenty
  if (whole === "0") return key; // "0" then "5" becomes "5", not "05"
  return text + key;
}

// Shows the typed text with grouping: "125000" → "1,25,000", "1240." → "1,240."
export function formatAmountInput(text) {
  if (text === "") return "0";
  const [whole, decimals] = text.split(".");
  const grouped = Number(whole || "0").toLocaleString("en-IN");
  return decimals === undefined ? grouped : `${grouped}.${decimals}`;
}
