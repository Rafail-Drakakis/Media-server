import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [types, setTypes] = useState([]);
  const [watchlistIds, setWatchlistIds] = useState(() => new Set());

  const handleWatchlistChange = useCallback((showId, inList) => {
    setWatchlistIds(prev => {
      const next = new Set(prev);
      if (inList) next.add(showId);
      else next.delete(showId);
      return next;
    });
  }, []);

  useEffect(() => {
    Promise.all([
      api.getTypes().catch(() => []),
      api.getWatchlist().catch(() => []),
    ]).then(([typeList, watchlist]) => {
      setTypes(typeList);
      setWatchlistIds(new Set(watchlist.map(w => w.id)));
    });
  }, []);

  useEffect(() => {
    if (query || window.innerWidth > 768) return;
    const timer = setTimeout(() => {
      document.querySelector('.search-form input')?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!query) { setResults([]); return; }
    setLoading(true);
    api.searchLibrary(query)
      .then(setResults)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="search-page">
      <h1>{query ? `Search results for "${query}"` : 'Search library'}</h1>
      {loading ? (
        <div className="loading-screen">Searching...</div>
      ) : results.length === 0 ? (
        query ? (
          <p className="empty-message">No results found.</p>
        ) : (
          <div className="search-empty">
            <p className="empty-message">Search for titles using the bar above, or browse by category:</p>
            <div className="search-category-links">
              <Link to="/browse" className="search-browse-link">Browse all categories</Link>
              {types.map(type => (
                <Link
                  key={type}
                  to={`/browse/type/${encodeURIComponent(type)}`}
                  className="search-category-chip"
                >
                  {TYPE_LABELS[type] || type}
                </Link>
              ))}
            </div>
          </div>
        )
      ) : (
        <div className="card-grid">
          {results.map(item => (
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
