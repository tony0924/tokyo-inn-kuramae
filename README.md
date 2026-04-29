# Tokyo Inn Kuramae

Tokyo Inn Kuramae is a private guest guide and booking management app built with React, Vite, Firebase Hosting, Firestore, Firebase Auth, and Cloud Functions.

## Features

- Guest guide pages for arrival, facilities, nearby services, restaurants, and emergency info.
- Admin booking management with guest codes, Gmail access, key management, and revenue overview.
- One-room booking conflict checks.
- Guest login by Google account or time-limited guest code.
- Gmail SMTP email notifications through Firebase Cloud Functions.

## Tech Stack

- React 18
- TypeScript
- Vite
- Firebase Hosting
- Cloud Firestore
- Firebase Authentication
- Firebase Cloud Functions v2

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env.local` from `.env.example` and fill in the Firebase web app config:

```bash
cp .env.example .env.local
```

Run locally:

```bash
npm run dev
```

Build:

```bash
npm run build
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full deployment checklist.

Common commands:

```bash
npm run build
firebase deploy --only hosting
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only functions
```

## Notes

- `.env.local` is intentionally ignored and should never be committed.
- `Previous/`, `.7z`, `node_modules/`, `dist/`, and Firebase build artifacts are ignored.
- Project context and handoff notes are documented in [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md).
