import { motion } from "framer-motion";
import { useCallback, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import GoogleSignInButton, { GOOGLE_SIGNIN_ENABLED } from "../components/GoogleSignInButton";
import Nav from "../components/Nav";
import { useAuth } from "../context/AuthContext";

export default function Auth({ mode }: { mode: "login" | "signup" }) {
  const { login, loginWithGoogle, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";

  function goToRedirect() {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? "/dashboard";
    navigate(redirectTo, { replace: true });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (isSignup) {
        await signup(email, password);
        sessionStorage.setItem("resumeAutoFiller.justSignedUp", "1");
      } else {
        await login(email, password);
      }
      goToRedirect();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      setError(null);
      setBusy(true);
      try {
        const { isNewUser } = await loginWithGoogle(credential);
        if (isNewUser) sessionStorage.setItem("resumeAutoFiller.justSignedUp", "1");
        goToRedirect();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Google sign-in failed");
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loginWithGoogle],
  );

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

          {GOOGLE_SIGNIN_ENABLED && (
            <>
              <div className="auth-divider">
                <span>or</span>
              </div>
              <GoogleSignInButton onCredential={handleGoogleCredential} />
            </>
          )}

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
