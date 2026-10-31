import { useEffect, useState } from "react";
import Icon from "../components/Icon.jsx";
import { getCategories, getExpenses, getSettings } from "../data/store.js";
import { monthKey, monthLabel, shiftMonth, todayISO } from "../lib/dates.js";
import { formatMoney } from "../lib/money.js";
import { byCategory, inMonth, total } from "../lib/summary.js";
import "./Summary.css";

function Summary() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currency, setCurrency] = useState("INR");
  const [loading, setLoading] = useState(true);

  const thisMonth = monthKey(todayISO()); // e.g. "2026-10"
  const [month, setMonth] = useState(thisMonth); // the month being shown

  useEffect(() => {
    Promise.all([getExpenses(), getCategories(), getSettings()]).then(
      ([expenseList, categoryList, settings]) => {
        setExpenses(expenseList);
        setCategories(categoryList);
        setCurrency(settings.currency);
        setLoading(false);
      },
    );
  }, []);

  if (loading) {
    return (
      <div className="page">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  // Everything below is worked out from state on every draw.
  const monthExpenses = inMonth(expenses, month);
  const monthTotal = total(monthExpenses);
  const rows = byCategory(monthExpenses, categories);
  const biggest = rows.length > 0 ? rows[0].amount : 0; // rows are sorted biggest first

  // Compare with the month before.
  const previousMonth = shiftMonth(month, -1);
  const previousTotal = total(inMonth(expenses, previousMonth));
  const previousName = monthLabel(previousMonth).split(" ")[0]; // "September"
  // null means "nothing to compare with" (no spending last month).
  const change =
    previousTotal > 0
      ? Math.round(((monthTotal - previousTotal) / previousTotal) * 100)
      : null;

  const isCurrentMonth = month === thisMonth;

  return (
    <div className="page">
      <h1 className="page-title">Summary</h1>

      <div className="month-switch">
        <button
          type="button"
          className="month-button"
          aria-label="Previous month"
          onClick={() => setMonth(shiftMonth(month, -1))}
        >
          <Icon name="back" size={18} />
        </button>
        <strong className="month-name">{monthLabel(month)}</strong>
        <button
          type="button"
          className="month-button"
          aria-label="Next month"
          disabled={isCurrentMonth} // no future months
          onClick={() => setMonth(shiftMonth(month, 1))}
        >
          <Icon name="forward" size={18} />
        </button>
      </div>

      <div className="card total-card">
        <div className="muted total-label">Total spent</div>
        <div className="total-value">{formatMoney(monthTotal, currency)}</div>

        {change !== null && (
          <div className={change < 0 ? "change less" : "change"}>
            <Icon name={change < 0 ? "down" : "up"} size={14} />
            {change === 0
              ? `Same as ${previousName}`
              : `${Math.abs(change)}% ${change < 0 ? "less" : "more"} than ${previousName} (${formatMoney(previousTotal, currency)})`}
          </div>
        )}

        {/* One bar split into colored parts, one part per category. */}
        {rows.length > 0 && (
          <div
            className="stack"
            role="img"
            aria-label={rows.map((row) => `${row.name} ${row.percent}%`).join(", ")}
          >
            {rows.map((row) => (
              <span
                key={row.id}
                style={{
                  width: `${(row.amount / monthTotal) * 100}%`,
                  background: `var(--cat-${row.color})`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <section className="breakdown">
        <h2 className="breakdown-title">By category</h2>

        {rows.length === 0 ? (
          <div className="card muted">No spending in {monthLabel(month)}.</div>
        ) : (
          <div className="card breakdown-list">
            {rows.map((row) => (
              <div key={row.id} className="category-row">
                <div className="category-head">
                  <span className="dot" style={{ background: `var(--cat-${row.color})` }} />
                  <span className="category-name">{row.name}</span>
                  <span className="muted">{row.percent}%</span>
                  <span className="category-amount">{formatMoney(row.amount, currency)}</span>
                </div>
                {/* Bar length is relative to the biggest category, so the top one is always full. */}
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${(row.amount / biggest) * 100}%`,
                      background: `var(--cat-${row.color})`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Summary;
