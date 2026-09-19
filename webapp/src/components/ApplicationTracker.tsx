import { useCallback, useEffect, useState } from "react";
import type { DragEvent, FormEvent } from "react";
import { createApplication, deleteApplication, listApplications, updateApplication } from "../lib/api";
import type { Application, ApplicationInput, ApplicationStatus } from "../lib/types";
import { ArrowUpRightIcon } from "./Icons";

export const STATUS_COLUMNS: Array<{ id: ApplicationStatus; label: string; empty: string }> = [
  { id: "filled", label: "Filled", empty: "Pages you fill with the extension land here" },
  { id: "applied", label: "Applied", empty: "Move a card here once you submit" },
  { id: "interviewing", label: "Interviewing", empty: "Nothing yet" },
  { id: "offer", label: "Offer", empty: "Fingers crossed" },
  { id: "rejected", label: "Rejected", empty: "Nothing here" },
];

// The backend stores naive UTC timestamps, so tag them as UTC before parsing.
function formatDate(iso: string): string {
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function useApplications(token: string | null) {
  const [apps, setApps] = useState<Application[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setApps(await listApplications(token));
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "Couldn't load your applications"));
    } finally {
      setLoaded(true);
    }
  }, [token]);

  useEffect(() => {
    load();
    // The extension logs fills from other tabs, so refresh when the user comes back.
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, [load]);

  async function add(input: ApplicationInput) {
    if (!token) return;
    const created = await createApplication(token, input);
    setApps((prev) => [created, ...prev.filter((a) => a.id !== created.id)]);
  }

  async function patch(id: number, changes: Partial<ApplicationInput>) {
    if (!token) return;
    const before = apps;
    setApps((prev) => prev.map((a) => (a.id === id ? ({ ...a, ...changes } as Application) : a)));
    try {
      const saved = await updateApplication(token, id, changes);
      setApps((prev) => prev.map((a) => (a.id === id ? saved : a)));
      setError(null);
    } catch (err) {
      setApps(before);
      setError(errorMessage(err, "Couldn't update that application"));
    }
  }

  async function remove(id: number) {
    if (!token) return;
    const before = apps;
    setApps((prev) => prev.filter((a) => a.id !== id));
    try {
      await deleteApplication(token, id);
    } catch (err) {
      setApps(before);
      setError(errorMessage(err, "Couldn't delete that application"));
    }
  }

  return { apps, loaded, error, add, patch, remove };
}

type Tracker = ReturnType<typeof useApplications>;

function AppCard({ app, tracker }: { app: Application; tracker: Tracker }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [company, setCompany] = useState(app.company);
  const [role, setRole] = useState(app.role ?? "");
  const [notes, setNotes] = useState(app.notes ?? "");

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(t);
  }, [confirming]);

  function startEdit() {
    setCompany(app.company);
    setRole(app.role ?? "");
    setNotes(app.notes ?? "");
    setEditing(true);
  }

  function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!company.trim()) return;
    tracker.patch(app.id, { company: company.trim(), role: role.trim() || null, notes: notes.trim() || null });
    setEditing(false);
  }

  function onDragStart(e: DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData("text/plain", String(app.id));
    e.dataTransfer.effectAllowed = "move";
  }

  if (editing) {
    return (
      <form className="app-card app-card-editing" onSubmit={saveEdit}>
        <input aria-label="Company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" autoFocus />
        <input aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role" />
        <textarea aria-label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" rows={3} />
        <div className="app-card-actions">
          <button className="btn btn-primary btn-sm" type="submit">
            Save
          </button>
          <button className="btn btn-secondary btn-sm" type="button" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="app-card" draggable onDragStart={onDragStart}>
      <div className="app-card-top">
        <div className="app-card-company">{app.company}</div>
        <span className="app-card-date">{formatDate(app.updated_at)}</span>
      </div>
      {app.role && <div className="app-card-role">{app.role}</div>}
      {app.notes && <div className="app-card-notes">{app.notes}</div>}

      <div className="app-card-actions">
        <select
          aria-label={`Status for ${app.company}`}
          value={app.status}
          onChange={(e) => tracker.patch(app.id, { status: e.target.value as ApplicationStatus })}
        >
          {STATUS_COLUMNS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        {app.url && (
          <a className="icon-btn" href={app.url} target="_blank" rel="noreferrer" aria-label={`Open ${app.company} posting`} title="Open posting">
            <ArrowUpRightIcon size={14} />
          </a>
        )}
        <button className="text-btn" type="button" onClick={startEdit}>
          Edit
        </button>
        <button
          className={`text-btn${confirming ? " danger" : ""}`}
          type="button"
          onClick={() => (confirming ? tracker.remove(app.id) : setConfirming(true))}
        >
          {confirming ? "Confirm?" : "Delete"}
        </button>
      </div>
    </div>
  );
}

export default function ApplicationTracker({ tracker }: { tracker: Tracker }) {
  const { apps, loaded, error, add, patch } = tracker;
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<ApplicationStatus | null>(null);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!company.trim()) return;
    setAdding(true);
    setFormError(null);
    try {
      await add({ company: company.trim(), role: role.trim() || null, url: url.trim() || null, status: "applied" });
      setCompany("");
      setRole("");
      setUrl("");
    } catch (err) {
      setFormError(errorMessage(err, "Couldn't add that application"));
    } finally {
      setAdding(false);
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>, status: ApplicationStatus) {
    e.preventDefault();
    setOverColumn(null);
    const id = Number(e.dataTransfer.getData("text/plain"));
    const app = apps.find((a) => a.id === id);
    if (app && app.status !== status) patch(id, { status });
  }

  return (
    <div>
      <form className="add-app" onSubmit={handleAdd}>
        <input aria-label="Company" placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} required />
        <input aria-label="Role" placeholder="Role (optional)" value={role} onChange={(e) => setRole(e.target.value)} />
        <input aria-label="Posting link" placeholder="Link (optional)" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button className="btn btn-primary btn-sm" type="submit" disabled={adding || !company.trim()}>
          {adding ? "Adding..." : "Add application"}
        </button>
      </form>

      {formError && <div className="alert alert-error">{formError}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {loaded && apps.length === 0 && (
        <p className="board-empty">
          Nothing tracked yet. Fill an application with the extension and it shows up here automatically, or add one above.
        </p>
      )}

      <div className="board" role="list">
        {STATUS_COLUMNS.map((col) => {
          const cards = apps.filter((a) => a.status === col.id);
          return (
            <div
              key={col.id}
              role="listitem"
              className={`board-col status-${col.id}${overColumn === col.id ? " over" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setOverColumn(col.id);
              }}
              onDragLeave={() => setOverColumn((c) => (c === col.id ? null : c))}
              onDrop={(e) => onDrop(e, col.id)}
            >
              <div className="board-col-head">
                <span className="board-dot" />
                <span className="board-col-label">{col.label}</span>
                <span className="board-count">{cards.length}</span>
              </div>
              {cards.length === 0 ? (
                <div className="board-col-empty">{col.empty}</div>
              ) : (
                cards.map((app) => <AppCard key={app.id} app={app} tracker={tracker} />)
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
