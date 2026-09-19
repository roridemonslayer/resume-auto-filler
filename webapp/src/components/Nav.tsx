import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { ArrowUpRightIcon, MoonIcon, SunIcon } from "./Icons";

export default function Nav() {
  const { token, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="nav">
      <div className="nav-inner">
        <Link to="/" className="nav-brand">
          <span className="nav-badge">R</span>
          <span className="nav-name">Resume Auto-Filler</span>
        </Link>
        <div className="nav-links">
          {token ? (
            <>
              <Link to="/dashboard" className="nav-link">
                Dashboard
              </Link>
              <button className="btn btn-secondary btn-sm" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                Log in
              </Link>
              <Link to="/signup" className="btn btn-primary btn-sm">
                Get started
                <span className="btn-icon" style={{ width: 20, height: 20 }}>
                  <ArrowUpRightIcon size={12} />
                </span>
              </Link>
            </>
          )}
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </div>
  );
}
