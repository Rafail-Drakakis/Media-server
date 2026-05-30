import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function Hero({ show }) {
  const navigate = useNavigate();
  const [playLoading, setPlayLoading] = useState(false);

  if (!show) return null;

  const bgImage = show.backdrop_path || show.poster_path;
  const backgroundStyle = bgImage
    ? { backgroundImage: `url("${encodeURI(bgImage)}")` }
    : undefined;

  async function handlePlay() {
    setPlayLoading(true);
    try {
      const detail = await api.getShow(show.id);
      const episodes = detail.episodes || [];
      if (episodes.length > 0) {
        navigate(`/watch/${episodes[0].id}`);
      } else {
        navigate(`/show/${show.id}`);
      }
    } catch {
      navigate(`/show/${show.id}`);
    } finally {
      setPlayLoading(false);
    }
  }

  return (
    <div
      className={`hero ${!bgImage ? 'hero--no-image' : 'hero--animated'}`}
      style={backgroundStyle}
    >
      <div className="hero-overlay" />
      <div className="hero-content">
        <h1 className="hero-title">{show.title}</h1>
        <p className="hero-overview">
          {show.overview?.length > 250 ? show.overview.slice(0, 250) + '...' : show.overview}
        </p>
        <div className="hero-actions">
          <button className="btn-play" onClick={handlePlay} disabled={playLoading}>
            &#9654; {playLoading ? 'Loading...' : 'Play'}
          </button>
          <button className="btn-info" onClick={() => navigate(`/show/${show.id}`)}>
            &#9432; More Info
          </button>
        </div>
      </div>
    </div>
  );
}
