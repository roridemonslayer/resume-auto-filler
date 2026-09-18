import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Nav from "../components/Nav";
import { DocumentIcon, IdBadgeIcon, OverviewIcon, PuzzleIcon } from "../components/Icons";
import { useAuth } from "../context/AuthContext";
import { updateDemographics, uploadResume } from "../lib/api";
import { EEO_FIELDS } from "../lib/eeoOptions";
import type { EeoProfile } from "../lib/types";

const SECTIONS = [
  { id: "overview", label: "Overview", Icon: OverviewIcon },
  { id: "resume", label: "Resume", Icon: DocumentIcon },
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
  };
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

  return (
    <>
      <Nav />
      <div className="container app-shell">
        <nav className="sidebar">
          {SECTIONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`sidebar-link${activeSection === id ? " active" : ""}`}
              onClick={() => scrollToSection(id)}
            >
              <Icon />
              {label}
            </button>
          ))}
        </nav>

        <div className="dashboard-main">
          <div id="overview">
            <div className="dashboard-header">
              <h1>Your profile</h1>
            </div>

            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-label">Skills detected</div>
                <div className="stat-value">{resume?.skills.length ?? 0}</div>
                <div className="stat-sub">from your uploaded resume</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Profile completeness</div>
                <div className="stat-value">{profile?.has_resume ? `${profileCompleteness}%` : "--"}</div>
                <div className="stat-sub">name, email, phone on file</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Voluntary info set</div>
                <div className="stat-value">{eeoSetCount}/5</div>
                <div className="stat-sub">EEO fields answered</div>
              </div>
            </div>
          </div>

          <motion.div id="resume" className="card" {...cardMotion(0)}>
            <div className="card-heading">
              <h2>Resume</h2>
            </div>

            {profile?.has_resume && resume ? (
              <div className="profile-summary">
                <div className="avatar-lg">{initials(resume.first_name, resume.last_name)}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    {resume.first_name} {resume.last_name}
                  </div>
                  <div style={{ fontSize: 13.5, color: "var(--muted)" }}>
                    {resume.email || "No email found"} · {resume.phone || "No phone found"}
                  </div>
                  <div className="skill-chip-row">
                    {resume.skills.slice(0, 8).map((skill) => (
                      <span className="skill-chip" key={skill}>
                        {skill}
                      </span>
                    ))}
                    {resume.skills.length > 8 && (
                      <span className="skill-chip">+{resume.skills.length - 8} more</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-hint">
                <div className="icon">📄</div>
                No resume uploaded yet.
              </div>
            )}

            <div className="field" style={{ marginTop: 20 }}>
              <label htmlFor="resume-file">
                {profile?.has_resume ? "Replace resume (PDF)" : "Upload resume (PDF)"}
              </label>
              <input id="resume-file" type="file" accept="application/pdf" onChange={handleUpload} disabled={uploading} />
            </div>

            {uploadError && <div className="alert alert-error">{uploadError}</div>}
            {uploadStatus && <div className="alert alert-success">{uploadStatus}</div>}
          </motion.div>

          <motion.div id="eeo" className="card" {...cardMotion(1)}>
            <div className="card-heading">
              <h2>Voluntary identity information</h2>
              <span className="badge">Optional</span>
            </div>
            <p style={{ marginBottom: 20, fontSize: 13.5 }}>
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
                {savingDemographics ? "Saving..." : "Save"}
              </button>
            </form>
          </motion.div>

          <motion.div id="extension" className="card" {...cardMotion(2)}>
            <div className="card-heading">
              <h2>Install the extension</h2>
            </div>
            <p style={{ marginBottom: 14 }}>
              The Chrome extension reads this profile to fill applications on any page. Log in with
              the same account there.
            </p>
            <a
              className="btn btn-secondary"
              href="https://github.com/roridemonslayer/resume-auto-filler#installation-development"
              target="_blank"
              rel="noreferrer"
            >
              Installation instructions →
            </a>
          </motion.div>
        </div>
      </div>
    </>
  );
}
