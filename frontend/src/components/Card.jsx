import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, authUrl } from '../api/client';

function resolveShowId(show) {
  return show.show_id ?? show.id;
}

export default function Card({
  show,
  progress,
  onRemove,
  variant = 'portrait',
  watchlistIds,
  onWatchlistChange,
}) {
  const navigate = useNavigate();
  const collapseTimer = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [playLoading, setPlayLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);

  const poster = show.poster_path || show.posterPath;
  const rawImage = variant === 'landscape'
    ? (show.backdrop_path || poster)
    : poster;
  const imageSrc = rawImage ? authUrl(rawImage) : null;

  const showId = resolveShowId(show);
  const inWatchlist = watchlistIds?.has(showId) ?? false;
  const showHoverPanel = variant === 'portrait' && !onRemove;

  const year = show.release_date?.slice(0, 4);
  const rating = show.vote_average > 0 ? show.vote_average.toFixed(1) : null;

  function handleMouseEnter() {
    clearTimeout(collapseTimer.current);
    if (showHoverPanel) setExpanded(true);
  }

  function handleMouseLeave() {
    collapseTimer.current = setTimeout(() => setExpanded(false), 350);
  }

  function handleRemoveClick(e) {
    e.stopPropagation();
    onRemove?.();
  }

  function handleClick() {
    if (onRemove && show.media_id != null) {
      navigate(`/watch/${show.media_id}`);
    } else if (show.show_id) {
      navigate(`/show/${show.show_id}`);
    } else {
      navigate(`/show/${show.id}`);
    }
  }

  async function handlePlayClick(e) {
    e.stopPropagation();
    if (onRemove && show.media_id != null) {
      navigate(`/watch/${show.media_id}`);
      return;
    }

    setPlayLoading(true);
    try {
      const detail = await api.getShow(showId);
      const episodes = detail.episodes || [];
      if (episodes.length > 0) {
        navigate(`/watch/${episodes[0].id}`);
      } else {
        navigate(`/show/${showId}`);
      }
    } catch {
      navigate(`/show/${showId}`);
    } finally {
      setPlayLoading(false);
    }
  }

  async function handleWatchlistClick(e) {
    e.stopPropagation();
    if (!showId || listLoading) return;

    setListLoading(true);
    try {
      if (inWatchlist) {
        await api.removeFromWatchlist(showId);
        onWatchlistChange?.(showId, false);
      } else {
        await api.addToWatchlist(showId);
        onWatchlistChange?.(showId, true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setListLoading(false);
    }
  }

  const pct = progress
    ? Math.min(100, Math.round((progress.position_seconds / Math.max(progress.duration_seconds, 1)) * 100))
    : null;

  return (
    <div
      className={`card card--${variant}${expanded ? ' card--expanded' : ''}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
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
      <div className="card-media">
        {imageSrc ? (
          <img src={imageSrc} alt={show.title || show.show_title} loading="lazy" />
        ) : (
          <div className="card-placeholder">
            <span>{(show.title || show.show_title || '?')[0]}</span>
          </div>
        )}
        {pct != null && (
          <div className="card-progress-bar">
            <div className="card-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      <div className="card-info">
        <p className="card-title">{show.title || show.show_title}</p>
      </div>
      {showHoverPanel && (
        <div className="card-hover-panel">
          {(year || rating) && (
            <div className="card-hover-meta">
              {year && <span>{year}</span>}
              {rating && <span className="card-hover-rating">&#9733; {rating}</span>}
            </div>
          )}
          <div className="card-hover-actions">
            <button
              type="button"
              className="card-action-btn card-action-btn--play"
              onClick={handlePlayClick}
              disabled={playLoading}
              aria-label="Play"
            >
              &#9654;
            </button>
            <button
              type="button"
              className={`card-action-btn card-action-btn--list${inWatchlist ? ' in-list' : ''}`}
              onClick={handleWatchlistClick}
              disabled={listLoading}
              aria-label={inWatchlist ? 'Remove from My List' : 'Add to My List'}
            >
              {inWatchlist ? '&#10003;' : '+'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
