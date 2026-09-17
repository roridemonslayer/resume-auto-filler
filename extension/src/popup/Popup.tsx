import { useEffect, useState } from "react";
import { fetchProfile, login, signup, uploadResume } from "./api";
import type { ResumeProfile } from "./types";

type View = "login" | "signup";

export default function Popup() {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<ResumeProfile | null>(null);
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

      const existingProfile = await fetchProfile(newToken);
      if (existingProfile) {
        setProfile(existingProfile);
        await chrome.storage.local.set({ profile: existingProfile });
      }
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
      const newProfile = await uploadResume(token, file);
      setProfile(newProfile);
      await chrome.storage.local.set({ profile: newProfile });
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

  return (
    <div className="app">
      <div className="brand">
        <div className="brand-badge">R</div>
        <h1>Resume Auto-Filler</h1>
      </div>

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
          {profile ? (
            <div className="profile-summary">
              <div className="name">
                {profile.first_name} {profile.last_name}
              </div>
              <div className="row">{profile.email || "No email found"}</div>
              <div className="row">{profile.phone || "No phone found"}</div>
              <div className="row">{profile.skills.length} skills detected</div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              Upload your resume to get started.
            </p>
          )}

          <div className="field">
            <label htmlFor="resume">{profile ? "Replace resume (PDF)" : "Upload resume (PDF)"}</label>
            <input id="resume" type="file" accept="application/pdf" onChange={handleUpload} disabled={busy} />
          </div>

          {error && <div className="error">{error}</div>}
          {status && <div className="status">{status}</div>}

          <button className="btn-primary" disabled={!profile || busy} onClick={handleFill}>
            Fill Application
          </button>

          <hr className="divider" />
          <button className="btn-link" onClick={handleLogout}>
            Log out
          </button>
        </>
      )}
    </div>
  );
}
