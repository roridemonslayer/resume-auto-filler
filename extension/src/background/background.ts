/**
 * Background service worker: no imports/exports on purpose (kept as a
 * classic script per tsconfig.scripts.json / manifest's "type": "module"
 * setting, which MV3 service workers require but plain global code
 * still satisfies).
 *
 * The popup talks to the backend directly. This worker does the
 * backend calls the content script needs: content scripts run inside the
 * job site's page, so their fetches are subject to that page's CSP/CORS,
 * whereas the worker has host_permissions for the API. It's also the
 * place to add chrome.commands (keyboard shortcuts) from the roadmap.
 */

// Keep in sync with API_BASE_URL in src/popup/api.ts (this file can't import it).
const API_BASE_URL = "http://localhost:8000";

async function getToken(): Promise<string | null> {
  const stored = await chrome.storage.local.get("token");
  return (stored.token as string | undefined) ?? null;
}

// Pulls the latest profile so edits made in the web app reach the next fill
// instead of waiting for the popup to be reopened.
async function refreshProfile(): Promise<{ profile?: unknown; error?: string }> {
  const token = await getToken();
  if (!token) return { error: "not-logged-in" };
  try {
    const response = await fetch(`${API_BASE_URL}/profile/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return { error: String(response.status) };
    const profile = await response.json();
    await chrome.storage.local.set({ profile });
    return { profile };
  } catch {
    return { error: "network" };
  }
}

// Returns the stored resume PDF as base64 (message passing is JSON-only).
async function fetchResumeFile(): Promise<{ name?: string; base64?: string; error?: string }> {
  const token = await getToken();
  if (!token) return { error: "not-logged-in" };
  try {
    const response = await fetch(`${API_BASE_URL}/resume/file`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return { error: String(response.status) };
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
    }
    const disposition = response.headers.get("Content-Disposition") ?? "";
    const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? "resume.pdf";
    return { name, base64: btoa(binary) };
  } catch {
    return { error: "network" };
  }
}

async function logApplication(payload: unknown): Promise<{ ok: boolean }> {
  const token = await getToken();
  if (!token) return { ok: false };
  try {
    const response = await fetch(`${API_BASE_URL}/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return { ok: response.ok };
  } catch {
    return { ok: false };
  }
}

// A submit click/event is only a *possible* submission (validation can fail),
// so it's parked per tab here until a page reports a confirmation. Kept in
// session storage because the service worker can be shut down at any time.
const PENDING_TTL_MS = 2 * 60 * 1000;

async function setPending(tabId: number, payload: unknown): Promise<void> {
  await chrome.storage.session.set({ [`pending:${tabId}`]: { payload, at: Date.now() } });
}

async function getPending(tabId: number): Promise<unknown | null> {
  const key = `pending:${tabId}`;
  const stored = await chrome.storage.session.get(key);
  const entry = stored[key] as { payload: unknown; at: number } | undefined;
  if (!entry || Date.now() - entry.at > PENDING_TTL_MS) return null;
  return entry.payload;
}

async function markSubmitted(payload: unknown): Promise<{ ok: boolean }> {
  const token = await getToken();
  if (!token) return { ok: false };
  try {
    const response = await fetch(`${API_BASE_URL}/applications/submitted`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return { ok: response.ok };
  } catch {
    return { ok: false };
  }
}

// --- application forms embedded in iframes ---------------------------------
// The content script also runs inside iframes (e.g. a company careers page
// embedding Greenhouse). A frame that looks like an application registers here;
// the top frame shows the button and asks us to fill each registered frame.
// Registrations are validated with a PING before use, so frames that have since
// navigated away drop out.

type FrameInfo = { fields: number; hasResumeInput: boolean };

async function getFrames(tabId: number): Promise<Record<string, FrameInfo>> {
  const key = `frames:${tabId}`;
  const stored = await chrome.storage.session.get(key);
  return (stored[key] as Record<string, FrameInfo> | undefined) ?? {};
}

async function liveFrames(tabId: number): Promise<Record<string, FrameInfo>> {
  const frames = await getFrames(tabId);
  const alive: Record<string, FrameInfo> = {};
  await Promise.all(
    Object.entries(frames).map(async ([frameId, info]) => {
      try {
        await chrome.tabs.sendMessage(tabId, { type: "PING" }, { frameId: Number(frameId) });
        alive[frameId] = info;
      } catch {
        /* frame is gone */
      }
    }),
  );
  await chrome.storage.session.set({ [`frames:${tabId}`]: alive });
  return alive;
}

async function fillChildFrames(tabId: number): Promise<{ fields: number; attached: boolean }> {
  const frames = await liveFrames(tabId);
  let fields = 0;
  let attached = false;
  for (const frameId of Object.keys(frames)) {
    try {
      const result = await chrome.tabs.sendMessage(tabId, { type: "FILL_HERE" }, { frameId: Number(frameId) });
      fields += result?.fields ?? 0;
      attached = attached || Boolean(result?.attached);
    } catch {
      /* frame went away mid-fill */
    }
  }
  return { fields, attached };
}

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(`frames:${tabId}`);
  chrome.storage.session.remove(`pending:${tabId}`);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  if (message?.type === "REFRESH_PROFILE") {
    refreshProfile().then(sendResponse);
    return true;
  }
  if (message?.type === "FRAME_APPLICATION" && tabId !== undefined && sender.frameId) {
    (async () => {
      const frames = await getFrames(tabId);
      frames[String(sender.frameId)] = message.info as FrameInfo;
      await chrome.storage.session.set({ [`frames:${tabId}`]: frames });
      try {
        await chrome.tabs.sendMessage(tabId, { type: "SHOW_BUTTON" }, { frameId: 0 });
      } catch {
        /* the top frame isn't ready; it asks for frames itself on startup */
      }
      sendResponse({ ok: true });
    })();
    return true;
  }
  if (message?.type === "GET_FRAME_INFO" && tabId !== undefined) {
    liveFrames(tabId).then((frames) => sendResponse({ frames: Object.values(frames) }));
    return true;
  }
  if (message?.type === "FILL_CHILD_FRAMES" && tabId !== undefined) {
    fillChildFrames(tabId).then(sendResponse);
    return true;
  }
  if (message?.type === "GET_TOP_INFO" && tabId !== undefined) {
    chrome.tabs
      .sendMessage(tabId, { type: "GET_TOP_INFO_LOCAL" }, { frameId: 0 })
      .then(sendResponse)
      .catch(() => sendResponse(null));
    return true;
  }
  if (message?.type === "SYNC_TOKEN" && typeof message.token === "string") {
    (async () => {
      const stored = await chrome.storage.local.get("token");
      if (stored.token !== message.token) {
        await chrome.storage.local.set({ token: message.token });
        await refreshProfile();
      }
      sendResponse({ ok: true });
    })();
    return true;
  }
  if (message?.type === "GET_RESUME_FILE") {
    fetchResumeFile().then(sendResponse);
    return true;
  }
  if (message?.type === "LOG_APPLICATION") {
    logApplication(message.payload).then(sendResponse);
    return true;
  }
  if (message?.type === "SUBMIT_ATTEMPT" && tabId !== undefined) {
    setPending(tabId, message.payload).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message?.type === "CHECK_PENDING" && tabId !== undefined) {
    getPending(tabId).then((payload) => sendResponse({ payload }));
    return true;
  }
  if (message?.type === "CONFIRM_SUBMIT") {
    markSubmitted(message.payload).then(async (result) => {
      if (tabId !== undefined) await chrome.storage.session.remove(`pending:${tabId}`);
      sendResponse(result);
    });
    return true;
  }
  return false;
});
