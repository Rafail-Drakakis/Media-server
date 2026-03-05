import { useNavigate } from 'react-router-dom';

export default function Card({ show, progress, onRemove }) {
  const navigate = useNavigate();
  const poster = show.poster_path || show.posterPath;

  function handleRemoveClick(e) {
    e.stopPropagation();
    onRemove?.();
  }

  function handleClick() {
    if (show.show_id) {
      navigate(`/show/${show.show_id}`);
    } else {
      navigate(`/show/${show.id}`);
    }
  }

  const pct = progress
    ? Math.min(100, Math.round((progress.position_seconds / Math.max(progress.duration_seconds, 1)) * 100))
    : null;

  return (
    <div className="card" onClick={handleClick}>
      {onRemove && (
        <button
          type="button"
          className="card-remove"
          onClick={handleRemoveClick}
          aria-label="Remove from list"
        >
          ×
        </button>
      )}
      {poster ? (
        <img src={poster} alt={show.title || show.show_title} loading="lazy" />
      ) : (
        <div className="card-placeholder">
          <span>{(show.title || show.show_title || '?')[0]}</span>
        </div>
      )}
      <div className="card-info">
        <p className="card-title">{show.title || show.show_title}</p>
      </div>
      {pct != null && (
        <div className="card-progress-bar">
          <div className="card-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
