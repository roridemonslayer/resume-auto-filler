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

## Run

```bash
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

The API is now at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

## Endpoints

| Method | Path                   | Auth | Description                                   |
|--------|------------------------|------|------------------------------------------------|
| POST   | `/auth/signup`         | no   | Create an account                               |
| POST   | `/auth/login`          | no   | Get a JWT access token                          |
| POST   | `/resume/upload`       | yes  | Upload a PDF, parse it, store the resume fields |
| GET    | `/profile/me`          | yes  | Fetch resume fields + EEO fields, merged        |
| PUT    | `/profile/demographics`| yes  | Set voluntary self-ID (veteran/gender/etc.)     |
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
