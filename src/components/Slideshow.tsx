import React, { useState, useEffect, useRef } from 'react';
import { Media } from '../types';
import { ChevronLeft, ChevronRight, Play, Pause, Image as ImageIcon, Video, Maximize, Minimize } from 'lucide-react';
import EmptyState from './EmptyState';

interface SlideshowProps {
  media: Media[];
}

export default function Slideshow({ media }: SlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && media.length > 0) {
      const currentMediaItem = media[currentIndex];
      // Only auto-advance if it's a photo, videos will advance on handleNext when ended.
      if (currentMediaItem?.type === 'photo') {
        interval = setInterval(() => {
          setCurrentIndex((prev) => (prev + 1) % media.length);
        }, 3000); // 3 seconds per photo
      }
    }
    return () => clearInterval(interval);
  }, [isPlaying, media.length, currentIndex]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % media.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  if (media.length === 0) {
    return (
      <EmptyState 
        icon={ImageIcon}
        title="Nenhuma mídia disponível para o carrossel."
      />
    );
  }

  const currentMedia = media[currentIndex];

  if (!currentMedia) {
    return (
      <div className="text-center py-20 text-gray-400 bg-white rounded-[2rem] shadow-sm border border-gray-100">
        <p className="text-lg font-medium text-gray-600">Carregando mídia...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div 
        id="slideshow-container"
        ref={containerRef}
        className="relative bg-black rounded-[2rem] overflow-hidden shadow-2xl aspect-video flex items-center justify-center group cursor-pointer"
        onClick={toggleFullscreen}
      >
        {(currentMedia.type === 'photo') ? (
            <img 
              src={`/api/image/${currentMedia.driveFileId}`} 
              alt={currentMedia.title}
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            (currentMedia.driveViewLink?.includes('firebasestorage') || currentMedia.driveFileId) ? (
              <video 
                src={currentMedia.driveViewLink?.includes('firebasestorage') ? currentMedia.driveViewLink : `/api/video/${currentMedia.driveFileId}`} 
                controls={!isPlaying}
                autoPlay={isPlaying}
                muted={isPlaying}
                playsInline
                onEnded={handleNext}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-gray-500 bg-white/10 rounded-xl p-8 flex flex-col items-center justify-center h-full w-full">
                 <Video size={48} className="mb-4 opacity-50" />
                 <p>Vídeo indisponível</p>
              </div>
            )
          )}

          {/* Controls Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6 pointer-events-none">
            <div className="flex items-center justify-between text-white pointer-events-auto">
              <div>
                <h3 className="text-xl font-medium">{currentMedia.author}</h3>
                <p className="text-sm text-white/80">{currentMedia.title}</p>
              </div>
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                  className="p-3 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
                  className="p-4 bg-[#D4A373] hover:bg-[#C39362] rounded-full transition-colors shadow-lg"
                >
                  {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleNext(); }}
                  className="p-3 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full transition-colors"
                >
                  <ChevronRight size={24} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                  className="p-3 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full transition-colors ml-2"
                >
                  {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                </button>
              </div>
            </div>
          </div>
          
          {/* Progress Indicators */}
        <div className="absolute top-4 left-0 right-0 flex justify-center gap-2 px-6">
          {media.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
