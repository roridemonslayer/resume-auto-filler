import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Nav from "../components/Nav";
import { useAuth } from "../context/AuthContext";
import { updateDemographics, uploadResume } from "../lib/api";
import { EEO_FIELDS } from "../lib/eeoOptions";
import type { EeoProfile } from "../lib/types";

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

export default function Dashboard() {
  const { token, profile, refreshProfile } = useAuth();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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

  return (
    <>
      <Nav />
      <div className="container dashboard-layout">
        <div className="dashboard-header">
          <h1>Your profile</h1>
        </div>

        <motion.div className="card" {...cardMotion(0)}>
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
            <label htmlFor="resume">{profile?.has_resume ? "Replace resume (PDF)" : "Upload resume (PDF)"}</label>
            <input id="resume" type="file" accept="application/pdf" onChange={handleUpload} disabled={uploading} />
          </div>

          {uploadError && <div className="alert alert-error">{uploadError}</div>}
          {uploadStatus && <div className="alert alert-success">{uploadStatus}</div>}
        </motion.div>

        <motion.div className="card" {...cardMotion(1)}>
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

        <motion.div className="card" {...cardMotion(2)}>
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
    </>
  );
}
