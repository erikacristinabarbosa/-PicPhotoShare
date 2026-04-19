import React, { useState, useEffect, useRef } from 'react';
import { useSession } from '../SessionContext';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, deleteDoc, doc, getDoc, updateDoc, setDoc, serverTimestamp, increment, or } from 'firebase/firestore';
import { Media } from '../types';
import { LogOut, Plus, Image as ImageIcon, Video, Trash2, Play, Menu, X, Pin, Share2, Clock, Heart, User, Users, Images, Trophy, BookOpen, Crown, Search, Sparkles, Instagram, Facebook, Twitter, MessageCircle, Check, LayoutGrid, MonitorPlay } from 'lucide-react';
import { getDocFromServer, doc as firestoreDoc } from 'firebase/firestore';
import UploadModal from './UploadModal';
import MediaViewer from './MediaViewer';
import ShareModal from './ShareModal';
import { motion } from 'motion/react';

import Guestbook from './Guestbook';
import Predictions from './Predictions';
import Slideshow from './Slideshow';
import Footer from './Footer';
import Ranking from './Ranking';
import EmptyState from './EmptyState';
import ScrollDots from './ScrollDots';
import { ImageOff } from 'lucide-react';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const { sessionId, guestSessionId } = useSession();

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
      className={`relative group cursor-pointer rounded-3xl overflow-hidden bg-gray-100/50 shadow-sm hover:shadow-2xl transition-all duration-500 ease-out shrink-0 w-64 h-80 sm:w-72 sm:h-96 snap-center hover:scale-[1.05] ${isSelected ? 'ring-4 ring-[#D4A373] ring-offset-2' : ''}`}
      onClick={handleClick}
    >
      {isSelectionMode && (
        <div className="absolute top-4 right-4 z-20">
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[#D4A373] border-[#D4A373]' : 'bg-white/50 border-white'}`}>
            {isSelected && <Share2 size={14} className="text-white" />}
          </div>
        </div>
      )}
      {media.isPinned && !isSelectionMode && (
        <div className="absolute top-4 right-4 bg-[#D4A373] text-white p-2 rounded-full shadow-md backdrop-blur-sm z-10">
          <Pin size={16} className="fill-current" />
        </div>
      )}
      {media.status === 'pending' && (
        <div className="absolute top-4 left-4 bg-yellow-500/90 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md backdrop-blur-sm z-10 flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Em Análise
        </div>
      )}
      {media.type === 'photo' ? (
        <div className="relative w-full h-full">
          {!isLoaded && (
            <div className="absolute inset-0 animate-pulse bg-[#FEFCF5] flex items-center justify-center">
              <div className="w-10 h-10 border-2 border-[#D4A373]/20 border-t-[#D4A373] rounded-full animate-spin" />
            </div>
          )}
          {isInView && (
            <img 
              src={`/api/image/${media.driveFileId}`} 
              alt={media.title} 
              className={`w-full h-full object-cover transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setIsLoaded(true)}
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          )}
        </div>
      ) : (
        <div className="relative w-full h-full bg-gray-900 flex items-center justify-center">
          {isInView && media.thumbnailLink ? (
            <img 
              src={media.thumbnailLink.replace('=s220', '=s1000')} 
              alt={media.title} 
              className={`w-full h-full object-cover transition-opacity duration-700 ${isLoaded ? 'opacity-80' : 'opacity-0'}`}
              onLoad={() => setIsLoaded(true)}
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          ) : isInView ? (
            <video 
              src={`/api/video/${media.driveFileId}#t=0.5`} 
              className={`w-full h-full object-cover transition-opacity duration-700 ${isLoaded ? 'opacity-80' : 'opacity-0'}`}
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
          ) : null}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`w-14 h-14 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-lg transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
              <Play size={24} className="ml-1" />
            </div>
          </div>
        </div>
      )}
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4">
        <div className="flex justify-end gap-2">
          {settings?.canDownload && (
            <a
              href={media.type === 'photo' ? `/api/image/${media.driveFileId}` : `/api/video/${media.driveFileId}`}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite?.(media.id, isFavorite);
              }}
              className={`p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-full transition-colors ${isFavorite ? 'text-red-500' : ''}`}
              title="Favoritar"
            >
              <Heart size={16} className={isFavorite ? 'fill-current' : ''} />
            </button>
          )}
          {(isAdmin || (settings?.canDelete && (
            (sessionId && media.authorSessionId === sessionId) || 
            (guestSessionId && media.authorSessionId === guestSessionId)
          ))) && (
            <button 
              onClick={handleDelete}
              className="p-2 bg-white/20 hover:bg-red-500/80 backdrop-blur-md text-white rounded-full transition-colors"
              title="Excluir mídia"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
        <div>
          <p className="text-white font-medium text-sm truncate drop-shadow-md">{formatName(media.author)}</p>
          <p className="text-white/90 text-xs drop-shadow-md">{media.likesCount} curtidas</p>
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
  const [filter, setFilter] = useState<'recent' | 'popular' | 'mine' | 'guestbook' | 'carousel' | 'by_guest' | 'ranking' | 'host_album' | 'predictions'>('recent');
  const [isAdmin, setIsAdmin] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const photosRef = useRef<HTMLDivElement>(null);
  const videosRef = useRef<HTMLDivElement>(null);
  const guestRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const filterBarRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mediaToShare, setMediaToShare] = useState<Media | null>(null);
  const [guestSearch, setGuestSearch] = useState('');
  const [displayLimit, setDisplayLimit] = useState(12);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isSlideshowMode, setIsSlideshowMode] = useState(false);

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
      // Optimistic update
      let newFavs = [...favoriteIds];
      if (isCurrentlyFavorite) {
        newFavs = newFavs.filter(x => x !== id);
      } else {
        newFavs.push(id);
      }
      setFavoriteIds(newFavs);
      localStorage.setItem(`favorites_${sessionId}`, JSON.stringify(newFavs));

      if (isCurrentlyFavorite) {
        await deleteDoc(likeRef);
        await updateDoc(mediaRef, { likesCount: increment(-1) });
      } else {
        await setDoc(likeRef, {
          sessionId,
          type: reactionId,
          author: guestName || 'Anônimo',
          timestamp: serverTimestamp()
        });
        await updateDoc(mediaRef, { likesCount: increment(1) });
      }
    } catch (e) {
      console.error(e);
      // Revert optimistic
      let oldFavs = [...favoriteIds];
      setFavoriteIds(oldFavs);
      localStorage.setItem(`favorites_${sessionId}`, JSON.stringify(oldFavs));
    }
  };

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(firestoreDoc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();
  }, []);

  const toggleSelection = (id: string) => {
    setSelectedMediaIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleShare = async (platform: 'whatsapp' | 'facebook' | 'twitter' | 'instagram', forceDirect = false) => {
    const baseUrl = window.location.origin + '/';
    let shareUrl = baseUrl;
    
    if (selectedMediaIds.length > 0) {
      const idsParam = selectedMediaIds.join(',');
      shareUrl = `${baseUrl}?ids=${idsParam}`;
    }

    const message = settings?.welcomeMessage || 'Confira a galeria de fotos do evento!';
    
    if (!forceDirect && selectedMediaIds.length > 0 && navigator.canShare) {
      setIsSharing(true);
      try {
        const filesToShare: File[] = [];
        for (const id of selectedMediaIds) {
          const media = mediaList.find(m => m.id === id);
          if (media) {
            const url = media.type === 'photo' ? `/api/image/${media.driveFileId}` : `/api/video/${media.driveFileId}`;
            const response = await fetch(url);
            const blob = await response.blob();
            const extension = media.type === 'photo' ? 'jpg' : 'mp4';
            const file = new File([blob], `media-${id}.${extension}`, { type: blob.type });
            filesToShare.push(file);
          }
        }

        if (navigator.canShare({ files: filesToShare })) {
          await navigator.share({
            files: filesToShare,
            title: 'Galeria de Fotos',
            text: message,
          });
          setIsSharing(false);
          return;
        }
      } catch (error) {
        console.log('Error sharing files:', error);
      }
      setIsSharing(false);
    }

    if (!forceDirect && navigator.share) {
      try {
        await navigator.share({
          title: 'Galeria de Fotos',
          text: message,
          url: shareUrl,
        });
        return;
      } catch (error) {
        console.log('Error sharing:', error);
      }
    }

    const encodedMessage = encodeURIComponent(message + ' ' + shareUrl);
    const encodedUrl = encodeURIComponent(shareUrl);

    if (forceDirect && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      switch (platform) {
        case 'whatsapp':
          window.location.href = `whatsapp://send?text=${encodedMessage}`;
          break;
        case 'facebook':
          window.location.href = `fb://facewebmodal/f?href=${encodedUrl}`;
          // Fallback if app not installed
          setTimeout(() => {
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank');
          }, 500);
          break;
        case 'twitter':
          window.location.href = `twitter://post?message=${encodedMessage}`;
          // Fallback
          setTimeout(() => {
            window.open(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(message)}`, '_blank');
          }, 500);
          break;
        case 'instagram':
          window.location.href = `instagram://`;
          break;
      }
      return;
    }

    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(message)}`, '_blank');
        break;
      case 'instagram':
        window.open(`https://www.instagram.com/`, '_blank');
        break;
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
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      setScrollY(window.scrollY);
      
      // Infinite scroll
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 500) {
        setDisplayLimit(prev => prev + 12);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (filterBarRef.current) {
      const activeBtn = filterBarRef.current.querySelector('[data-active="true"]');
      if (activeBtn) {
        activeBtn.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [filter]);

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
      if (!sessionId) return; // Wait for sessionId
      
      const sessionIds = [sessionId];
      if (guestSessionId && guestSessionId !== sessionId) {
        sessionIds.push(guestSessionId);
      }

      console.log('Querying mine with sessionIds:', sessionIds);

      q = query(
        collection(db, 'media'),
        where('authorSessionId', 'in', sessionIds)
      );
    } else {
      q = query(
        collection(db, 'media'),
        where('status', '==', 'approved')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Media[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Media);
      });

      // Update session avatar if we find a photo for this user
      if (sessionId) {
        const sessionIdsForAvatar = [sessionId];
        if (guestSessionId && guestSessionId !== sessionId) sessionIdsForAvatar.push(guestSessionId);
        const myPhoto = items.find(m => sessionIdsForAvatar.includes(m.authorSessionId) && m.type === 'photo');
        if (myPhoto && myPhoto.thumbnailLink) {
          setAuthorPhotoUrl(myPhoto.thumbnailLink);
        }
      }

      let sorted = [...items];
      console.log(`Filtering gallery: ${filter}, total items: ${items.length}, includes host album: ${items.some(m => m.isHostAlbum)}`);
      
      // Handle shared selection via URL
      const urlParams = new URLSearchParams(window.location.search);
      const sharedIds = urlParams.get('ids')?.split(',');
      if (sharedIds && sharedIds.length > 0) {
        sorted = sorted.filter(m => sharedIds.includes(m.id));
      }

      if (filter === 'recent') {
        sorted = sorted.filter(m => !m.isHostAlbum);
        sorted.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          const timeA = a.timestamp?.toMillis() || 0;
          const timeB = b.timestamp?.toMillis() || 0;
          return timeB - timeA;
        });
      } else if (filter === 'host_album') {
        sorted = sorted.filter(m => m.isHostAlbum);
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
        const mySessionIds = [sessionId, guestSessionId].filter((id): id is string => !!id && id.trim() !== '');
        
        sorted = sorted.filter(m => 
          mySessionIds.includes(m.authorSessionId) && 
          m.isHostAlbum !== true
        );
        sorted.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
      } else if (filter === 'by_guest') {
        sorted = sorted.filter(m => !m.isHostAlbum);
        sorted.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
      } else if (filter === 'carousel') {
        sorted = sorted.filter(m => !m.isHostAlbum);
      }

      setMediaList(sorted);
    }, (error) => {
      console.error("Error fetching media:", error);
    });

    return () => unsubscribe();
  }, [filter, guestName, sessionId]);

  const handleDeleteMedia = (id: string) => {
    setMediaToDelete(id);
  };

  const confirmDeleteMedia = async () => {
    if (!mediaToDelete) return;
    try {
      const mediaDoc = await getDoc(doc(db, 'media', mediaToDelete));
      if (mediaDoc.exists()) {
        const mediaData = mediaDoc.data();
        if (mediaData.driveFileId) {
          await fetch(`/api/drive/${mediaData.driveFileId}`, { method: 'DELETE' });
        }
      }
      await deleteDoc(doc(db, 'media', mediaToDelete));
      setMediaToDelete(null);
    } catch (error) {
      console.error("Error deleting media:", error);
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

  const filteredMediaList = React.useMemo(() => {
    const search = guestSearch.trim().toLowerCase();
    if (!search) return mediaList;
    return mediaList.filter(m => 
      formatName(m.author).toLowerCase() === search
    );
  }, [mediaList, guestSearch]);

  const allPhotos = filteredMediaList.filter(m => m.type === 'photo');
  const allVideos = filteredMediaList.filter(m => m.type === 'video');

  const photos = allPhotos.slice(0, displayLimit);
  const videos = allVideos.slice(0, displayLimit);

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
            onClick={() => changeFilter('recent')}
            className={`flex items-center gap-3 py-3 px-4 rounded-xl font-medium transition-all duration-200 text-left ${filter === 'recent' ? 'bg-[#D4A373] text-white shadow-md shadow-[#D4A373]/20 scale-[1.02]' : 'text-gray-600 hover:bg-pink-50 hover:text-[#D4A373]'}`}
          >
            <Clock size={18} className={filter === 'recent' ? 'text-white' : 'text-gray-400'} /> O que rolou agora
          </button>
          <button 
            onClick={() => changeFilter('host_album')}
            className={`flex items-center gap-3 py-3 px-4 rounded-xl font-medium transition-all duration-200 text-left ${filter === 'host_album' ? 'bg-[#D4A373] text-white shadow-md shadow-[#D4A373]/20 scale-[1.02]' : 'text-gray-600 hover:bg-pink-50 hover:text-[#D4A373]'}`}
          >
            <Crown size={18} className={filter === 'host_album' ? 'text-white' : 'text-[#D4A373]'} /> Álbum dos Anfitriões
          </button>
          <button 
            onClick={() => changeFilter('popular')}
            className={`flex items-center gap-3 py-3 px-4 rounded-xl font-medium transition-all duration-200 text-left ${filter === 'popular' ? 'bg-[#D4A373] text-white shadow-md shadow-[#D4A373]/20 scale-[1.02]' : 'text-gray-600 hover:bg-pink-50 hover:text-[#D4A373]'}`}
          >
            <Heart size={18} className={filter === 'popular' ? 'text-white' : 'text-rose-400'} /> Mais Curtidas
          </button>
          <button 
            onClick={() => changeFilter('mine')}
            className={`flex items-center gap-3 py-3 px-4 rounded-xl font-medium transition-all duration-200 text-left ${filter === 'mine' ? 'bg-[#D4A373] text-white shadow-md shadow-[#D4A373]/20 scale-[1.02]' : 'text-gray-600 hover:bg-pink-50 hover:text-[#D4A373]'}`}
          >
            <User size={18} className={filter === 'mine' ? 'text-white' : 'text-gray-400'} /> Minhas Fotos
          </button>
          <button 
            onClick={() => changeFilter('by_guest')}
            className={`flex items-center gap-3 py-3 px-4 rounded-xl font-medium transition-all duration-200 text-left ${filter === 'by_guest' ? 'bg-[#D4A373] text-white shadow-md shadow-[#D4A373]/20 scale-[1.02]' : 'text-gray-600 hover:bg-pink-50 hover:text-[#D4A373]'}`}
          >
            <Users size={18} className={filter === 'by_guest' ? 'text-white' : 'text-gray-400'} /> Por Convidado
          </button>
          <button 
            onClick={() => { changeFilter('carousel'); setIsSlideshowMode(true); }}
            className={`flex items-center gap-3 py-3 px-4 rounded-xl font-medium transition-all duration-200 text-left ${filter === 'carousel' ? 'bg-[#D4A373] text-white shadow-md shadow-[#D4A373]/20 scale-[1.02]' : 'text-gray-600 hover:bg-pink-50 hover:text-[#D4A373]'}`}
          >
            <Images size={18} className={filter === 'carousel' ? 'text-white' : 'text-gray-400'} /> Carrossel de Fotos
          </button>
          <button 
            onClick={() => changeFilter('ranking')}
            className={`flex items-center gap-3 py-3 px-4 rounded-xl font-medium transition-all duration-200 text-left ${filter === 'ranking' ? 'bg-[#D4A373] text-white shadow-md shadow-[#D4A373]/20 scale-[1.02]' : 'text-gray-600 hover:bg-pink-50 hover:text-[#D4A373]'}`}
          >
            <Trophy size={18} className={filter === 'ranking' ? 'text-white' : 'text-yellow-500'} /> Convidados Mais Animados
          </button>
          <button 
            onClick={() => changeFilter('guestbook')}
            className={`flex items-center gap-3 py-3 px-4 rounded-xl font-medium transition-all duration-200 text-left ${filter === 'guestbook' ? 'bg-[#D4A373] text-white shadow-md shadow-[#D4A373]/20 scale-[1.02]' : 'text-gray-600 hover:bg-pink-50 hover:text-[#D4A373]'}`}
          >
            <BookOpen size={18} className={filter === 'guestbook' ? 'text-white' : 'text-gray-400'} /> Deixe um carinho
          </button>
          <button 
            onClick={() => changeFilter('predictions')}
            className={`flex items-center gap-3 py-3 px-4 rounded-xl font-medium transition-all duration-200 text-left ${filter === 'predictions' ? 'bg-[#D4A373] text-white shadow-md shadow-[#D4A373]/20 scale-[1.02]' : 'text-gray-600 hover:bg-pink-50 hover:text-[#D4A373]'}`}
          >
            <Sparkles size={18} className={filter === 'predictions' ? 'text-white' : 'text-yellow-400'} /> Videntes por um Dia
          </button>

          <div className="border-t border-gray-100 mt-4 pt-4 mb-4">
            <button onClick={logout} className="flex items-center gap-3 w-full text-left text-gray-600 hover:text-red-500 hover:bg-red-50 transition-colors py-3 px-4 rounded-xl">
              <LogOut size={18} />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content App Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#FAFAFA]">
      
      {/* Header */}
      <header className={`bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-pink-100/50 transition-all duration-300 ${isScrolled ? 'py-2 shadow-sm' : 'py-4'}`}>
        <div className="w-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle (Left) */}
            <button 
              className="p-2 -ml-2 text-gray-600 hover:text-[#D4A373] transition-colors md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
          
          {/* Right Side: Event Name */}
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex flex-col items-end">
              <span className="text-[16pt] font-bold text-[#D4A373] text-right font-montserrat tracking-widest uppercase drop-shadow-sm leading-none">
                {settings?.eventName || '15 Anos Ana'}
              </span>
              <span className="text-[8px] sm:text-[10px] text-gray-400 font-medium uppercase mt-1">
                Seja Bem Vindo {guestName?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Collapsible Menu */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${isMenuOpen ? 'max-h-[600px] border-t border-gray-100 mt-2 shadow-inner' : 'max-h-0'}`}>
          <div className="px-4 py-3 bg-white flex flex-col gap-1">
            <span className="text-sm text-gray-500 font-medium border-b border-gray-100 pb-2 mb-1 px-2">Olá, {guestName}</span>
            
            <button 
              onClick={() => changeFilter('recent')}
              className={`flex items-center gap-2 text-left py-2.5 px-3 rounded-lg font-medium transition-colors ${filter === 'recent' ? 'bg-pink-50 text-[#D4A373]' : 'text-gray-600 hover:bg-gray-50 hover:text-[#D4A373]'}`}
            >
              <Clock size={16} /> O que rolou agora
            </button>
            <button 
              onClick={() => changeFilter('host_album')}
              className={`flex items-center gap-2 text-left py-2.5 px-3 rounded-lg font-medium transition-colors ${filter === 'host_album' ? 'bg-pink-50 text-[#D4A373]' : 'text-gray-600 hover:bg-gray-50 hover:text-[#D4A373]'}`}
            >
              <Crown size={16} /> Álbum dos Anfitriões
            </button>
            <button 
              onClick={() => changeFilter('popular')}
              className={`flex items-center gap-2 text-left py-2.5 px-3 rounded-lg font-medium transition-colors ${filter === 'popular' ? 'bg-pink-50 text-[#D4A373]' : 'text-gray-600 hover:bg-gray-50 hover:text-[#D4A373]'}`}
            >
              <Heart size={16} /> Mais Curtidas
            </button>
            <button 
              onClick={() => changeFilter('mine')}
              className={`flex items-center gap-2 text-left py-2.5 px-3 rounded-lg font-medium transition-colors ${filter === 'mine' ? 'bg-pink-50 text-[#D4A373]' : 'text-gray-600 hover:bg-gray-50 hover:text-[#D4A373]'}`}
            >
              <User size={16} /> Minhas Fotos
            </button>
            <button 
              onClick={() => { changeFilter('carousel'); setIsSlideshowMode(true); }}
              className={`flex items-center gap-2 text-left py-2.5 px-3 rounded-lg font-medium transition-colors ${filter === 'carousel' ? 'bg-pink-50 text-[#D4A373]' : 'text-gray-600 hover:bg-gray-50 hover:text-[#D4A373]'}`}
            >
              <Images size={16} /> Carrossel de Fotos
            </button>
            <button 
              onClick={() => changeFilter('ranking')}
              className={`flex items-center gap-2 text-left py-2.5 px-3 rounded-lg font-medium transition-colors ${filter === 'ranking' ? 'bg-pink-50 text-[#D4A373]' : 'text-gray-600 hover:bg-gray-50 hover:text-[#D4A373]'}`}
            >
              <Trophy size={16} /> Convidados Mais Animados
            </button>
            <button 
              onClick={() => changeFilter('guestbook')}
              className={`flex items-center gap-2 text-left py-2.5 px-3 rounded-lg font-medium transition-colors ${filter === 'guestbook' ? 'bg-pink-50 text-[#D4A373]' : 'text-gray-600 hover:bg-gray-50 hover:text-[#D4A373]'}`}
            >
              <BookOpen size={16} /> Deixe um carinho
            </button>
            <button 
              onClick={() => changeFilter('predictions')}
              className={`flex items-center gap-2 text-left py-2.5 px-3 rounded-lg font-medium transition-colors ${filter === 'predictions' ? 'bg-pink-50 text-[#D4A373]' : 'text-gray-600 hover:bg-gray-50 hover:text-[#D4A373]'}`}
            >
              <Sparkles size={16} /> Videntes por um Dia
            </button>

            <div className="border-t border-gray-100 mt-1 pt-1">
              <button onClick={logout} className="flex items-center gap-2 w-full text-left text-gray-600 hover:text-red-500 hover:bg-red-50 transition-colors py-2.5 px-3 rounded-lg">
                <LogOut size={18} />
                <span className="font-medium">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Banner */}
      <div className="relative w-full bg-white border-b border-gray-100">
        <div className="w-full px-4 sm:px-6 py-4">
          <div className="relative w-full aspect-[1080/400] md:aspect-auto md:h-[500px] lg:h-[600px] rounded-2xl overflow-hidden shadow-lg bg-black/5 flex justify-center items-center">
            {settings?.bannerUrl || '/banner.png' ? (
              <img 
                src={settings?.bannerUrl || '/banner.png'} 
                alt="Banner do Evento" 
                className="w-full h-full object-cover md:object-contain absolute top-0 left-0"
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
            <div 
              className="w-full h-full absolute inset-0 flex items-center justify-center bg-gradient-to-r from-[#D4A373]/20 to-[#5A5A40]/20 z-10"
              style={{ 
                display: settings?.bannerUrl || '/banner.png' ? 'none' : 'flex' 
              }}
            >
                <div className="text-center">
                  <h1 className="text-2xl sm:text-4xl font-serif text-[#D4A373] tracking-wider uppercase">
                    {settings?.eventName || '15 Anos da Ana'}
                  </h1>
                  <p className="text-sm sm:text-base text-gray-500 mt-1">
                    {settings?.welcomeMessage || 'Compartilhe seus momentos conosco'}
                  </p>
                </div>
              </div>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div 
        ref={filterBarRef}
        className="flex w-full px-6 pt-2 pb-4 gap-3 overflow-x-auto custom-scrollbar scroll-smooth"
      >
          <button 
            onClick={() => setFilter('recent')}
            data-active={filter === 'recent'}
            className={`w-28 h-16 px-2 rounded-xl text-xs font-medium whitespace-normal leading-tight transition-all duration-300 flex flex-col items-center justify-center text-center shrink-0 gap-1 ${filter === 'recent' ? 'bg-[#D4A373] text-white shadow-md shadow-[#D4A373]/20' : 'bg-white text-gray-500 hover:bg-pink-50 border border-gray-100'}`}
          >
            <Clock size={16} />
            O que rolou agora
          </button>
          <button 
            onClick={() => setFilter('host_album')}
            data-active={filter === 'host_album'}
            className={`w-28 h-16 px-2 rounded-xl text-xs font-medium whitespace-normal leading-tight transition-all duration-300 flex flex-col items-center justify-center text-center shrink-0 gap-1 ${filter === 'host_album' ? 'bg-[#D4A373] text-white shadow-md shadow-[#D4A373]/20' : 'bg-white text-gray-500 hover:bg-pink-50 border border-gray-100'}`}
          >
            <Crown size={16} />
            Álbum dos Anfitriões
          </button>
          <button 
            onClick={() => setFilter('popular')}
            data-active={filter === 'popular'}
            className={`w-28 h-16 px-2 rounded-xl text-xs font-medium whitespace-normal leading-tight transition-all duration-300 flex flex-col items-center justify-center text-center shrink-0 gap-1 ${filter === 'popular' ? 'bg-[#D4A373] text-white shadow-md shadow-[#D4A373]/20' : 'bg-white text-gray-500 hover:bg-pink-50 border border-gray-100'}`}
          >
            <Heart size={16} />
            Mais Curtidas
          </button>
          <button 
            onClick={() => setFilter('mine')}
            data-active={filter === 'mine'}
            className={`w-28 h-16 px-2 rounded-xl text-xs font-medium whitespace-normal leading-tight transition-all duration-300 flex flex-col items-center justify-center text-center shrink-0 gap-1 ${filter === 'mine' ? 'bg-[#D4A373] text-white shadow-md shadow-[#D4A373]/20' : 'bg-white text-gray-500 hover:bg-pink-50 border border-gray-100'}`}
          >
            <User size={16} />
            Minhas Fotos
          </button>
          <button 
            onClick={() => setFilter('by_guest')}
            data-active={filter === 'by_guest'}
            className={`w-28 h-16 px-2 rounded-xl text-xs font-medium whitespace-normal leading-tight transition-all duration-300 flex flex-col items-center justify-center text-center shrink-0 gap-1 ${filter === 'by_guest' ? 'bg-[#D4A373] text-white shadow-md shadow-[#D4A373]/20' : 'bg-white text-gray-500 hover:bg-pink-50 border border-gray-100'}`}
          >
            <Users size={16} />
            Por Convidado
          </button>
          <button 
            onClick={() => setFilter('carousel')}
            data-active={filter === 'carousel'}
            className={`w-28 h-16 px-2 rounded-xl text-xs font-medium whitespace-normal leading-tight transition-all duration-300 flex flex-col items-center justify-center text-center shrink-0 gap-1 ${filter === 'carousel' ? 'bg-[#D4A373] text-white shadow-md shadow-[#D4A373]/20' : 'bg-white text-gray-500 hover:bg-pink-50 border border-gray-100'}`}
          >
            <Images size={16} />
            Carrossel de Fotos
          </button>
          <button 
            onClick={() => setFilter('ranking')}
            data-active={filter === 'ranking'}
            className={`w-28 h-16 px-2 rounded-xl text-xs font-medium whitespace-normal leading-tight transition-all duration-300 flex flex-col items-center justify-center text-center shrink-0 gap-1 ${filter === 'ranking' ? 'bg-[#D4A373] text-white shadow-md shadow-[#D4A373]/20' : 'bg-white text-gray-500 hover:bg-pink-50 border border-gray-100'}`}
          >
            <Trophy size={16} />
            Convidados Mais Animados
          </button>
          <button 
            onClick={() => setFilter('guestbook')}
            data-active={filter === 'guestbook'}
            className={`w-28 h-16 px-2 rounded-xl text-xs font-medium whitespace-normal leading-tight transition-all duration-300 flex flex-col items-center justify-center text-center shrink-0 gap-1 ${filter === 'guestbook' ? 'bg-[#D4A373] text-white shadow-md shadow-[#D4A373]/20' : 'bg-white text-gray-500 hover:bg-pink-50 border border-gray-100'}`}
          >
            <BookOpen size={16} />
            Deixe um carinho
          </button>
          <button 
            onClick={() => setFilter('predictions')}
            data-active={filter === 'predictions'}
            className={`w-28 h-16 px-2 rounded-xl text-xs font-medium whitespace-normal leading-tight transition-all duration-300 flex flex-col items-center justify-center text-center shrink-0 gap-1 ${filter === 'predictions' ? 'bg-[#D4A373] text-white shadow-md shadow-[#D4A373]/20' : 'bg-white text-gray-500 hover:bg-pink-50 border border-gray-100'}`}
          >
            <Sparkles size={16} />
            Videntes por um Dia
          </button>
        </div>

      {/* Mobile Actions Bar (Replaces Banner) */}
      <div className="w-full px-6 py-4 flex items-center justify-between block md:hidden bg-white border-b border-gray-100">
        {/* Floating Add Button */}
        {((filter === 'recent' || filter === 'carousel') || (filter === 'host_album' && isAdmin)) && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-[#D4A373] rounded-full animate-ping opacity-20"></div>
              <button
                onClick={() => setIsUploadOpen(true)}
                className="relative w-12 h-12 bg-[#D4A373] text-white rounded-full shadow-lg shadow-[#D4A373]/30 flex items-center justify-center hover:bg-[#c39162] transition-all duration-300 active:scale-90"
                title="Adicionar fotos"
              >
                <Plus size={24} />
              </button>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-800 leading-tight">Incluir</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Fotos e Vídeos</span>
            </div>
          </div>
        )}

        {/* Social Share Bar */}
        <div className="flex items-center gap-0.5 p-1 bg-gray-50 rounded-full border border-gray-100 shrink-0">
          <button 
            onClick={() => handleShare('whatsapp', true)}
            className="p-2 text-green-500 hover:bg-white hover:shadow-sm rounded-full transition-all active:scale-90 shrink-0"
            title="WhatsApp"
            disabled={isSharing}
          >
            <MessageCircle size={20} />
          </button>
          <button 
            onClick={() => handleShare('instagram', true)}
            className="p-2 text-pink-600 hover:bg-white hover:shadow-sm rounded-full transition-all active:scale-90 shrink-0"
            title="Instagram"
            disabled={isSharing}
          >
            <Instagram size={20} />
          </button>
          <button 
            onClick={() => handleShare('facebook', true)}
            className="p-2 text-blue-600 hover:bg-white hover:shadow-sm rounded-full transition-all active:scale-90 shrink-0"
            title="Facebook"
            disabled={isSharing}
          >
            <Facebook size={20} />
          </button>
          <button 
            onClick={() => handleShare('twitter', true)}
            className="p-2 text-blue-400 hover:bg-white hover:shadow-sm rounded-full transition-all active:scale-90 shrink-0"
            title="Twitter (X)"
            disabled={isSharing}
          >
            <Twitter size={20} />
          </button>
        </div>
      </div>

      {/* Guest Search Input */}
      {(filter === 'recent' || filter === 'popular' || filter === 'by_guest' || filter === 'carousel' || filter === 'host_album' || filter === 'mine') && (
        <div className="w-full px-6 mt-10 sm:mt-0 mb-4 relative flex items-center gap-2">
          {((filter === 'recent' || filter === 'carousel' || filter === 'mine') || (filter === 'host_album' && isAdmin)) && (
            <input
              type="checkbox"
              checked={isSelectionMode}
              onChange={() => {
                setIsSelectionMode(!isSelectionMode);
                setSelectedMediaIds([]);
              }}
              className="w-6 h-6 rounded-md border-gray-300 text-[#D4A373] focus:ring-[#D4A373] shrink-0"
            />
          )}
          <div className="relative group flex-1">
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={guestSearch}
              onChange={(e) => setGuestSearch(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-2xl py-3 pl-10 pr-10 text-sm focus:ring-2 focus:ring-[#D4A373] focus:border-transparent outline-none transition-all shadow-sm hover:shadow-md"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D4A373]">
              <Search size={16} />
            </div>
            {guestSearch && (
              <button 
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition-colors"
                title="Limpar busca"
              >
                <X size={12} />
              </button>
            )}
            
            {/* Guest Suggestions Dropdown */}
            {guestSearch && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto">
                {Array.from(new Set(mediaList.map(m => formatName(m.author))))
                  .filter(author => author.toLowerCase().includes(guestSearch.toLowerCase()))
                  .map(author => (
                    <button
                      key={author}
                      onClick={() => {
                        setGuestSearch(author);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-pink-50 text-gray-700 transition-colors text-sm"
                    >
                      {author}
                    </button>
                  ))}
                {Array.from(new Set(mediaList.map(m => formatName(m.author))))
                  .filter(author => author.toLowerCase().includes(guestSearch.toLowerCase())).length === 0 && (
                    <div className="px-4 py-2 text-gray-400 text-xs">Nenhum convidado encontrado</div>
                  )}
              </div>
            )}
          </div>
          {guestSearch.trim() && (
            <p className="text-xs text-gray-400 mt-2 ml-2">
              Filtrando por: <span className="font-bold text-[#D4A373]">"{guestSearch}"</span>
            </p>
          )}
          
          <div className="flex bg-white rounded-xl p-1 border border-gray-100 shadow-sm ml-2 shrink-0">
            <button 
              onClick={() => setIsSlideshowMode(false)}
              className={`p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-medium ${!isSlideshowMode ? 'bg-[#D4A373] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              title="Ver em grade"
            >
              <LayoutGrid size={18} />
              <span className="hidden md:inline">Grade</span>
            </button>
            <button 
              onClick={() => setIsSlideshowMode(true)}
              className={`p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-medium ${isSlideshowMode ? 'bg-[#D4A373] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              title="Ver como carrossel"
            >
              <MonitorPlay size={18} />
              <span className="hidden md:inline">Carrossel</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Social Share Buttons (Desktop) */}
      <div className="hidden md:flex fixed top-24 right-6 z-40 flex-col gap-2 py-2 px-2 bg-white/90 backdrop-blur-md rounded-full border border-gray-100 shadow-xl animate-in fade-in slide-in-from-right-4 duration-700">
        {isSharing ? (
          <div className="p-2 flex flex-col items-center gap-2 text-[#D4A373]">
            <div className="w-5 h-5 border-2 border-[#D4A373] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            <button 
              onClick={() => handleShare('whatsapp', true)}
              className="p-2 text-green-500 hover:bg-green-50 rounded-full transition-all hover:scale-110 active:scale-95"
              title="WhatsApp"
              disabled={isSharing}
            >
              <MessageCircle size={20} />
            </button>
            <button 
              onClick={() => handleShare('instagram', true)}
              className="p-2 text-pink-600 hover:bg-pink-50 rounded-full transition-all hover:scale-110 active:scale-95"
              title="Instagram"
              disabled={isSharing}
            >
              <Instagram size={20} />
            </button>
            <button 
              onClick={() => handleShare('facebook', true)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-all hover:scale-110 active:scale-95"
              title="Facebook"
              disabled={isSharing}
            >
              <Facebook size={20} />
            </button>
            <button 
              onClick={() => handleShare('twitter', true)}
              className="p-2 text-black hover:bg-gray-100 rounded-full transition-all hover:scale-110 active:scale-95"
              title="X (Twitter)"
              disabled={isSharing}
            >
              <Twitter size={20} />
            </button>
          </>
        )}
      </div>

      {/* Floating Add Button (Desktop) */}
      {((filter === 'recent' || filter === 'carousel') || (filter === 'host_album' && isAdmin)) && (
        <div className="hidden md:flex fixed bottom-8 right-8 z-50 flex-col items-end gap-4">
          {isSelectionMode && selectedMediaIds.length > 0 && (
            <div className="bg-[#D4A373] text-white px-6 py-2 rounded-full text-sm font-medium shadow-lg animate-in zoom-in duration-300">
              {selectedMediaIds.length} selecionado{selectedMediaIds.length !== 1 ? 's' : ''}
            </div>
          )}
          
          <div className="relative">
            <div className="absolute inset-0 bg-[#D4A373] rounded-full animate-ping opacity-75"></div>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="relative w-16 h-16 bg-[#D4A373] text-white rounded-full shadow-2xl shadow-[#D4A373]/40 flex items-center justify-center hover:bg-[#c39162] transition-all duration-300 hover:scale-110 active:scale-95"
              title="Adicionar fotos"
            >
              <Plus size={32} />
            </button>
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
        ) : filter === 'carousel' || isSlideshowMode ? (
          <Slideshow photos={allPhotos} videos={allVideos} />
        ) : filter === 'host_album' ? (
          <div className="space-y-4">
            <div className="px-6 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#D4A373]/20 flex items-center justify-center shrink-0">
                  <Crown size={22} className="text-[#D4A373]" />
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl text-gray-800">Álbum dos Anfitriões</h2>
              </div>
            </div>

            <div className="space-y-12">
              {/* Photos Carousel */}
                {photos.length > 0 && (
                  <section>
                    <div className="px-6 mb-6 flex items-center gap-3">
                      <h2 className="font-serif text-2xl text-gray-800">Fotos</h2>
                      <div className="h-px flex-1 bg-gradient-to-r from-pink-100 to-transparent"></div>
                    </div>
                    <ScrollDots containerRef={photosRef} itemCount={photos.length} />
                    <div 
                      ref={photosRef}
                      className="flex overflow-x-auto gap-6 px-6 pb-8 snap-x snap-mandatory no-scrollbar"
                    >
                      {photos.map((media) => (
                        <MediaItem 
                          key={media.id} 
                          media={media} 
                          onClick={() => setSelectedMedia(media)} 
                          isAdmin={isAdmin}
                          onDelete={handleDeleteMedia}
                          onShare={(id) => setMediaToShare(mediaList.find(m => m.id === id) || null)}
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
                )}

                {/* Videos Carousel */}
                {videos.length > 0 && (
                  <section>
                    <div className="px-6 mb-6 flex items-center gap-3">
                      <h2 className="font-serif text-2xl text-gray-800">Vídeos</h2>
                      <div className="h-px flex-1 bg-gradient-to-r from-pink-100 to-transparent"></div>
                    </div>
                    <ScrollDots containerRef={videosRef} itemCount={videos.length} />
                    <div 
                      ref={videosRef}
                      className="flex overflow-x-auto gap-6 px-6 pb-8 snap-x snap-mandatory no-scrollbar"
                    >
                      {videos.map((media) => (
                        <MediaItem 
                          key={media.id} 
                          media={media} 
                          onClick={() => setSelectedMedia(media)} 
                          isAdmin={isAdmin}
                          onDelete={handleDeleteMedia}
                          onShare={(id) => setMediaToShare(mediaList.find(m => m.id === id) || null)}
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
            {Object.entries(mediaByGuest).map(([author, authorMedia]) => (
              <section key={author}>
                <div className="px-6 mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#D4A373]/20 flex items-center justify-center shrink-0">
                    <span className="text-lg font-serif text-[#D4A373]">
                      {author.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <h2 className="font-serif text-2xl text-gray-800">{author}</h2>
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
                      onShare={(id) => setMediaToShare(mediaList.find(m => m.id === id) || null)}
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
            {/* Photos Carousel */}
            {photos.length > 0 && (
              <section>
                <div className="px-6 mb-6 flex items-center gap-3">
                  <h2 className="font-serif text-2xl text-gray-800">Fotos</h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-pink-100 to-transparent"></div>
                </div>
                <ScrollDots containerRef={photosRef} itemCount={photos.length} />
                <div 
                  ref={photosRef}
                  className="flex overflow-x-auto gap-6 px-6 pb-8 snap-x snap-mandatory no-scrollbar"
                >
                  {photos.map((media) => (
                    <MediaItem 
                      key={media.id} 
                      media={media} 
                      onClick={() => setSelectedMedia(media)} 
                      isAdmin={isAdmin}
                      onDelete={handleDeleteMedia}
                      onShare={(id) => setMediaToShare(mediaList.find(m => m.id === id) || null)}
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
            )}

            {/* Videos Carousel */}
            {videos.length > 0 && (
              <section>
                <div className="px-6 mb-6 flex items-center gap-3">
                  <h2 className="font-serif text-2xl text-gray-800">Vídeos</h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-pink-100 to-transparent"></div>
                </div>
                <ScrollDots containerRef={videosRef} itemCount={videos.length} />
                <div 
                  ref={videosRef}
                  className="flex overflow-x-auto gap-6 px-6 pb-8 snap-x snap-mandatory no-scrollbar"
                >
                  {videos.map((media) => (
                    <MediaItem 
                      key={media.id} 
                      media={media} 
                      onClick={() => setSelectedMedia(media)} 
                      isAdmin={isAdmin}
                      onDelete={handleDeleteMedia}
                      onShare={(id) => setMediaToShare(mediaList.find(m => m.id === id) || null)}
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
            )}

            {(allPhotos.length > displayLimit || allVideos.length > displayLimit) && (
              <div className="flex justify-center py-12">
                <button 
                  onClick={() => setDisplayLimit(prev => prev + 12)}
                  className="bg-white border border-gray-200 text-gray-700 px-10 py-4 rounded-2xl font-medium hover:bg-gray-50 hover:shadow-md transition-all flex items-center gap-3 active:scale-95"
                >
                  <Plus size={20} className="text-[#D4A373]" />
                  Carregar mais mídias
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {isUploadOpen && <UploadModal onClose={() => setIsUploadOpen(false)} />}
      {selectedMedia && <MediaViewer media={selectedMedia} onClose={() => setSelectedMedia(null)} settings={settings} />}
      <ShareModal 
        isOpen={mediaToShare !== null} 
        onClose={() => setMediaToShare(null)} 
        url={mediaToShare ? `${window.location.origin}/?ids=${mediaToShare.id}` : window.location.origin}
        title="Confira esta mídia do evento!"
      />

      {/* Delete Confirmation Modal */}
      {mediaToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-xl font-serif text-gray-800 mb-2">Excluir Mídia</h3>
            <p className="text-gray-600 mb-6">Tem certeza que deseja excluir esta mídia permanentemente?</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setMediaToDelete(null)}
                className="px-5 py-2.5 rounded-full text-gray-600 font-medium hover:bg-gray-100 transition-colors"
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
      )}
      
      <Footer />
      </div>
    </div>
  );
}
