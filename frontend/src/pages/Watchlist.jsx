import { useState, useEffect } from 'react';
import { api } from '../api/client';
import Card from '../components/Card';

export default function Watchlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getWatchlist()
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen">Loading...</div>;

  return (
    <div className="watchlist-page">
      <h1>My List</h1>
      {items.length === 0 ? (
        <p className="empty-message">Your list is empty. Browse and add shows!</p>
      ) : (
        <div className="card-grid">
          {items.map(item => <Card key={item.id} show={item} />)}
        </div>
      )}
    </div>
  );
}
