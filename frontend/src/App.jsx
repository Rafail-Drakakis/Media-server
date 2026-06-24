import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Header from './components/Header';
import MobileTabBar from './components/MobileTabBar';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Detail from './pages/Detail';
import Watch from './pages/Watch';
import Watchlist from './pages/Watchlist';
import Search from './pages/Search';
import Browse from './pages/Browse';
import BrowseList from './pages/BrowseList';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Login />;
  return <Home />;
}

function AppShell() {
  const { user } = useAuth();
  const location = useLocation();
  const hideTabBar = location.pathname.startsWith('/watch/');

  return (
    <>
      {user && <Header />}
      {user && !hideTabBar && <MobileTabBar />}
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
        <Route path="/browse" element={<ProtectedRoute><Browse /></ProtectedRoute>} />
        <Route path="/browse/:kind/:slug" element={<ProtectedRoute><BrowseList /></ProtectedRoute>} />
        <Route path="/show/:id" element={<ProtectedRoute><Detail /></ProtectedRoute>} />
        <Route path="/watch/:mediaId" element={<ProtectedRoute><Watch /></ProtectedRoute>} />
        <Route path="/watchlist" element={<ProtectedRoute><Watchlist /></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return <AppShell />;
}
