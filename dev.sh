#!/usr/bin/env bash
# Starts everything needed to try the extension on a real job application:
# builds the extension, then runs the backend (:8000) and the web app (:5173).
set -euo pipefail
root="$(cd "$(dirname "$0")" && pwd)"

if [ ! -d "$root/backend/.venv" ]; then
  echo "No backend/.venv yet -- follow the Setup steps in backend/DEV.md first." >&2
  exit 1
fi
for port in 8000 5173; do
  if lsof -ti "tcp:$port" >/dev/null 2>&1; then
    echo "Port $port is already in use, so the app may already be running. Stop it first, or skip this script." >&2
    exit 1
  fi
done

echo "Building the extension..."
(cd "$root/extension" && npm run build --silent)

trap 'kill 0' EXIT INT TERM
(cd "$root/backend" && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000) &
(cd "$root/webapp" && npm run dev --silent) &
sleep 3

cat <<MSG

  Ready.
    1. Web app:  http://localhost:5173   (sign up or log in, then upload your resume PDF)
    2. Extension: chrome://extensions -> Developer mode -> Load unpacked -> $root/extension/dist
                  (already loaded? click its reload icon)
    3. Open a real job application (Greenhouse, Lever, Ashby...). Click the lime R, or the
       extension icon -> Autofill. Review everything, then submit it yourself.

  Ctrl+C stops the backend and web app.
MSG
wait
