import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function Nav() {
  const { token, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="nav">
      <div className="container nav-inner">
        <Link to="/" className="nav-brand">
          <span className="nav-badge">R</span>
          Resume Auto-Filler
        </Link>
        <div className="nav-links">
          {token ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <button className="btn-ghost" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/signup" className="btn btn-primary" style={{ padding: "9px 18px" }}>
                Get started
              </Link>
            </>
          )}
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </div>
    </div>
  );
}
