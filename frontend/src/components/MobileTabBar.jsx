import { NavLink } from 'react-router-dom';

function IconHome({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V9.5z" />
    </svg>
  );
}

function IconBrowse({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconList({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M6 4h15M6 12h15M6 20h15M3 4h.01M3 12h.01M3 20h.01" />
    </svg>
  );
}

function IconSearch({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" fill={active ? 'currentColor' : 'none'} />
      <path d="M20 20l-4-4" stroke={active ? '#141414' : 'currentColor'} strokeWidth="2.5" />
    </svg>
  );
}

const TABS = [
  { to: '/home', end: true, label: 'Home', Icon: IconHome },
  { to: '/browse', label: 'Browse', Icon: IconBrowse },
  { to: '/watchlist', label: 'My List', Icon: IconList },
  { to: '/search', label: 'Search', Icon: IconSearch },
];

export default function MobileTabBar() {
  return (
    <nav className="mobile-tabbar" aria-label="Mobile navigation">
      {TABS.map(({ to, end, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `mobile-tab ${isActive ? 'active' : ''}`}
        >
          {({ isActive }) => (
            <>
              <Icon active={isActive} />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
