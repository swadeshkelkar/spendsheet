import { useEffect, useState } from "react";
import { getExpenses } from "../data/store.js";

function History() {
  // Starts as an empty list; filled in once the data has loaded.
  const [expenses, setExpenses] = useState([]);

  // Runs once, after the screen first appears: load the expenses, then put
  // them in state, which redraws the screen with the real count.
  useEffect(() => {
    getExpenses().then((list) => setExpenses(list));
  }, []);

  return (
    <div className="page">
      <h1 className="page-title">History</h1>
      <p className="muted">{expenses.length} sample expenses loaded. The list arrives in step 5.</p>
    </div>
  );
}

export default History;
