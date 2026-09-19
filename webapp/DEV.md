# Web app development guide

React + TypeScript + react-router single-page app: landing page, auth, and the dashboard where
users upload their resume and set their EEO/voluntary-identity info. This is the primary product
surface -- the extension is a thin client that reads the same account's profile to fill pages.

## Setup

```bash
cd webapp
npm install
```

The backend must be running first -- see [`../backend/DEV.md`](../backend/DEV.md).

### Enabling "Sign in with Google" (optional)

The Google button just doesn't render until this is set up -- everything else works without it.

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a project (or pick
   an existing one).
2. **APIs & Services → OAuth consent screen**: choose "External", fill in the required fields
   (app name, your email), and save. You don't need to submit it for verification for local dev.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - Application type: **Web application**
   - **Authorized JavaScript origins**: add `http://localhost:5173` (and your deployed webapp URL
     later)
   - Leave "Authorized redirect URIs" empty -- this flow doesn't use redirects.
4. Copy the **Client ID** it gives you (looks like `123-abc.apps.googleusercontent.com`).
5. Put it in **both**:
   - `webapp/.env`: `VITE_GOOGLE_CLIENT_ID=<that value>`
   - `backend/.env`: `GOOGLE_CLIENT_ID=<the same value>`
6. Restart both `npm run dev` and the backend so the env vars are picked up.

## Run

```bash
npm run dev
```

Opens at `http://localhost:5173`. `API_BASE_URL` in `src/lib/api.ts` defaults to
`http://localhost:8000`; update it (and deploy the built `dist/` somewhere) before pointing this
at a real backend.

## Build

```bash
npm run build
```

Type-checks then builds to `dist/`, deployable as a static site (Vercel, Netlify, etc.) as long as
`API_BASE_URL` points at your deployed backend and the backend's CORS allows the deployed origin
(it currently allows `*`).

## Pages

- `/` -- landing page (marketing pitch, honest data/privacy section)
- `/login`, `/signup` -- auth, both handled by `src/pages/Auth.tsx`
- `/dashboard` -- protected (`RequireAuth`); resume upload + parsed summary, an editable
  "Profile details" section (`components/ProfileEditor.tsx`), the application tracker board
  (`components/ApplicationTracker.tsx`), and the voluntary identity information form
  (`src/lib/eeoOptions.ts` holds the option lists)

## Architecture notes

- `src/context/AuthContext.tsx` holds the JWT (in `localStorage`) and the merged profile, fetched
  from `GET /profile/me` on mount and after login/upload/save.
- The EEO form fields are intentionally unset (`null`) by default, not pre-selected to any answer.
  Each field also offers an explicit "I don't wish to answer" option, distinct from leaving it
  unset -- see the comment in `src/lib/eeoOptions.ts` for why that distinction matters (it lets a
  user tell the extension to actively decline a question on forms that require a selection,
  versus just not answering it at all).
- The landing hero's browser-window graphic (`.mock-browser` in `src/styles/global.css`) is pure
  CSS, not a screenshot -- keeps the bundle small and never goes stale when the actual UI changes.
- `src/components/GoogleSignInButton.tsx` reads `VITE_GOOGLE_CLIENT_ID` and renders nothing if it's
  unset, rather than a broken button -- see the setup steps above.
- A signup (email/password or Google) sets a `sessionStorage` flag that shows a one-time "Account
  created" banner on the dashboard (`Dashboard.tsx`'s `showWelcome` state) -- no backend involved,
  works with zero setup.
- Education/experience are stored as flat lists of lines, so `ProfileEditor` edits them as
  one-line-per-entry text areas; lines starting with a bullet character render as bullets.
- `useApplications` (in `ApplicationTracker.tsx`) owns the tracker state so the dashboard's
  overview tile and the board share it. It updates optimistically and reverts on error, and
  refetches when the window regains focus, since the extension logs fills from other tabs.
- The backend returns naive UTC timestamps; `formatDate` tags them as UTC before parsing.
- Layout gotcha: the dashboard grids use `minmax(0, 1fr)` columns on purpose. With plain `1fr`,
  the board's fixed-width columns stretch the whole page sideways instead of scrolling inside
  their card.
- The design is dark-first (`:root`) with `[data-theme="light"]` overriding the tokens; the
  accent is lime and always sits on near-black text. `ThemeContext` defaults to dark, and its
  storage key is versioned so a redesign can reset stale saved themes.
