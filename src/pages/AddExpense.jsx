import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import {
  addExpense,
  deleteExpense,
  getCategories,
  getExpenses,
  getSettings,
  updateExpense,
} from "../data/store.js";
import { todayISO } from "../lib/dates.js";
import { currencySymbol, formatAmountInput, pressKey } from "../lib/money.js";
import "./AddExpense.css";

// The keypad's 12 keys, in the order they appear (3 per row).
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];

// One screen for both adding (/add) and editing (/edit/some-id).
function AddExpense() {
  const navigate = useNavigate(); // lets us change screens from code
  const { id } = useParams(); // the ":id" part of /edit/:id, or undefined on /add
  const isEditing = id !== undefined;
  // Coming back from the Categories screen, the half-filled form is in here.
  const draft = useLocation().state?.draft;

  // "loading" → "ready", or "missing" if the expense to edit doesn't exist.
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  // Everything the user can change on this screen lives in state.
  const [categories, setCategories] = useState([]);
  const [currency, setCurrency] = useState("INR");
  // Each starts from the draft if there is one. ?? means "if that's missing, use this".
  const [amountText, setAmountText] = useState(draft?.amountText ?? ""); // e.g. "1240.5"
  const [categoryId, setCategoryId] = useState(draft?.categoryId ?? "food");
  const [date, setDate] = useState(draft?.date ?? todayISO());
  const [note, setNote] = useState(draft?.note ?? "");
  const [saving, setSaving] = useState(false);

  // Load categories. When editing, also find the expense and fill in the form.
  useEffect(() => {
    Promise.all([getCategories(), getExpenses(), getSettings()]).then(
      ([categoryList, expenseList, settings]) => {
        setCurrency(settings.currency);

        const existing = id
          ? expenseList.find((expense) => expense.id === id)
          : null;

        if (id && !existing) {
          setStatus("missing");
          return;
        }

        // Removed categories are hidden, except the one this expense already uses.
        const shown = categoryList.filter(
          (category) => category.active || category.id === existing?.categoryId,
        );
        setCategories(shown);
        // If the selected category isn't on screen (say Food was removed),
        // select the first one instead.
        setCategoryId((current) =>
          shown.some((category) => category.id === current) ? current : shown[0].id,
        );

        if (existing) {
          setAmountText(String(existing.amount)); // 1240.5 → "1240.5"
          setCategoryId(existing.categoryId);
          setDate(existing.date);
          setNote(existing.note);
        }
        setStatus("ready");
      },
    );
  }, [id]); // run again if the URL switches to a different expense

  // On a computer, let the number keys and Backspace work like the keypad.
  useEffect(() => {
    function handleKeyDown(event) {
      // Typing in the note or date field? Leave those keys alone.
      if (event.target.tagName === "INPUT") return;

      if (/^[0-9.]$/.test(event.key)) {
        setAmountText((text) => pressKey(text, event.key));
      } else if (event.key === "Backspace") {
        setAmountText((text) => pressKey(text, "back"));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    // Cleanup: stop listening when we leave this screen.
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const amount = Number(amountText); // "1240.5" → 1240.5, "" → 0
  const canSave = amount > 0 && !saving;

  async function handleSave(event) {
    event.preventDefault(); // stop the browser's default form submit (a page reload)
    if (!canSave) return;

    setSaving(true); // disables the button so a double tap can't save twice
    setError("");
    const input = { amount, categoryId, date, note: note.trim() };

    try {
      if (isEditing) {
        await updateExpense(id, input);
      } else {
        await addExpense(input);
      }
      navigate("/history");
    } catch (problem) {
      setError(problem.message); // e.g. the expense was deleted meanwhile
      setSaving(false);
    }
  }

  async function handleDelete() {
    // window.confirm shows the browser's OK / Cancel box and returns true or false.
    if (!window.confirm("Delete this expense?")) return;

    try {
      await deleteExpense(id);
      navigate("/history");
    } catch (problem) {
      setError(problem.message);
    }
  }

  // ---------- What to show ----------
  // These early returns come after all the hooks above. React needs every
  // hook to run on every draw, in the same order, so hooks can't sit below
  // a return that only happens sometimes.

  if (status === "loading") {
    return <div className="add muted">Loading…</div>;
  }

  if (status === "missing") {
    return (
      <div className="add">
        <p>This expense no longer exists. It may have been deleted.</p>
        <Link to="/history">Back to history</Link>
      </div>
    );
  }

  return (
    <form className="add" onSubmit={handleSave}>
      <div className="add-head">
        <Link to="/history" className="icon-button" aria-label="Close">
          <Icon name="close" />
        </Link>
        <h1 className="add-title">{isEditing ? "Edit expense" : "Add expense"}</h1>
        <span className="icon-button" /> {/* empty space to keep the title centered */}
      </div>

      <div className="amount">
        <span className="muted">Amount</span>
        <div className="amount-value">
          <span className="amount-symbol">{currencySymbol(currency)}</span>
          <span className={amountText === "" ? "amount-digits empty" : "amount-digits"}>
            {formatAmountInput(amountText, currency)}
          </span>
        </div>
      </div>

      <div className="chips" role="radiogroup" aria-label="Category">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            role="radio"
            aria-checked={category.id === categoryId}
            className="chip"
            onClick={() => setCategoryId(category.id)}
          >
            <span className="dot" style={{ background: `var(--cat-${category.color})` }} />
            {category.name}
          </button>
        ))}

        {/* "+ New" opens the Categories screen and takes the form along,
            so nothing typed so far is lost. (Only when adding, not editing.) */}
        {!isEditing && (
          <Link
            to="/settings/categories"
            state={{ draft: { amountText, categoryId, date, note } }}
            className="chip chip-new"
          >
            <Icon name="plus" size={16} />
            New
          </Link>
        )}
      </div>

      <div className="fields">
        <label className="field">
          <Icon name="calendar" size={18} />
          <span className="visually-hidden">Date</span>
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(event) => setDate(event.target.value || todayISO())}
          />
        </label>
        <label className="field">
          <Icon name="pencil" size={18} />
          <span className="visually-hidden">Note</span>
          <input
            type="text"
            placeholder="Add a note (optional)"
            value={note}
            maxLength={120}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
      </div>

      <div className="keypad">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            aria-label={key === "back" ? "Delete digit" : key}
            onClick={() => setAmountText((text) => pressKey(text, key))}
          >
            {key === "back" ? <Icon name="backspace" /> : key}
          </button>
        ))}
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary save" disabled={!canSave}>
        {saving ? "Saving…" : isEditing ? "Save changes" : "Save expense"}
      </button>

      {isEditing && (
        <button type="button" className="delete" onClick={handleDelete}>
          Delete expense
        </button>
      )}
    </form>
  );
}

export default AddExpense;
