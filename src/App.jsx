import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import AddExpense from "./pages/AddExpense.jsx";
import History from "./pages/History.jsx";
import Summary from "./pages/Summary.jsx";
import Settings from "./pages/Settings.jsx";

// App decides which screen to show based on the URL.
//
// HashRouter keeps the route after a "#", like  /spendsheet/#/history.
// That works on GitHub Pages, which can't redirect unknown paths to index.html.
function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Screens inside Layout get the tab bar around them. */}
        <Route element={<Layout />}>
          <Route path="/history" element={<History />} />
          <Route path="/summary" element={<Summary />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Add expense takes the whole screen, so it sits outside Layout. */}
        <Route path="/add" element={<AddExpense />} />

        {/* Any other address (including "/") goes to History. */}
        <Route path="*" element={<Navigate to="/history" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
