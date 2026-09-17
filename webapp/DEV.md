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
- `/dashboard` -- protected (`RequireAuth`); resume upload + parsed summary, and the voluntary
  identity information form (`src/lib/eeoOptions.ts` holds the option lists)

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
