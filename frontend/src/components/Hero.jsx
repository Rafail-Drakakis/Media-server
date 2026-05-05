import { useNavigate } from 'react-router-dom';

export default function Hero({ show }) {
  const navigate = useNavigate();
  if (!show) return null;

  const bgImage = show.backdrop_path || show.poster_path;
  const backgroundStyle = bgImage
    ? { backgroundImage: `url("${encodeURI(bgImage)}")` }
    : undefined;

  return (
    <div
      className="hero"
      style={backgroundStyle}
    >
      <div className="hero-overlay" />
      <div className="hero-content">
        <h1 className="hero-title">{show.title}</h1>
        <p className="hero-overview">
          {show.overview?.length > 250 ? show.overview.slice(0, 250) + '...' : show.overview}
        </p>
        <div className="hero-actions">
          <button className="btn-play" onClick={() => navigate(`/show/${show.id}`)}>
            &#9654; Play
          </button>
          <button className="btn-info" onClick={() => navigate(`/show/${show.id}`)}>
            &#9432; More Info
          </button>
        </div>
      </div>
    </div>
  );
}
