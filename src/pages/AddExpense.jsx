import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import { addExpense, getCategories } from "../data/store.js";
import { todayISO } from "../lib/dates.js";
import { formatAmountInput, pressKey } from "../lib/money.js";
import "./AddExpense.css";

// The keypad's 12 keys, in the order they appear (3 per row).
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];

function AddExpense() {
  const navigate = useNavigate(); // lets us change screens from code

  // Everything the user can change on this screen lives in state.
  const [categories, setCategories] = useState([]);
  const [amountText, setAmountText] = useState(""); // e.g. "1240.5"
  const [categoryId, setCategoryId] = useState("food");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Load the categories to show as chips. Removed ones (active: false) are skipped.
  useEffect(() => {
    getCategories().then((list) =>
      setCategories(list.filter((category) => category.active)),
    );
  }, []);

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
    await addExpense({ amount, categoryId, date, note: note.trim() });
    navigate("/history");
  }

  return (
    <form className="add" onSubmit={handleSave}>
      <div className="add-head">
        <Link to="/history" className="icon-button" aria-label="Close">
          <Icon name="close" />
        </Link>
        <h1 className="add-title">Add expense</h1>
        <span className="icon-button" /> {/* empty space to keep the title centered */}
      </div>

      <div className="amount">
        <span className="muted">Amount</span>
        <div className="amount-value">
          <span className="amount-symbol">₹</span>
          <span className={amountText === "" ? "amount-digits empty" : "amount-digits"}>
            {formatAmountInput(amountText)}
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

      <button type="submit" className="btn-primary save" disabled={!canSave}>
        {saving ? "Saving…" : "Save expense"}
      </button>
    </form>
  );
}

export default AddExpense;
