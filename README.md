# Resume Auto-Filler

Stop copying and pasting your resume into every job application. Click once. Get hired faster.

## The problem

You're applying to jobs. For the 50th time today, you're copying your name, email, phone number,
education, and work history into forms. It's tedious, it's error-prone, and it kills momentum.

Resume Auto-Filler fixes this: create an account, upload your resume PDF once, and whenever you
hit a job application, click one button to fill every field it can recognize. You review the
filled fields and hit submit yourself.

## How it works

1. **Create an account and upload your resume** (via the extension popup). The backend parses
   your PDF and extracts structured fields -- name, email, phone, education, skills, work
   history.
2. **Open a job application page.** A green "Fill Application" button appears in the corner.
3. **Click it.** Matching fields fill in and briefly highlight. **You review and submit the
   application yourself** -- the extension never submits anything on your behalf.

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
  writes it into the page's form fields. Nothing about the job site you're on is sent back to
  the backend.
- We don't sell data, run ads, or add tracking. But "your data leaves your device" is the
  honest description of the current architecture -- treat it accordingly until this is backed
  by a real security review.

## Features

- Smart field matching by input name/id/placeholder/label text -- email, phone, name, education,
  skills, work history
- One-click filling on most job sites, including forms built with frameworks like React
  (Greenhouse-style forms), by dispatching real input events
- PDF parsing on upload (name, contact info, education, skills, a basic work-history section)
- Visual feedback -- filled fields highlight briefly
- Free, open source, no premium tier

## Roadmap

**Short term**
- Better multi-job work history extraction (structured roles with dates, not one text block)
- Date field support (graduation, employment dates)
- Better dropdown/select detection
- Edit extracted data before filling, from the popup

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
extension/   Chrome extension (Manifest V3): React popup + TypeScript content script
```

See [`backend/DEV.md`](backend/DEV.md) and [`extension/DEV.md`](extension/DEV.md) for setup.

## Installation (development)

**Chrome Web Store listing:** not yet submitted.

**Load unpacked (current option):**

1. Set up and run the backend -- see [`backend/DEV.md`](backend/DEV.md).
2. Build the extension -- see [`extension/DEV.md`](extension/DEV.md). This produces an
   `extension/dist/` folder.
3. Go to `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select
   `extension/dist`.
4. Click the extension icon, sign up, and upload a resume PDF.

## FAQ

**Is my data safe?** Your resume PDF is parsed and discarded, not stored. The fields extracted
from it, and your account, are stored on the backend. See [Data & privacy](#data--privacy) above.

**Does the extension submit applications for me?** No. It fills fields; you review and click the
site's own submit button.

**What if a form doesn't fill completely?** Some sites use custom fields or React components this
version doesn't recognize yet. Fill those manually and open a GitHub issue so we can improve
matching.

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
