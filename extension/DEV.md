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

- `src/popup/` -- React popup (400px, dark/lime like the web app). It asks the active tab's content
  script what's on the page (`GET_PAGE_INFO`: looks like an application?, field count, resume upload
  present, guessed company/role) and shows that as a job card with a big Autofill button (which
  sends `FILL_FORM` with the profile), plus rows for the profile, stored resume, voluntary info
  and tracked applications that deep-link into the web app (`/dashboard#section`) and a red dot
  when something's missing. A settings view holds the tracking toggle and log out. Logged out, it
  offers email/password and points at the web app, whose login the extension picks up
  automatically (`SYNC_TOKEN`, see below). Opening it as a normal tab with `?tab=<tabId>` targets
  that tab instead of the active one, which is how it's tested. Talks to the backend directly via
  `fetch` (see `src/popup/api.ts`);
  `API_BASE_URL` there defaults to `http://localhost:8000` and needs updating (plus a matching
  entry in `public/manifest.json`'s `host_permissions`) before pointing at a deployed backend.
- `src/content/content-script.ts` -- runs on every top-level page (manifest `matches: <all_urls>`).
  The floating logo button (a lime "R" that expands to "Fill application" on hover, in a shadow
  root so page CSS can't touch it) only appears when `pageLooksLikeJobApplication` passes: at least
  3 fillable fields AND a job-evidence score of 4+ (`jobApplicationScore`): known ATS host +3,
  resume/CV upload +3, job-form phrases (cover letter, work authorization, EEO...) +2, veteran/
  disability fields +2, apply/careers/job wording in the URL, title or heading +1. Card-number
  fields veto it. So signup, contact, newsletter and checkout forms don't trigger it, but real
  Greenhouse/Lever/Ashby forms do. A debounced `MutationObserver` re-checks as the DOM changes
  (capped at 40 scans per URL) since many ATS platforms render fields client-side, and the button
  is removed if a single-page app navigates to something that isn't an application. The button
  sits 84px up so it clears the reCAPTCHA badge many ATS pages pin to the corner. Matches
  `input`/`textarea`/`select` elements against the user's profile using name/id/placeholder/label-text
  heuristics, and fills them via the native property setter (not just `.value =`) so frameworks like
  React that back many ATS forms (e.g. Greenhouse) actually register the change.
- `src/background/background.ts` -- does the backend calls the content script needs (content
  scripts run under the job site's CSP/CORS, the worker has `host_permissions`): `REFRESH_PROFILE`
  fetches a fresh profile before each fill so web-app edits apply immediately (the popup also
  refreshes when opened), and `LOG_APPLICATION` posts the filled page to `/applications`. It is
  also the natural home for keyboard-shortcut (`chrome.commands`) support from the roadmap.
  `API_BASE_URL` is duplicated here because the worker can't import from the popup code.
- Resume attach (`attachResume`): after filling text fields, if the account has a stored PDF
  (`profile.resume_file`) the content script asks the background worker for it (`GET_RESUME_FILE`,
  returned as base64 because messages are JSON-only) and sets it on the form's resume `<input
  type="file">` via `DataTransfer` plus `input`/`change` events -- what a drag-and-drop does, so
  ATS uploaders react (verified against Greenhouse, whose page immediately POSTed the exact PDF
  bytes to its S3 bucket). `fileInputKind` decides resume vs cover letter from the input's own
  label, then the nearest ancestor mentioning exactly one of them; if a container mentions both it
  refuses to guess. Inputs whose `accept` excludes PDFs, disabled inputs, and inputs that already
  hold a file are skipped. If the form wants a resume but the account has no stored PDF, the toast
  says to re-upload it in the web app.
- Web app sign-in (`SYNC_TOKEN`): on the web app's exact origin (`WEBAPP_ORIGIN` in the content
  script, must match `WEBAPP_URL` in `popup/api.ts`) the content script reads its login token from
  `localStorage` on load and listens for the `resumeAutoFiller.token` `postMessage` the web app
  sends when someone logs in, and passes it to the background worker, which stores it and loads
  the profile. That is what lets Google-only accounts (no password) use the extension. Messages
  from any other origin are ignored.
- Application tracking: after a fill, the content script guesses company (hosted-ATS path or
  subdomain, then `og:site_name`, then the domain), role (first `<h1>`, else the page title) and a
  cleaned URL (only job-id query params like `gh_jid` are kept so the same posting dedupes). The
  popup's "Track my applications automatically" checkbox stores `trackApplications` in
  `chrome.storage.local`; only an explicit `false` disables logging and submission detection.
- Submission detection (`startSubmitWatcher`, started when the Fill button is injected): a `submit`
  event or a click on a button labelled Submit/Apply/etc. only *arms* a pending submission
  (`SUBMIT_ATTEMPT`, parked per tab in `chrome.storage.session` for 2 minutes), because validation
  can fail. It becomes `applied` (`CONFIRM_SUBMIT` -> `POST /applications/submitted`) only when a
  confirmation appears: newly appearing text matching `CONFIRM_TEXT` on the same page (text already
  present at click time, like a "thank you" footer, is ignored), a URL change to a
  confirmation-looking path, or -- via `CHECK_PENDING` on every page load -- landing on such a
  page after the form navigated. If no confirmation is recognised the row simply stays "Filled"
  and can be marked applied from the web app.
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

## Known limitations

- **Embedded application forms (iframes).** The content script only runs in the top-level page, so
  when a company's own careers site embeds the ATS form in an iframe (e.g. Airbnb embedding
  Greenhouse's `/embed/job_app`), the button doesn't appear. Supporting this means running in
  frames and relaying show/fill/log messages through the background worker to the top frame.
