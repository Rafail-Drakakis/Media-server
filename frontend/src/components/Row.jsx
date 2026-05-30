import { useRef } from 'react';
import { Link } from 'react-router-dom';
import Card from './Card';

export default function Row({
  title,
  items,
  progressMap,
  onRemove,
  seeAllHref,
  cardVariant,
  watchlistIds,
  onWatchlistChange,
}) {
  const rowRef = useRef(null);

  if (!items || items.length === 0) return null;

  function scroll(direction) {
    if (!rowRef.current) return;
    const amount = rowRef.current.clientWidth * 0.8;
    rowRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  }

  const showSeeAll = seeAllHref && items.length > 6;

  return (
    <div className="row-section">
      <div className="row-header">
        <h2 className="row-title">{title}</h2>
        {showSeeAll && (
          <Link to={seeAllHref} className="row-see-all">See all</Link>
        )}
      </div>
      <div className="row-wrapper">
        <button
          type="button"
          className="row-arrow row-arrow-left"
          onClick={() => scroll('left')}
          aria-label="Scroll left"
        >
          &#10094;
        </button>
        <div className="row-items" ref={rowRef}>
          {items.map(item => (
            <Card
              key={item.id ?? item.media_id}
              show={item}
              variant={cardVariant}
              progress={progressMap?.[item.id] ?? progressMap?.[item.media_id] ?? null}
              onRemove={onRemove ? () => onRemove(item) : undefined}
              watchlistIds={cardVariant === 'landscape' ? undefined : watchlistIds}
              onWatchlistChange={onWatchlistChange}
            />
          ))}
        </div>
        <button
          type="button"
          className="row-arrow row-arrow-right"
          onClick={() => scroll('right')}
          aria-label="Scroll right"
        >
          &#10095;
        </button>
      </div>
    </div>
  );
}
