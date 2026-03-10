import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [show, setShow] = useState(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playingIds, setPlayingIds] = useState(new Set());

  useEffect(() => {
    Promise.all([
      api.getShow(id),
      api.getWatchlist(),
      api.getActiveVLC().catch(() => []),
    ]).then(([showData, wl, activeIds]) => {
      setShow(showData);
      setInWatchlist(wl.some(w => w.id === showData.id));
      setPlayingIds(new Set(activeIds));
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  async function toggleWatchlist() {
    if (inWatchlist) {
      await api.removeFromWatchlist(show.id);
      setInWatchlist(false);
    } else {
      await api.addToWatchlist(show.id);
      setInWatchlist(true);
    }
  }

  function playMedia(mediaId) {
    navigate(`/watch/${mediaId}`);
  }

  async function launchVLC(mediaId) {
    try {
      let startTime = 0;
      const progressList = await api.getProgress().catch(() => []);
      const saved = progressList.find(p => String(p.media_id) === String(mediaId));
      if (saved && saved.position_seconds > 5) {
        startTime = saved.position_seconds;
      }
      await api.launchInVLC(mediaId, startTime);
      setPlayingIds(prev => new Set(prev).add(mediaId));
    } catch (err) {
      console.error('Failed to launch VLC:', err);
    }
  }

  const isPlaying = (mediaId) => playingIds.has(mediaId);

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!show) return <div className="loading-screen">Show not found</div>;

  const bgImage = show.backdrop_path || show.poster_path;
  const episodes = show.episodes || [];
  const seasons = [...new Set(episodes.filter(e => e.season_number != null).map(e => e.season_number))].sort((a, b) => a - b);

  return (
    <div className="detail-page">
      <div
        className="detail-hero"
        style={bgImage ? { backgroundImage: `url(${bgImage})` } : undefined}
      >
        <div className="hero-overlay" />
        <div className="detail-hero-content">
          <h1>{show.title}</h1>
          <div className="detail-meta">
            {show.release_date && <span>{show.release_date.slice(0, 4)}</span>}
            {show.vote_average > 0 && <span className="rating">&#9733; {show.vote_average.toFixed(1)}</span>}
            {Array.isArray(show.genres) && show.genres.length > 0 && (
              <span>{show.genres.join(', ')}</span>
            )}
          </div>
          <p className="detail-overview">{show.overview}</p>
          <div className="detail-actions">
            {episodes.length > 0 && (
              <>
                <button className="btn-play" onClick={() => playMedia(episodes[0].id)}>
                  &#9654; Play{show.type === 'series' ? ' S1E1' : ''}
                </button>
                {!isPlaying(episodes[0].id) && (
                  <button className="btn-vlc" onClick={() => launchVLC(episodes[0].id)}>
                    &#9654; VLC
                  </button>
                )}
              </>
            )}
            <button className="btn-secondary" onClick={toggleWatchlist}>
              {inWatchlist ? '&#10003; In My List' : '+ My List'}
            </button>
          </div>
        </div>
      </div>

      {show.type === 'series' && seasons.length > 0 && (
        <div className="episodes-section">
          {seasons.map(sNum => (
            <div key={sNum} className="season-block">
              <h3>Season {sNum}</h3>
              <div className="episode-list">
                {episodes.filter(e => e.season_number === sNum).map(ep => (
                  <div key={ep.id} className="episode-item" onClick={() => playMedia(ep.id)}>
                    <span className="ep-number">E{ep.episode_number}</span>
                    <span className="ep-title">{ep.episode_title || `Episode ${ep.episode_number}`}</span>
                    {!isPlaying(ep.id) && <button className="btn-vlc-sm" onClick={(e) => { e.stopPropagation(); launchVLC(ep.id); }}>VLC</button>}
                    <button className="btn-play-sm">&#9654;</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {show.type === 'movie' && episodes.length > 0 && (
        <div className="episodes-section">
          <div className="episode-list">
            {episodes.map(ep => (
              <div key={ep.id} className="episode-item" onClick={() => playMedia(ep.id)}>
                <span className="ep-title">{ep.episode_title || show.title}</span>
                {!isPlaying(ep.id) && <button className="btn-vlc-sm" onClick={(e) => { e.stopPropagation(); launchVLC(ep.id); }}>VLC</button>}
                <button className="btn-play-sm">&#9654;</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
