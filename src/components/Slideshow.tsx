import React, { useState, useEffect, useRef } from 'react';
import { Media } from '../types';
import { ChevronLeft, ChevronRight, Play, Pause, Image as ImageIcon, Video, Maximize, Minimize } from 'lucide-react';
import EmptyState from './EmptyState';

interface SlideshowProps {
  photos: Media[];
  videos: Media[];
}

export default function Slideshow({ photos, videos }: SlideshowProps) {
  const [activeTab, setActiveTab] = useState<'photos' | 'videos'>('photos');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentMediaList = activeTab === 'photos' ? photos : videos;

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
    setCurrentIndex(0);
    setIsPlaying(true);
  }, [activeTab]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && currentMediaList.length > 0 && activeTab === 'photos') {
      interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % currentMediaList.length);
      }, 3000); // 3 seconds per slide
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentMediaList.length, activeTab]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % currentMediaList.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + currentMediaList.length) % currentMediaList.length);
  };

  if (photos.length === 0 && videos.length === 0) {
    return (
      <EmptyState 
        icon={ImageIcon}
        title="Nenhuma mídia disponível para o carrossel."
      />
    );
  }

  const currentMedia = currentMediaList[currentIndex];

  return (
    <div className="max-w-5xl mx-auto py-8 px-6">
      <div className="flex justify-center gap-4 mb-8">
        <button
          onClick={() => setActiveTab('photos')}
          className={`px-6 py-3 rounded-full font-medium flex items-center gap-2 transition-all ${
            activeTab === 'photos' 
              ? 'bg-[#D4A373] text-white shadow-md' 
              : 'bg-white text-gray-500 hover:bg-pink-50 border border-gray-200'
          }`}
        >
          <ImageIcon size={18} />
          Fotos ({photos.length})
        </button>
        <button
          onClick={() => setActiveTab('videos')}
          className={`px-6 py-3 rounded-full font-medium flex items-center gap-2 transition-all ${
            activeTab === 'videos' 
              ? 'bg-[#D4A373] text-white shadow-md' 
              : 'bg-white text-gray-500 hover:bg-pink-50 border border-gray-200'
          }`}
        >
          <Video size={18} />
          Vídeos ({videos.length})
        </button>
      </div>

      {currentMediaList.length === 0 ? (
        <div className="text-center py-20 text-gray-400 bg-white rounded-[2rem] shadow-sm border border-gray-100">
          <p className="text-lg font-medium text-gray-600">Nenhum {activeTab === 'photos' ? 'foto' : 'vídeo'} disponível.</p>
        </div>
      ) : (
        <div 
          ref={containerRef}
          className="relative bg-black rounded-[2rem] overflow-hidden shadow-2xl aspect-video flex items-center justify-center group cursor-pointer"
          onClick={toggleFullscreen}
        >
          {activeTab === 'photos' ? (
            <img 
              src={`/api/image/${currentMedia.driveFileId}`} 
              alt={currentMedia.title}
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <video 
              src={currentMedia.driveViewLink?.includes('firebasestorage') ? currentMedia.driveViewLink : `/api/video/${currentMedia.driveFileId}`} 
              controls={!isPlaying}
              autoPlay={isPlaying}
              muted={isPlaying}
              onEnded={handleNext}
              className="w-full h-full object-contain"
            />
          )}

          {/* Controls Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6 pointer-events-none">
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
            {currentMediaList.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
