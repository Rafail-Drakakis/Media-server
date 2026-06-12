import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, authUrl } from '../api/client';

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

export default function Browse() {
  const [types, setTypes] = useState([]);
  const [genres, setGenres] = useState([]);
  const [typePreviews, setTypePreviews] = useState({});
  const [genrePreviews, setGenrePreviews] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [typeList, genreList] = await Promise.all([
          api.getTypes().catch(() => []),
          api.getGenres().catch(() => []),
        ]);

        const filteredGenres = genreList.filter(g => g !== 'Music' && g !== 'Documentary');
        setTypes(typeList);
        setGenres(filteredGenres);

        const typePreviewEntries = await Promise.all(
          typeList.map(async (type) => {
            const items = await api.getLibrary({ type, limit: 1 }).catch(() => []);
            return [type, items[0] || null];
          })
        );
        setTypePreviews(Object.fromEntries(typePreviewEntries));

        const genrePreviewEntries = await Promise.all(
          filteredGenres.map(async (genre) => {
            const items = await api.getLibrary({ genre, limit: 1 }).catch(() => []);
            return [genre, items[0] || null];
          })
        );
        setGenrePreviews(Object.fromEntries(genrePreviewEntries));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="loading-screen">Loading...</div>;

  const visibleTypes = types.filter(t => typePreviews[t]);
  const visibleGenres = genres.filter(g => genrePreviews[g]);

  return (
    <div className="browse-page">
      <h1 className="page-title">Browse</h1>

      {visibleTypes.length > 0 && (
        <section className="browse-section">
          <h2 className="browse-section-title">Categories</h2>
          <div className="browse-grid">
            {visibleTypes.map(type => {
              const preview = typePreviews[type];
              const bg = authUrl(preview?.backdrop_path || preview?.poster_path);
              return (
                <Link
                  key={type}
                  to={`/browse/type/${encodeURIComponent(type)}`}
                  className="browse-tile"
                  style={bg ? { backgroundImage: `url("${encodeURI(bg)}")` } : undefined}
                >
                  <span className="browse-tile-label">{TYPE_LABELS[type] || type}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {visibleGenres.length > 0 && (
        <section className="browse-section">
          <h2 className="browse-section-title">Genres</h2>
          <div className="browse-grid">
            {visibleGenres.map(genre => {
              const preview = genrePreviews[genre];
              const bg = authUrl(preview?.backdrop_path || preview?.poster_path);
              return (
                <Link
                  key={genre}
                  to={`/browse/genre/${encodeURIComponent(genre)}`}
                  className="browse-tile"
                  style={bg ? { backgroundImage: `url("${encodeURI(bg)}")` } : undefined}
                >
                  <span className="browse-tile-label">{genre}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {visibleTypes.length === 0 && visibleGenres.length === 0 && (
        <p className="empty-message">No categories available yet. Scan your library from the profile menu.</p>
      )}
    </div>
  );
}
