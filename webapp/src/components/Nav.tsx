import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Nav() {
  const { token, logout } = useAuth();

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
        </div>
      </div>
    </div>
  );
}
