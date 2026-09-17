import { motion } from "framer-motion";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Nav from "../components/Nav";
import { useAuth } from "../context/AuthContext";

export default function Auth({ mode }: { mode: "login" | "signup" }) {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (isSignup) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      const redirectTo = (location.state as { from?: string } | null)?.from ?? "/dashboard";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Nav />
      <div className="auth-shell">
        <motion.div
          className="card auth-card"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <h2>{isSignup ? "Create your account" : "Welcome back"}</h2>
          <p className="sub">
            {isSignup
              ? "Set up your profile once, fill applications everywhere."
              : "Log in to manage your resume and profile."}
          </p>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {isSignup && <div className="hint">At least 8 characters.</div>}
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <button className="btn btn-primary btn-block" disabled={busy} type="submit">
              {busy ? "Please wait..." : isSignup ? "Sign up" : "Log in"}
            </button>
          </form>

          <p style={{ marginTop: 18, fontSize: 13.5, textAlign: "center" }}>
            {isSignup ? (
              <>
                Already have an account? <Link to="/login">Log in</Link>
              </>
            ) : (
              <>
                Need an account? <Link to="/signup">Sign up</Link>
              </>
            )}
          </p>
        </motion.div>
      </div>
    </>
  );
}
