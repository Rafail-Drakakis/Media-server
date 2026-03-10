import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function Watch() {
  const { mediaId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [progress, setProgress] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    api.getProgress().then(list => {
      const p = list.find(x => String(x.media_id) === String(mediaId));
      if (p) setProgress(p);
    }).catch(console.error);
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

  const token = localStorage.getItem('token');

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
      />
    </div>
  );
}
