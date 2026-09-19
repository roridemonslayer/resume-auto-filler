import { useState } from "react";
import type { KeyboardEvent } from "react";
import { updateResume } from "../lib/api";
import type { ResumeProfile } from "../lib/types";

interface Draft {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  education: string;
  work_history: string;
  skills: string[];
}

function toDraft(resume: ResumeProfile | undefined): Draft {
  return {
    first_name: resume?.first_name ?? "",
    last_name: resume?.last_name ?? "",
    email: resume?.email ?? "",
    phone: resume?.phone ?? "",
    education: (resume?.education ?? []).join("\n"),
    work_history: (resume?.work_history ?? []).join("\n"),
    skills: resume?.skills ?? [],
  };
}

function lines(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

const BULLET_RE = /^\s*[•·▪\-–*]\s*/;

function ExperienceList({ items }: { items: string[] }) {
  return (
    <div className="exp-list">
      {items.map((line, i) =>
        BULLET_RE.test(line) ? (
          <div className="exp-bullet" key={i}>
            {line.replace(BULLET_RE, "")}
          </div>
        ) : (
          <div className="exp-head" key={i}>
            {line}
          </div>
        ),
      )}
    </div>
  );
}

interface Props {
  token: string | null;
  resume: ResumeProfile | undefined;
  hasResume: boolean;
  onSaved: () => Promise<void>;
}

export default function ProfileEditor({ token, resume, hasResume, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => toDraft(resume));
  const [skillInput, setSkillInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function startEditing() {
    setDraft(toDraft(resume));
    setSkillInput("");
    setError(null);
    setSaved(false);
    setEditing(true);
  }

  function setField<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function commitSkills(raw: string, current: string[]): string[] {
    const existing = new Set(current.map((s) => s.toLowerCase()));
    const next = [...current];
    for (const part of raw.split(",")) {
      const skill = part.trim();
      if (skill && !existing.has(skill.toLowerCase())) {
        existing.add(skill.toLowerCase());
        next.push(skill);
      }
    }
    return next;
  }

  function addSkill() {
    if (!skillInput.trim()) return;
    setField("skills", commitSkills(skillInput, draft.skills));
    setSkillInput("");
  }

  function onSkillKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill();
    } else if (e.key === "Backspace" && !skillInput && draft.skills.length) {
      setField("skills", draft.skills.slice(0, -1));
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      await updateResume(token, {
        first_name: draft.first_name || null,
        last_name: draft.last_name || null,
        email: draft.email || null,
        phone: draft.phone || null,
        education: lines(draft.education),
        work_history: lines(draft.work_history),
        skills: commitSkills(skillInput, draft.skills),
      });
      await onSaved();
      setEditing(false);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your changes");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} noValidate>
        <div className="eeo-grid">
          <div className="field">
            <label htmlFor="pd-first">First name</label>
            <input id="pd-first" type="text" value={draft.first_name} onChange={(e) => setField("first_name", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pd-last">Last name</label>
            <input id="pd-last" type="text" value={draft.last_name} onChange={(e) => setField("last_name", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pd-email">Email</label>
            <input id="pd-email" type="email" value={draft.email} onChange={(e) => setField("email", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pd-phone">Phone</label>
            <input id="pd-phone" type="text" value={draft.phone} placeholder="(555) 123-4567" onChange={(e) => setField("phone", e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="pd-edu">Education</label>
          <textarea id="pd-edu" rows={5} value={draft.education} onChange={(e) => setField("education", e.target.value)} />
          <div className="hint">One entry per line. The extension fills the first line into school and degree fields.</div>
        </div>

        <div className="field">
          <label htmlFor="pd-exp">Experience</label>
          <textarea id="pd-exp" rows={12} value={draft.work_history} onChange={(e) => setField("work_history", e.target.value)} />
          <div className="hint">One line per entry. Start bullet points with •. The first line is what the extension fills into company fields.</div>
        </div>

        <div className="field">
          <label htmlFor="pd-skill">Skills</label>
          <div className="skill-editor">
            {draft.skills.map((skill) => (
              <span className="skill-chip skill-chip-edit" key={skill}>
                {skill}
                <button
                  type="button"
                  aria-label={`Remove ${skill}`}
                  onClick={() => setField("skills", draft.skills.filter((s) => s !== skill))}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              id="pd-skill"
              type="text"
              value={skillInput}
              placeholder={draft.skills.length ? "Add another…" : "Type a skill, press Enter"}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={onSkillKey}
              onBlur={addSkill}
            />
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  const r = resume;
  const isEmpty =
    !hasResume ||
    (!r?.first_name && !r?.last_name && !r?.email && !r?.phone && !r?.education.length && !r?.work_history.length && !r?.skills.length);

  return (
    <div>
      {saved && <div className="alert alert-success">Saved. The extension will use these details next time you click Fill.</div>}

      {isEmpty ? (
        <div className="empty-hint" style={{ paddingBottom: 20 }}>
          Nothing here yet. Upload a resume above, or fill in your details by hand.
        </div>
      ) : (
        <>
          <dl className="detail-grid">
            <div>
              <dt>Name</dt>
              <dd>{[r?.first_name, r?.last_name].filter(Boolean).join(" ") || <span className="unset">Not set</span>}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{r?.email || <span className="unset">Not set</span>}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{r?.phone || <span className="unset">Not set — add it with Edit</span>}</dd>
            </div>
          </dl>

          <div className="detail-block">
            <h3>Education</h3>
            {r?.education.length ? (
              <ExperienceList items={r.education} />
            ) : (
              <p className="unset">Nothing found.</p>
            )}
          </div>

          <div className="detail-block">
            <h3>Experience</h3>
            {r?.work_history.length ? (
              <ExperienceList items={r.work_history} />
            ) : (
              <p className="unset">Nothing found.</p>
            )}
          </div>

          <div className="detail-block">
            <h3>Skills</h3>
            {r?.skills.length ? (
              <div className="skill-chip-row" style={{ marginTop: 0 }}>
                {r.skills.map((skill) => (
                  <span className="skill-chip" key={skill}>
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="unset">Nothing found.</p>
            )}
          </div>
        </>
      )}

      <button className="btn btn-secondary" type="button" onClick={startEditing} style={{ marginTop: 8 }}>
        {isEmpty ? "Add details" : "Edit details"}
      </button>
    </div>
  );
}
