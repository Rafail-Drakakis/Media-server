import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import Card from '../components/Card';

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

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
      <h1>Search results for "{query}"</h1>
      {loading ? (
        <div className="loading-screen">Searching...</div>
      ) : results.length === 0 ? (
        <p className="empty-message">No results found.</p>
      ) : (
        <div className="card-grid">
          {results.map(item => <Card key={item.id} show={item} />)}
        </div>
      )}
    </div>
  );
}
