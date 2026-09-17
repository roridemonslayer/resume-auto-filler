import { useEffect, useState } from "react";
import { WEBAPP_URL, fetchProfile, login, signup, uploadResume } from "./api";
import type { FullProfile } from "./types";

type View = "login" | "signup";

function initials(first: string | null, last: string | null): string {
  const a = first?.[0] ?? "";
  const b = last?.[0] ?? "";
  return (a + b).toUpperCase() || "R";
}

export default function Popup() {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(["token", "profile"], (result) => {
      if (result.token) setToken(result.token);
      if (result.profile) setProfile(result.profile);
    });
  }, []);

  async function handleAuth(kind: View) {
    setError(null);
    setBusy(true);
    try {
      if (kind === "signup") {
        await signup(email, password);
      }
      const newToken = await login(email, password);
      setToken(newToken);
      await chrome.storage.local.set({ token: newToken });

      const fullProfile = await fetchProfile(newToken);
      setProfile(fullProfile);
      await chrome.storage.local.set({ profile: fullProfile });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setError(null);
    setStatus(null);
    setBusy(true);
    try {
      await uploadResume(token, file);
      const fullProfile = await fetchProfile(token);
      setProfile(fullProfile);
      await chrome.storage.local.set({ profile: fullProfile });
      setStatus("Resume parsed! Ready to fill applications.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function handleFill() {
    if (!profile) return;
    setError(null);
    setStatus(null);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setError("No active tab found");
      return;
    }

    try {
      await chrome.tabs.sendMessage(tab.id, { type: "FILL_FORM", profile });
      setStatus("Filled! Review the fields, then submit yourself.");
    } catch {
      setError("Couldn't reach this page. Try reloading the tab.");
    }
  }

  function handleLogout() {
    setToken(null);
    setProfile(null);
    chrome.storage.local.remove(["token", "profile"]);
  }

  const resume = profile?.resume;

  return (
    <div className="app">
      <div className="hero">
        <div className="brand">
          <div className="brand-badge">R</div>
          <h1>Resume Auto-Filler</h1>
        </div>
        <p className="tagline">
          {token ? "One click, every field." : "Sign in to start filling applications."}
        </p>
      </div>

      <div className="body">
        {!token ? (
          <>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <div className="error">{error}</div>}

            <button className="btn-primary" disabled={busy} onClick={() => handleAuth(view)}>
              {busy ? "Please wait..." : view === "login" ? "Log in" : "Sign up"}
            </button>

            <div className="footer-row">
              <button
                className="btn-link"
                onClick={() => setView(view === "login" ? "signup" : "login")}
              >
                {view === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}
              </button>
            </div>
          </>
        ) : (
          <>
            {profile?.has_resume && resume ? (
              <div className="profile-card">
                <div className="avatar">{initials(resume.first_name, resume.last_name)}</div>
                <div className="profile-info">
                  <div className="name">
                    {resume.first_name} {resume.last_name}
                  </div>
                  <div className="row">{resume.email || "No email found"}</div>
                  <div className="row">{resume.phone || "No phone found"}</div>
                  <span className="chip">{resume.skills.length} skills detected</span>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="icon">📄</div>
                Upload your resume to get started.
              </div>
            )}

            <div className="field">
              <label htmlFor="resume">
                {profile?.has_resume ? "Replace resume (PDF)" : "Upload resume (PDF)"}
              </label>
              <input
                id="resume"
                type="file"
                accept="application/pdf"
                onChange={handleUpload}
                disabled={busy}
              />
            </div>

            {error && <div className="error">{error}</div>}
            {status && <div className="status">{status}</div>}

            <button className="btn-primary" disabled={!profile?.has_resume || busy} onClick={handleFill}>
              Fill Application
            </button>

            <a className="webapp-link" href={WEBAPP_URL} target="_blank" rel="noreferrer">
              Manage full profile & EEO info →
            </a>

            <hr className="divider" />
            <button className="btn-link" onClick={handleLogout}>
              Log out
            </button>
          </>
        )}
      </div>
    </div>
  );
}
