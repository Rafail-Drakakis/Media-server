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

  async function handleRemove(item) {
    try {
      await api.removeFromWatchlist(item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return <div className="loading-screen">Loading...</div>;

  return (
    <div className="watchlist-page">
      <h1>My List</h1>
      {items.length === 0 ? (
        <p className="empty-message">Your list is empty. Browse and add shows!</p>
      ) : (
        <div className="card-grid">
          {items.map(item => (
            <Card
              key={item.id}
              show={item}
              onRemove={() => handleRemove(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
