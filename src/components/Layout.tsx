import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const nav: { to: string; label: string; end?: boolean }[] = [
  { to: "/", label: "Tracker", end: true },
  { to: "/activities", label: "Activities" },
  { to: "/platforms", label: "Platforms" },
  { to: "/analytics", label: "Analytics" },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <div>
            <p className="brand-title">Daily Tracker</p>
            <p className="brand-sub">Hi, {user?.name}</p>
          </div>
        </div>
        <nav className="app-nav" aria-label="Main">
          {nav.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <button type="button" className="btn btn-ghost" onClick={logout}>
          Log out
        </button>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
