import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <header className="app-header">
      <div className="header-left">
        <Link to="/" className="logo">NETFLIX FOR PEPE</Link>
        <nav className="header-nav">
          <Link to="/">Home</Link>
          <Link to="/watchlist">My List</Link>
        </nav>
      </div>
      <div className="header-right">
        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search titles..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </form>
        <div className="user-menu">
          <span className="user-avatar">{(user?.displayName || user?.email || '?')[0].toUpperCase()}</span>
          <button className="logout-btn" onClick={() => { logout(); navigate('/login'); }}>
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
