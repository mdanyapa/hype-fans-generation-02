"use client";
import { useRef, useState, useEffect } from "react";

export default function EventDualVideo() {
  // First video state
  const videoRef1 = useRef<HTMLVideoElement>(null);
  const [playing1, setPlaying1] = useState(false);
  const [showButton1, setShowButton1] = useState(true);
  const hideTimeout1 = useRef<NodeJS.Timeout | null>(null);

  // Second video state
  const videoRef2 = useRef<HTMLVideoElement>(null);
  const [playing2, setPlaying2] = useState(false);
  const [showButton2, setShowButton2] = useState(true);
  const hideTimeout2 = useRef<NodeJS.Timeout | null>(null);

  // Handlers for first video
  const handleToggle1 = () => {
    const video = videoRef1.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setPlaying1(true);
      hideTimeout1.current = setTimeout(() => setShowButton1(false), 600);
    } else {
      video.pause();
      setPlaying1(false);
      setShowButton1(true);
    }
  };
  const handlePlay1 = () => {
    setPlaying1(true);
    hideTimeout1.current = setTimeout(() => setShowButton1(false), 600);
  };
  const handlePause1 = () => {
    setPlaying1(false);
    setShowButton1(true);
  };
  const handleMouseMove1 = () => {
    setShowButton1(true);
    if (playing1) {
      if (hideTimeout1.current) clearTimeout(hideTimeout1.current);
      hideTimeout1.current = setTimeout(() => setShowButton1(false), 1200);
    }
  };

  // Handlers for second video
  const handleToggle2 = () => {
    const video = videoRef2.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setPlaying2(true);
      hideTimeout2.current = setTimeout(() => setShowButton2(false), 600);
    } else {
      video.pause();
      setPlaying2(false);
      setShowButton2(true);
    }
  };
  const handlePlay2 = () => {
    setPlaying2(true);
    hideTimeout2.current = setTimeout(() => setShowButton2(false), 600);
  };
  const handlePause2 = () => {
    setPlaying2(false);
    setShowButton2(true);
  };
  const handleMouseMove2 = () => {
    setShowButton2(true);
    if (playing2) {
      if (hideTimeout2.current) clearTimeout(hideTimeout2.current);
      hideTimeout2.current = setTimeout(() => setShowButton2(false), 1200);
    }
  };

  useEffect(() => {
    return () => {
      if (hideTimeout1.current) clearTimeout(hideTimeout1.current);
      if (hideTimeout2.current) clearTimeout(hideTimeout2.current);
    };
  }, []);

  return (
    <div className="flex flex-col md:flex-row justify-center items-center gap-6 py-6 w-full">
      <div className="relative w-full md:w-1/2 max-w-none rounded-2xl overflow-hidden shadow-xl border border-gray-700 bg-black/70 backdrop-blur-md" onMouseMove={handleMouseMove1} onMouseEnter={handleMouseMove1} onMouseLeave={() => playing1 && setShowButton1(false)}>
        <video ref={videoRef1} src="/videos/first.mp4" loop muted playsInline className="w-full h-[180px] sm:h-[220px] md:h-[260px] object-cover bg-black select-none" onPlay={handlePlay1} onPause={handlePause1} style={{ cursor: 'pointer' }} tabIndex={-1} />
        <button onClick={handleToggle1} className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 border border-white/30 backdrop-blur-lg rounded-full p-4 shadow-lg transition-all duration-300 flex items-center justify-center ${showButton1 ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} style={{ boxShadow: '0 4px 32px 0 rgba(0,0,0,0.18)', borderWidth: 1.5 }} aria-label={playing1 ? 'Pause video' : 'Play video'}>
          {playing1 ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
              <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polygon points="6,4 20,12 6,20 6,4" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>
      <div className="relative w-full md:w-1/2 max-w-none rounded-2xl overflow-hidden shadow-xl border border-gray-700 bg-black/70 backdrop-blur-md" onMouseMove={handleMouseMove2} onMouseEnter={handleMouseMove2} onMouseLeave={() => playing2 && setShowButton2(false)}>
        <video ref={videoRef2} src="/videos/second.mp4" loop muted playsInline className="w-full h-[180px] sm:h-[220px] md:h-[260px] object-cover bg-black select-none" onPlay={handlePlay2} onPause={handlePause2} style={{ cursor: 'pointer' }} tabIndex={-1} />
        <button onClick={handleToggle2} className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 border border-white/30 backdrop-blur-lg rounded-full p-4 shadow-lg transition-all duration-300 flex items-center justify-center ${showButton2 ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} style={{ boxShadow: '0 4px 32px 0 rgba(0,0,0,0.18)', borderWidth: 1.5 }} aria-label={playing2 ? 'Pause video' : 'Play video'}>
          {playing2 ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
              <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polygon points="6,4 20,12 6,20 6,4" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
