import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function Watch() {
  const { mediaId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [progress, setProgress] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [subtitles, setSubtitles] = useState([]);
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState(null);
  const [subtitleMenuOpen, setSubtitleMenuOpen] = useState(false);
  const hideTimer = useRef(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    api.getProgress().then(list => {
      const p = list.find(x => String(x.media_id) === String(mediaId));
      if (p) setProgress(p);
    }).catch(console.error);
  }, [mediaId]);

  useEffect(() => {
    api.getSubtitles(mediaId)
      .then(list => setSubtitles(list))
      .catch(() => setSubtitles([]));
  }, [mediaId]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !progress) return;

    function onLoaded() {
      if (progress.position_seconds > 5 && progress.position_seconds < v.duration - 10) {
        v.currentTime = progress.position_seconds;
      }
    }

    v.addEventListener('loadedmetadata', onLoaded);
    return () => v.removeEventListener('loadedmetadata', onLoaded);
  }, [progress]);

  const saveProgress = useCallback(() => {
    const v = videoRef.current;
    if (!v || v.readyState < 1) return;
    api.updateProgress(Number(mediaId), v.currentTime, v.duration).catch(() => {});
  }, [mediaId]);

  useEffect(() => {
    saveTimer.current = setInterval(saveProgress, 10000);
    return () => clearInterval(saveTimer.current);
  }, [saveProgress]);

  function handleMouseMove() {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }

  function handleBack() {
    saveProgress();
    navigate(-1);
  }

  const SEEK_SECONDS = 5;

  useEffect(() => {
    function onKeyDown(e) {
      const v = videoRef.current;
      if (!v || v.readyState < 1) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        v.currentTime = Math.max(0, v.currentTime - SEEK_SECONDS);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        v.currentTime = Math.min(v.duration, v.currentTime + SEEK_SECONDS);
      }
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);

  const token = localStorage.getItem('token');
  const hasSubtitles = subtitles.length > 0;

  return (
    <div
      className="watch-page"
      onMouseMove={handleMouseMove}
    >
      <div className={`watch-top-bar ${showControls ? 'visible' : ''}`}>
        <button className="btn-back" onClick={handleBack}>&#10094; Back</button>
      </div>
      <video
        ref={videoRef}
        className="video-player"
        src={`/api/stream/${mediaId}?token=${token}`}
        controls
        autoPlay
        onPause={saveProgress}
        onEnded={saveProgress}
      >
        {hasSubtitles && selectedSubtitleIndex !== null && (
          <track
            key={selectedSubtitleIndex}
            kind="subtitles"
            src={api.subtitleUrl(mediaId, selectedSubtitleIndex)}
            srcLang="en"
            label={subtitles.find(s => s.index === selectedSubtitleIndex)?.label ?? 'Subtitle'}
            default
          />
        )}
      </video>
      {hasSubtitles && (
        <div className={`watch-bottom-bar ${showControls ? 'visible' : ''}`}>
          <div className="watch-cc-wrap">
            <button
              type="button"
              className="watch-cc-btn"
              onClick={() => setSubtitleMenuOpen(prev => !prev)}
              aria-label="Subtitles"
              title="Subtitles"
            >
              CC
            </button>
            {subtitleMenuOpen && (
              <div className="watch-cc-menu">
                <button
                  type="button"
                  className="watch-cc-menu-item"
                  onClick={() => {
                    setSelectedSubtitleIndex(null);
                    setSubtitleMenuOpen(false);
                  }}
                >
                  Off
                </button>
                {subtitles.map(({ index, label }) => (
                  <button
                    key={index}
                    type="button"
                    className="watch-cc-menu-item"
                    onClick={() => {
                      setSelectedSubtitleIndex(index);
                      setSubtitleMenuOpen(false);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
