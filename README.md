# Media-server

A self-hosted Netflix-like app for streaming movies and series from your external HDD.

## Prerequisites

- **Node.js** 18+ (recommended: 20+)
- External HDD mounted at a known path

## Quick Start

### 1. Backend

```bash
cd backend
npm install
```

Edit `.env` to set your `MEDIA_ROOT` (path to your external HDD media folder):

```env
TMDB_API_KEY=your_tmdb_api_key
JWT_SECRET=your_secret
MEDIA_ROOT=/mnt/external/media
PORT=3001
```

Start the backend:

```bash
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

### 3. Usage

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
- Netflix-like dark UI

## Media Organization

The scanner supports these naming conventions:

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
