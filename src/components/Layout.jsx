import { NavLink, Outlet } from "react-router-dom";
import Icon from "./Icon.jsx";
import "./Layout.css";

// The three main tabs. To add a tab, add an entry here and a matching <Route> in App.jsx.
const TABS = [
  { to: "/history", label: "History", icon: "list" },
  { to: "/summary", label: "Summary", icon: "chart" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

// The frame around every main screen: the navigation plus the current screen.
// Phones get a tab bar at the bottom; wide screens get a sidebar (see Layout.css).
function Layout() {
  return (
    <div className="shell">
      <nav className="nav" aria-label="Main">
        <div className="nav-brand">Spendsheet</div>
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} className="nav-link">
            <Icon name={tab.icon} />
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <main className="shell-main">
        {/* The screen that matches the current URL is drawn here. */}
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
