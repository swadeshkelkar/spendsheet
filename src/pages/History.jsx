import { Link } from "react-router-dom";
import LoadError from "../components/LoadError.jsx";
import { useSpendingData } from "../hooks/useSpendingData.js";
import { dayLabel, monthKey, monthLabel, todayISO } from "../lib/dates.js";
import { formatMoney } from "../lib/money.js";
import { groupByDay, inMonth, total } from "../lib/summary.js";
import "./History.css";

function History() {
  // Loads from your spreadsheet, and again whenever you come back to the app.
  const { data, error, retry } = useSpendingData();

  // Nothing to show yet: still loading, or the first load failed.
  if (data === null) {
    return (
      <div className="page">
        {error ? (
          <LoadError message={error} onRetry={retry} />
        ) : (
          <p className="muted">Loading your expenses…</p>
        )}
      </div>
    );
  }

  const { expenses, categories, currency } = data;

  // Everything below is worked out from state on every draw.
  const thisMonth = monthKey(todayISO()); // e.g. "2026-10"
  const monthExpenses = inMonth(expenses, thisMonth);
  const days = groupByDay(monthExpenses);
  const monthName = monthLabel(thisMonth).split(" ")[0]; // "October"

  function findCategory(id) {
    return categories.find((category) => category.id === id);
  }

  return (
    <div className="page">
      <h1 className="page-title">History</h1>

      {/* A later reload failed: keep showing what we have, with the error on top. */}
      {error && <LoadError message={error} onRetry={retry} />}

      <div className="hero">
        <div>
          <div className="hero-label">Spent in {monthName}</div>
          <div className="hero-total">{formatMoney(total(monthExpenses), currency)}</div>
        </div>
        <div className="hero-label">{monthExpenses.length} expenses</div>
      </div>

      {days.length === 0 && (
        <div className="card muted">No expenses in {monthName} yet.</div>
      )}

      {days.map((day) => (
        <section key={day.date} className="day">
          <div className="day-head">
            <span>{dayLabel(day.date)}</span>
            <span>{formatMoney(day.total, currency)}</span>
          </div>

          <div className="day-list">
            {day.items.map((expense) => {
              // An expense can point to a category that no longer exists.
              const category = findCategory(expense.categoryId);
              const name = category ? category.name : "Unknown";
              const color = category ? category.color : "gray";

              return (
                // Each row is a link to the edit screen for that expense.
                <Link
                  key={expense.id}
                  to={`/edit/${expense.id}`}
                  className="expense"
                >
                  <span
                    className="badge"
                    style={{ color: `var(--cat-${color})`, background: `var(--cat-${color}-tint)` }}
                  >
                    {name.charAt(0)}
                  </span>
                  <span className="expense-text">
                    <span className="expense-note">{expense.note || name}</span>
                    <span className="expense-category">{name}</span>
                  </span>
                  <span className="expense-amount">{formatMoney(expense.amount, currency)}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export default History;
