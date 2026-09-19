# Resume Auto-Filler

Stop copying and pasting your resume into every job application. Click once. Get hired faster.

## The problem

You're applying to jobs. For the 50th time today, you're copying your name, email, phone number,
education, and work history into forms. It's tedious, it's error-prone, and it kills momentum.

Resume Auto-Filler fixes this: create an account on the web app, upload your resume PDF once, and
whenever you hit a job application, click one button in the extension to fill every field it can
recognize -- including the EEO/voluntary self-identification questions (veteran status, gender,
race/ethnicity) most autofillers skip. You review the filled fields and hit submit yourself.

## How it works

1. **On the web app**, create an account and upload your resume PDF. The backend parses it into
   structured fields -- name, email, phone, education, skills, work history. Optionally fill in
   voluntary EEO info too (every field defaults to unset/"prefer not to say").
2. **Install the extension** and log into the same account. It reads that profile -- it doesn't
   have its own separate onboarding.
3. **Open a job application page.** A green "Fill Application" button appears in the corner.
4. **Click it.** Matching text fields, dropdowns, and radio-button EEO questions fill in and
   briefly highlight. **You review and submit the application yourself** -- the extension never
   submits anything on your behalf.

## Data & privacy

This is **not** a fully local/offline tool. Earlier drafts of this project's pitch said
"100% local, never leaves your browser" -- that described a different, backend-free design and
is no longer accurate now that the project supports accounts. Here's what's actually true today:

- Your resume PDF is uploaded to the backend over HTTPS, parsed **in-memory**, and then
  discarded. The raw file is not stored.
- The backend stores your account (email + hashed password) and the **structured fields**
  extracted from your resume (name, email, phone, education, skills, work history) so your
  browser doesn't need to re-parse the PDF every time.
- Filling itself happens entirely in your browser: the extension reads your stored profile and
  writes it into the page's form fields. What you see or type on the job site is never sent back.
- **Application tracking:** by default, when you click Fill -- and again when the page shows that
  your application was submitted -- the extension sends that page's URL (with tracking parameters
  stripped) plus a guessed company name and role title (taken from the page's heading) to your
  account, so the web app's tracker can list it. To notice a submission it reads the page's text
  *locally* for a confirmation like "application received"; that text is never sent anywhere.
  Untick "Track my applications automatically" in the extension popup to turn all of this off;
  nothing is sent then. Tracked applications are stored with your account and you can delete them
  from the web app.
- We don't sell data, run ads, or add tracking. But "your data leaves your device" is the
  honest description of the current architecture -- treat it accordingly until this is backed
  by a real security review.

## Features

- Smart field matching by input name/id/placeholder/label text -- email, phone, name, education,
  skills, work history
- EEO/voluntary self-identification support -- veteran status, disability status, gender,
  race/ethnicity, sexual orientation -- entered once in the web app, filled via both `<select>`
  dropdowns and radio-button groups (Workday-style forms use radios, not selects)
- One-click filling on most job sites, including forms built with frameworks like React
  (Greenhouse-style forms), by dispatching real input events
- PDF parsing on upload (name, contact info, education, skills, a basic work-history section)
- Visual feedback -- filled fields highlight briefly
- Editable profile -- see the education and experience parsed from your resume, and fix or add
  anything (including skills) in the web app; the extension picks up edits on the next fill
- Automatic application tracker -- pages you fill are logged to a kanban board (filled / applied /
  interviewing / offer / rejected) in the web app, and move to Applied by themselves when the
  extension sees your submission confirmation. Drag-and-drop, notes and manual adds still work
- Free, open source, no premium tier

## Roadmap

**Short term**
- Better multi-job work history extraction (structured roles with dates, not one text block)
- Date field support (graduation, employment dates)
- Better dropdown/select detection
- Edit extracted data from the popup (editing already works in the web app)

**Medium term**
- Multiple resume versions per account
- Keyboard shortcut to fill (e.g. Alt+F)
- Custom field mappings for specific sites
- Repeating form sections (multiple past jobs, multiple schools)

**Long term**
- OCR for scanned/image-based PDFs
- ML-based field matching
- Cover letter drafting
- Dark mode for the popup
- Export parsed data as CSV

## Project layout

```
backend/     FastAPI backend: accounts, JWT auth, resume upload + parsing, profile storage
webapp/      React web app: landing page, auth, resume upload, EEO info -- the primary product
extension/   Chrome extension (Manifest V3): thin popup + TypeScript content script (fills only)
```

See [`backend/DEV.md`](backend/DEV.md), [`webapp/DEV.md`](webapp/DEV.md), and
[`extension/DEV.md`](extension/DEV.md) for setup.

## Installation (development)

**Chrome Web Store listing:** not yet submitted.

1. Set up and run the backend -- see [`backend/DEV.md`](backend/DEV.md).
2. Run the web app -- see [`webapp/DEV.md`](webapp/DEV.md). Sign up, upload a resume PDF, and
   optionally fill in the voluntary EEO info.
3. Build the extension -- see [`extension/DEV.md`](extension/DEV.md). This produces an
   `extension/dist/` folder.
4. Go to `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select
   `extension/dist`.
5. Click the extension icon and log in with the same account you signed up with on the web app.

## FAQ

**Is my data safe?** Your resume PDF is parsed and discarded, not stored. The fields extracted
from it, and your account, are stored on the backend. See [Data & privacy](#data--privacy) above.

**Does the extension submit applications for me?** No. It fills fields; you review and click the
site's own submit button.

**What if a form doesn't fill completely?** Some sites use custom fields or React components this
version doesn't recognize yet. Fill those manually and open a GitHub issue so we can improve
matching.

**Do I have to answer the EEO/demographic questions?** No. Every field (veteran status,
disability, gender, race/ethnicity, sexual orientation) is unset by default and stays that way
until you explicitly set it in the web app dashboard -- the extension never guesses or infers
these.

**Can I use multiple resumes?** Not yet -- on the roadmap.

**Can you add [feature]?** Maybe -- open an issue or a pull request.

## Contributing

This is open source.

- **Report a bug:** open a GitHub issue with repro steps/screenshots.
- **Suggest a feature:** open an issue titled "Feature request: ...".
- **Submit code:** fork, branch, make your change (see the `DEV.md` in the relevant folder),
  open a pull request.

## License

MIT -- see [LICENSE](LICENSE).
