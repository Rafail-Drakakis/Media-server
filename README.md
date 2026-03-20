# Media-server

A self-hosted Netflix-like app for streaming movies and series from your external HDD.

## Prerequisites

- **Node.js** 18+ (recommended: 20+)
- npm 9+ (bundled with recent Node versions)
- External HDD mounted at a known path (this will be your `MEDIA_ROOT`)

## Quick Start (Development)

### 1. Backend

From the repo root:

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` folder and set at least:

```env
TMDB_API_KEY=your_tmdb_api_key
JWT_SECRET=your_secret
MEDIA_ROOT=/mnt/external/media
PORT=3001
```

- **TMDB_API_KEY**: create a free API key from TMDB.
- **MEDIA_ROOT**: absolute path to the folder where your movies/series live (can be on an external HDD).
- **PORT**: API port. The frontend dev server proxies `/api` to `http://localhost:3001`, so if you change this, also update the Vite config.

Start the backend in watch mode:

```bash
npm run dev
```

This will start the API at `http://localhost:3001`.

### 2. Frontend

In a second terminal, from the repo root:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

During development, all requests to `/api/*` from the frontend are proxied to the backend (`http://localhost:3001`).

## Production Build (optional)

If you want to build the frontend for production:

```bash
cd frontend
npm run build
# Optionally preview the built app
npm run preview
```

For the backend, you can run it without file watching:

```bash
cd backend
npm install
npm start
```

## Usage

1. **Register** a new account
2. Click **Scan Library** to scan your media folder
3. The app will fetch metadata (posters, descriptions, genres) from TMDB
4. Browse, search, and watch your media

## Features

- Multi-user authentication with separate watchlists
- Automatic metadata fetching from TMDB (posters, descriptions, ratings, genres)
- Continue watching with progress tracking
- Search across your library
- Genre-based browsing
- Video streaming with seek support (range requests)
- **Subtitle support**: place `.srt` or `.vtt` files in the same folder as a video; choose which track to use from the watch page
- Netflix-like dark UI

## Media Organization

The scanner supports these naming conventions:

Recognized top-level folders under `MEDIA_ROOT` include: `Movies`, `Series`, `Kids shows`, `Podcasts`, `Talks`, `Performances`, and `Stand up`.

**Movies:**
```
Movie Name (2020)/Movie Name (2020).mp4
Movie.Name.2020.mp4
```

**Series:**
```
Show Name/Season 01/Show.Name.S01E01.mp4
Show Name/Show.Name.S01E01.mp4
Show.Name.S01E01.Episode.Title.mkv
```

Supported formats: `.mp4`, `.mkv`, `.avi`, `.webm`, `.mov`, `.m4v`, `.wmv`, `.flv`, `.ts`

**Subtitles:** Put `.srt` or `.vtt` files in the same folder as the video (e.g. `Movie Name (2020)/Movie Name (2020).en.srt`). On the watch page, use the "Subtitles" dropdown to pick which track to show.
