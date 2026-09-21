import { useEffect, useState } from "react";
import { updateAnswers } from "../lib/api";
import type { AnswerProfile, YesNo } from "../lib/types";

const EMPTY: AnswerProfile = {
  country: null,
  location: null,
  authorized_to_work: null,
  requires_sponsorship: null,
  willing_to_relocate: null,
  open_to_in_person: null,
  earliest_start: null,
  desired_salary: null,
  how_did_you_hear: null,
};

const YES_NO: Array<{ key: keyof AnswerProfile; label: string }> = [
  { key: "authorized_to_work", label: "Legally authorized to work in the country you're applying to?" },
  { key: "requires_sponsorship", label: "Will you now or in the future need visa sponsorship?" },
  { key: "willing_to_relocate", label: "Open to relocating?" },
  { key: "open_to_in_person", label: "Open to working in person or hybrid?" },
];

const TEXT: Array<{ key: keyof AnswerProfile; label: string; placeholder: string }> = [
  { key: "country", label: "Country", placeholder: "United States" },
  { key: "location", label: "City / location", placeholder: "Boston, MA" },
  { key: "earliest_start", label: "Earliest start date", placeholder: "Immediately, or June 2027" },
  { key: "desired_salary", label: "Desired salary (optional)", placeholder: "$120,000" },
  { key: "how_did_you_hear", label: "How did you hear about roles?", placeholder: "LinkedIn" },
];

function Segmented({ label, value, onChange }: { label: string; value: YesNo | null; onChange: (v: YesNo | null) => void }) {
  return (
    <div className="qa-row">
      <span className="qa-label" id={`qa-${label}`}>
        {label}
      </span>
      <div className="seg" role="radiogroup" aria-labelledby={`qa-${label}`}>
        {(
          [
            ["yes", "Yes"],
            ["no", "No"],
            [null, "Skip"],
          ] as const
        ).map(([v, text]) => (
          <button
            key={text}
            type="button"
            role="radio"
            aria-checked={value === v}
            className={value === v ? "on" : ""}
            onClick={() => onChange(v)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

interface Props {
  token: string | null;
  answers: AnswerProfile | undefined;
  onSaved: () => Promise<void>;
}

export default function AnswersForm({ token, answers, onSaved }: Props) {
  const [draft, setDraft] = useState<AnswerProfile>(answers ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (answers) setDraft(answers);
  }, [answers]);

  function set<K extends keyof AnswerProfile>(key: K, value: AnswerProfile[K]) {
    setStatus(null);
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setStatus(null);
    try {
      await updateAnswers(token, draft);
      await onSaved();
      setStatus({ ok: true, text: "Saved. The extension will use these on your next application." });
    } catch (err) {
      setStatus({ ok: false, text: err instanceof Error ? err.message : "Couldn't save" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave}>
      <div className="qa-list">
        {YES_NO.map(({ key, label }) => (
          <Segmented key={key} label={label} value={draft[key] as YesNo | null} onChange={(v) => set(key, v as never)} />
        ))}
      </div>

      <div className="eeo-grid" style={{ marginTop: 22 }}>
        {TEXT.map(({ key, label, placeholder }) => (
          <div className="field" key={key}>
            <label htmlFor={`ans-${key}`}>{label}</label>
            <input
              id={`ans-${key}`}
              type="text"
              value={(draft[key] as string | null) ?? ""}
              placeholder={placeholder}
              onChange={(e) => set(key, (e.target.value || null) as never)}
            />
          </div>
        ))}
      </div>

      {status && <div className={`alert ${status.ok ? "alert-success" : "alert-error"}`}>{status.text}</div>}

      <button className="btn btn-primary" type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save answers"}
      </button>
    </form>
  );
}
