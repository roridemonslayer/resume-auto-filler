# Extension development guide

Chrome extension (Manifest V3): React/TypeScript popup + a vanilla TypeScript content script.

## Setup

```bash
cd extension
npm install
```

The backend must be running first -- see [`../backend/DEV.md`](../backend/DEV.md).

## Build and load

```bash
npm run build
```

This runs Vite (bundles the popup, copies `manifest.json` and icons from `public/`) and then
`tsc` (compiles `background.ts` and `content-script.ts` straight to plain JS), producing a
self-contained `dist/` folder.

Then:

1. `chrome://extensions`
2. Enable **Developer mode** (top right)
3. **Load unpacked** → select `extension/dist`
4. Click the extension icon, sign up, upload a resume PDF, then visit any page with a form and
   click **Fill Application**.

Re-run `npm run build` and click the reload icon on `chrome://extensions` after making changes --
there's no hot-reload for the packed extension.

## Live-editing the popup only

```bash
npm run dev
```

Runs Vite's dev server for the popup UI in a normal browser tab (useful for iterating on layout
without reloading the extension), but `chrome.*` APIs won't be available there -- switch to the
built extension to test the full auth/upload/fill flow.

## Architecture notes

- `src/popup/` -- React popup: login/signup, resume upload, shows the parsed profile, triggers
  filling on the active tab. Talks to the backend directly via `fetch` (see `src/popup/api.ts`);
  `API_BASE_URL` there defaults to `http://localhost:8000` and needs updating (plus a matching
  entry in `public/manifest.json`'s `host_permissions`) before pointing at a deployed backend.
- `src/content/content-script.ts` -- injected into every page. Matches `input`/`textarea`/`select`
  elements against the user's profile using name/id/placeholder/label-text heuristics, and fills
  them via the native property setter (not just `.value =`) so frameworks like React that back
  many ATS forms (e.g. Greenhouse) actually register the change.
- `src/background/background.ts` -- currently minimal; the natural home for keyboard-shortcut
  (`chrome.commands`) support from the roadmap.
- `background.ts` and `content-script.ts` are deliberately import/export-free and compiled by a
  separate `tsconfig.scripts.json` (not bundled by Vite), because MV3 content scripts run as
  classic scripts and choke on ES module syntax. If you need to share code with the popup, copy
  the small bit you need rather than adding an import -- see the comment at the top of each file.
- Field matching is heuristic (regex over name/id/placeholder/aria-label/associated label text).
  It won't catch every custom-built form; that's expected for this stage of the project.

## Known limitations (tracked on the roadmap)

- No structured multi-job work history or multi-school education -- only the first entry of each
  fills in.
- `<select>` dropdowns only fill when an option's visible text loosely matches the profile value.
- No keyboard shortcut yet.
