import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, authUrl } from '../api/client';

export default function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [show, setShow] = useState(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getShow(id),
      api.getWatchlist(),
    ]).then(([showData, wl]) => {
      setShow(showData);
      setInWatchlist(wl.some(w => w.id === showData.id));
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

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!show) return <div className="loading-screen">Show not found</div>;

  const bgImage = authUrl(show.backdrop_path || show.poster_path);
  const backgroundStyle = bgImage
    ? { backgroundImage: `url("${encodeURI(bgImage)}")` }
    : undefined;
  const episodes = show.episodes || [];
  const seasons = [...new Set(episodes.filter(e => e.season_number != null).map(e => e.season_number))].sort((a, b) => a - b);

  return (
    <div className="detail-page">
      <div
        className="detail-hero"
        style={backgroundStyle}
      >
        <div className="hero-overlay" />
        <div className="detail-hero-content">
          <div className="detail-hero-layout">
            {show.poster_path && (
              <img
                className="detail-poster"
                src={authUrl(show.poster_path)}
                alt={show.title}
              />
            )}
            <div className="detail-hero-info">
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
                  <button className="btn-play" onClick={() => playMedia(episodes[0].id)}>
                    &#9654; Play{episodes.length > 1 ? ' E1' : ''}
                  </button>
                )}
                <button className="btn-secondary" onClick={toggleWatchlist}>
                  {inWatchlist ? '&#10003; In My List' : '+ My List'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {episodes.length > 1 && seasons.length > 1 && (
        <div className="episodes-section">
          {seasons.map(sNum => (
            <div key={sNum} className="season-block">
              <h3>Season {sNum}</h3>
              <div className="episode-list">
                {episodes.filter(e => e.season_number === sNum).map(ep => (
                  <div key={ep.id} className="episode-item" onClick={() => playMedia(ep.id)}>
                    <span className="ep-number">E{ep.episode_number}</span>
                    <span className="ep-title">{ep.episode_title || `Episode ${ep.episode_number}`}</span>
                    <button className="btn-play-sm">&#9654;</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {episodes.length > 1 && seasons.length <= 1 && (
        <div className="episodes-section">
          <div className="episode-list">
            {episodes.map(ep => (
              <div key={ep.id} className="episode-item" onClick={() => playMedia(ep.id)}>
                {ep.episode_number && <span className="ep-number">E{ep.episode_number}</span>}
                <span className="ep-title">{ep.episode_title || `Episode ${ep.episode_number || ''}`}</span>
                <button className="btn-play-sm">&#9654;</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
