# Media Server

Self-hosted personal streaming app with:

- a Node.js/Express backend (`backend/`)
- a React + Vite frontend (`frontend/`)
- a local SQLite database (`backend/data.db`)

The backend scans your media folder, reads local sidecar metadata, and serves authenticated streaming endpoints.

## Tech Stack

- Backend: Express, `sql.js`, JWT auth
- Frontend: React, React Router, Vite
- Database: SQLite file at `backend/data.db`

## Project Structure

- `backend/` API server, scanner, auth, streaming routes
- `frontend/` UI app

## Prerequisites

- Node.js 18+ (recommended)
- npm
- A local media folder mounted on your machine

## First Run

1. Copy environment examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

2. Generate a strong JWT secret and set it in `backend/.env`:

```bash
openssl rand -base64 48
```

3. Set `MEDIA_ROOT` to your media folder path in `backend/.env`.

4. Install dependencies and start both apps (see below).

5. Open the frontend, register the first user account, then run a library scan from the UI.

The database file (`backend/data.db`) is created automatically on first backend start. It is not committed to git.

## Environment Variables

Backend (`backend/.env`):

```env
JWT_SECRET=replace_with_a_long_random_secret
MEDIA_ROOT=/absolute/path/to/your/media/folder
PORT=3001
ALLOW_REGISTRATION=false
CORS_ORIGINS=http://localhost:5173
```

Frontend (`frontend/.env`):

```env
VITE_APP_NAME=Media Server
```

Notes:

- `JWT_SECRET` must be at least 32 characters. The server refuses to start with a missing or placeholder value.
- `MEDIA_ROOT` must exist and be readable by the backend.
- `ALLOW_REGISTRATION=false` (default) allows only the first user to register. Set to `true` to permit additional sign-ups.
- `CORS_ORIGINS` is a comma-separated list of allowed frontend URLs.

## Install

Install dependencies for both apps:

```bash
cd backend && npm install
cd ../frontend && npm install
```

## Run in Development

Start backend:

```bash
cd backend
npm run dev
```

Start frontend (new terminal):

```bash
cd frontend
npm run dev
```

Default URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

## Build Frontend

```bash
cd frontend
npm run build
npm run preview
```

## API Overview

Base path: `/api`

- Health
  - `GET /api/health`
- Auth
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
- Library
  - `POST /api/library/scan`
  - `GET /api/library`
  - `GET /api/library/types`
  - `GET /api/library/genres`
  - `GET /api/library/search?q=...`
  - `GET /api/library/:id`
  - `GET /api/library/media/:id`
- Streaming / subtitles
  - `GET /api/stream/:id`
  - `GET /api/stream/:id/subtitles`
  - `GET /api/stream/:id/subtitles/:index?format=vtt`
- User state
  - `GET /api/progress`
  - `PUT /api/progress`
  - `DELETE /api/progress/:mediaId`
  - `GET /api/watchlist`
  - `POST /api/watchlist`
  - `DELETE /api/watchlist/:showId`

Most routes require `Authorization: Bearer <token>`. Streaming and image assets accept the token via query string for browser media elements.

## Security

- Never commit `backend/.env`, `backend/data.db`, `node_modules/`, or `frontend/dist/`.
- Registration is open only until the first user exists, unless `ALLOW_REGISTRATION=true`.
- Set `CORS_ORIGINS` to your real frontend origin when deploying beyond localhost.
- See [SECURITY.md](SECURITY.md) for vulnerability reporting and secret-rotation guidance.

## Deploying

- Build the frontend (`npm run build`) and serve it behind a reverse proxy with the backend.
- Do not expose the Vite dev server (`npm run dev`) to the public internet. The dev config binds to all interfaces (`host: true`).
- Rotate `JWT_SECRET` and user passwords if secrets were ever committed to git before going public.

## Subtitles

- Subtitles are discovered when you play a title, not during library scan.
- The server looks for `.srt` and `.vtt` files in the video folder and in any `metadata/` folder on the path from the file up to `MEDIA_ROOT` (e.g. show-level subs under `series/My Show/metadata/` for episodes in season folders).
- If the same filename exists in multiple locations, the copy next to the video file wins.

## Scanner Behavior

- Recursively scans `MEDIA_ROOT` for video files.
- Attempts to infer movie/series metadata from path and filename.
- Reads metadata only from local sidecars at `<movie-or-show-folder>/metadata/metadata.json`.
- Uses local sidecar image references for poster/backdrop when present.
- If no sidecar metadata exists, keeps the item with minimal metadata fields.
- Removes DB entries for media files no longer present on disk.

## Troubleshooting

- `MEDIA_ROOT does not exist`
  - Check `MEDIA_ROOT` in `backend/.env`.
- `Invalid or expired token`
  - Log in again or rotate `JWT_SECRET` carefully (old tokens become invalid).
- No media appears after scan
  - Confirm file extensions are supported (`.mp4`, `.mkv`, `.avi`, etc.).
  - Check backend logs for scan warnings.
