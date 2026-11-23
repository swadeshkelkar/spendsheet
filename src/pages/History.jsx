import { Link, useSearchParams } from "react-router-dom";
import LoadError from "../components/LoadError.jsx";
import { useMonthData } from "../hooks/useMonthData.js";
import { dayLabel, monthKey, monthLabel, todayISO } from "../lib/dates.js";
import { formatMoney } from "../lib/money.js";
import { availableMonths, monthInYear, yearsIn } from "../lib/monthPicker.js";
import { groupByDay, total } from "../lib/summary.js";
import "./History.css";

// "01" … "12", for the month dropdown.
const MONTH_NUMBERS = Array.from({ length: 12 }, (_, index) =>
  String(index + 1).padStart(2, "0"),
);

function History() {
  // The month being shown lives in the address: #/history?month=2026-03.
  // That way a refresh, the back button, or coming back from editing keeps
  // it. No month in the address (as from the tab bar) means this month.
  const [searchParams, setSearchParams] = useSearchParams();
  const thisMonth = monthKey(todayISO()); // e.g. "2026-11"
  const asked = searchParams.get("month") || "";
  // Only a well-formed month that isn't in the future; anything else: this month.
  const month =
    /^\d{4}-\d{2}$/.test(asked) && asked <= thisMonth ? asked : thisMonth;

  // Loads that month from your spreadsheet, and again when you come back.
  const { data, error, retry } = useMonthData(month);

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

  const { categories, currency, files } = data;

  // What the dropdowns offer, worked out on every draw.
  const months = availableMonths(files, thisMonth); // ["2025-04", …, "2026-11"]
  const years = yearsIn(months); // ["2026", "2025"]
  const [year, monthNumber] = month.split("-"); // "2026-03" → "2026", "03"

  // Right after picking a month, data is still the previous month's.
  const ready = data.month === month;
  const monthExpenses = ready ? data.expenses : [];
  const days = groupByDay(monthExpenses);
  const monthName = monthLabel(month).split(" ")[0]; // "March"

  // Show another month by changing the address. replace: true means the back
  // button doesn't step through every month you looked at.
  function chooseMonth(key) {
    setSearchParams(key === thisMonth ? {} : { month: key }, { replace: true });
  }

  function findCategory(id) {
    return categories.find((category) => category.id === id);
  }

  return (
    <div className="page">
      <h1 className="page-title">History</h1>

      {/* Two plain <select>s: phones show their own scroll-wheel pickers. */}
      <div className="month-picker">
        <select
          aria-label="Month"
          value={monthNumber}
          onChange={(event) => chooseMonth(`${year}-${event.target.value}`)}
        >
          {MONTH_NUMBERS.map((number) => (
            <option
              key={number}
              value={number}
              // Future months, and months before your first file, can't be picked.
              disabled={!months.includes(`${year}-${number}`)}
            >
              {monthLabel(`${year}-${number}`).split(" ")[0]}
            </option>
          ))}
        </select>
        <select
          aria-label="Year"
          value={year}
          // Keep the same month in the new year if it has it, else the closest.
          onChange={(event) =>
            chooseMonth(monthInYear(months, event.target.value, monthNumber))
          }
        >
          {years.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {/* A later reload failed: keep showing what we have, with the error on top. */}
      {error && <LoadError message={error} onRetry={retry} />}

      {!ready && <p className="muted">Loading {monthLabel(month)}…</p>}

      {ready && (
        <div className="hero">
          <div>
            <div className="hero-label">Spent in {monthName}</div>
            <div className="hero-total">
              {formatMoney(total(monthExpenses), currency)}
            </div>
          </div>
          <div className="hero-label">{monthExpenses.length} expenses</div>
        </div>
      )}

      {ready && days.length === 0 && (
        <div className="card muted">
          {month === thisMonth
            ? `No expenses in ${monthName} yet.`
            : `No expenses in ${monthLabel(month)}.`}
        </div>
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
                  // ?sheet= tells the edit screen which year's file it's in.
                  to={`/edit/${expense.id}?sheet=${expense.spreadsheetId}`}
                  className="expense"
                >
                  <span
                    className="badge"
                    style={{
                      color: `var(--cat-${color})`,
                      background: `var(--cat-${color}-tint)`,
                    }}
                  >
                    {name.charAt(0)}
                  </span>
                  <span className="expense-text">
                    <span className="expense-note">{expense.note || name}</span>
                    <span className="expense-category">{name}</span>
                  </span>
                  <span className="expense-amount">
                    {formatMoney(expense.amount, currency)}
                  </span>
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
