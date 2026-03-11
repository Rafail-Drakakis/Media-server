import { useState, useEffect } from 'react';
import { api } from '../api/client';
import Hero from '../components/Hero';
import Row from '../components/Row';

const TYPE_LABELS = {
  movie: 'Movies',
  series: 'Series',
  concert: 'Concerts',
  documentary: 'Documentaries',
  podcast: 'Podcasts',
  talk: 'Talks',
};

export default function Home() {
  const [typeRows, setTypeRows] = useState({});
  const [continueWatching, setContinueWatching] = useState([]);
  const [genres, setGenres] = useState([]);
  const [genreShows, setGenreShows] = useState({});
  const [hero, setHero] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [progressMap, setProgressMap] = useState({});
  const [typeOrder, setTypeOrder] = useState([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [types, progress, genreList] = await Promise.all([
        api.getTypes().catch(() => ['movie', 'series']),
        api.getProgress(),
        api.getGenres(),
      ]);

      setTypeOrder(types);

      const libraryFetches = types.map(t => api.getLibrary({ type: t }));
      const libraryResults = await Promise.all(libraryFetches);

      const rows = {};
      const allShows = [];
      for (let i = 0; i < types.length; i++) {
        rows[types[i]] = libraryResults[i];
        allShows.push(...libraryResults[i]);
      }
      setTypeRows(rows);

      setGenres(genreList);
      setContinueWatching(progress.filter(p => p.position_seconds > 0));

      const pMap = {};
      for (const p of progress) {
        pMap[p.show_id || p.media_id] = p;
      }
      setProgressMap(pMap);

      if (allShows.length > 0) {
        const withBackdrop = allShows.filter(s => s.backdrop_path);
        setHero(withBackdrop.length > 0
          ? withBackdrop[Math.floor(Math.random() * withBackdrop.length)]
          : allShows[0]
        );
      }

      const gShows = {};
      for (const genre of genreList) {
        gShows[genre] = allShows.filter(s =>
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

  const totalShows = Object.values(typeRows).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <main className="home">
      {totalShows === 0 ? (
        <div className="empty-library">
          <h2>Your library is empty</h2>
          <p>Scan your media folder to find content.</p>
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
            {typeOrder.map(type => (
              <Row key={type} title={TYPE_LABELS[type] || type} items={typeRows[type] || []} />
            ))}
            {genres.map(genre => (
              <Row key={genre} title={genre} items={genreShows[genre]} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
