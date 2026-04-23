import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function Watch() {
  const { mediaId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [progress, setProgress] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [subtitles, setSubtitles] = useState([]);
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState(null);
  const [subtitleMenuOpen, setSubtitleMenuOpen] = useState(false);
  const [playbackError, setPlaybackError] = useState('');
  const [nextEpisodeId, setNextEpisodeId] = useState(null);
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
    let cancelled = false;

    async function loadNextEpisode() {
      try {
        const media = await api.getMedia(mediaId);
        if (!media?.show_id) {
          if (!cancelled) setNextEpisodeId(null);
          return;
        }
        const show = await api.getShow(media.show_id);
        const episodes = Array.isArray(show?.episodes) ? show.episodes : [];
        const currentIndex = episodes.findIndex(ep => String(ep.id) === String(mediaId));
        const nextEpisode = currentIndex >= 0 ? episodes[currentIndex + 1] : null;
        if (!cancelled) setNextEpisodeId(nextEpisode ? nextEpisode.id : null);
      } catch {
        if (!cancelled) setNextEpisodeId(null);
      }
    }

    loadNextEpisode();
    return () => {
      cancelled = true;
    };
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

  // Sync video state to React
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTimeUpdate = () => setCurrentTime(v.currentTime);
    const onDurationChange = () => setDuration(v.duration);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onVolumeChange = () => {
      setVolume(v.volume);
      setIsMuted(v.muted);
    };
    v.addEventListener('timeupdate', onTimeUpdate);
    v.addEventListener('durationchange', onDurationChange);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('volumechange', onVolumeChange);
    onVolumeChange();
    if (v.duration) setDuration(v.duration);
    return () => {
      v.removeEventListener('timeupdate', onTimeUpdate);
      v.removeEventListener('durationchange', onDurationChange);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('volumechange', onVolumeChange);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
  }, []);

  const handleVolumeChange = useCallback((e) => {
    const v = videoRef.current;
    if (!v) return;
    const val = parseFloat(e.target.value);
    v.volume = val;
    v.muted = val === 0;
  }, []);

  const handleSeek = useCallback((e) => {
    const v = videoRef.current;
    if (!v) return;
    const val = parseFloat(e.target.value);
    v.currentTime = val;
    setCurrentTime(val);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

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

  function handleNextEpisode() {
    if (!nextEpisodeId) return;
    saveProgress();
    setSelectedSubtitleIndex(null);
    setSubtitleMenuOpen(false);
    setPlaybackError('');
    navigate(`/watch/${nextEpisodeId}`, { replace: true });
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
      <div ref={containerRef} className="watch-video-container">
        <video
          ref={videoRef}
          className="video-player"
          src={`/api/stream/${mediaId}?token=${token}`}
          autoPlay
          onLoadedData={() => setPlaybackError('')}
          onError={() => setPlaybackError('This video format may not be supported by your browser.')}
          onPause={saveProgress}
          onEnded={saveProgress}
          onClick={togglePlay}
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
        {playbackError && (
          <div className="watch-playback-error">
            <p>{playbackError}</p>
          </div>
        )}
        <div className={`watch-bottom-bar ${showControls ? 'visible' : ''}`}>
          <button
            type="button"
            className="watch-ctrl-btn"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '\u23F8' : '\u25B6'}
          </button>
          <span className="watch-time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <input
            type="range"
            className="watch-seek"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Seek"
          />
          <div className="watch-controls-right">
            {nextEpisodeId && (
              <button
                type="button"
                className="watch-ctrl-btn"
                onClick={handleNextEpisode}
                aria-label="Next episode"
                title="Next episode"
              >
                Next Ep
              </button>
            )}
            <div className="watch-volume-wrap">
              <button
                type="button"
                className="watch-ctrl-btn"
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? '\uD83D\uDD07' : '\uD83D\uDD0A'}
              </button>
              <input
                type="range"
                className="watch-volume"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                aria-label="Volume"
              />
            </div>
            {hasSubtitles && (
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
            )}
            <button
              type="button"
              className="watch-ctrl-btn"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? '\u2922' : '\u26F6'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
