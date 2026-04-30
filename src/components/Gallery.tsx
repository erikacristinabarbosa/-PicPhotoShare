import React, { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useSession } from '../SessionContext';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, deleteDoc, doc, getDoc, updateDoc, setDoc, serverTimestamp, increment, or } from 'firebase/firestore';
import { Media } from '../types';
import { LogOut, Plus, Image as ImageIcon, Video, Trash2, Play, Menu, X, Pin, Share2, Clock, Heart, User, Users, Images, Trophy, BookOpen, Crown, Search, Sparkles, Instagram, Facebook, Twitter, MessageCircle, Check, LayoutGrid, MonitorPlay, CheckSquare, Activity } from 'lucide-react';
import Feed from './Feed';
import { getDocFromServer, doc as firestoreDoc } from 'firebase/firestore';
import UploadModal from './UploadModal';
import MediaViewer from './MediaViewer';
import EntranceScreen from './EntranceScreen';
import WelcomeModal from './WelcomeModal';
import { motion, AnimatePresence } from 'motion/react';

import Guestbook from './Guestbook';
import Predictions from './Predictions';
import Slideshow from './Slideshow';
import Footer from './Footer';
import Ranking from './Ranking';
import EmptyState from './EmptyState';
import ScrollDots from './ScrollDots';
import { ImageOff } from 'lucide-react';
import LogoutSplash from './LogoutSplash';

import Portal from './Portal';

const MediaItem: React.FC<{ 
  media: Media; 
  onClick: () => void; 
  isAdmin: boolean; 
  onDelete: (id: string) => void; 
  onShare: (id: string) => void;
  onToggleFavorite?: (id: string, isFavorite: boolean) => void;
  isFavorite: boolean;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
  settings?: any;
}> = ({ media, onClick, isAdmin, onDelete, onShare, onToggleFavorite, isFavorite, isSelectionMode, isSelected, onToggleSelection, settings }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { sessionId, guestSessionId, guestName } = useSession();
  
  const [likers, setLikers] = useState<string[]>([]);
  const [commenters, setCommenters] = useState<string[]>([]);

  useEffect(() => {
    // Fetch who liked
    const fetchReactions = async () => {
      try {
        const { getDocs, collection } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        const likesSnap = await getDocs(collection(db, 'media', media.id, 'likes'));
        const likersList = likesSnap.docs.map(d => d.data().author || 'Anônimo');
        setLikers(Array.from(new Set(likersList)));

        const commentsSnap = await getDocs(collection(db, 'media', media.id, 'comments'));
        const commentersList = commentsSnap.docs.map(d => d.data().author || 'Anônimo');
        setCommenters(Array.from(new Set(commentersList)));
      } catch (err) {
        // ignore errors
      }
    };
    if (isInView) {
      fetchReactions();
    }
  }, [media.id, isInView]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { 
        rootMargin: '200px', // Load slightly before they come into view
        threshold: 0.01 
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(media.id);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isSelectionMode && onToggleSelection) {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelection(media.id);
    } else {
      onClick();
    }
  };

  const formatName = (input: string) => {
    if (!input) return 'Anônimo';
    return input
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <motion.div 
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "50px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`relative group cursor-pointer rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-b from-[#FFFDF9] to-[#FEF6EB] shadow-[0_12px_30px_-10px_rgba(212,163,115,0.4),0_4px_6px_-4px_rgba(212,163,115,0.2)] border border-[#E8D1B5]/60 transition-all duration-500 ease-out shrink-0 w-[95vw] sm:w-[85vw] max-w-4xl aspect-[4/5] sm:aspect-video snap-center hover:scale-[1.02] hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(212,163,115,0.5),0_8px_12px_-6px_rgba(212,163,115,0.3)] ${isSelected ? 'ring-4 ring-[#D4A373] ring-offset-2' : ''}`}
      onClick={handleClick}
    >
      <div className="absolute inset-0 z-20 pointer-events-none rounded-2xl sm:rounded-3xl border-t-2 border-white/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4),inset_0_-6px_15px_rgba(212,163,115,0.25)] transition-all duration-500 group-hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6),inset_0_-6px_20px_rgba(212,163,115,0.4)]"></div>

      {isSelectionMode && (
        <div className="absolute top-3 left-3 z-20">
          <div className={`w-8 h-8 rounded-full border-[3px] flex items-center justify-center transition-all shadow-md ${isSelected ? 'bg-[#D4A373] border-[#D4A373]' : 'bg-black/20 border-white backdrop-blur-md'}`}>
            {isSelected && <Check size={16} strokeWidth={3} className="text-white" />}
          </div>
        </div>
      )}
      {media.isPinned && !isSelectionMode && (
        <div className="absolute top-4 right-4 bg-[#D4A373] text-white p-2 rounded-full shadow-md backdrop-blur-sm z-10">
          <Pin size={16} className="text-white fill-current" />
        </div>
      )}
      {media.status === 'pending' && (
        <div className="absolute top-4 left-4 bg-yellow-500/90 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md backdrop-blur-sm z-10 flex items-center gap-1.5">
          <Check size={14} className="text-white" />
          Em Análise
        </div>
      )}
      {media.type === 'photo' ? (
        <div className="relative w-full h-full">
          {!isLoaded && (
            <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 animate-shimmer" style={{ backgroundSize: '1000px 100%' }} />
              <div className="relative w-12 h-12 flex items-center justify-center">
                <div className="absolute inset-0 border-2 border-[#D4A373]/20 rounded-full" />
                <div className="absolute inset-0 border-2 border-t-[#D4A373] rounded-full animate-spin" />
              </div>
            </div>
          )}
          {isInView && (
            <>
              {/* Blurred background to fill the space without being black */}
              <img 
                src={`/api/image/${media?.driveFileId}`} 
                alt="" 
                className="absolute inset-0 w-full h-full object-cover opacity-60 blur-3xl scale-110"
                referrerPolicy="no-referrer"
              />
              <motion.img 
                layoutId={`media-${media.id}`}
                src={`/api/image/${media?.driveFileId}`} 
                alt={media.title} 
                className={`w-full h-full object-contain relative z-10 transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setIsLoaded(true)}
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            </>
          )}
        </div>
      ) : (
        <div className="relative w-full h-full bg-gray-900 flex items-center justify-center overflow-hidden">
          {!isLoaded && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 animate-shimmer" style={{ backgroundSize: '1000px 100%' }} />
              <div className="relative w-12 h-12 flex items-center justify-center">
                <div className="absolute inset-0 border-2 border-white/10 rounded-full" />
                <div className="absolute inset-0 border-2 border-t-white/40 rounded-full animate-spin" />
              </div>
            </div>
          )}
          {isInView && media.thumbnailLink ? (
            <>
              <img 
                src={media.thumbnailLink.replace('=s220', '=s1000')} 
                alt="" 
                className="absolute inset-0 w-full h-full object-cover opacity-30 blur-3xl scale-110"
                referrerPolicy="no-referrer"
              />
              <motion.img 
                layoutId={`media-${media.id}`}
                src={media.thumbnailLink.replace('=s220', '=s1000')} 
                alt={media.title} 
                className={`w-full h-full object-contain relative z-10 transition-opacity duration-700 ${isLoaded ? 'opacity-80' : 'opacity-0'}`}
                onLoad={() => setIsLoaded(true)}
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            </>
          ) : isInView ? (
            <>
              {/* Blurred background copy of video wouldn't work as cleanly without extra logic, using object-contain is enough since container is black */}
              {(media?.driveViewLink?.includes('firebasestorage') || media?.driveFileId) && (
                <motion.video 
                  layoutId={`media-${media.id}`}
                  src={media?.driveViewLink?.includes('firebasestorage') ? media.driveViewLink : `/api/video/${media?.driveFileId}#t=0.5`} 
                  className={`w-full h-full object-contain relative z-10 transition-opacity duration-700 ${isLoaded ? 'opacity-80' : 'opacity-0'}`}
                  preload="metadata"
                  muted
                  playsInline
                  onLoadedData={() => setIsLoaded(true)}
                  onLoadedMetadata={(e) => {
                    // Force seek to show frame
                    const video = e.target as HTMLVideoElement;
                    video.currentTime = 0.5;
                  }}
                />
              )}
            </>
          ) : null}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`w-14 h-14 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-lg transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
              <Play size={24} className="text-[#D4A373] fill-[#D4A373] ml-1" />
            </div>
          </div>
        </div>
      )}
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4">
        <div className="flex justify-end gap-2">
          {settings?.canDownload && (
            <a
              href={media?.type === 'photo' ? `/api/image/${media?.driveFileId}` : `/api/video/${media?.driveFileId}`}
              download={media.title || 'media'}
              onClick={(e) => e.stopPropagation()}
              className="p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-full transition-colors"
              title="Baixar mídia"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </a>
          )}
          {settings?.canShare && (
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onShare(media.id);
              }}
              className="p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-full transition-colors"
              title="Compartilhar"
            >
              <Share2 size={16} />
            </button>
          )}
          {settings?.canFavorite && (
            <button 
              disabled={isLiking}
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isLiking) return;
                setIsLiking(true);
                try {
                  await onToggleFavorite?.(media.id, isFavorite);
                } finally {
                  setIsLiking(false);
                }
              }}
              className={`p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-full transition-colors ${isFavorite ? 'text-red-500' : ''} ${isLiking ? 'animate-pulse opacity-70' : ''}`}
              title="Favoritar"
            >
              <Heart size={16} className={isFavorite ? 'fill-current' : ''} />
            </button>
          )}
          {(isAdmin || (settings?.canDelete && (
            (sessionId && media.authorSessionId === sessionId) || 
            (guestSessionId && media.authorSessionId === guestSessionId) ||
            (guestName && formatName(media.author) === formatName(guestName))
          ))) && (
            <button 
              onClick={handleDelete}
              className="p-2 bg-white/20 hover:bg-red-500/80 backdrop-blur-md text-white rounded-full transition-colors shadow-sm"
              title="Excluir mídia"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
        <div>
          <p className="text-white font-medium text-sm truncate drop-shadow-md">{formatName(media.author)}</p>
          <div className="flex items-center gap-2 mt-1">
            <span 
              className="text-white/90 text-xs drop-shadow-md bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1 cursor-help"
              title={likers.length > 0 ? `Curtido por: ${likers.map(formatName).join(', ')}` : 'Nenhuma curtida'}
            >
              <Heart size={12} /> {media.likesCount || 0}
            </span>
            <span 
              className="text-white/90 text-xs drop-shadow-md bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1 cursor-help"
              title={commenters.length > 0 ? `Comentado por: ${commenters.map(formatName).join(', ')}` : 'Nenhum comentário'}
            >
              <MessageCircle size={12} /> {(media as any)?.commentsCount || 0}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function Gallery({ settings }: { settings: any }) {
  const { guestName, sessionId, guestSessionId, logout, setAuthorPhotoUrl } = useSession();
  const [mediaList, setMediaList] = useState<Media[]>([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [filter, setFilter] = useState<'recent' | 'popular' | 'mine' | 'guestbook' | 'carousel' | 'by_guest' | 'ranking' | 'host_album' | 'predictions' | 'feed'>('feed');
  const [isAdmin, setIsAdmin] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const photosRef = useRef<HTMLDivElement>(null);
  const videosRef = useRef<HTMLDivElement>(null);
  const guestRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const filterBarRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [guestSearch, setGuestSearch] = useState('');
  const [displayLimit, setDisplayLimit] = useState(12);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [readyFilesToShare, setReadyFilesToShare] = useState<File[] | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isSlideshowMode, setIsSlideshowMode] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showEntrance, setShowEntrance] = useState(false);

  // --- BEGIN ANDROID BACK BUTTON INTERCEPTOR ---
  const navStateRef = useRef({
    isUploadOpen,
    selectedMedia,
    isSlideshowMode,
    isMenuOpen,
    isSelectionMode,
    filter,
    isSearchModalOpen,
    showWelcome,
    showEntrance
  });

  useEffect(() => {
    navStateRef.current = {
      isUploadOpen,
      selectedMedia,
      isSlideshowMode,
      isMenuOpen,
      isSelectionMode,
      filter,
      isSearchModalOpen,
      showWelcome,
      showEntrance
    };
  }, [isUploadOpen, selectedMedia, isSlideshowMode, isMenuOpen, isSelectionMode, filter, isSearchModalOpen, showWelcome, showEntrance]);

  useEffect(() => {
    // Push dummy state to intercept back button
    window.history.pushState({ galleryActive: true }, "");

    const handlePopState = (e: PopStateEvent) => {
      const state = navStateRef.current;
      const needsClose = state.isUploadOpen || state.selectedMedia || state.isSlideshowMode || state.isMenuOpen || state.isSelectionMode || state.isSearchModalOpen || state.showWelcome || state.showEntrance || state.filter !== 'recent';

      if (needsClose) {
        // We intercepted the back button. Revert the topmost internal state.
        if (state.isUploadOpen) setIsUploadOpen(false);
        else if (state.selectedMedia) setSelectedMedia(null);
        else if (state.isSlideshowMode) setIsSlideshowMode(false);
        else if (state.isSearchModalOpen) setIsSearchModalOpen(false);
        else if (state.showEntrance) setShowEntrance(false);
        else if (state.showWelcome) setShowWelcome(false);
        else if (state.isMenuOpen) setIsMenuOpen(false);
        else if (state.isSelectionMode) {
          setIsSelectionMode(false);
          setSelectedMediaIds([]);
        }
        else if (state.filter !== 'feed') setFilter('feed');

        // Restore dummy state to intercept the next back press
        window.history.pushState({ galleryActive: true }, "");
      } else {
        // Exit gallery (we need to call back() again because the dummy state was popped)
        window.history.back();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  // --- END ANDROID BACK BUTTON INTERCEPTOR ---

useEffect(() => {
    if (guestSessionId) {
      const welcomeKey = 'welcomeShown_' + guestSessionId;
      if (!localStorage.getItem(welcomeKey)) {
        if (settings?.entranceTemplate && settings.entranceTemplate !== 'none') {
          setShowEntrance(true);
        } else {
          setShowWelcome(true);
        }
        localStorage.setItem(welcomeKey, 'true');
      }
    }
  }, [guestSessionId, settings?.entranceTemplate]);

    useEffect(() => {
    if (sessionId) {
      const stored = localStorage.getItem(`favorites_${sessionId}`);
      if (stored) {
        try {
          setFavoriteIds(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse flavors', e);
        }
      }
    }
  }, [sessionId]);

  const handleToggleFavorite = async (id: string, isCurrentlyFavorite: boolean) => {
    if (!sessionId) return;
    const reactionId = 'heart';
    const likeId = `${sessionId}_${reactionId}`;
    const likeRef = doc(db, 'media', id, 'likes', likeId);
    const mediaRef = doc(db, 'media', id);

    try {
      // Robust check to see if we're sending a duplicate request 
      // by comparing with the current ACTUAL list in localStorage
      const currentStored = JSON.parse(localStorage.getItem(`favorites_${sessionId}`) || '[]');
      const isAlreadyInSavedList = currentStored.includes(id);

      // If we're trying to like but it's already liked, or trying to unlike but it's not liked, ignore.
      if ((!isCurrentlyFavorite && isAlreadyInSavedList) || (isCurrentlyFavorite && !isAlreadyInSavedList)) {
        console.warn('Like toggle sync blocked: requested state matches current stored state');
        return;
      }

      // Optimistic update
      let newFavs = [...favoriteIds];
      if (isCurrentlyFavorite) {
        newFavs = newFavs.filter(x => x !== id);
      } else {
        if (!newFavs.includes(id)) newFavs.push(id);
      }
      setFavoriteIds(newFavs);
      localStorage.setItem(`favorites_${sessionId}`, JSON.stringify(newFavs));

      if (isCurrentlyFavorite) {
        await deleteDoc(likeRef);
        // Robust update to avoid negative values
        const mediaSnap = await getDoc(mediaRef);
        const currentCount = mediaSnap.data()?.likesCount || 0;
        await updateDoc(mediaRef, { 
          likesCount: currentCount > 0 ? increment(-1) : 0 
        });
      } else {
        await setDoc(likeRef, {
          sessionId,
          type: reactionId,
          author: guestName || 'Anônimo',
          timestamp: serverTimestamp()
        });
        await updateDoc(mediaRef, { likesCount: increment(1) });
        if (!isAdmin && sessionId) {
          window.dispatchEvent(new CustomEvent('points-earned', { detail: { actionName: 'Curtida', points: 2 } }));
        }
      }
    } catch (e) {
      console.error(e);
      // Revert optimistic
      const lastStored = JSON.parse(localStorage.getItem(`favorites_${sessionId}`) || '[]');
      setFavoriteIds(lastStored);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const toggleSelection = (id: string) => {
    setSelectedMediaIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const shareFiles = async (ids: string[]) => {
    if (ids.length === 0) return;
    setIsSharing(true);
    try {
      const promises = ids.map(async (id) => {
        const media = mediaList.find(m => m.id === id);
        if (!media) return null;
        const url = media.type === 'photo' ? `/api/image/${media.driveFileId}` : `/api/video/${media.driveFileId}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch media");
        const blob = await response.blob();
        const extension = media.type === 'photo' ? 'jpg' : 'mp4';
        const mimeType = media.type === 'photo' ? 'image/jpeg' : 'video/mp4';
        return new File([blob], `media-${id}.${extension}`, { type: mimeType });
      });

      const results = await Promise.all(promises);
      const filesToShare = results.filter((f): f is File => f !== null);

      if (navigator.canShare && navigator.canShare({ files: filesToShare })) {
        setReadyFilesToShare(filesToShare);
      } else {
        for (const file of filesToShare) {
          const objectUrl = URL.createObjectURL(file);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = objectUrl;
          a.download = file.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(objectUrl);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        setIsSharing(false);
        setIsSelectionMode(false);
        setSelectedMediaIds([]);
      }
    } catch (error) {
      console.log('Error sharing/downloading:', error);
      alert('Não foi possível carregar a mídia para compartilhamento. Tente novamente.');
      setIsSharing(false);
      setIsSelectionMode(false);
      setSelectedMediaIds([]);
    }
  };

  const executeShare = async () => {
    if (!readyFilesToShare) return;
    try {
      await navigator.share({
        files: readyFilesToShare,
        title: 'Galeria de Fotos'
      });
    } catch (shareError: any) {
      console.log('Native share failed:', shareError.name);
    } finally {
      setReadyFilesToShare(null);
      setIsSharing(false);
      setIsSelectionMode(false);
      setSelectedMediaIds([]);
    }
  };

  const clearSearch = () => {
    setGuestSearch('');
  };

  const changeFilter = (newFilter: typeof filter) => {
    setFilter(newFilter);
    setIsSlideshowMode(false);
    setIsMenuOpen(false);
    setDisplayLimit(12);

    setTimeout(() => {
      if (filterBarRef.current) {
        const activeBtn = filterBarRef.current.querySelector('[data-tab-id="' + newFilter + '"]');
        if (activeBtn) {
          const container = filterBarRef.current;
          const scrollLeft = (activeBtn as HTMLElement).offsetLeft - (container.offsetWidth / 2) + ((activeBtn as HTMLElement).offsetWidth / 2);
          container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        } else if (newFilter === 'recent') {
          filterBarRef.current.scrollLeft = 0;
        }
      }
    }, 50);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Force scroll to far left on component mount
  useEffect(() => {
    if (filterBarRef.current) {
      filterBarRef.current.scrollLeft = 0;
      // Backup timeout in case of layout shifts
      setTimeout(() => {
        if (filterBarRef.current) filterBarRef.current.scrollLeft = 0;
      }, 50);
    }
  }, []);

  useEffect(() => {
    // Check for deep links
    const urlParams = new URLSearchParams(window.location.search);
    const guestbookId = urlParams.get('guestbookId');
    const predictionId = urlParams.get('predictionId');
    
    if (guestbookId) {
      setFilter('guestbook');
    } else if (predictionId) {
      setFilter('predictions');
    }
  }, []);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setIsAdmin(!!user);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    setDisplayLimit(12);
    let q;
    if (filter === 'mine') {
      if (!sessionId && !guestName) return; // Wait for session
      
      // We look up by author name first, as users might log in from different devices
      // but use the same name. It gets both pending and approved media they own.
      if (guestName) {
        q = query(
          collection(db, 'media'),
          where('author', '==', guestName)
        );
      } else {
        const sessionIds = [sessionId];
        if (guestSessionId && guestSessionId !== sessionId) {
          sessionIds.push(guestSessionId);
        }
        q = query(
          collection(db, 'media'),
          where('authorSessionId', 'in', sessionIds)
        );
      }
    } else {
      q = query(
        collection(db, 'media')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Media[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Media;
        
        // Exclude rejected universally
        if (data.status === 'rejected') return;
        
        // Admin sees pending. Guest sees pending ONLY if it's 'mine' (author matches).
        // Since we explicitly want 'pending' in 'mine' but hide it elsewhere:
        if (!isAdmin && filter !== 'mine' && data.status === 'pending') {
          return;
        }

        items.push({ id: doc.id, ...data } as Media);
      });

      // Update session avatar if we find a photo for this user
      if (sessionId && filter !== 'host_album') {
        const sessionIdsForAvatar = [sessionId];
        if (guestSessionId && guestSessionId !== sessionId) sessionIdsForAvatar.push(guestSessionId);
        const myPhoto = items.find(m => sessionIdsForAvatar.includes(m.authorSessionId) && m.type === 'photo');
        if (myPhoto && myPhoto.thumbnailLink) {
          setAuthorPhotoUrl(myPhoto.thumbnailLink);
        }
      }

      let sorted = [...items];
      
      // EXCLUSIVITY LOGIC
      if (filter === 'host_album') {
        // ONLY Host Album items
        sorted = sorted.filter(m => m.isHostAlbum === true || (m as any).isHostAlbum === 'true');
      } else if (filter === 'popular' || filter === 'mine') {
        // Include BOTH host and guest media for popular and mine
        // For 'mine', we already queried by session ID, so no additional structure filter is needed.
      } else {
        // For recent, by_guest, carousel, exclude host album media
        sorted = sorted.filter(m => !m.isHostAlbum && (m as any).isHostAlbum !== 'true');
      }

      // Handle shared selection via URL
      const urlParams = new URLSearchParams(window.location.search);
      const sharedIds = urlParams.get('ids')?.split(',');
      if (sharedIds && sharedIds.length > 0) {
        sorted = sorted.filter(m => sharedIds.includes(m.id));
      }

      if (filter === 'recent') {
        sorted.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          const timeA = a.timestamp?.toMillis() || 0;
          const timeB = b.timestamp?.toMillis() || 0;
          return timeB - timeA;
        });
        sorted = sorted.slice(0, 10);
      } else if (filter === 'host_album') {
        sorted.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
      } else if (filter === 'popular') {
        sorted = sorted.filter(m => ((m.likesCount || 0) + (m.commentsCount || 0)) > 0);
        sorted.sort((a, b) => {
          const scoreA = (a.likesCount || 0) + (a.commentsCount || 0);
          const scoreB = (b.likesCount || 0) + (b.commentsCount || 0);
          return scoreB - scoreA;
        });
        sorted = sorted.slice(0, 10);
      } else if (filter === 'mine') {
        // Sort by newest first
        sorted.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
      } else if (filter === 'by_guest') {
        sorted.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
      } 
      // carousel is implicitly handled by the initial filter

      setMediaList(sorted);
    }, (error) => {
      console.error("Error fetching media:", error);
    });

    return () => unsubscribe();
  }, [filter, guestName, sessionId, guestSessionId]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsSlideshowMode(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleDeleteMedia = (id: string) => {
    setMediaToDelete(id);
  };

  const confirmDeleteMedia = async () => {
    if (!mediaToDelete) return;
    try {
      const mediaDoc = await getDoc(doc(db, 'media', mediaToDelete));
      if (mediaDoc.exists()) {
        const mediaData = mediaDoc.data();
        if (mediaData?.driveFileId) {
          await fetch(`/api/drive/${mediaData.driveFileId}`, { method: 'DELETE' });
        }
      }
      await deleteDoc(doc(db, 'media', mediaToDelete));
      setMediaToDelete(null);
    } catch (error: any) {
      console.error("Error deleting media:", error);
      alert('Erro ao excluir mídia: ' + error.message);
      setMediaToDelete(null);
    }
  };

  const enterSlideshowFullscreen = () => {
    flushSync(() => {
      setIsSlideshowMode(true);
    });
    const el = document.getElementById('slideshow-container');
    if (el && !document.fullscreenElement) {
      el.requestFullscreen().catch(err => console.error("Error entering fullscreen:", err));
    }
  };

  const SearchAndSelectControls = () => (
    <div className="flex items-center gap-2">
      <div className="flex bg-gray-50 rounded-xl p-1 border border-gray-100 shrink-0">
        <button 
          onClick={() => setIsSlideshowMode(false)}
          className={`p-1.5 rounded-lg transition-all ${!isSlideshowMode ? 'bg-white text-[#D4A373] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          title="Ver em grade"
        >
          <LayoutGrid size={18} />
        </button>
        <button 
          onClick={enterSlideshowFullscreen}
          className={`p-1.5 rounded-lg transition-all ${isSlideshowMode ? 'bg-white text-[#D4A373] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          title="Ver como carrossel"
        >
          <MonitorPlay size={18} />
        </button>
      </div>
      {!isSelectionMode && ((filter === 'recent' || filter === 'carousel' || filter === 'mine') || (filter === 'host_album' && isAdmin)) && (
        <button
          onClick={() => {
            setIsSelectionMode(true);
            setSelectedMediaIds([]);
          }}
          className={`p-2 rounded-full transition-colors flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-[#D4A373]/20 hover:text-[#D4A373]`}
          title="Selecionar mídias"
        >
          <CheckSquare size={18} />
        </button>
      )}
      <button 
        onClick={() => setIsSearchModalOpen(true)}
        className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-[#D4A373]/20 hover:text-[#D4A373] transition-colors relative flex items-center justify-center"
        title="Buscar"
      >
        <Search size={18} />
        {guestSearch && (
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#D4A373] border-2 border-white rounded-full"></span>
        )}
      </button>
    </div>
  );

  const formatName = (input: string) => {
    if (!input) return 'Anônimo';
    return input
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const filteredMediaList = React.useMemo(() => {
    const search = guestSearch.trim().toLowerCase();
    if (!search) return mediaList;
    return mediaList.filter(m => 
      formatName(m.author).toLowerCase() === search
    );
  }, [mediaList, guestSearch]);

  const allPhotos = filteredMediaList.filter(m => m.type === 'photo');
  const allVideos = filteredMediaList.filter(m => m.type === 'video');

  const displayMedia = filteredMediaList.slice(0, displayLimit);

  // Group media by guest for the 'by_guest' filter
  const mediaByGuest = React.useMemo(() => {
    if (filter !== 'by_guest') return {};
    const grouped: Record<string, Media[]> = {};
    filteredMediaList.forEach(media => {
      const authorName = formatName(media.author);
      if (!grouped[authorName]) {
        grouped[authorName] = [];
      }
      grouped[authorName].push(media);
    });
    return grouped;
  }, [filteredMediaList, filter]);

  return (
    <div className="min-h-screen flex bg-[#FAFAFA] font-sans text-gray-800">
      
      {/* Desktop Persistent Sidebar Menu */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white border-r border-pink-100 shadow-sm sticky top-0 h-screen overflow-y-auto shrink-0 transition-all duration-300">
        <div className="p-6 border-b border-gray-100 bg-pink-50/30">
          <span className="font-montserrat font-bold text-[#D4A373] tracking-widest text-sm block mb-1">MENU DO EVENTO</span>
          <span className="text-xs text-gray-500 block">Olá, <strong className="text-[#D4A373]">{guestName}</strong></span>
        </div>
        
        <nav className="p-4 flex-1 overflow-y-auto flex flex-col gap-1.5 custom-scrollbar">
          <button 
            onClick={() => changeFilter('feed')}
            className={`flex items-center gap-3 py-3 px-4 rounded-xl font-medium transition-all duration-200 text-left ${filter === 'feed' ? 'menu-btn-active' : 'menu-btn-inactive'}`}
          >
            <Activity size={18} className="text-blue-500" /> Feed de Atividades
          </button>
          <button 
            onClick={() => changeFilter('recent')}
            className={`flex items-center gap-3 py-3 px-4 rounded-xl font-medium transition-all duration-200 text-left ${filter === 'recent' ? 'menu-btn-active' : 'menu-btn-inactive'}`}
          >
            <Clock size={18} className="text-emerald-500" /> O que rolou agora
          </button>
          <button 
            onClick={() => changeFilter('host_album')}
            className={`flex items-center gap-3 py-3 px-4 rounded-xl font-medium transition-all duration-200 text-left ${filter === 'host_album' ? 'menu-btn-active' : 'menu-btn-inactive'}`}
          >
            <Crown size={18} className="text-amber-500" /> Álbum dos Anfitriões
          </button>
          <button 
            onClick={() => changeFilter('popular')}
            className={`flex items-center gap-3 py-3 px-4 rounded-xl font-medium transition-all duration-200 text-left ${filter === 'popular' ? 'menu-btn-active' : 'menu-btn-inactive'}`}
          >
            <Heart size={18} className="text-red-500" /> Mais Curtidas
          </button>
          <button 
            onClick={() => changeFilter('mine')}
            className={`flex items-center gap-3 py-3 px-4 rounded-xl font-medium transition-all duration-200 text-left ${filter === 'mine' ? 'menu-btn-active' : 'menu-btn-inactive'}`}
          >
            <User size={18} className="text-purple-500" /> Minhas Fotos
          </button>
          <button 
            onClick={() => changeFilter('by_guest')}
            className={`flex items-center gap-3 py-3 px-4 rounded-xl font-medium transition-all duration-200 text-left ${filter === 'by_guest' ? 'menu-btn-active' : 'menu-btn-inactive'}`}
          >
            <Users size={18} className="text-indigo-500" /> Por Convidado
          </button>
          <button 
            onClick={() => { changeFilter('carousel'); enterSlideshowFullscreen(); }}
            className={`flex items-center gap-3 py-3 px-4 rounded-xl font-medium transition-all duration-200 text-left ${filter === 'carousel' ? 'menu-btn-active' : 'menu-btn-inactive'}`}
          >
            <Images size={18} className="text-pink-500" /> Carrossel de Fotos
          </button>
          <button 
            onClick={() => changeFilter('ranking')}
            className={`flex items-center gap-3 py-3 px-4 rounded-xl font-medium transition-all duration-200 text-left ${filter === 'ranking' ? 'menu-btn-active' : 'menu-btn-inactive'}`}
          >
            <Trophy size={18} className="text-yellow-600" /> Convidados Mais Animados
          </button>
          <button 
            onClick={() => changeFilter('guestbook')}
            className={`flex items-center gap-3 py-3 px-4 rounded-xl font-medium transition-all duration-200 text-left ${filter === 'guestbook' ? 'menu-btn-active' : 'menu-btn-inactive'}`}
          >
            <BookOpen size={18} className="text-orange-500" /> Deixe um carinho
          </button>
          <button 
            onClick={() => changeFilter('predictions')}
            className={`flex items-center gap-3 py-3 px-4 rounded-xl font-medium transition-all duration-200 text-left ${filter === 'predictions' ? 'menu-btn-active' : 'menu-btn-inactive'}`}
          >
            <Sparkles size={18} className="text-teal-500" /> Videntes por um Dia
          </button>

          <div className="border-t border-gray-100 mt-4 pt-4 mb-4">
            <button onClick={() => setIsLoggingOut(true)} className="flex items-center gap-3 w-full text-left text-gray-600 hover:text-red-500 hover:bg-red-50 transition-colors py-3 px-4 rounded-xl">
              <LogOut size={18} />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </nav>
      </aside>

      {isLoggingOut && <LogoutSplash onComplete={() => logout()} />}

      {/* Main Content App Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#FAFAFA]">
      
      {/* Header */}
      <header className={`bg-white/95 backdrop-blur-md sticky top-0 z-50 border-b-2 border-gold-shiny animate-gold-pulse transition-all duration-300 ${isScrolled ? 'py-1.5 shadow-sm' : 'py-2 sm:py-3'}`}>
        <div className="w-full px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Mobile Menu Toggle (Left) */}
            <button 
              className="p-2 -ml-2 text-gray-500 hover:text-[#D4A373] transition-colors md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={20} className="sm:w-6 sm:h-6" /> : <Menu size={20} className="sm:w-6 sm:h-6" />}
            </button>
          </div>
          
          {/* Right Side: Event Name & Logo */}
          <div className="flex items-center gap-3 ml-auto overflow-hidden">
            <div onClick={() => changeFilter('recent')} className="cursor-pointer flex flex-col items-end min-w-0 hover:opacity-80 transition-opacity">
              <span className="text-lg sm:text-2xl md:text-3xl font-black bg-gradient-to-r from-[#D4A373] via-[#C39363] to-[#E6C9A8] bg-clip-text text-transparent text-right font-montserrat tracking-tight uppercase leading-none whitespace-nowrap drop-shadow-sm">
                {settings?.eventName || '15 Anos Ana'}
              </span>
              <span className="text-xs sm:text-sm text-gray-700 font-extrabold uppercase mt-1 whitespace-nowrap drop-shadow-sm">
                Bem-vindo(a), {guestName?.split(' ')[0]}
              </span>
            </div>
            <div className="flex items-center border-l-2 border-gray-100 pl-3">
               <img src={settings?.logoUrl || "/logo.png?v=2"} alt="Logo" className="h-8 sm:h-10 object-contain drop-shadow-sm transition-transform hover:scale-105" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
          </div>
        </div>

        {/* Mobile Collapsible Menu */}
        <div className={`md:hidden absolute top-full left-0 w-full transition-all duration-300 ease-in-out bg-white/95 backdrop-blur-md shadow-xl z-[100] ${isMenuOpen ? 'max-h-[1000px] border-b border-gray-100' : 'max-h-0 overflow-hidden'}`}>
          <div className="px-4 py-3 bg-white flex flex-col gap-1 max-h-[80vh] overflow-y-auto no-scrollbar">
            <span className="text-sm text-gray-500 font-medium border-b border-gray-100 pb-2 mb-1 px-2 shrink-0">Olá, {guestName}</span>
            
            <button 
              onClick={() => changeFilter('feed')}
              className={`flex items-center gap-2 text-left py-2.5 px-3 rounded-lg font-medium transition-colors ${filter === 'feed' ? 'menu-btn-active' : 'menu-btn-inactive'}`}
            >
              <Activity size={16} className="text-blue-500" /> Feed de Atividades
            </button>
            <button 
              onClick={() => changeFilter('recent')}
              className={`flex items-center gap-2 text-left py-2.5 px-3 rounded-lg font-medium transition-colors ${filter === 'recent' ? 'menu-btn-active' : 'menu-btn-inactive'}`}
            >
              <Clock size={16} className="text-emerald-500" /> O que rolou agora
            </button>
            <button 
              onClick={() => changeFilter('host_album')}
              className={`flex items-center gap-2 text-left py-2.5 px-3 rounded-lg font-medium transition-colors ${filter === 'host_album' ? 'menu-btn-active' : 'menu-btn-inactive'}`}
            >
              <Crown size={16} className="text-amber-500" /> Álbum dos Anfitriões
            </button>
            <button 
              onClick={() => changeFilter('popular')}
              className={`flex items-center gap-2 text-left py-2.5 px-3 rounded-lg font-medium transition-colors ${filter === 'popular' ? 'menu-btn-active' : 'menu-btn-inactive'}`}
            >
              <Heart size={16} className="text-red-500" /> Mais Curtidas
            </button>
            <button 
              onClick={() => changeFilter('mine')}
              className={`flex items-center gap-2 text-left py-2.5 px-3 rounded-lg font-medium transition-colors ${filter === 'mine' ? 'menu-btn-active' : 'menu-btn-inactive'}`}
            >
              <User size={16} className="text-purple-500" /> Minhas Fotos
            </button>
            <button 
              onClick={() => { changeFilter('carousel'); enterSlideshowFullscreen(); }}
              className={`flex items-center gap-2 text-left py-2.5 px-3 rounded-lg font-medium transition-colors ${filter === 'carousel' ? 'menu-btn-active' : 'menu-btn-inactive'}`}
            >
              <Images size={16} className="text-pink-500" /> Carrossel de Fotos
            </button>
            <button 
              onClick={() => changeFilter('ranking')}
              className={`flex items-center gap-2 text-left py-2.5 px-3 rounded-lg font-medium transition-colors ${filter === 'ranking' ? 'menu-btn-active' : 'menu-btn-inactive'}`}
            >
              <Trophy size={16} className="text-yellow-600" /> Convidados Mais Animados
            </button>
            <button 
              onClick={() => changeFilter('guestbook')}
              className={`flex items-center gap-2 text-left py-2.5 px-3 rounded-lg font-medium transition-colors ${filter === 'guestbook' ? 'menu-btn-active' : 'menu-btn-inactive'}`}
            >
              <BookOpen size={16} className="text-orange-500" /> Deixe um carinho
            </button>
            <button 
              onClick={() => changeFilter('predictions')}
              className={`flex items-center gap-2 text-left py-2.5 px-3 rounded-lg font-medium transition-colors ${filter === 'predictions' ? 'menu-btn-active' : 'menu-btn-inactive'}`}
            >
              <Sparkles size={16} className="text-teal-500" /> Videntes por um Dia
            </button>

            <div className="border-t border-gray-100 mt-1 pt-1 shrink-0">
              <button onClick={() => setIsLoggingOut(true)} className="flex items-center gap-2 w-full text-left text-gray-600 hover:text-red-500 hover:bg-red-50 transition-colors py-2.5 px-3 rounded-lg">
                <LogOut size={18} />
                <span className="font-medium">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Banner */}
      <div className="relative w-full bg-white border-b border-gray-100 cursor-pointer" onClick={() => changeFilter('recent')}>
        <div className="w-full">
          <div className="relative w-full h-[200px] md:h-[300px] overflow-hidden shadow-lg bg-[radial-gradient(circle_at_center,_#B88A5B_0%,_black_150%)] flex justify-center items-center">
            {settings?.bannerUrl || '/banner.png' ? (
              <img 
                src={settings?.bannerUrl || '/banner.png'} 
                alt="Banner do Evento" 
                className="w-full h-full object-contain absolute top-0 left-0"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  if (!settings?.bannerUrl) {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }
                }}
              />
            ) : null}

            {/* Spotlights */}
            <div className="absolute top-[-20%] left-[0%] w-[35%] h-[140%] animate-spotlight-l pointer-events-none mix-blend-plus-lighter z-[5]"></div>
            <div className="absolute top-[-20%] right-[0%] w-[35%] h-[140%] animate-spotlight-r pointer-events-none mix-blend-plus-lighter z-[5]"></div>
            <div className="absolute inset-0 animate-spotlight-roam pointer-events-none z-[5]"></div>

            <div 
              className="w-full h-full absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#BF953F] via-[#FCF6BA] via-[#B38728] via-[#FBF5B7] to-[#AA771C] z-10"
              style={{ 
                display: settings?.bannerUrl || '/banner.png' ? 'none' : 'flex' 
              }}
            >
                <div className="text-center bg-white/20 backdrop-blur-sm p-8 sm:p-12 md:p-16 rounded-[2rem] border border-white/30 shadow-2xl">
                  <h1 className="text-4xl sm:text-5xl md:text-7xl font-serif text-gray-900 tracking-wider uppercase drop-shadow-sm leading-tight">
                    {settings?.eventName || '15 Anos da Ana'}
                  </h1>
                  <div className="w-24 h-1 bg-gray-900 mx-auto my-4 sm:my-6 opacity-30"></div>
                  <p className="text-sm sm:text-base md:text-lg text-gray-800 font-medium italic">
                    {settings?.welcomeMessage || 'Compartilhe seus momentos conosco'}
                  </p>
                </div>
              </div>

            {/* Social Shortcuts */}
            {(settings?.instagramUrl || settings?.facebookUrl || settings?.twitterUrl) && (
              <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 flex flex-col items-end gap-1.5 sm:gap-2 z-20">
                <span className="text-[9px] min-[375px]:text-[10px] sm:text-[11px] uppercase tracking-widest text-[#FFFDF0]/80 font-bold drop-shadow-md pr-1">Siga-nos</span>
                <div className="flex gap-2 sm:gap-3 bg-black/20 p-2 sm:p-2.5 rounded-2xl backdrop-blur-md border border-white/10 shadow-[0_4px_15px_rgba(0,0,0,0.3)]">
                  {settings?.instagramUrl && (
                    <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 sm:p-2 bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] text-white rounded-xl shadow-md hover:scale-110 hover:-translate-y-1 transition-all duration-300 relative group">
                      <Instagram size={16} className="sm:w-5 sm:h-5" />
                      <span className="absolute -top-7 right-0 text-[10px] sm:text-xs font-semibold px-2 py-1 bg-black/80 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity">Instagram</span>
                    </a>
                  )}
                  {settings?.facebookUrl && (
                    <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 sm:p-2 bg-[#1877F2] text-white rounded-xl shadow-md hover:scale-110 hover:-translate-y-1 transition-all duration-300 relative group">
                      <Facebook size={16} className="sm:w-5 sm:h-5" />
                      <span className="absolute -top-7 right-0 text-[10px] sm:text-xs font-semibold px-2 py-1 bg-black/80 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Facebook</span>
                    </a>
                  )}
                  {settings?.twitterUrl && (
                    <a href={settings.twitterUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 sm:p-2 bg-black text-white rounded-xl shadow-md border border-white/20 hover:scale-110 hover:-translate-y-1 transition-all duration-300 relative group">
                      <Twitter size={16} className="sm:w-5 sm:h-5" />
                      <span className="absolute -top-7 right-0 text-[10px] sm:text-xs font-semibold px-2 py-1 bg-black/80 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">X (Twitter)</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Unified Multi-Function Toolbar */}
      {!isSelectionMode && (
        <div 
          ref={filterBarRef}
          className="bg-[radial-gradient(circle_at_center,_rgba(184,138,91,0.6)_0%,_rgba(0,0,0,0.7)_150%)] backdrop-blur-xl border-b sm:border-y sm:border-[#B88A5B]/40 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.6),0_4px_6px_-4px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(255,255,255,0.15),inset_0_-4px_8px_rgba(0,0,0,0.4)] overflow-x-auto no-scrollbar sticky top-[60px] sm:top-[70px] z-40 transition-all duration-300 relative group"
        >
          <div className="absolute inset-0 z-0 pointer-events-none border-t border-white/20 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1),inset_0_-6px_15px_rgba(0,0,0,0.4)]"></div>
          <div className="flex items-center gap-4 px-6 py-4 min-w-max relative z-10">
            {/* 1. Incluir fotos e vídeos */}
            {((filter === 'recent' || filter === 'carousel' || filter === 'feed') || (filter === 'host_album' && isAdmin)) && (
              <button
                onClick={() => setIsUploadOpen(true)}
                className="flex-shrink-0 w-12 h-12 bg-gradient-to-b from-green-400 to-green-600 text-white rounded-full shadow-[0_6px_10px_rgba(34,197,94,0.4),0_2px_4px_rgba(0,0,0,0.3),inset_0_2px_2px_rgba(255,255,255,0.6),inset_0_-3px_5px_rgba(0,0,0,0.4)] border border-green-300/80 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 hover:brightness-110 animate-pulse-scale"
                title={filter === 'host_album' ? 'Álbum oficial' : 'Incluir fotos'}
              >
                <Plus size={24} />
              </button>
            )}

            {/* Vertical Divider */}
            {((filter === 'recent' || filter === 'carousel' || filter === 'feed') || (filter === 'host_album' && isAdmin)) && (
              <div className="w-px h-8 bg-gray-200 shrink-0 mx-2"></div>
            )}

            {/* 4. Barra de Mídias (Filters) */}
            <div className="flex items-center gap-4 pr-10">
              {[
                { id: 'feed', label: 'Feed', icon: <Activity size={20} className="text-blue-500" /> },
                { id: 'recent', label: 'Recentes', icon: <Clock size={20} className="text-emerald-500" /> },
                { id: 'host_album', label: 'Álbum', icon: <Crown size={20} className="text-amber-500" /> },
                { id: 'popular', label: 'Popular', icon: <Heart size={20} className="text-red-500" /> },
                { id: 'mine', label: 'Minhas', icon: <User size={20} className="text-purple-500" /> },
                { id: 'by_guest', label: 'Convidados', icon: <Users size={20} className="text-indigo-500" /> },
                { id: 'ranking', label: 'Ranking', icon: <Trophy size={20} className="text-yellow-600" /> },
                { id: 'guestbook', label: 'Mensagens', icon: <BookOpen size={20} className="text-orange-500" /> },
                { id: 'predictions', label: 'Previsões', icon: <Sparkles size={20} className="text-teal-500" /> },
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setFilter(tab.id as any)}
                  data-active={filter === tab.id}
                  data-tab-id={tab.id}
                  className={`h-10 px-4 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-300 flex items-center gap-2 ${filter === tab.id ? 'menu-btn-active' : 'menu-btn-inactive'}`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating Add Button */}
      {!isSelectionMode && ((filter === 'recent' || filter === 'carousel' || filter === 'feed') || (filter === 'host_album' && isAdmin)) && (
        <div className="flex fixed bottom-24 md:bottom-8 right-4 md:right-8 z-[90] flex-col items-end gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-[#D4A373] rounded-full animate-ping opacity-75"></div>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="relative w-16 h-16 bg-[#D4A373] text-white rounded-full shadow-2xl shadow-[#D4A373]/40 flex items-center justify-center hover:bg-[#c39162] transition-all duration-300 hover:scale-110 active:scale-95"
              title={filter === 'host_album' ? 'Adicionar ao álbum oficial' : 'Adicionar fotos'}
            >
              <Plus size={32} />
            </button>
          </div>
        </div>
      )}

      {/* Selection Mode Floating Action Bar */}
      {isSelectionMode && (
        <div className="fixed top-[180px] sm:top-[200px] left-4 sm:left-6 z-[9999] w-auto pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-xl border border-gray-200 shadow-[0_10px_40px_rgba(0,0,0,0.25)] rounded-2xl p-3 sm:p-4 flex items-center gap-4 animate-in slide-in-from-left">
            <div className="flex items-center gap-3 pr-4 border-r border-gray-200">
              <button 
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedMediaIds([]);
                }}
                className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200 transition"
                title="Cancelar"
              >
                <X size={18} />
              </button>
              <span className="font-semibold text-gray-800 whitespace-nowrap">
                {selectedMediaIds.length} {selectedMediaIds.length === 1 ? 'selecionada' : 'selecionadas'}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => shareFiles(selectedMediaIds)}
                disabled={selectedMediaIds.length === 0}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedMediaIds.length > 0 
                    ? 'bg-[#D4A373] text-white shadow-md hover:bg-[#c39162]' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Share2 size={16} />
                Compartilhar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 w-full px-6 pt-2 pb-8 space-y-12">
        {filter === 'ranking' ? (
          <Ranking />
        ) : filter === 'guestbook' ? (
          <Guestbook 
            isAdmin={isAdmin} 
            settings={settings}
            highlightId={new URLSearchParams(window.location.search).get('guestbookId') || undefined} 
          />
        ) : filter === 'predictions' ? (
          <Predictions 
            isAdmin={isAdmin} 
            settings={settings}
            highlightId={new URLSearchParams(window.location.search).get('predictionId') || undefined} 
          />
        ) : filter === 'feed' ? (
          <Feed isAdmin={isAdmin} settings={settings} />
        ) : filter === 'carousel' || isSlideshowMode ? (
          <Slideshow media={filteredMediaList} />
        ) : filter === 'host_album' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 mb-10 mt-4 flex-wrap">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 bg-[#FFFDF0] px-3 py-1 rounded-full border border-[#FDF2D0]"
              >
                <Crown size={14} className="text-[#D4A373]" />
                <h2 className="text-sm font-serif font-bold text-gray-800 tracking-tight whitespace-nowrap">
                  Álbum dos Anfitriões ({displayMedia.length})
                </h2>
              </motion.div>
              <p className="text-[10px] text-gray-500 italic">As fotos oficiais passadas para nós!</p>
            </div>

            <div className="space-y-12">
              {/* Media Carousel (Combined) */}
                {(displayMedia.length > 0) && (
                  <section>
                    <div className="px-6 mb-4 flex items-center gap-3">
                      <h2 className="font-serif text-xl text-gray-800">Mídias</h2>
                      <div className="h-px flex-1 bg-gradient-to-r from-pink-100 to-transparent"></div>
                      <SearchAndSelectControls />
                    </div>
                    <ScrollDots containerRef={photosRef} itemCount={displayMedia.length} />
                    <div 
                      ref={photosRef}
                      className="flex overflow-x-auto gap-6 px-6 pb-8 snap-x snap-mandatory no-scrollbar"
                    >
                      {displayMedia.map((media) => (
                        <MediaItem 
                          key={media.id} 
                          media={media} 
                          onClick={() => setSelectedMedia(media)} 
                          isAdmin={isAdmin}
                          onDelete={handleDeleteMedia}
                          onShare={(id) => shareFiles([id])}
                          onToggleFavorite={handleToggleFavorite}
                          isFavorite={favoriteIds.includes(media.id)}
                          isSelectionMode={isSelectionMode}
                          isSelected={selectedMediaIds.includes(media.id)}
                          onToggleSelection={toggleSelection}
                          settings={settings}
                        />
                      ))}
                      {(allPhotos.length + allVideos.length > displayLimit) && (
                        <div 
                          key="observer-hosts"
                          className="shrink-0 w-20 flex items-center justify-center snap-center"
                          ref={(el) => {
                            if (!el || !el.parentElement) return;
                            const observer = new IntersectionObserver(
                              entries => {
                                if (entries[0].isIntersecting) {
                                  setDisplayLimit(prev => prev + 12);
                                  observer.disconnect();
                                }
                              },
                              { threshold: 0.1, root: el.parentElement }
                            );
                            observer.observe(el);
                          }}
                        >
                          <div className="w-8 h-8 rounded-full border-4 border-[#D4A373]/20 border-t-[#D4A373] animate-spin" />
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {(allPhotos.length === 0 && allVideos.length === 0) && (
                  <EmptyState 
                    icon={Crown}
                    title="O Álbum dos noivos está vazio."
                    description="O anfitrião ainda não adicionou fotos oficiais."
                  />
                )}
              </div>
          </div>
        ) : filter === 'by_guest' ? (
          <div className="space-y-12">
            <div className="flex items-center justify-center gap-3 mb-10 mt-4 flex-wrap">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 bg-blue-50/50 px-3 py-1 rounded-full border border-blue-100/50"
              >
                <Users size={14} className="text-indigo-600" />
                <h2 className="text-sm font-serif font-bold text-gray-800 tracking-tight whitespace-nowrap">
                  Fotos por Convidado ({Object.keys(mediaByGuest).length})
                </h2>
              </motion.div>
              <p className="text-[10px] text-gray-500 italic">Separamos tudo agrupado!</p>
            </div>

            {Object.entries(mediaByGuest).map(([author, authorMedia]) => (
              <section key={author}>
                <div className="px-6 mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#D4A373]/20 flex items-center justify-center shrink-0">
                    <span className="text-lg font-serif text-[#D4A373]">
                      {author.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <h2 className="font-serif text-2xl text-gray-800">{author} ({authorMedia.length})</h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-pink-100 to-transparent"></div>
                </div>
                <ScrollDots containerRef={{ current: guestRefs.current[author] }} itemCount={authorMedia.length} />
                <div 
                  ref={el => { guestRefs.current[author] = el; }}
                  className="flex overflow-x-auto gap-6 px-6 pb-8 snap-x snap-mandatory no-scrollbar"
                >
                  {authorMedia.map((media) => (
                    <MediaItem 
                      key={media.id} 
                      media={media} 
                      onClick={() => setSelectedMedia(media)} 
                      isAdmin={isAdmin}
                      onDelete={handleDeleteMedia}
                      onShare={(id) => shareFiles([id])}
                      onToggleFavorite={handleToggleFavorite}
                      isFavorite={favoriteIds.includes(media.id)}
                      isSelectionMode={isSelectionMode}
                      isSelected={selectedMediaIds.includes(media.id)}
                      onToggleSelection={toggleSelection}
                      settings={settings}
                    />
                  ))}
                </div>
              </section>
            ))}
            {Object.keys(mediaByGuest).length === 0 && (
              <EmptyState 
                icon={ImageOff}
                title="Nenhuma mídia encontrada."
                description="Seja o primeiro a compartilhar um momento especial!"
              />
            )}
          </div>
        ) : mediaList.length === 0 ? (
          <EmptyState 
            icon={ImageOff}
            title="Nenhuma mídia encontrada."
            description="Seja o primeiro a compartilhar um momento especial!"
          />
        ) : filteredMediaList.length === 0 ? (
          <EmptyState 
            icon={Search}
            title="Nenhum resultado encontrado."
            description="Tente buscar por outro nome ou limpe o filtro."
            action={
              guestSearch.trim() && (
                <button 
                  onClick={clearSearch}
                  className="mt-6 text-[#D4A373] font-medium hover:underline"
                >
                  Limpar busca
                </button>
              )
            }
          />
        ) : (
          <>
            {/* Dynamic Standard Feed Header */}
            <div className="flex items-center justify-center gap-3 mb-10 mt-4 flex-wrap">
              <motion.div
                key={filter}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
                  filter === 'recent' ? 'bg-pink-50/50 border-pink-100/50' :
                  filter === 'popular' ? 'bg-red-50/50 border-red-100/50' :
                  'bg-blue-50/50 border-blue-100/50'
                }`}
              >
                {filter === 'recent' && <Clock size={14} className="text-rose-600" />}
                {filter === 'popular' && <Heart size={14} className="text-red-500" />}
                {filter === 'mine' && <User size={14} className="text-blue-600" />}
                
                <h2 className="text-sm font-serif font-bold text-gray-800 tracking-tight whitespace-nowrap">
                  {filter === 'recent' && `O que está rolando agora (${displayMedia.length})`}
                  {filter === 'popular' && `Mais Curtidas da Festa (${displayMedia.length})`}
                  {filter === 'mine' && `Minhas Lembranças (Você) (${displayMedia.length})`}
                </h2>
              </motion.div>
              
              <p className="text-[10px] text-gray-500 italic">
                {filter === 'recent' && 'Todas as fotos e vídeos em tempo real!'}
                {filter === 'popular' && 'A galera adorou isso aqui!'}
                {filter === 'mine' && 'Seu ponto de vista hoje à noite.'}
              </p>
            </div>

            {/* Media Carousel */}
            {(displayMedia.length > 0) && (
              <section>
                <div className="px-6 mb-6 flex items-center gap-3">
                  <h2 className="font-serif text-2xl text-gray-800">Mídias</h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-pink-100 to-transparent"></div>
                  <SearchAndSelectControls />
                </div>
                <ScrollDots containerRef={photosRef} itemCount={displayMedia.length} />
                <div 
                  ref={photosRef}
                  className="flex overflow-x-auto gap-6 px-6 pb-8 snap-x snap-mandatory no-scrollbar"
                >
                  {displayMedia.map((media) => (
                    <MediaItem 
                      key={media.id} 
                      media={media} 
                      onClick={() => setSelectedMedia(media)} 
                      isAdmin={isAdmin}
                      onDelete={handleDeleteMedia}
                      onShare={(id) => shareFiles([id])}
                      onToggleFavorite={handleToggleFavorite}
                      isFavorite={favoriteIds.includes(media.id)}
                      isSelectionMode={isSelectionMode}
                      isSelected={selectedMediaIds.includes(media.id)}
                      onToggleSelection={toggleSelection}
                      settings={settings}
                    />
                  ))}
                  {(filteredMediaList.length > displayLimit) && (
                    <div 
                      key="observer"
                      className="shrink-0 w-20 flex items-center justify-center snap-center"
                      ref={(el) => {
                        if (!el || !el.parentElement) return;
                        const observer = new IntersectionObserver(
                          entries => {
                            if (entries[0].isIntersecting) {
                              setDisplayLimit(prev => prev + 12);
                              observer.disconnect();
                            }
                          },
                          { threshold: 0.1, root: el.parentElement }
                        );
                        observer.observe(el);
                      }}
                    >
                      <div className="w-8 h-8 rounded-full border-4 border-[#D4A373]/20 border-t-[#D4A373] animate-spin" />
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {isSearchModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[10000] overflow-y-auto">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsSearchModalOpen(false)} />
            <div className="flex min-h-full items-start justify-center pt-24 p-4">
              <motion.div 
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl relative"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-serif text-gray-800">Buscar Mídias</h3>
                  <button 
                    onClick={() => setIsSearchModalOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="relative">
                  <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Digite o nome de quem enviou..."
                    value={guestSearch}
                    onChange={(e) => setGuestSearch(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-800 pl-12 pr-12 py-4 rounded-2xl focus:ring-2 focus:ring-[#D4A373]/30 focus:border-[#D4A373] outline-none transition-all placeholder:text-gray-400"
                  />
                  {guestSearch && (
                    <button 
                      onClick={() => setGuestSearch('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className="mt-8 flex justify-end">
                  <button 
                    onClick={() => setIsSearchModalOpen(false)}
                    className="px-8 py-3 bg-[#D4A373] hover:bg-[#c39162] text-white rounded-full font-medium transition-colors shadow-lg shadow-[#D4A373]/30 flex items-center justify-center gap-2 w-full sm:w-auto"
                  >
                    Ver resultados
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </Portal>
      )}
      {isUploadOpen && <UploadModal onClose={() => setIsUploadOpen(false)} isHostAlbum={filter === 'host_album' && isAdmin} />}
      <AnimatePresence>
        {selectedMedia && <MediaViewer media={selectedMedia} onClose={() => setSelectedMedia(null)} settings={settings} />}
      </AnimatePresence>
      {showEntrance && settings && (
        <EntranceScreen 
          settings={settings} 
          onEnter={() => {
            setShowEntrance(false);
            setShowWelcome(true);
          }} 
        />
      )}
      {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} settings={settings} guestName={guestName || undefined} />}

      {/* Delete Confirmation Modal */}
      {mediaToDelete && (
        <Portal>
        <div className="fixed inset-0 z-[10000] overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={() => setMediaToDelete(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
              <h3 className="text-xl font-serif text-gray-800 mb-2">Excluir Mídia</h3>
            <p className="text-gray-600 mb-6">Tem certeza que deseja excluir esta mídia permanentemente?</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setMediaToDelete(null)}
                className="btn-beige px-5 py-2.5 rounded-full font-medium"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDeleteMedia}
                className="px-5 py-2.5 rounded-full bg-red-500 text-white font-medium hover:bg-red-600 transition-colors shadow-md shadow-red-500/20"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
        </div>
        </Portal>
      )}

      {/* Sharing Loading Modal */}
      {(isSharing || readyFilesToShare) && (
        <Portal>
          <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 flex flex-col items-center gap-4 text-center max-w-sm w-full shadow-2xl">
              {readyFilesToShare ? (
                <>
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-inner mb-2">
                    <Check size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif text-gray-800 font-medium tracking-tight mb-1">Pronto!</h3>
                    <p className="text-sm text-gray-500 mb-6">Mídias preparadas com sucesso.</p>
                  </div>
                  <button 
                    onClick={executeShare}
                    className="w-full bg-[#D4A373] text-white py-3 rounded-xl font-medium shadow-md hover:bg-[#c39162] transition-colors"
                  >
                    Abrir opções de compartilhamento
                  </button>
                  <button 
                    onClick={() => {
                      setReadyFilesToShare(null);
                      setIsSharing(false);
                      setIsSelectionMode(false);
                      setSelectedMediaIds([]);
                    }}
                    className="w-full text-gray-500 py-2 text-sm font-medium hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 border-4 border-[#D4A373] border-t-transparent rounded-full animate-spin"></div>
                  <div>
                    <h3 className="text-xl font-serif text-gray-800 font-medium tracking-tight mb-1">Preparando mídias...</h3>
                    <p className="text-sm text-gray-500">Isto pode demorar alguns segundos dependendo do tamanho das mídias.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </Portal>
      )}
      
      <Footer />
    </div>
  </div>
  );
}
