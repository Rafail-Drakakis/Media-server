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

## Environment Variables

Copy the example files first:

```bash
cp backend/.env.example backend/.env
```

Backend (`backend/.env`) values:

```env
JWT_SECRET=replace_with_a_long_random_secret
MEDIA_ROOT=/absolute/path/to/your/media/folder
PORT=3001
```

Notes:

- `JWT_SECRET` must be long and random.
- `MEDIA_ROOT` must exist and be readable by the backend.
- Frontend app name is set with `VITE_APP_NAME` in `frontend/.env`.

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

Most routes require `Authorization: Bearer <token>`.

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
