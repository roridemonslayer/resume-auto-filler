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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "REFRESH_PROFILE") {
    refreshProfile().then(sendResponse);
    return true;
  }
  if (message?.type === "LOG_APPLICATION") {
    logApplication(message.payload).then(sendResponse);
    return true;
  }
  return false;
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("Resume Auto-Filler installed. Click the toolbar icon to get started.");
  }
});
