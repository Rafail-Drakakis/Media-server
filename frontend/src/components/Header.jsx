import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLibraryScan } from '../hooks/useLibraryScan';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);
  const { scanning, scanMessage, scanLibrary, clearScanMessage } = useLibraryScan();

  const isHome = location.pathname === '/';
  const searchFocus = new URLSearchParams(location.search).get('focus') === '1';

  useEffect(() => {
    setMobileSearchOpen(false);
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!searchFocus) return;
    setMobileSearchOpen(true);
    const timer = setTimeout(() => searchInputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [searchFocus, location.pathname]);

  useEffect(() => {
    if (!isHome) {
      setHeaderScrolled(true);
      return;
    }

    function onScroll() {
      setHeaderScrolled(window.scrollY > window.innerHeight * 0.25);
    }

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!scanMessage) return;
    const timer = setTimeout(clearScanMessage, 4000);
    return () => clearTimeout(timer);
  }, [scanMessage, clearScanMessage]);

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setMobileSearchOpen(false);
    }
  }

  async function handleScan() {
    await scanLibrary();
    setMenuOpen(false);
  }

  function handleSignOut() {
    setMenuOpen(false);
    logout();
    navigate('/');
  }

  const headerClass = [
    'app-header',
    isHome && !headerScrolled ? 'app-header--transparent' : 'app-header--scrolled',
  ].join(' ');

  return (
    <header className={headerClass}>
      <div className="header-left">
        <Link to="/" className="logo">Netflix for Pepe</Link>
        <nav className="header-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : undefined}>Home</NavLink>
          <NavLink to="/browse" className={({ isActive }) => isActive ? 'active' : undefined}>Browse</NavLink>
          <NavLink to="/watchlist" className={({ isActive }) => isActive ? 'active' : undefined}>My List</NavLink>
        </nav>
      </div>
      <div className="header-right">
        <button
          type="button"
          className="mobile-search-toggle"
          onClick={() => setMobileSearchOpen(prev => !prev)}
          aria-label="Toggle search"
        >
          &#128269;
        </button>
        <form className={`search-form ${mobileSearchOpen ? 'open' : ''}`} onSubmit={handleSearch}>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search titles..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </form>
        <div className="user-menu" ref={menuRef}>
          <button
            type="button"
            className="user-avatar-btn"
            onClick={() => setMenuOpen(prev => !prev)}
            aria-label="User menu"
            aria-expanded={menuOpen}
          >
            <span className="user-avatar">{(user?.displayName || user?.email || '?')[0].toUpperCase()}</span>
          </button>
          {menuOpen && (
            <div className="user-dropdown">
              <div className="user-dropdown-header">
                <span className="user-dropdown-name">{user?.displayName || 'User'}</span>
                <span className="user-dropdown-email">{user?.email}</span>
              </div>
              <button type="button" className="user-dropdown-item" onClick={handleScan} disabled={scanning}>
                {scanning ? 'Scanning library...' : 'Rescan Library'}
              </button>
              <button type="button" className="user-dropdown-item user-dropdown-item--danger" onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
      {scanMessage && <div className="scan-toast">{scanMessage}</div>}
    </header>
  );
}
