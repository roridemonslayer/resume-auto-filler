# Backend development guide

FastAPI app providing accounts and resume parsing for the Resume Auto-Filler extension.

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env: set SECRET_KEY to a random value, e.g.
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### Enabling the welcome email (optional)

Signup works fine without this -- it just skips sending an email (logged, not an error).

1. Sign up at [resend.com](https://resend.com) (free tier is enough for dev).
2. **API Keys → Create API Key**, copy it.
3. Put it in `backend/.env`: `RESEND_API_KEY=<that value>`.
4. `EMAIL_FROM` defaults to Resend's shared test sender (`onboarding@resend.dev`), which only
   delivers to the email address you signed up to Resend with. To send to arbitrary addresses,
   verify your own domain in Resend (**Domains** tab) and set `EMAIL_FROM` to an address at that
   domain.

### Enabling Google sign-in (optional)

See [`../webapp/DEV.md`](../webapp/DEV.md#enabling-sign-in-with-google-optional) -- same
`GOOGLE_CLIENT_ID` value goes in both `backend/.env` and `webapp/.env`.

## Run

```bash
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

The API is now at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

## Endpoints

| Method | Path                   | Auth | Description                                   |
|--------|------------------------|------|------------------------------------------------|
| POST   | `/auth/signup`         | no   | Create an account, sends a welcome email        |
| POST   | `/auth/login`          | no   | Get a JWT access token                          |
| POST   | `/auth/google`         | no   | Sign in/up with a Google ID token credential     |
| POST   | `/resume/upload`       | yes  | Upload a PDF, parse it, store the resume fields |
| GET    | `/profile/me`          | yes  | Fetch resume fields + EEO fields, merged        |
| PUT    | `/profile/demographics`| yes  | Set voluntary self-ID (veteran/gender/etc.)     |
| GET    | `/resume/file`         | yes  | Download the stored original PDF (only ever your own) |
| DELETE | `/resume/file`         | yes  | Delete the stored PDF (parsed fields are kept)   |
| PUT    | `/profile/resume`      | yes  | Replace the editable resume fields (name, contact, education, experience, skills) |
| GET    | `/applications`        | yes  | List the user's tracked applications, newest first |
| POST   | `/applications`        | yes  | Track an application; re-posting the same `url` bumps the existing row instead of duplicating it |
| POST   | `/applications/submitted` | yes | Extension saw a submission confirmation: promotes the matching `filled` row to `applied` (never downgrades interviewing/offer/rejected), or creates it as `applied` |
| PATCH  | `/applications/{id}`   | yes  | Update company/role/url/status/notes             |
| DELETE | `/applications/{id}`   | yes  | Remove an application                            |
| GET    | `/health`              | no   | Liveness check                                  |

Authenticated requests need `Authorization: Bearer <token>`.

## Notes

- Storage is SQLite by default (`app.db`, gitignored). Point `DATABASE_URL` in `.env` at Postgres
  for anything beyond local dev.
- `bcrypt` is pinned to `4.0.1` in `requirements.txt` -- newer `bcrypt` versions break `passlib`'s
  backend self-test with a `password cannot be longer than 72 bytes` error on every hash/verify
  call. Don't bump it without checking that passlib has fixed the incompatibility.
- The PDF resume parser (`app/resume_parser.py`) is heuristic, not ML-based: it looks for section
  headers ("Education", "Skills", "Experience") and regexes for email/phone. It works well on
  simply-formatted resumes and will miss fields on heavily designed ones. Multi-job structured
  work history is on the roadmap.
- CORS is wide open (`allow_origins=["*"]`) because each install of the Chrome extension has a
  different `chrome-extension://<id>` origin. Auth uses bearer tokens, not cookies, so this
  doesn't expose credentialed requests.
- EEO/demographic fields (`app/models.py`'s `EeoProfile`) are never inferred or extracted -- they
  only get set through an explicit `PUT /profile/demographics` call from the web app, and every
  field is nullable so "unset" and "prefer not to say" both just mean `null`.
- `app/email.py` and `app/google_oauth.py` both degrade gracefully when unconfigured: signup
  succeeds either way (email is fire-and-forget), and `/auth/google` returns a clean 501 instead
  of crashing if `GOOGLE_CLIENT_ID` isn't set.
- A Google-only account gets a random, never-used password hash (see `routers/auth.py`) so the
  `User` model doesn't need a nullable password column just for this.
- `google-auth`'s default requests transport needs the `requests` package installed separately --
  it's not pulled in automatically, hence the explicit `requests==2.32.3` pin.

- `PUT /profile/resume` is a full replace: blank strings become `null` and blank list entries are
  dropped, so the web app's edit form can send exactly what's on screen. It also creates the
  resume row if the user never uploaded a PDF (`has_resume` then becomes true).
- Application `status` is one of `filled`, `applied`, `interviewing`, `offer`, `rejected`. The
  extension logs new fills as `filled`; the web app's manual add uses `applied`. `url` must start
  with `http://` or `https://` (the web app renders it as a link, so `javascript:` URLs are
  rejected). Timestamps are naive UTC -- clients must treat them as UTC.

- `POST /resume/upload` now also stores the original PDF (one row per user in `resume_files`,
  replaced on re-upload) so the extension can attach it to application forms. Non-PDFs are
  rejected by magic bytes (`%PDF-`), not just the declared content type, because the file is
  served back; filenames are reduced to a safe base name. `GET /resume/file` always answers as
  `application/pdf` + `attachment` + `nosniff`. `/profile/me` reports `resume_file` (name/size)
  without the bytes. Files are stored unencrypted in the DB -- fine for local dev, not for
  production.

## Tests

There's no automated test suite yet. Manual smoke test:

```bash
curl -X POST localhost:8000/auth/signup -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"testpass123"}'

TOKEN=$(curl -s -X POST localhost:8000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"testpass123"}' | python3 -c \
  'import sys,json; print(json.load(sys.stdin)["access_token"])')

curl -X POST localhost:8000/resume/upload -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/resume.pdf;type=application/pdf"

curl localhost:8000/profile/me -H "Authorization: Bearer $TOKEN"

curl -X PUT localhost:8000/profile/demographics -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"veteran_status":"I am not a protected veteran","gender":"Female"}'
```
