import { useState, useEffect } from 'react';
import { api } from '../api/client';
import Hero from '../components/Hero';
import Row from '../components/Row';

export default function Home() {
  const [movies, setMovies] = useState([]);
  const [series, setSeries] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  const [genres, setGenres] = useState([]);
  const [genreShows, setGenreShows] = useState({});
  const [hero, setHero] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [progressMap, setProgressMap] = useState({});

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [movieList, seriesList, progress, genreList] = await Promise.all([
        api.getLibrary({ type: 'movie' }),
        api.getLibrary({ type: 'series' }),
        api.getProgress(),
        api.getGenres(),
      ]);

      setMovies(movieList);
      setSeries(seriesList);
      setGenres(genreList);
      setContinueWatching(progress.filter(p => p.position_seconds > 0));

      const pMap = {};
      for (const p of progress) {
        pMap[p.show_id || p.media_id] = p;
      }
      setProgressMap(pMap);

      const all = [...movieList, ...seriesList];
      if (all.length > 0) {
        const withBackdrop = all.filter(s => s.backdrop_path);
        setHero(withBackdrop.length > 0
          ? withBackdrop[Math.floor(Math.random() * withBackdrop.length)]
          : all[0]
        );
      }

      const gShows = {};
      for (const genre of genreList) {
        gShows[genre] = all.filter(s =>
          Array.isArray(s.genres) && s.genres.includes(genre)
        );
      }
      setGenreShows(gShows);
    } catch (err) {
      console.error('Failed to load library:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleScan() {
    setScanning(true);
    try {
      await api.scanLibrary();
      await loadData();
    } catch (err) {
      alert('Scan failed: ' + err.message);
    } finally {
      setScanning(false);
    }
  }

  async function handleRemoveFromContinueWatching(item) {
    try {
      await api.deleteProgress(item.media_id);
      setContinueWatching(prev => prev.filter(p => p.media_id !== item.media_id));
      setProgressMap(prev => {
        const next = { ...prev };
        delete next[item.media_id];
        return next;
      });
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return <div className="loading-screen">Loading library...</div>;
  }

  const isEmpty = movies.length === 0 && series.length === 0;

  return (
    <main className="home">
      {isEmpty ? (
        <div className="empty-library">
          <h2>Your library is empty</h2>
          <p>Scan your media folder to find movies and series.</p>
          <button className="btn-play" onClick={handleScan} disabled={scanning}>
            {scanning ? 'Scanning...' : 'Scan Library'}
          </button>
        </div>
      ) : (
        <>
          <Hero show={hero} />
          <div className="rows-container">
            <div className="scan-bar">
              <button className="btn-scan" onClick={handleScan} disabled={scanning}>
                {scanning ? 'Scanning...' : 'Rescan Library'}
              </button>
            </div>
            <Row title="Continue Watching" items={continueWatching} progressMap={progressMap} onRemove={handleRemoveFromContinueWatching} />
            <Row title="Movies" items={movies} />
            <Row title="Series" items={series} />
            {genres.map(genre => (
              <Row key={genre} title={genre} items={genreShows[genre]} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
