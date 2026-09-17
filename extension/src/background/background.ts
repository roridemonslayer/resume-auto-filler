/**
 * Background service worker: no imports/exports on purpose (kept as a
 * classic script per tsconfig.scripts.json / manifest's "type": "module"
 * setting, which MV3 service workers require but plain global code
 * still satisfies).
 *
 * Currently minimal -- the popup talks to the backend directly and
 * messages the content script directly. This exists as the place to
 * add chrome.commands (keyboard shortcuts) and cross-tab coordination
 * from the roadmap.
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("Resume Auto-Filler installed. Click the toolbar icon to get started.");
  }
});
