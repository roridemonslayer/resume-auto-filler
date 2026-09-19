import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Nav from "../components/Nav";
import ApplicationTracker, { useApplications } from "../components/ApplicationTracker";
import {
  ArrowUpRightIcon,
  BoardIcon,
  DocumentIcon,
  IdBadgeIcon,
  OverviewIcon,
  PuzzleIcon,
  UploadIcon,
  UserIcon,
} from "../components/Icons";
import ProfileEditor from "../components/ProfileEditor";
import { useAuth } from "../context/AuthContext";
import { updateDemographics, uploadResume } from "../lib/api";
import { EEO_FIELDS } from "../lib/eeoOptions";
import type { EeoProfile } from "../lib/types";

const SECTIONS = [
  { id: "overview", label: "Overview", Icon: OverviewIcon },
  { id: "resume", label: "Resume", Icon: DocumentIcon },
  { id: "details", label: "Profile details", Icon: UserIcon },
  { id: "applications", label: "Applications", Icon: BoardIcon },
  { id: "eeo", label: "Voluntary info", Icon: IdBadgeIcon },
  { id: "extension", label: "Extension", Icon: PuzzleIcon },
];

function initials(first: string | null, last: string | null): string {
  const a = first?.[0] ?? "";
  const b = last?.[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

function cardMotion(index: number) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, delay: index * 0.08, ease: "easeOut" as const },
    whileHover: { y: -3 },
  };
}

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const count = useMotionValue(0);
  const display = useTransform(count, (v) => `${Math.round(v)}${suffix}`);

  useEffect(() => {
    const controls = animate(count, value, { duration: 0.7, ease: "easeOut" });
    return controls.stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <motion.span>{display}</motion.span>;
}

const SCROLLSPY_TOP_OFFSET = 100;

function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState(ids[0]);

  useEffect(() => {
    // IntersectionObserver's callback only reports entries whose state
    // just changed, not every currently-observed target -- so a batch
    // can report an unrelated section exiting while giving no signal
    // about the section that's actually now on screen, leaving `active`
    // stuck. Measuring directly on scroll avoids that entirely: walk
    // the sections in order and keep whichever one's top has most
    // recently crossed the tracking line -- that's the one we're "in".
    function computeActive() {
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top - SCROLLSPY_TOP_OFFSET <= 0) {
          current = id;
        }
      }
      setActive(current);
    }

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        computeActive();
        ticking = false;
      });
    }

    computeActive();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);

  return active;
}

export default function Dashboard() {
  const { token, profile, refreshProfile } = useAuth();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const sectionIds = useRef(SECTIONS.map((s) => s.id)).current;
  const activeSection = useActiveSection(sectionIds);
  const tracker = useApplications(token);
  const [showWelcome, setShowWelcome] = useState(
    () => sessionStorage.getItem("resumeAutoFiller.justSignedUp") === "1",
  );

  function dismissWelcome() {
    sessionStorage.removeItem("resumeAutoFiller.justSignedUp");
    setShowWelcome(false);
  }

  const [demographics, setDemographics] = useState<EeoProfile>(
    profile?.eeo ?? {
      veteran_status: null,
      disability_status: null,
      gender: null,
      race_ethnicity: null,
      sexual_orientation: null,
    },
  );
  const [savingDemographics, setSavingDemographics] = useState(false);
  const [demographicsStatus, setDemographicsStatus] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.eeo) setDemographics(profile.eeo);
  }, [profile?.eeo]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setUploadError(null);
    setUploadStatus(null);
    setUploading(true);
    try {
      await uploadResume(token, file);
      await refreshProfile();
      setUploadStatus("Resume parsed successfully.");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSaveDemographics(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSavingDemographics(true);
    setDemographicsStatus(null);
    try {
      await updateDemographics(token, demographics);
      await refreshProfile();
      setDemographicsStatus("Saved.");
    } finally {
      setSavingDemographics(false);
    }
  }

  const resume = profile?.resume;

  const filledResumeFields = resume
    ? [resume.first_name, resume.last_name, resume.email, resume.phone].filter(Boolean).length
    : 0;
  const profileCompleteness = Math.round((filledResumeFields / 4) * 100);
  const eeoSetCount = Object.values(demographics).filter(Boolean).length;

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const firstName = resume?.first_name;
  const eeoTotal = Object.keys(demographics).length;
  const interviewingCount = tracker.apps.filter((a) => a.status === "interviewing").length;
  const offerCount = tracker.apps.filter((a) => a.status === "offer").length;

  return (
    <>
      <Nav />
      <div className="container app-shell">
        <nav className="sidebar">
          {SECTIONS.map(({ id, label, Icon }) => {
            const isActive = activeSection === id;
            return (
              <button
                key={id}
                className={`sidebar-link${isActive ? " active" : ""}`}
                onClick={() => scrollToSection(id)}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-pill"
                    className="sidebar-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="sidebar-link-content">
                  <Icon />
                  {label}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="dashboard-main">
          {showWelcome && (
            <motion.div
              className="alert alert-success"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
            >
              <span>Account created — welcome to Resume Auto-Filler!</span>
              <button className="btn-ghost" onClick={dismissWelcome}>
                Dismiss
              </button>
            </motion.div>
          )}

          <div id="overview">
            <span className="eyebrow">Overview</span>
            <h1 className="dash-title">
              {firstName ? (
                <>
                  Hey, <span className="accent">{firstName}.</span>
                </>
              ) : (
                <>
                  Your <span className="accent">profile.</span>
                </>
              )}
            </h1>
            <p className="dash-sub">This is everything the extension will fill in for you.</p>

            <div className="stat-grid">
              <motion.div className="stat-card tone-lime" whileHover={{ y: -6 }}>
                <div className="stat-label">Skills detected</div>
                <div className="stat-value">
                  <CountUp value={resume?.skills.length ?? 0} />
                </div>
                <div className="stat-sub">from your uploaded resume</div>
              </motion.div>
              <motion.div className="stat-card tone-lilac" whileHover={{ y: -6 }}>
                <div className="stat-label">Profile complete</div>
                <div className="stat-value">
                  {profile?.has_resume ? <CountUp value={profileCompleteness} suffix="%" /> : "--"}
                </div>
                <div className="meter">
                  <motion.span
                    initial={{ width: 0 }}
                    animate={{ width: `${profile?.has_resume ? profileCompleteness : 0}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
                <div className="stat-sub">name, email, phone on file</div>
              </motion.div>
              <motion.div className="stat-card tone-peach" whileHover={{ y: -6 }}>
                <div className="stat-label">Voluntary info set</div>
                <div className="stat-value">
                  <CountUp value={eeoSetCount} suffix={`/${eeoTotal}`} />
                </div>
                <div className="dots" aria-hidden="true">
                  {Array.from({ length: eeoTotal }, (_, i) => (
                    <span key={i} className={i < eeoSetCount ? "on" : ""} />
                  ))}
                </div>
                <div className="stat-sub">EEO fields answered</div>
              </motion.div>
              <motion.div className="stat-card tone-sky" whileHover={{ y: -6 }}>
                <div className="stat-label">Applications</div>
                <div className="stat-value">
                  <CountUp value={tracker.apps.length} />
                </div>
                <div className="stat-sub">
                  {tracker.apps.length === 0
                    ? "tracked once you fill or add one"
                    : `${interviewingCount} interviewing · ${offerCount} offer${offerCount === 1 ? "" : "s"}`}
                </div>
              </motion.div>
            </div>
          </div>

          <motion.div id="resume" className="card" {...cardMotion(0)}>
            <div className="dash-card-head">
              <div>
                <span className="eyebrow">01 — Resume</span>
                <h2>{profile?.has_resume ? "Your resume" : "Upload your resume"}</h2>
              </div>
            </div>

            {profile?.has_resume && resume ? (
              <div className="profile-summary">
                <div className="avatar-lg">{initials(resume.first_name, resume.last_name)}</div>
                <div>
                  <div className="profile-name">
                    {resume.first_name} {resume.last_name}
                  </div>
                  <div className="profile-contact">
                    {resume.email || "No email found"} · {resume.phone || "No phone found"}
                  </div>
                  <div className="skill-chip-row">
                    {resume.skills.slice(0, 8).map((skill) => (
                      <span className="skill-chip" key={skill}>
                        {skill}
                      </span>
                    ))}
                    {resume.skills.length > 8 && (
                      <span className="skill-chip skill-chip-more">+{resume.skills.length - 8} more</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-hint">No resume uploaded yet — drop a PDF below to get started.</div>
            )}

            <label className={`dropzone${uploading ? " busy" : ""}`} htmlFor="resume-file">
              <span className="dropzone-icon">
                <UploadIcon />
              </span>
              <span className="dropzone-title">
                {uploading ? "Parsing your resume…" : profile?.has_resume ? "Replace your resume" : "Drop your resume here"}
              </span>
              <span className="dropzone-sub">PDF only — click to browse or drag a file in</span>
              <input id="resume-file" type="file" accept="application/pdf" onChange={handleUpload} disabled={uploading} />
            </label>

            {uploadError && <div className="alert alert-error" style={{ marginTop: 16 }}>{uploadError}</div>}
            {uploadStatus && <div className="alert alert-success" style={{ marginTop: 16 }}>{uploadStatus}</div>}
          </motion.div>

          <motion.div id="details" className="card" {...cardMotion(1)}>
            <div className="dash-card-head">
              <div>
                <span className="eyebrow">02 — Profile details</span>
                <h2>What we parsed</h2>
              </div>
            </div>
            <p style={{ marginBottom: 26, fontSize: 15.5, maxWidth: "62ch" }}>
              Everything the extension can fill in, straight from your resume. Fix anything the
              parser got wrong, or add what it missed.
            </p>
            <ProfileEditor token={token} resume={resume} hasResume={Boolean(profile?.has_resume)} onSaved={refreshProfile} />
          </motion.div>

          <motion.div id="applications" className="card" {...cardMotion(2)}>
            <div className="dash-card-head">
              <div>
                <span className="eyebrow">03 — Applications</span>
                <h2>Where you've applied</h2>
              </div>
            </div>
            <p style={{ marginBottom: 26, fontSize: 15.5, maxWidth: "62ch" }}>
              Applications track themselves. The extension logs a page when you fill it and moves it
              to Applied when it sees your submission confirmation. After that, drag cards between
              columns as things move along.
            </p>
            <ApplicationTracker tracker={tracker} />
          </motion.div>

          <motion.div id="eeo" className="card" {...cardMotion(3)}>
            <div className="dash-card-head">
              <div>
                <span className="eyebrow">04 — Voluntary info</span>
                <h2>Voluntary identity information</h2>
              </div>
              <span className="badge">Optional</span>
            </div>
            <p style={{ marginBottom: 26, fontSize: 15.5, maxWidth: "62ch" }}>
              Some applications include optional EEO (Equal Employment Opportunity) questions.
              Answering here lets the extension complete them for you. Every field is unset by
              default -- leave any blank to skip it, or choose "I don't wish to answer" if you want
              the extension to actively select that option.
            </p>

            <form onSubmit={handleSaveDemographics}>
              <div className="eeo-grid">
                {EEO_FIELDS.map((field) => (
                  <div className="field" key={field.key}>
                    <label htmlFor={field.key}>{field.label}</label>
                    <select
                      id={field.key}
                      value={demographics[field.key] ?? ""}
                      onChange={(e) =>
                        setDemographics((prev) => ({
                          ...prev,
                          [field.key]: e.target.value || null,
                        }))
                      }
                    >
                      <option value="">Not set (won't be filled)</option>
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    {field.hint && <div className="hint">{field.hint}</div>}
                  </div>
                ))}
              </div>

              {demographicsStatus && <div className="alert alert-success">{demographicsStatus}</div>}

              <button className="btn btn-primary" disabled={savingDemographics} type="submit">
                {savingDemographics ? "Saving..." : "Save changes"}
              </button>
            </form>
          </motion.div>

          <motion.div id="extension" className="card extension-card" {...cardMotion(4)}>
            <div>
              <span className="eyebrow">05 — Extension</span>
              <h2>Install the extension.</h2>
              <p>
                The Chrome extension reads this profile to fill applications on any page. Log in
                with the same account there.
              </p>
            </div>
            <a
              className="btn btn-dark"
              href="https://github.com/roridemonslayer/resume-auto-filler#installation-development"
              target="_blank"
              rel="noreferrer"
            >
              Installation instructions
              <span className="btn-icon">
                <ArrowUpRightIcon />
              </span>
            </a>
          </motion.div>
        </div>
      </div>
    </>
  );
}
