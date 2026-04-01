# Media-server

A self-hosted Netflix-like app that scans a local/external media library, enriches it with metadata, and streams it in a browser.

## What This Project Does

- Scans your local media folders and builds a library database
- Detects movies, series, documentaries, podcasts, talks, concerts, performances, and stand-up
- Fetches metadata from TMDB where applicable (title, poster, backdrop, rating, genres, overview)
- Streams video with range requests (seek support)
- Supports subtitles (`.srt`, `.vtt`) with on-the-fly SRT -> VTT conversion for web playback
- Tracks watch progress per user and supports "Continue Watching"
- Supports per-user watchlists ("My List")
- Generates local thumbnails for content without TMDB posters (from local artwork or `ffmpeg` frame capture)

## Tech Stack

- Frontend: React + React Router + Vite
- Backend: Express (Node.js, ESM)
- Database: `sql.js` (SQLite stored in `backend/data.db`)
- Auth: JWT + bcrypt password hashing

## Project Structure

```text
.
├─ backend/
│  ├─ src/
│  │  ├─ routes/        # auth, library, progress, watchlist, stream, thumbnail
│  │  ├─ services/      # scanner, tmdb integration, thumbnail generation
│  │  ├─ db/            # schema + db initialization
│  │  └─ middleware/    # auth middleware
│  ├─ data.db           # created automatically
│  └─ package.json
├─ frontend/
│  ├─ src/              # pages, components, API client, auth context
│  └─ package.json
└─ README.md
```

## Prerequisites

- Node.js 18+ (Node.js 20+ recommended)
- npm 9+
- A mounted local/external media folder (used as `MEDIA_ROOT`)
- `ffmpeg` (recommended; used for thumbnail extraction fallback)

### Install ffmpeg (Linux example)

```bash
sudo apt update
sudo apt install -y ffmpeg
```

## Environment Variables

Create `backend/.env`:

```env
TMDB_API_KEY=your_tmdb_api_key
JWT_SECRET=replace-with-strong-random-secret
MEDIA_ROOT=/absolute/path/to/your/media
PORT=3001
```

- `TMDB_API_KEY`: TMDB API key for metadata enrichment (`movie`, `series`, and some documentaries)
- `JWT_SECRET`: secret used to sign auth tokens (change from defaults for real usage)
- `MEDIA_ROOT`: absolute path to your library root
- `PORT`: backend port (default `3001`)

Frontend does not require env vars for local development by default. It proxies `/api` to `http://localhost:3001`.

## Quick Start (Development)

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

Backend will run on `http://localhost:3001`.

### 2) Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend will run on `http://localhost:5173`.

## Production / Non-watch Run

Backend:

```bash
cd backend
npm install
npm start
```

Frontend build:

```bash
cd frontend
npm run build
npm run preview
```

## First-Time Usage Flow

1. Register an account
2. Sign in
3. Open Home and click **Scan Library**
4. Browse content rows by type and genre
5. Open a title -> Play media
6. Add/remove items from **My List** as needed

## Media Library Organization

The scanner walks all subfolders under `MEDIA_ROOT` and recognizes these top-level folder names:

- `Movies` -> `movie`
- `Series` -> `series`
- `Kids shows` -> `series`
- `Concerts` -> `concert`
- `Documentaries` -> `documentary`
- `Podcasts` -> `podcast`
- `Talks` -> `talk`
- `Performances` -> `performance`
- `Stand up` -> `standup`

Unknown top-level folders are treated as movie-style content.

### Supported video formats

`.mp4`, `.mkv`, `.avi`, `.webm`, `.mov`, `.m4v`, `.wmv`, `.flv`, `.ts`

### Example naming patterns

Movies:

```text
Movies/Movie Name (2020)/Movie Name (2020).mp4
Movies/Movie.Name.2020.mkv
```

Series:

```text
Series/Show Name/Season 01/Show.Name.S01E01.mp4
Series/Show Name/Show.Name.S01E02.mkv
Series/Show Name/1 - Pilot.mp4
```

Episode number parsing supports patterns like:

- `S01E02`
- `Episode 2`
- `Επεισόδιο 2`
- Leading numbered prefix (`1 - ...`)

### Subtitles

Place subtitle files in the same folder as the video:

- Supported subtitle formats: `.srt`, `.vtt`
- In player UI, click `CC` and choose a subtitle track
- `.srt` is converted to VTT on request for browser compatibility

## Functional Overview

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- JWT-based auth (`Authorization: Bearer <token>`)

### Library

- `POST /api/library/scan` scans disk, updates DB, deduplicates entries, removes deleted files
- `GET /api/library` lists shows (optional filters: `type`, `genre`, `limit`)
- `GET /api/library/types` returns available media types
- `GET /api/library/genres` returns discovered genres
- `GET /api/library/search?q=...` title/overview search
- `GET /api/library/:id` show details + episodes/media items
- `GET /api/library/media/:id` raw media item record

### Playback & Subtitles

- `GET /api/stream/:id` streams file with range support
- `GET /api/stream/:id/subtitles` lists subtitle tracks
- `GET /api/stream/:id/subtitles/:index?format=vtt` returns subtitle file

### Progress

- `GET /api/progress` list user progress rows
- `PUT /api/progress` upsert progress (`mediaId`, `positionSeconds`, `durationSeconds`)
- `DELETE /api/progress/:mediaId` remove progress entry

For series, saving progress on one episode clears progress for other episodes of the same show (single active "continue" item per series).

### Watchlist

- `GET /api/watchlist`
- `POST /api/watchlist`
- `DELETE /api/watchlist/:showId`

### Thumbnails

- `GET /api/thumbnail/:showId` serves generated fallback thumbnail
- For items without TMDB posters:
  - Prefer local image files near the video (`poster`, `cover`, `folder`, etc.)
  - Otherwise extract a frame via `ffmpeg`

## Useful Notes

- Database file: `backend/data.db`
- The backend periodically persists DB state and also writes after mutation queries
- On startup, backend removes `${MEDIA_ROOT}/.Trash-1000` if present
- Frontend auto-redirects to login on `401` responses
- Player supports keyboard seek:
  - Left arrow: -5 seconds
  - Right arrow: +5 seconds

## Troubleshooting

- `Scan failed: MEDIA_ROOT does not exist`
  - Verify `MEDIA_ROOT` in `backend/.env` is an absolute, mounted path
- No posters/metadata
  - Verify `TMDB_API_KEY`; non-TMDB categories intentionally skip TMDB lookup
- Thumbnails missing for local/non-TMDB content
  - Install `ffmpeg`; or place local artwork files (`.jpg/.jpeg/.png/.webp`) in video folder
- Frontend cannot reach backend
  - Ensure backend runs on the port expected by `frontend/vite.config.js` proxy (`3001` by default)

## Security / Deployment Recommendations

- Use a strong `JWT_SECRET`
- Do not expose this app directly to the internet without a reverse proxy and HTTPS
- Keep `backend/.env` private and out of version control
- If deploying on a home server, restrict network access to trusted devices/users
