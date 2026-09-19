import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { WEBAPP_URL, fetchProfile, listApplications, login, signup, uploadResume } from "./api";
import type { Application, ApplicationStatus, FullProfile, PageInfo } from "./types";

type AuthView = "login" | "signup";
type FillState = "idle" | "working" | "done";

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  filled: "Filled",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Lets the popup be opened in a normal tab for debugging (?tab=<id>), since
// then "the active tab" would be the popup itself.
async function getActiveTabId(): Promise<number | null> {
  const forced = new URLSearchParams(location.search).get("tab");
  if (forced) return Number(forced);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id ?? null;
}

async function requestPageInfo(): Promise<PageInfo | null> {
  const id = await getActiveTabId();
  if (id == null) return null;
  try {
    return (await chrome.tabs.sendMessage(id, { type: "GET_PAGE_INFO" })) as PageInfo;
  } catch {
    return null; // restricted page (chrome://, web store) or no content script
  }
}

const icon = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const Icons = {
  gear: (
    <svg width="18" height="18" viewBox="0 0 24 24" {...icon}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  ),
  external: (
    <svg width="17" height="17" viewBox="0 0 24 24" {...icon}>
      <path d="M7 17L17 7M8 7h9v9" />
    </svg>
  ),
  back: (
    <svg width="18" height="18" viewBox="0 0 24 24" {...icon}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  ),
  chevron: (
    <svg width="16" height="16" viewBox="0 0 24 24" {...icon}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  ),
  user: (
    <svg width="18" height="18" viewBox="0 0 24 24" {...icon}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c.9-3.6 3.9-5.4 7.5-5.4s6.6 1.8 7.5 5.4" />
    </svg>
  ),
  file: (
    <svg width="18" height="18" viewBox="0 0 24 24" {...icon}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  ),
  id: (
    <svg width="18" height="18" viewBox="0 0 24 24" {...icon}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <circle cx="9" cy="11" r="2" />
      <path d="M6 16c.6-1.8 2-2.6 3-2.6s2.4.8 3 2.6M14.5 10h4M14.5 13.5h4" />
    </svg>
  ),
  board: (
    <svg width="18" height="18" viewBox="0 0 24 24" {...icon}>
      <rect x="3.5" y="4" width="5" height="16" rx="1.5" />
      <rect x="10" y="4" width="5" height="10" rx="1.5" />
      <rect x="16.5" y="4" width="4" height="13" rx="1.5" />
    </svg>
  ),
  upload: (
    <svg width="17" height="17" viewBox="0 0 24 24" {...icon}>
      <path d="M12 16V4M7 9l5-5 5 5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  ),
  check: (
    <svg width="20" height="20" viewBox="0 0 24 24" {...icon} strokeWidth={2.6}>
      <path d="M5 12.5l4.2 4.2 9.8-10" />
    </svg>
  ),
};

function Row({ icon, title, sub, dot, href }: { icon: ReactNode; title: string; sub: string; dot?: boolean; href: string }) {
  return (
    <a className="row" href={href} target="_blank" rel="noreferrer">
      <span className="row-icon">{icon}</span>
      <span className="row-text">
        <span className="row-title">{title}</span>
        <span className="row-sub">{sub}</span>
      </span>
      {dot && <span className="dot" aria-label="Needs attention" />}
      <span className="row-chevron">{Icons.chevron}</span>
    </a>
  );
}

export default function Popup() {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [page, setPage] = useState<PageInfo | null>(null);
  const [pageChecked, setPageChecked] = useState(false);
  const [track, setTrack] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [fillState, setFillState] = useState<FillState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function loadSession(activeToken: string) {
    fetchProfile(activeToken)
      .then((fresh) => {
        setProfile(fresh);
        chrome.storage.local.set({ profile: fresh });
      })
      .catch(() => {});
    listApplications(activeToken).then(setApps).catch(() => {});
    setPage(await requestPageInfo());
    setPageChecked(true);
  }

  useEffect(() => {
    chrome.storage.local.get(["token", "profile", "trackApplications"], (result) => {
      if (result.profile) setProfile(result.profile);
      if (result.trackApplications === false) setTrack(false);
      if (result.token) {
        setToken(result.token);
        void loadSession(result.token);
      }
      setReady(true);
    });
    // The web app hands its login to the extension in the background; pick it up if that happens while open.
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === "local" && changes.token?.newValue) {
        setToken(changes.token.newValue as string);
        void loadSession(changes.token.newValue as string);
      }
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, []);

  async function handleAuth(kind: AuthView) {
    setError(null);
    setBusy(true);
    try {
      if (kind === "signup") await signup(email, password);
      const newToken = await login(email, password);
      await chrome.storage.local.set({ token: newToken });
      setToken(newToken);
      await loadSession(newToken);
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
    setMessage(null);
    setBusy(true);
    try {
      await uploadResume(token, file);
      const fresh = await fetchProfile(token);
      setProfile(fresh);
      await chrome.storage.local.set({ profile: fresh });
      setMessage("Resume updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function handleFill() {
    if (!profile || !token) return;
    setError(null);
    setMessage(null);
    const tabId = await getActiveTabId();
    if (tabId == null) {
      setError("No active tab found.");
      return;
    }
    setFillState("working");
    try {
      const result = (await chrome.tabs.sendMessage(tabId, { type: "FILL_FORM", profile })) as {
        filled: number;
        attached: boolean;
      };
      if (!result.filled && !result.attached) {
        setError("Couldn't find any fields to fill on this page.");
        setFillState("idle");
        return;
      }
      setFillState("done");
      setMessage(
        `Filled ${result.filled} field${result.filled === 1 ? "" : "s"}${result.attached ? " and attached your resume" : ""}. Review, then submit.`,
      );
      setTimeout(() => listApplications(token).then(setApps).catch(() => {}), 1200);
      setTimeout(() => setFillState("idle"), 2600);
    } catch {
      setError("Couldn't reach this page. Try reloading the tab.");
      setFillState("idle");
    }
  }

  function handleTrackToggle(checked: boolean) {
    setTrack(checked);
    chrome.storage.local.set({ trackApplications: checked });
  }

  function handleLogout() {
    setToken(null);
    setProfile(null);
    setApps([]);
    setShowSettings(false);
    chrome.storage.local.remove(["token", "profile"]);
  }

  const dashboard = (hash = "") => `${WEBAPP_URL}/dashboard${hash}`;

  // ---- logged out --------------------------------------------------------
  if (ready && !token) {
    return (
      <div className="popup">
        <header className="top">
          <div className="brand">
            <span className="logo">R</span>
            <span className="wordmark">Resume Auto-Filler</span>
          </div>
        </header>

        <section className="card auth">
          <h1>Sign in to autofill</h1>
          <p className="muted">One click fills any job application and attaches your resume.</p>

          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <div className="notice error">{error}</div>}
          <button className="autofill" disabled={busy || !email || !password} onClick={() => handleAuth(view)}>
            {busy ? "Please wait..." : view === "login" ? "Log in" : "Create account"}
          </button>
          <button className="link" onClick={() => setView(view === "login" ? "signup" : "login")}>
            {view === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}
          </button>
        </section>

        <section className="card connect">
          <strong>Signed up with Google, or already logged in on the web app?</strong>
          <p className="muted">Open the web app and sign in there. This extension connects to it automatically.</p>
          <a className="btn-secondary" href={WEBAPP_URL} target="_blank" rel="noreferrer">
            Open the web app {Icons.external}
          </a>
        </section>
      </div>
    );
  }

  if (!ready) return <div className="popup" />;

  // ---- settings ----------------------------------------------------------
  if (showSettings) {
    return (
      <div className="popup">
        <header className="top">
          <button className="icon-btn" onClick={() => setShowSettings(false)} aria-label="Back">
            {Icons.back}
          </button>
          <div className="brand">
            <span className="wordmark">Settings</span>
          </div>
          <span className="icon-btn ghost" />
        </header>

        <section className="card">
          <label className="switch-row">
            <span>
              <span className="row-title">Track my applications</span>
              <span className="row-sub">Log pages you fill, and mark them Applied when the page confirms your submission.</span>
            </span>
            <input type="checkbox" checked={track} onChange={(e) => handleTrackToggle(e.target.checked)} />
          </label>
        </section>

        <a className="btn-secondary" href={dashboard()} target="_blank" rel="noreferrer">
          Open my dashboard {Icons.external}
        </a>
        <button className="btn-secondary danger" onClick={handleLogout}>
          Log out
        </button>
      </div>
    );
  }

  // ---- main --------------------------------------------------------------
  const resume = profile?.resume;
  const file = profile?.resume_file ?? null;
  const detected = Boolean(page?.looksLikeApplication);
  const tracked = page?.url ? apps.find((a) => a.url === page.url) : undefined;
  const missingDetails = !resume || !resume.first_name || !resume.email || !resume.phone;
  const eeoSet = profile ? Object.values(profile.eeo).filter(Boolean).length : 0;
  const interviewing = apps.filter((a) => a.status === "interviewing").length;
  const canFill = Boolean(profile?.has_resume) && page !== null && fillState !== "working";

  const buttonLabel =
    fillState === "working" ? "Filling..." : fillState === "done" ? "Filled" : detected ? "Autofill" : "Autofill anyway";
  const subline = !profile?.has_resume
    ? "Upload your resume first."
    : page === null
      ? "Can't run on this page."
      : detected
        ? `Fills ${page.fields} field${page.fields === 1 ? "" : "s"}${file ? ` · attaches ${file.name}` : ""}`
        : "Tries to fill any fields that match your profile.";

  return (
    <div className="popup">
      <header className="top">
        <div className="brand">
          <span className="logo">R</span>
          <span className="wordmark">Resume Auto-Filler</span>
        </div>
        <div className="top-actions">
          <a className="icon-btn" href={dashboard()} target="_blank" rel="noreferrer" title="Open dashboard" aria-label="Open dashboard">
            {Icons.external}
          </a>
          <button className="icon-btn" onClick={() => setShowSettings(true)} title="Settings" aria-label="Settings">
            {Icons.gear}
          </button>
        </div>
      </header>

      {!pageChecked ? (
        <section className="card job skeleton" />
      ) : page && detected ? (
        <section className="card job">
          <div className="job-head">
            <span className="avatar">{(page.company || "?").charAt(0).toUpperCase()}</span>
            <span className="job-meta">
              <span className="job-company">{page.company}</span>
              <span className="job-host">{page.host}</span>
            </span>
            {tracked && <span className={`chip chip-${tracked.status}`}>{STATUS_LABEL[tracked.status]}</span>}
          </div>
          <h2 className="job-role">{page.role ?? "Job application"}</h2>
          <div className="job-foot">
            <span>{page.fields} fields found</span>
            {page.hasResumeInput && <span>Resume upload found</span>}
          </div>
        </section>
      ) : (
        <section className="card job empty">
          <strong>{page ? "No job application detected" : "Can't run on this page"}</strong>
          <span className="muted">
            {page
              ? "Open an application form and the R button appears in the corner, and this popup shows the job."
              : "Browser pages and the Web Store can't be autofilled."}
          </span>
        </section>
      )}

      <button className={`autofill${detected ? "" : " secondary"}${fillState === "done" ? " done" : ""}`} disabled={!canFill} onClick={handleFill}>
        {fillState === "done" && Icons.check}
        {buttonLabel}
      </button>
      <div className="autofill-sub">{subline}</div>

      {error && <div className="notice error">{error}</div>}
      {message && <div className="notice ok">{message}</div>}

      <section className="card list">
        <Row
          icon={Icons.user}
          title="Your autofill information"
          sub={resume?.first_name || resume?.email ? [[resume.first_name, resume.last_name].filter(Boolean).join(" "), resume.email].filter(Boolean).join(" · ") : "Add your details"}
          dot={missingDetails}
          href={dashboard("#details")}
        />
        <Row
          icon={Icons.file}
          title="Resume"
          sub={file ? `${file.name} · ${formatBytes(file.size)}` : "No PDF on file. Upload one so I can attach it."}
          dot={!file}
          href={dashboard("#resume")}
        />
        <button className="upload-btn" onClick={() => fileInput.current?.click()} disabled={busy}>
          {Icons.upload}
          {busy ? "Uploading..." : file ? "Upload a new resume" : "Upload your resume"}
        </button>
        <input ref={fileInput} type="file" accept="application/pdf" hidden onChange={handleUpload} />
        <Row icon={Icons.id} title="Voluntary info" sub={`${eeoSet} of 5 answered`} href={dashboard("#eeo")} />
        <Row
          icon={Icons.board}
          title="Applications"
          sub={apps.length ? `${apps.length} tracked${interviewing ? ` · ${interviewing} interviewing` : ""}` : "Nothing tracked yet"}
          href={dashboard("#applications")}
        />
      </section>

      <a className="footer-link" href={dashboard()} target="_blank" rel="noreferrer">
        Open my dashboard
      </a>
    </div>
  );
}
