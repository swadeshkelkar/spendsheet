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
