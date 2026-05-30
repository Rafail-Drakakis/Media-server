import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import Card from '../components/Card';

const TYPE_LABELS = {
  movie: 'Movies',
  series: 'Series',
  concert: 'Concerts',
  documentary: 'Documentaries',
  podcast: 'Podcasts',
  talk: 'Talks',
  performance: 'Performances',
  standup: 'Stand up',
};

export default function BrowseList() {
  const { kind, slug } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [watchlistIds, setWatchlistIds] = useState(() => new Set());

  const decodedSlug = decodeURIComponent(slug || '');
  const title = kind === 'type'
    ? (TYPE_LABELS[decodedSlug] || decodedSlug)
    : decodedSlug;

  const handleWatchlistChange = useCallback((showId, inList) => {
    setWatchlistIds(prev => {
      const next = new Set(prev);
      if (inList) next.add(showId);
      else next.delete(showId);
      return next;
    });
  }, []);

  useEffect(() => {
    api.getWatchlist()
      .then(wl => setWatchlistIds(new Set(wl.map(w => w.id))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = kind === 'type' ? { type: decodedSlug } : { genre: decodedSlug };
    api.getLibrary(params)
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [kind, decodedSlug]);

  return (
    <div className="browse-list-page">
      <div className="browse-list-header">
        <button type="button" className="browse-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
          &#10094;
        </button>
        <h1>{title}</h1>
      </div>
      {loading ? (
        <div className="loading-screen">Loading...</div>
      ) : items.length === 0 ? (
        <p className="empty-message">No titles found.</p>
      ) : (
        <div className="card-grid">
          {items.map(item => (
            <Card
              key={item.id}
              show={item}
              watchlistIds={watchlistIds}
              onWatchlistChange={handleWatchlistChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
