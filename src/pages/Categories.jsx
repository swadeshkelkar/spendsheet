import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import {
  CATEGORY_COLORS,
  addCategory,
  getCategories,
  removeCategory,
} from "../data/store.js";
import "./Categories.css";

function Categories() {
  const navigate = useNavigate();
  // Set when we were opened from the Add screen's "+ New" chip: the half-filled
  // expense form, so we can hand it back afterwards.
  const draft = useLocation().state?.draft;

  const [categories, setCategories] = useState(null); // null = still loading
  const [name, setName] = useState("");
  const [color, setColor] = useState(null); // null = "use the suggested color"
  const [error, setError] = useState("");

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  if (categories === null) {
    return (
      <div className='page'>
        <p className='muted'>Loading…</p>
      </div>
    );
  }

  const active = categories.filter((category) => category.active);

  // Suggest the first color no active category uses yet (or teal if all are
  // taken). Worked out on every draw, so it updates after each add or remove.
  const usedColors = active.map((category) => category.color);
  const suggestedColor =
    CATEGORY_COLORS.find((item) => !usedColors.includes(item)) || "teal";
  const chosenColor = color || suggestedColor;

  async function handleAdd(event) {
    event.preventDefault();
    setError("");
    try {
      const category = await addCategory({ name, color: chosenColor });

      if (draft) {
        // Back to the Add screen with the form as it was, and the new category picked.
        navigate("/add", {
          state: { draft: { ...draft, categoryId: category.id } },
        });
        return;
      }

      setCategories(await getCategories()); // show the updated list
      setName("");
      setColor(null);
    } catch (problem) {
      setError(problem.message); // e.g. "You already have a category called Food."
    }
  }

  async function handleRemove(category) {
    const ok = window.confirm(
      `Remove ${category.name}? Past expenses keep it, but it won't be offered for new ones.`,
    );
    if (!ok) return;

    try {
      await removeCategory(category.id);
      setCategories(await getCategories());
    } catch (problem) {
      setError(problem.message);
    }
  }

  return (
    <div className='page'>
      {/* From the Add screen, "back" returns there with the form restored. */}
      {draft ? (
        <Link to='/add' state={{ draft }} className='back-link'>
          <Icon name='back' size={18} /> Add expense
        </Link>
      ) : (
        <Link to='/settings' className='back-link'>
          <Icon name='back' size={18} /> Settings
        </Link>
      )}

      <h1 className='page-title'>Categories</h1>

      <div className='card category-list'>
        {active.map((category) => (
          <div key={category.id} className='category-item'>
            <span
              className='category-swatch'
              style={{ background: `var(--cat-${category.color})` }}
            />
            <span className='category-label'>{category.name}</span>
            {category.id === "other" ? (
              <span className='muted category-locked'>Always kept</span>
            ) : (
              <button
                type='button'
                className='remove-button'
                onClick={() => handleRemove(category)}
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      <form className='card new-category' onSubmit={handleAdd}>
        <h2 className='new-category-title'>New category</h2>

        <input
          className='text-input'
          type='text'
          placeholder='Name, e.g. Eating out'
          aria-label='Category name'
          value={name}
          maxLength={24}
          onChange={(event) => setName(event.target.value)}
        />

        <div className='swatches' role='radiogroup' aria-label='Color'>
          {CATEGORY_COLORS.map((item) => (
            <button
              key={item}
              type='button'
              role='radio'
              aria-label={item}
              aria-checked={item === chosenColor}
              className='swatch'
              style={{ background: `var(--cat-${item})` }}
              onClick={() => setColor(item)}
            />
          ))}
        </div>

        {error && (
          <p className='form-error' role='alert'>
            {error}
          </p>
        )}

        <button
          type='submit'
          className='btn-primary'
          disabled={name.trim() === ""}
        >
          Add category
        </button>
      </form>
    </div>
  );
}

export default Categories;
