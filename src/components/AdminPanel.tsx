import React, { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDoc, setDoc, collectionGroup, getDocs, where, writeBatch } from 'firebase/firestore';
import { Media, Settings, UserLog } from '../types';
import { LogOut, Check, X, Trash2, Settings as SettingsIcon, Image as ImageIcon, Video, Play, Download, BarChart2, Menu, Trophy, Clock, Crown, BookOpen, Sparkles, Users, Share2, Eye, EyeOff, Lock, Heart, User, MessageCircle, LayoutGrid, MonitorPlay, CheckSquare, Activity } from 'lucide-react';
import Feed from './Feed';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import MediaViewer from './MediaViewer';
import DisplayGenerator from './DisplayGenerator';
import Footer from './Footer';
import UploadModal from './UploadModal';
import ShareModal from './ShareModal';

import { motion, AnimatePresence } from 'motion/react';
import Guestbook from './Guestbook';
import Predictions from './Predictions';
import Ranking from './Ranking';
import EmptyState from './EmptyState';
import ScrollDots from './ScrollDots';
import AdminManager from './AdminManager';
import Slideshow from './Slideshow';
import Portal from './Portal';
import LogoutSplash from './LogoutSplash';
import EntranceScreen from './EntranceScreen';
import WelcomeModal from './WelcomeModal';
import { audioPresets } from '../lib/audioPresets';
import { musicPresets } from '../lib/musicPresets';

export default function AdminPanel() {
  const [mediaList, setMediaList] = useState<Media[]>([]);
  const [settings, setSettings] = useState<Settings>({ 
    uploadsEnabled: true, 
    videoUploadsEnabled: true, 
    requireApproval: false, 
    inviteCode: '15ANOS',
    eventName: 'Meus 15 Anos',
    eventDate: '',
    eventPhotoUrl: '',
    eventVideoUrl: '',
    logoUrl: '',
    bannerUrl: '',
    welcomeMessage: 'Bem-vindos à minha festa!',
    canLike: true,
    canComment: true,
    canShare: true,
    canDelete: false,
    canFavorite: false,
    canDownload: true,
    instagramUrl: '',
    facebookUrl: '',
    twitterUrl: ''
  });
  const tabsRef = useRef<HTMLDivElement>(null);
  
  const changeActiveTab = (newTab: any) => {
    setActiveTab(newTab);
    setIsMenuOpen(false);
    setIsSelectionMode(false);
    setSelectedMediaIds([]);
    setIsSlideshowMode(false);
    setTimeout(() => {
      if (tabsRef.current) {
        const activeBtn = tabsRef.current.querySelector('[data-tab-id="' + newTab + '"]');
        if (activeBtn) {
          activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } else if (newTab === 'pending') {
          tabsRef.current.scrollLeft = 0;
        }
      }
    }, 50);
  };
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'settings' | 'guestbook' | 'maintenance' | 'display' | 'host_album' | 'predictions' | 'ranking' | 'access_logs' | 'admin_manager' | 'popular' | 'feed'>('feed');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [isSlideshowMode, setIsSlideshowMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isUploadingWelcomeMedia, setIsUploadingWelcomeMedia] = useState(false);
  const [isUploadingWelcomeAudio, setIsUploadingWelcomeAudio] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecordingWelcomeAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
        
        setIsUploadingWelcomeAudio(true);
        try {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) throw new Error('Erro na resposta do servidor.');

          const data = await response.json();
          setSettings(prev => ({
            ...prev,
            welcomeAudioUrl: `/api/image/${data.id}`
          }));
        } catch (error: any) {
          console.error("Error uploading recorded welcome audio:", error);
          alert(`Erro ao fazer upload da gravação: ${error.message}`);
        } finally {
          setIsUploadingWelcomeAudio(false);
        }

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
    } catch (err) {
      console.error("Erro ao acessar o microfone:", err);
      alert("Não foi possível acessar o microfone para gravação.");
    }
  };

  const stopRecordingWelcomeAudio = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
    }
  };

  const [isDownloading, setIsDownloading] = useState(false);
  const [isRecalculatingLikes, setIsRecalculatingLikes] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceStats, setMaintenanceStats] = useState<{fixed: number, removed: number} | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [ranking, setRanking] = useState<{name: string, photos: number, likes: number, comments: number, total: number, avatarUrl?: string}[]>([]);
  const [isLoadingRanking, setIsLoadingRanking] = useState(false);
  const [accessLogs, setAccessLogs] = useState<UserLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [showClearLogsModal, setShowClearLogsModal] = useState(false);
  const [showDeleteAllMediaModal, setShowDeleteAllMediaModal] = useState(false);
  const [showDeleteAllMessagesModal, setShowDeleteAllMessagesModal] = useState(false);
  const [showDeleteAllPredictionsModal, setShowDeleteAllPredictionsModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mediaToShare, setMediaToShare] = useState<Media | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const highResQrRef = useRef<HTMLDivElement>(null);
  const hostAlbumRef = useRef<HTMLDivElement>(null);
  const mediaListRef = useRef<HTMLDivElement>(null);
  const [showEntrancePreview, setShowEntrancePreview] = useState(false);
  const [showWelcomePreview, setShowWelcomePreview] = useState(false);
  
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  // --- BEGIN ANDROID BACK BUTTON INTERCEPTOR ---
  const navStateRef = useRef({
    selectedMedia,
    isUploadOpen,
    mediaToDelete,
    showMaintenanceModal,
    showClearLogsModal,
    showDeleteAllMediaModal,
    showDeleteAllMessagesModal,
    showDeleteAllPredictionsModal,
    isMenuOpen,
    isShareModalOpen,
    activeTab
  });

  useEffect(() => {
    navStateRef.current = {
      selectedMedia,
      isUploadOpen,
      mediaToDelete,
      showMaintenanceModal,
      showClearLogsModal,
      showDeleteAllMediaModal,
      showDeleteAllMessagesModal,
      showDeleteAllPredictionsModal,
      isMenuOpen,
      isShareModalOpen,
      activeTab
    };
  }, [
    selectedMedia,
    isUploadOpen,
    mediaToDelete,
    showMaintenanceModal,
    showClearLogsModal,
    showDeleteAllMediaModal,
    showDeleteAllMessagesModal,
    showDeleteAllPredictionsModal,
    isMenuOpen,
    isShareModalOpen,
    activeTab
  ]);

  useEffect(() => {
    window.history.pushState({ adminActive: true }, "");

    const handlePopState = (e: PopStateEvent) => {
      const state = navStateRef.current;
      const needsClose = 
        state.selectedMedia || 
        state.isUploadOpen || 
        state.mediaToDelete || 
        state.showMaintenanceModal || 
        state.showClearLogsModal || 
        state.showDeleteAllMediaModal || 
        state.showDeleteAllMessagesModal || 
        state.showDeleteAllPredictionsModal || 
        state.isMenuOpen || 
        state.isShareModalOpen || 
        state.activeTab !== 'pending';

      if (needsClose) {
        if (state.selectedMedia) setSelectedMedia(null);
        else if (state.isUploadOpen) setIsUploadOpen(false);
        else if (state.mediaToDelete) setMediaToDelete(null);
        else if (state.showMaintenanceModal) setShowMaintenanceModal(false);
        else if (state.showClearLogsModal) setShowClearLogsModal(false);
        else if (state.showDeleteAllMediaModal) setShowDeleteAllMediaModal(false);
        else if (state.showDeleteAllMessagesModal) setShowDeleteAllMessagesModal(false);
        else if (state.showDeleteAllPredictionsModal) setShowDeleteAllPredictionsModal(false);
        else if (state.isShareModalOpen) setIsShareModalOpen(false);
        else if (state.isMenuOpen) setIsMenuOpen(false);
        else if (state.activeTab !== 'pending') setActiveTab('pending');

        window.history.pushState({ adminActive: true }, "");
      } else {
        window.history.back();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  // --- END ANDROID BACK BUTTON INTERCEPTOR ---

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsSlideshowMode(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate('/admin/login');
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  useEffect(() => {
    // Fetch Settings
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setSettings({
            uploadsEnabled: data.uploadsEnabled ?? true,
            videoUploadsEnabled: data.videoUploadsEnabled ?? true,
            requireApproval: data.requireApproval ?? false,
            inviteCode: data.inviteCode ?? '15ANOS',
            eventName: data.eventName ?? 'Meus 15 Anos',
            eventDate: data.eventDate ?? '',
            eventPhotoUrl: data.eventPhotoUrl ?? '',
            eventVideoUrl: data.eventVideoUrl ?? '',
            logoUrl: data.logoUrl ?? '',
            bannerUrl: data.bannerUrl ?? '',
            welcomeMessage: data.welcomeMessage ?? 'Bem-vindos à minha festa!',
            welcomeMediaType: data.welcomeMediaType ?? 'photo',
            welcomeMediaUrl: data.welcomeMediaUrl ?? '',
            welcomeAudioUrl: data.welcomeAudioUrl ?? '',
            welcomeTemplate: data.welcomeTemplate ?? 'modern_gradient',
            entranceTemplate: data.entranceTemplate ?? 'none',
            entranceAudioPreset: data.entranceAudioPreset ?? 'none',
            entranceAudioUrl: data.entranceAudioUrl ?? '',
            displayBackgrounds: data.displayBackgrounds ?? [],
            canLike: data.canLike ?? true,
            canComment: data.canComment ?? true,
            canShare: data.canShare ?? true,
            canDelete: data.canDelete ?? false,
            canFavorite: data.canFavorite ?? false,
            canDownload: data.canDownload ?? true,
            instagramUrl: data.instagramUrl ?? '',
            facebookUrl: data.facebookUrl ?? '',
            twitterUrl: data.twitterUrl ?? ''
          });
        } else {
          // Initialize settings if they don't exist
          await setDoc(doc(db, 'settings', 'global'), settings);
        }
      } catch (error) {
        console.error("Error fetching/initializing settings:", error);
      }
    };
    fetchSettings();

    // Listen for Media
    const q = query(collection(db, 'media'), orderBy('timestamp', 'desc'));
    const unsubscribeMedia = onSnapshot(q, (snapshot) => {
      const items: Media[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Media);
      });
      setMediaList(items);
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening to media:", error);
      setIsLoading(false);
    });

    return () => unsubscribeMedia();
  }, []);

  useEffect(() => {
    let rankingUnsubs: (() => void)[] = [];

    if (activeTab === 'maintenance' || activeTab === 'ranking') {
      setIsLoadingRanking(true);
      
      let currentMedia: any[] = [];
      let currentComments: any[] = [];
      let currentGuestbook: any[] = [];
      let currentPredictions: any[] = [];
      let currentLikes: any[] = [];

      const calculateRanking = () => {
        try {
          const userStats: Record<string, { name: string, photos: number, likes: number, comments: number, total: number, avatarUrl?: string }> = {};
          const sessionToName: Record<string, string> = {};

          const getNormalizedName = (name: string | undefined | null) => {
            if (!name || name.trim() === '') return 'anônimo';
            return name.trim().toLowerCase();
          };

          const getDisplayName = (name: string | undefined | null) => {
            if (!name || name.trim() === '') return 'Anônimo';
            return name.trim();
          };

          const updateStats = (sessionId: string | undefined, authorName: string | undefined, type: 'photos' | 'comments', avatarData?: { driveFileId?: string, thumbnailLink?: string }, isPriorityAvatar?: boolean) => {
            const normName = getNormalizedName(authorName);
            if (sessionId) {
              sessionToName[sessionId] = normName;
            }
            
            if (!userStats[normName]) {
              userStats[normName] = { name: getDisplayName(authorName), photos: 0, likes: 0, comments: 0, total: 0, avatarUrl: '' };
            }
            
            userStats[normName][type] += 1;
            
            if (authorName && userStats[normName].name === 'Anônimo') {
              userStats[normName].name = getDisplayName(authorName);
            }

            // Prioritize avatars from messages/predictions over gallery photos
            if (avatarData && (!userStats[normName].avatarUrl || isPriorityAvatar)) {
              if (avatarData.driveFileId) {
                userStats[normName].avatarUrl = `/api/image/${avatarData.driveFileId}`;
              } else if (avatarData.thumbnailLink) {
                userStats[normName].avatarUrl = avatarData.thumbnailLink.replace('=s220', '=s800');
              }
            }
          };

          // 1. Media
          const approvedMediaIds = new Set<string>();
          currentMedia.forEach(doc => {
            const data = doc.data() as any;
            
            approvedMediaIds.add(doc.id);
            
            // ONLY count guest media for ranking (don't give points to the host)
            if (data.isHostAlbum || data.isHostAlbum === 'true') return;
            
            if (data.type === 'photo' || data.type === 'video') {
              updateStats(data.authorSessionId, data.author, 'photos', { driveFileId: data.driveFileId, thumbnailLink: data.thumbnailLink });
            }
          });

          // 2. Comments on Media
          currentComments.forEach(doc => {
            const data = doc.data() as any;
            const mediaId = doc.ref.parent.parent?.id;
            if (mediaId && approvedMediaIds.has(mediaId)) {
              updateStats(data.authorSessionId, data.author, 'comments');
            }
          });

          // 3. Guestbook
          currentGuestbook.forEach(doc => {
            const data = doc.data() as any;
            updateStats(data.authorSessionId, data.author, 'comments', { driveFileId: data.driveFileId, thumbnailLink: data.thumbnailLink }, true);
          });

          // 3.5 Predictions
          currentPredictions.forEach(doc => {
            const data = doc.data() as any;
            updateStats(data.authorSessionId, data.author, 'comments', { driveFileId: data.driveFileId, thumbnailLink: data.thumbnailLink }, true);
          });

          // 4. Likes
          currentLikes.forEach(doc => {
            const data = doc.data() as any;
            const mediaId = doc.ref.parent.parent?.id;
            
            if (mediaId && approvedMediaIds.has(mediaId)) {
              const sessionId = data.sessionId || doc.id;
              if (sessionId) {
                const normName = sessionToName[sessionId] || getNormalizedName(data.author);
                if (!userStats[normName]) {
                  const displayName = data.author ? getDisplayName(data.author) : 'Anônimo';
                  userStats[normName] = { name: displayName, photos: 0, likes: 0, comments: 0, total: 0, avatarUrl: '' };
                }
                userStats[normName].likes += 1;

                if (data.author && userStats[normName].name === 'Anônimo') {
                  userStats[normName].name = getDisplayName(data.author);
                }
              }
            }
          });

          const rankingArray = Object.values(userStats)
            .filter(stat => stat.name.toLowerCase() !== 'anônimo' && stat.name.toLowerCase() !== 'anfitrião')
            .map(stat => ({
              ...stat,
              total: stat.photos * 10 + stat.comments * 5 + stat.likes * 2
            })).sort((a, b) => b.total - a.total);

          setRanking(rankingArray);
        } catch (error) {
          console.error("Error calculating ranking:", error);
        } finally {
          setIsLoadingRanking(false);
        }
      };

      const handleUpdate = () => {
        calculateRanking();
      };
      
      rankingUnsubs.push(onSnapshot(query(collection(db, 'media')), snapshot => { 
        currentMedia = snapshot.docs.filter((doc) => {
           const data = doc.data();
           return data.status !== 'rejected' && data.status !== 'pending';
        }); 
        handleUpdate(); 
      }));
      rankingUnsubs.push(onSnapshot(collectionGroup(db, 'comments'), snapshot => { currentComments = snapshot.docs; handleUpdate(); }));
      rankingUnsubs.push(onSnapshot(collection(db, 'guestbook'), snapshot => { currentGuestbook = snapshot.docs; handleUpdate(); }));
      rankingUnsubs.push(onSnapshot(collection(db, 'predictions'), snapshot => { currentPredictions = snapshot.docs; handleUpdate(); }));
      rankingUnsubs.push(onSnapshot(collectionGroup(db, 'likes'), snapshot => { currentLikes = snapshot.docs; handleUpdate(); }));
    }

    if (activeTab === 'access_logs') {
      setIsLoadingLogs(true);
      const q = query(collection(db, 'access_logs'), orderBy('timestamp', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const logs: UserLog[] = [];
        snapshot.forEach((doc) => {
          logs.push({ id: doc.id, ...doc.data() } as any as UserLog);
        });
        setAccessLogs(logs);
        setIsLoadingLogs(false);
      });
      rankingUnsubs.push(unsubscribe);
    }

    return () => {
      rankingUnsubs.forEach(unsub => unsub());
    };
  }, [activeTab]);

  const downloadHighResQRCode = () => {
    const canvas = highResQrRef.current?.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `qrcode-${settings.eventName.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = url;
      link.click();
    }
  };

  const handleDownloadAll = async () => {
    if (mediaList.length === 0) {
      alert("Nenhuma mídia para baixar.");
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    const zip = new JSZip();
    const folder = zip.folder("midias_evento");

    try {
      let downloadedCount = 0;
      for (const media of mediaList) {
        if (media.status !== 'approved') continue; // Only download approved media
        
        try {
          const url = media.type === 'photo' ? `/api/image/${media.driveFileId}` : `/api/video/${media.driveFileId}`;
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Failed to fetch ${media.title}`);
          const blob = await response.blob();
          
          // Ensure unique filenames
          const extension = media.type === 'photo' ? '.jpg' : '.mp4';
          let filename = media.title || `midia_${media.id}`;
          if (!filename.toLowerCase().endsWith(extension)) {
            filename += extension;
          }
          
          folder?.file(filename, blob);
        } catch (err) {
          console.error(`Error downloading ${media.title}:`, err);
        }

        downloadedCount++;
        setDownloadProgress(Math.round((downloadedCount / mediaList.length) * 100));
      }

      setDownloadProgress(100); // Generating ZIP
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "midias_evento.zip");
    } catch (error) {
      console.error("Error creating ZIP:", error);
      alert("Ocorreu um erro ao criar o arquivo ZIP.");
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/admin/login');
  };

  const clearAccessLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const q = query(collection(db, 'access_logs'));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      setShowClearLogsModal(false);
    } catch (error) {
      console.error("Error clearing access logs:", error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const deleteAllMedia = async () => {
    setIsDeletingAll(true);
    try {
      // 1. Delete media documents
      const mediaSnap = await getDocs(collection(db, 'media'));
      
      for (const mediaDoc of mediaSnap.docs) {
        const data = mediaDoc.data();
        
        // Delete child collections (likes/comments)
        const commentsSnap = await getDocs(collection(db, 'media', mediaDoc.id, 'comments'));
        const likesSnap = await getDocs(collection(db, 'media', mediaDoc.id, 'likes'));
        
        const batch = writeBatch(db);
        commentsSnap.docs.forEach(d => batch.delete(d.ref));
        likesSnap.docs.forEach(d => batch.delete(d.ref));
        batch.delete(mediaDoc.ref);
        await batch.commit();
        
        // Try to delete from Drive if we have the ID
        if (data?.driveFileId) {
          try {
            await fetch(`/api/drive/${data.driveFileId}`, { method: 'DELETE' });
          } catch (e) {
            console.error("Error deleting file from drive:", data.driveFileId, e);
          }
        }
      }
      
      // 2. Also clear access logs to reset "sessions" contributing to ranking if requested or implied
      const logsSnap = await getDocs(collection(db, 'access_logs'));
      const logsBatch = writeBatch(db);
      logsSnap.docs.forEach(d => logsBatch.delete(d.ref));
      await logsBatch.commit();

      setShowDeleteAllMediaModal(false);
      // Ranking is automatically refreshed by the onSnapshot listener if the tab is active
    } catch (error) {
      console.error("Error deleting all media:", error);
      alert("Erro ao excluir todas as mídias.");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const deleteAllMessages = async () => {
    setIsDeletingAll(true);
    try {
      const guestbookSnap = await getDocs(collection(db, 'guestbook'));
      const batch = writeBatch(db);
      for (const d of guestbookSnap.docs) {
        const commentsSnap = await getDocs(collection(db, 'guestbook', d.id, 'comments'));
        const likesSnap = await getDocs(collection(db, 'guestbook', d.id, 'likes'));
        commentsSnap.docs.forEach(c => batch.delete(c.ref));
        likesSnap.docs.forEach(l => batch.delete(l.ref));
        batch.delete(d.ref);
      }
      await batch.commit();
      
      setShowDeleteAllMessagesModal(false);
      // Ranking is automatically refreshed by the onSnapshot listener if the tab is active
    } catch (error) {
      console.error("Error deleting all messages:", error);
      alert("Erro ao excluir todas as mensagens.");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const deleteAllPredictions = async () => {
    setIsDeletingAll(true);
    try {
      const predictionsSnap = await getDocs(collection(db, 'predictions'));
      const batch = writeBatch(db);
      for (const d of predictionsSnap.docs) {
        const commentsSnap = await getDocs(collection(db, 'predictions', d.id, 'comments'));
        const likesSnap = await getDocs(collection(db, 'predictions', d.id, 'likes'));
        commentsSnap.docs.forEach(c => batch.delete(c.ref));
        likesSnap.docs.forEach(l => batch.delete(l.ref));
        batch.delete(d.ref);
      }
      await batch.commit();
      
      setShowDeleteAllPredictionsModal(false);
      // Ranking is automatically refreshed by the onSnapshot listener if the tab is active
    } catch (error) {
      console.error("Error deleting all predictions:", error);
      alert("Erro ao excluir todas as previsões.");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const updateStatus = async (id: string, status: 'approved' | 'rejected' | 'pending') => {
    try {
      await updateDoc(doc(db, 'media', id), { status });
      // Ranking is automatically refreshed by the onSnapshot listener if the tab is active
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleDelete = (id: string) => {
    setMediaToDelete(id);
  };

  const confirmDelete = async () => {
    if (!mediaToDelete) return;
    try {
      const mediaDoc = await getDoc(doc(db, 'media', mediaToDelete));
      if (mediaDoc.exists()) {
        const mediaData = mediaDoc.data();
        if (mediaData?.driveFileId) {
          try {
            await fetch(`/api/drive/${mediaData.driveFileId}`, { method: 'DELETE' });
          } catch(e) {
            console.error(e);
          }
        }
      }
      
      const commentsSnap = await getDocs(collection(db, 'media', mediaToDelete, 'comments'));
      const likesSnap = await getDocs(collection(db, 'media', mediaToDelete, 'likes'));
      const batch = writeBatch(db);
      commentsSnap.docs.forEach(d => batch.delete(d.ref));
      likesSnap.docs.forEach(d => batch.delete(d.ref));
      batch.delete(doc(db, 'media', mediaToDelete));
      await batch.commit();
      
      setMediaToDelete(null);
      // Ranking is automatically refreshed by the onSnapshot listener if the tab is active
    } catch (error) {
      console.error("Error deleting media:", error);
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

  const toggleSelection = (id: string) => {
    setSelectedMediaIds(prev => 
      prev.includes(id) ? prev.filter(mediaId => mediaId !== id) : [...prev, id]
    );
  };

  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const confirmBulkDelete = async () => {
    for (const id of selectedMediaIds) {
      try {
        const mediaDoc = await getDoc(doc(db, 'media', id));
        if (mediaDoc.exists()) {
          const mediaData = mediaDoc.data();
          if (mediaData?.driveFileId) {
            try {
              await fetch(`/api/drive/${mediaData.driveFileId}`, { method: 'DELETE' });
            } catch(e) {}
          }
        }
        
        const commentsSnap = await getDocs(collection(db, 'media', id, 'comments'));
        const likesSnap = await getDocs(collection(db, 'media', id, 'likes'));
        const batch = writeBatch(db);
        commentsSnap.docs.forEach(d => batch.delete(d.ref));
        likesSnap.docs.forEach(d => batch.delete(d.ref));
        batch.delete(doc(db, 'media', id));
        await batch.commit();
      } catch (error) {
        console.error("Error deleting media:", error);
      }
    }
    setSelectedMediaIds([]);
    setIsSelectionMode(false);
    setShowBulkDeleteConfirm(false);
  };

  const handleBulkDelete = async () => {
    if (selectedMediaIds.length === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const [readyFilesToShare, setReadyFilesToShare] = useState<File[] | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const handleBulkShare = async () => {
    if (selectedMediaIds.length === 0) return;
    setIsSharing(true);
    try {
      const files: File[] = [];
      const itemsToShare = mediaList.filter(m => selectedMediaIds.includes(m.id));
      
      for (const media of itemsToShare) {
        const url = media.type === 'photo' ? `/api/image/${media.driveFileId}` : `/api/video/${media.driveFileId}`;
        const response = await fetch(url);
        const blob = await response.blob();
        const extension = media.type === 'photo' ? '.jpg' : '.mp4';
        files.push(new File([blob], `midia_${media.id}${extension}`, { type: blob.type }));
      }
      
      if (files.length > 0) {
        setReadyFilesToShare(files);
        setIsShareModalOpen(true);
      }
    } catch (error) {
      console.error("Error preparing files for share:", error);
      alert("Erro ao preparar arquivos para compartilhamento.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("DEBUG handleSaveSettings, settings:", settings);
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        uploadsEnabled: settings.uploadsEnabled ?? true,
        videoUploadsEnabled: settings.videoUploadsEnabled ?? true,
        requireApproval: settings.requireApproval ?? false,
        inviteCode: settings.inviteCode ?? '15ANOS',
        eventName: settings.eventName ?? '',
        eventDate: settings.eventDate ?? '',
        eventPhotoUrl: settings.eventPhotoUrl ?? '',
        eventVideoUrl: settings.eventVideoUrl ?? '',
        logoUrl: settings.logoUrl ?? '',
        bannerUrl: settings.bannerUrl ?? '',
        welcomeMessage: settings.welcomeMessage ?? '',
        welcomeMediaType: settings.welcomeMediaType ?? 'photo',
        welcomeMediaUrl: settings.welcomeMediaUrl ?? '',
        welcomeAudioUrl: settings.welcomeAudioUrl ?? '',
        welcomeTemplate: settings.welcomeTemplate ?? 'modern_gradient',
        entranceTemplate: settings.entranceTemplate ?? 'none',
        entranceAudioPreset: settings.entranceAudioPreset ?? 'none',
        entranceAudioUrl: settings.entranceAudioUrl ?? '',
        customAudioPresets: settings.customAudioPresets ?? [],
        displayBackgrounds: settings.displayBackgrounds ?? [],
        canLike: settings.canLike ?? true,
        canComment: settings.canComment ?? true,
        canShare: settings.canShare ?? true,
        canDelete: settings.canDelete ?? false,
        canFavorite: settings.canFavorite ?? false,
        canDownload: settings.canDownload ?? true,
        instagramUrl: settings.instagramUrl ?? '',
        facebookUrl: settings.facebookUrl ?? '',
        twitterUrl: settings.twitterUrl ?? ''
      }, { merge: true });
      console.log("Configurações salvas com sucesso no Firestore.");
      alert('Configurações salvas com sucesso!');
    } catch (error: any) {
      console.error("Error saving settings:", error);
      alert(`Erro ao salvar configurações: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const recalculateAllLikes = async () => {
    setIsRecalculatingLikes(true);
    setMaintenanceStats(null);
    let fixedCount = 0;
    let totalDuplicatesRemoved = 0;
    
    try {
      const mediaSnap = await getDocs(collection(db, 'media'));
      
      for (const mediaDoc of mediaSnap.docs) {
        const mediaId = mediaDoc.id;
        const likesSnap = await getDocs(collection(db, 'media', mediaId, 'likes'));
        
        const uniqueLikes = new Map<string, any>();
        const toDelete: string[] = [];

        likesSnap.docs.forEach(likeDoc => {
          const data = likeDoc.data();
          const key = data.sessionId || (data.author ? `author_${data.author}` : likeDoc.id);
          
          if (!uniqueLikes.has(key)) {
            uniqueLikes.set(key, likeDoc.id);
          } else {
            toDelete.push(likeDoc.id);
          }
        });

        if (toDelete.length > 0) {
          totalDuplicatesRemoved += toDelete.length;
          for (const duplicateId of toDelete) {
            await deleteDoc(doc(db, 'media', mediaId, 'likes', duplicateId));
          }
        }

        const correctCount = uniqueLikes.size;
        if (mediaDoc.data().likesCount !== correctCount) {
          await updateDoc(doc(db, 'media', mediaId), {
            likesCount: correctCount
          });
          fixedCount++;
        }
      }

      setMaintenanceStats({ fixed: fixedCount, removed: totalDuplicatesRemoved });
      setShowMaintenanceModal(false);
    } catch (error) {
      console.error("Erro ao recalcular curtidas:", error);
      alert('Ocorreu um erro durante a manutenção. Verifique sua conexão.');
    } finally {
      setIsRecalculatingLikes(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") === -1) {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error(`O servidor retornou um erro inesperado (não-JSON). O arquivo pode ser muito grande.`);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao fazer upload da imagem');
      }

      const data = await response.json();
      setSettings(prev => ({
        ...prev,
        eventPhotoUrl: `/api/image/${data.id}`
      }));
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      alert(`Erro ao fazer upload da foto: ${error.message}`);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  
  const handleWelcomeMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingWelcomeMedia(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") === -1) {
        throw new Error('O servidor retornou um erro inesperado.');
      }

      if (!response.ok) {
        throw new Error('Erro na resposta do servidor.');
      }

      const data = await response.json();
      setSettings(prev => ({
        ...prev,
        welcomeMediaUrl: `/api/image/${data.id}`
      }));
    } catch (error: any) {
      console.error("Error uploading welcome media:", error);
      alert(`Erro ao fazer upload: ${error.message}`);
    } finally {
      setIsUploadingWelcomeMedia(false);
    }
  };

  const handleWelcomeAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingWelcomeAudio(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") === -1) {
        throw new Error('O servidor retornou um erro inesperado.');
      }

      if (!response.ok) {
        throw new Error('Erro na resposta do servidor.');
      }

      const data = await response.json();
      setSettings(prev => ({
        ...prev,
        welcomeAudioUrl: `/api/image/${data.id}`
      }));
    } catch (error: any) {
      console.error("Error uploading welcome audio:", error);
      alert(`Erro ao fazer upload: ${error.message}`);
    } finally {
      setIsUploadingWelcomeAudio(false);
    }
  };

  const handleCustomMusicPresetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingWelcomeAudio(true); // Reusing the same loading state for simplicity or could make a new one
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") === -1) {
        throw new Error('O servidor retornou um erro inesperado.');
      }

      if (!response.ok) {
        throw new Error('Erro na resposta do servidor.');
      }

      const data = await response.json();
      
      // Add to custom presets
      const newPreset = {
        id: `custom_${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
        url: `/api/image/${data.id}`
      };
      
      setSettings(prev => ({
        ...prev,
        customAudioPresets: [...(prev.customAudioPresets || []), newPreset],
        welcomeAudioUrl: newPreset.url // Auto select the new upload
      }));
    } catch (error: any) {
      console.error("Error uploading custom music:", error);
      alert(`Erro ao fazer upload: ${error.message}`);
    } finally {
      setIsUploadingWelcomeAudio(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingVideo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") === -1) {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error(`O servidor retornou um erro inesperado (não-JSON). O arquivo pode ser muito grande.`);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao fazer upload do vídeo');
      }

      const data = await response.json();
      setSettings(prev => ({
        ...prev,
        eventVideoUrl: `/api/video/${data.id}`
      }));
    } catch (error: any) {
      console.error("Error uploading video:", error);
      alert(`Erro ao fazer upload do vídeo: ${error.message}`);
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleShareMedia = (media: Media) => {
    setMediaToShare(media);
    setIsShareModalOpen(true);
  };

  const handleDownloadMedia = async (media: Media) => {
    try {
      const url = media.type === 'photo' ? `/api/image/${media.driveFileId}` : `/api/video/${media.driveFileId}`;
      const response = await fetch(url);
      const blob = await response.blob();
      const extension = media.type === 'photo' ? 'jpg' : 'mp4';
      saveAs(blob, `${media.id}.${extension}`);
    } catch (error) {
      console.error("Error downloading media:", error);
      alert("Erro ao baixar a mídia.");
    }
  };

  const pendingMedia = mediaList.filter(m => m.status === 'pending' && !m.isHostAlbum && (m as any).isHostAlbum !== 'true');
  const approvedMedia = mediaList.filter(m => m.status === 'approved' && !m.isHostAlbum && (m as any).isHostAlbum !== 'true');
  const hostAlbumMedia = mediaList.filter(m => m.isHostAlbum === true || (m as any).isHostAlbum === 'true');

  const popularMedia = mediaList
    .filter(m => ((m.likesCount || 0) + (m.commentsCount || 0)) > 0)
    .sort((a, b) => ((b.likesCount || 0) + (b.commentsCount || 0)) - ((a.likesCount || 0) + (a.commentsCount || 0)))
    .slice(0, 50);

  const gridMedia = activeTab === 'pending' ? pendingMedia : 
                    activeTab === 'popular' ? popularMedia : 
                    approvedMedia;

  const renderMediaControls = (title: string, subtitle: string, count: number) => (
    <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center bg-white p-6 rounded-2xl shadow-sm mb-6 mt-4 gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-medium text-gray-900">{title} ({count})</h2>
          {activeTab === 'host_album' && (
            <button
              onClick={() => setIsUploadOpen(true)}
              className="btn-gold px-4 py-1.5 text-sm rounded-full font-medium flex items-center gap-2"
            >
              <ImageIcon size={14} /> Adicionar
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>
      {(activeTab === 'approved' || activeTab === 'host_album') && (
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
          {!isSelectionMode && (
            <button
              onClick={() => {
                setIsSelectionMode(true);
                setSelectedMediaIds([]);
              }}
              className="p-2 rounded-full transition-colors flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-[#D4A373]/20 hover:text-[#D4A373]"
              title="Selecionar mídias"
            >
              <CheckSquare size={18} />
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (!auth.currentUser && !isLoading) {
    return null; // Let the useEffect navigate to login
  }

  if (isLoading) {
    return (
      <Portal>
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#FAFAFA] gap-4">
          <div className="w-12 h-12 border-4 border-[#D4A373]/20 border-t-[#D4A373] rounded-full animate-spin"></div>
          <p className="text-[#D4A373] font-medium animate-pulse">Carregando painel...</p>
        </div>
      </Portal>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#FAFAFA] font-sans text-gray-800">
      
      {/* Desktop Persistent Sidebar Menu */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white border-r border-pink-100 shadow-sm sticky top-0 h-screen overflow-y-auto shrink-0 transition-all duration-300">
        <div className="p-6 border-b border-gray-100 bg-pink-50/30">
          <span className="font-montserrat font-bold text-[#D4A373] tracking-widest text-sm block mb-1">ADMINISTRAÇÃO</span>
          <span className="text-xs text-[#D4A373] font-bold block">Administrador</span>
        </div>
        
        <nav className="p-4 flex-1 overflow-y-auto flex flex-col gap-1.5 custom-scrollbar">
          {[
            { id: 'feed', label: 'Feed de Atividades', icon: <Activity size={18} className="text-blue-500" /> },
            { id: 'pending', label: `Pendentes (${pendingMedia.length})`, icon: <Clock size={18} className="text-gray-500" /> },
            { id: 'approved', label: `Aprovados (${approvedMedia.length})`, icon: <Check size={18} className="text-emerald-500" /> },
            { id: 'host_album', label: 'Álbum dos Anfitriões', icon: <Crown size={18} className="text-amber-500" /> },
            { id: 'popular', label: 'Mais Curtidas', icon: <Heart size={18} className="text-red-500" /> },
            { id: 'guestbook', label: 'Deixe um carinho', icon: <BookOpen size={18} className="text-orange-500" /> },
            { id: 'predictions', label: 'Videntes por um Dia', icon: <Sparkles size={18} className="text-teal-500" /> },
            { id: 'ranking', label: 'Os mais animados da festa', icon: <Trophy size={18} className="text-yellow-600" /> },
            { id: 'access_logs', label: 'Acessos', icon: <Users size={18} className="text-indigo-500" /> },
            { id: 'admin_manager', label: 'Usuários', icon: <Users size={18} className="text-violet-500" /> },
            { id: 'settings', label: 'Configurações', icon: <SettingsIcon size={18} className="text-gray-600" /> },
            { id: 'maintenance', label: 'Manutenção', icon: <SettingsIcon size={18} className="text-red-800" /> },
            { id: 'display', label: 'Display', icon: <ImageIcon size={18} className="text-pink-500" /> },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => changeActiveTab(tab.id as any)}
              className={`flex items-center gap-3 py-3 px-4 rounded-xl font-medium transition-all duration-200 text-left whitespace-nowrap overflow-hidden transition-all duration-300 ${activeTab === tab.id ? 'menu-btn-active' : 'menu-btn-inactive'}`}
              title={tab.label}
            >
              <div className="shrink-0">{tab.icon}</div>
              <span className="truncate">{tab.label}</span>
            </button>
          ))}

          <div className="border-t border-gray-100 mt-4 pt-4 mb-4">
            <button onClick={() => setIsLoggingOut(true)} className="flex items-center gap-3 w-full text-left text-gray-600 hover:text-red-500 hover:bg-red-50 transition-colors py-3 px-4 rounded-xl">
              <LogOut size={18} />
              <span className="font-medium">Sair do Painel</span>
            </button>
          </div>
        </nav>
      </aside>

      {isLoggingOut && <LogoutSplash onComplete={handleLogout} />}

      {/* Main Content App Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#FAFAFA]">
      
      {/* Header */}
      <header className={`bg-white/95 backdrop-blur-md sticky top-0 z-50 border-b border-[#D4A373]/10 transition-all duration-300 ${isScrolled ? 'py-2 shadow-sm' : 'py-3 sm:py-4'}`}>
        <div className="w-full px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Mobile Menu Toggle (Left) */}
            <button 
              className="p-2 -ml-2 text-gray-500 hover:text-[#D4A373] transition-colors md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={20} className="sm:w-6 sm:h-6" /> : <Menu size={20} className="sm:w-6 sm:h-6" />}
            </button>
          </div>
          
          {/* Right Side: Event Name */}
          <div className="flex items-center gap-3 ml-auto overflow-hidden">
            <div onClick={() => changeActiveTab('pending')} className="cursor-pointer flex flex-col items-end min-w-0 hover:opacity-80 transition-opacity">
              <span className="text-lg sm:text-2xl md:text-3xl font-bold text-[#D4A373] text-right font-montserrat tracking-tight sm:tracking-widest uppercase whitespace-nowrap drop-shadow-sm leading-none">
                {settings?.eventName || 'Painel Admin'}
              </span>
              <span className="text-[9px] sm:text-[11px] text-gray-400 font-bold uppercase mt-0.5 tracking-wider whitespace-nowrap">
                ADMINISTRADOR
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Collapsible Menu */}
        <div className={`md:hidden absolute top-full left-0 w-full bg-white/95 backdrop-blur-md shadow-xl transition-all duration-300 ease-in-out z-[100] ${isMenuOpen ? 'max-h-[1000px] border-b border-gray-100' : 'max-h-0 overflow-hidden'}`}>
          <div className="px-4 py-3 bg-white flex flex-col gap-1 max-h-[80vh] overflow-y-auto no-scrollbar">
            <span className="text-sm text-gray-500 font-medium border-b border-gray-100 pb-2 mb-1 px-2 shrink-0">Menu Administrativo</span>
            
            {[
              { id: 'feed', label: 'Feed de Atividades', icon: <Activity size={18} className="text-blue-500" /> },
              { id: 'pending', label: `Pendentes (${pendingMedia.length})`, icon: <Clock size={18} className="text-gray-500" /> },
              { id: 'approved', label: `Aprovados (${approvedMedia.length})`, icon: <Check size={18} className="text-emerald-500" /> },
              { id: 'host_album', label: 'Álbum dos Anfitriões', icon: <Crown size={18} className="text-amber-500" /> },
              { id: 'popular', label: 'Mais Curtidas', icon: <Heart size={18} className="text-red-500" /> },
              { id: 'guestbook', label: 'Deixe um carinho', icon: <BookOpen size={18} className="text-orange-500" /> },
              { id: 'predictions', label: 'Videntes por um Dia', icon: <Sparkles size={18} className="text-teal-500" /> },
              { id: 'ranking', label: 'Os mais animados da festa', icon: <Trophy size={18} className="text-yellow-600" /> },
              { id: 'access_logs', label: 'Acessos', icon: <Users size={18} className="text-indigo-500" /> },
              { id: 'admin_manager', label: 'Usuários', icon: <Users size={18} className="text-violet-500" /> },
              { id: 'settings', label: 'Configurações', icon: <SettingsIcon size={18} className="text-gray-600" /> },
              { id: 'maintenance', label: 'Manutenção', icon: <SettingsIcon size={18} className="text-red-800" /> },
              { id: 'display', label: 'Display', icon: <ImageIcon size={18} className="text-pink-500" /> },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => changeActiveTab(tab.id as any)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === tab.id ? 'menu-btn-active' : 'menu-btn-inactive'}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
            
            <div className="border-t border-gray-100 mt-1 pt-1 shrink-0">
              <button onClick={() => setIsLoggingOut(true)} className="flex items-center gap-2 w-full text-left text-gray-600 hover:text-red-500 hover:bg-red-50 transition-colors py-2.5 px-3 rounded-lg">
                <LogOut size={18} />
                <span className="font-medium">Sair do Painel</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Banner (Same as Gallery) */}
      <div className="relative w-full bg-white border-b border-gray-100 cursor-pointer" onClick={() => changeActiveTab('pending')}>
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
              className="w-full h-full absolute inset-0 flex items-center justify-center bg-gradient-to-r from-[#D4A373]/20 to-[#5A5A40]/20"
              style={{ display: settings?.bannerUrl || '/banner.png' ? 'none' : 'flex' }}
            >
              <div className="text-center">
                <h1 className="text-2xl sm:text-4xl font-montserrat font-bold text-[#D4A373] tracking-wider uppercase">
                  Painel Administrativo
                </h1>
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

      {/* Admin Tabs (Same style as Gallery Filters) - Hidden on desktop due to sidebar */}
      <div className="relative group md:hidden w-full overflow-hidden bg-[radial-gradient(circle_at_center,_rgba(184,138,91,0.6)_0%,_rgba(0,0,0,0.7)_150%)] backdrop-blur-xl border-b border-[#B88A5B]/40 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.6),0_4px_6px_-4px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(255,255,255,0.15),inset_0_-4px_8px_rgba(0,0,0,0.4)]">
        <div className="absolute inset-0 z-0 pointer-events-none border-t border-white/20 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1),inset_0_-6px_15px_rgba(0,0,0,0.4)]"></div>
        <div 
          ref={tabsRef} 
          className="flex w-full px-4 sm:px-6 py-4 gap-2 sm:gap-3 overflow-x-auto no-scrollbar scroll-smooth relative z-10"
        >
          {[
          { id: 'feed', label: 'Feed', icon: <Activity size={18} className="sm:w-5 sm:h-5 text-blue-500" /> },
          { id: 'pending', label: 'Pendentes', icon: <Clock size={18} className="sm:w-5 sm:h-5 text-gray-500" /> },
          { id: 'approved', label: 'Aprovados', icon: <Check size={18} className="sm:w-5 sm:h-5 text-emerald-500" /> },
          { id: 'host_album', label: 'Álbum', icon: <Crown size={18} className="sm:w-5 sm:h-5 text-amber-500" /> },
          { id: 'popular', label: 'Mais Curtidas', icon: <Heart size={18} className="sm:w-5 sm:h-5 text-red-500" /> },
          { id: 'guestbook', label: 'Mensagens', icon: <BookOpen size={18} className="sm:w-5 sm:h-5 text-orange-500" /> },
          { id: 'predictions', label: 'Previsões', icon: <Sparkles size={18} className="sm:w-5 sm:h-5 text-teal-500" /> },
          { id: 'ranking', label: 'Ranking', icon: <Trophy size={18} className="sm:w-5 sm:h-5 text-yellow-600" /> },
          { id: 'access_logs', label: 'Acessos', icon: <Users size={18} className="sm:w-5 sm:h-5 text-indigo-500" /> },
          { id: 'admin_manager', label: 'Usuários', icon: <Users size={18} className="sm:w-5 sm:h-5 text-violet-500" /> },
          { id: 'settings', label: 'Configurações', icon: <SettingsIcon size={18} className="sm:w-5 sm:h-5 text-gray-600" /> },
          { id: 'maintenance', label: 'Manutenção', icon: <SettingsIcon size={18} className="sm:w-5 sm:h-5 text-red-800" /> },
          { id: 'display', label: 'Display', icon: <ImageIcon size={18} className="sm:w-5 sm:h-5 text-pink-500" /> },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => changeActiveTab(tab.id as any)}
            data-tab-id={tab.id}
            className={`h-14 px-4 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-300 flex items-center justify-start text-left shrink-0 gap-3 ${activeTab === tab.id ? 'menu-btn-active' : 'menu-btn-inactive'}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
        </div>
      </div>

      <main className="flex-1 w-full px-4 sm:px-6 py-8">
        {activeTab === 'display' ? (
          <DisplayGenerator 
            eventName={settings?.eventName || ''} 
            eventDate={settings?.eventDate}
            inviteCode={settings?.inviteCode || ''} 
            eventPhotoUrl={settings?.eventPhotoUrl}
            customBackgrounds={settings?.displayBackgrounds || []}
            onUpdateCustomBackgrounds={async (newBg) => {
              setSettings(prev => ({...prev, displayBackgrounds: newBg}));
              try {
                await setDoc(doc(db, 'settings', 'global'), { displayBackgrounds: newBg }, { merge: true });
              } catch (e) {
                console.error('Error saving custom backgrounds', e);
              }
            }}
          />
        ) : activeTab === 'ranking' ? (
          <Ranking />
        ) : activeTab === 'admin_manager' ? (
          <div className="py-8">
            <AdminManager />
          </div>
        ) : activeTab === 'maintenance' ? (
          <div className="space-y-6">
            {/* Header de Manutenção */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-3xl shadow-sm border border-pink-50 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                 <SettingsIcon size={120} className="text-[#D4A373]" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-pink-100 text-[#D4A373] rounded-xl">
                    <SettingsIcon size={24} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 font-montserrat tracking-tight">Manutenção do Sistema</h2>
                </div>
                <p className="text-gray-600 max-w-2xl">
                  Ferramentas para garantir a integridade dos dados e organização da sua galeria de 15 anos.
                </p>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recalcular Curtidas Card */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-pink-50 text-[#D4A373] rounded-lg">
                      <Heart size={20} />
                    </div>
                    <h3 className="font-bold text-gray-900 font-montserrat">Sincronizar Curtidas</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-6">
                    Corrige contagens erradas e remove curtidas duplicadas por convidado. Execute se notar discrepância no ranking.
                  </p>
                </div>
                <button
                  onClick={() => setShowMaintenanceModal(true)}
                  disabled={isRecalculatingLikes}
                  className="w-full py-4 btn-gold rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isRecalculatingLikes ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Trophy size={18} />
                  )}
                  {isRecalculatingLikes ? 'Processando...' : 'RECALCULAR AGORA'}
                </button>
                {maintenanceStats && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-4 p-4 bg-green-50 border border-green-100 rounded-xl text-center"
                  >
                    <p className="text-green-700 font-bold text-sm">✓ Limpeza Concluída!</p>
                    <p className="text-xs text-green-600 mt-1">
                      {maintenanceStats.fixed} mídias corrigidas e {maintenanceStats.removed} duplicatas removidas.
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Download em Massa Card */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-pink-50 text-[#D4A373] rounded-lg">
                      <Download size={20} />
                    </div>
                    <h3 className="font-bold text-gray-900 font-montserrat">Download Completo</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-6">
                    Crie um arquivo ZIP com todas as fotos e vídeos que já foram aprovados para guardar de lembrança.
                  </p>
                </div>
                <button
                  onClick={handleDownloadAll}
                  disabled={isDownloading || mediaList.filter(m => m.status === 'approved').length === 0}
                  className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDownloading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Download size={18} />
                  )}
                  {isDownloading ? `${downloadProgress}%` : 'BAIXAR TUDO (ZIP)'}
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 rounded-3xl border border-red-100 p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12 pointer-events-none">
                 <Trash2 size={150} className="text-red-600" />
              </div>
              <div className="relative z-10">
                <h2 className="text-xl font-bold text-red-900 mb-6 flex items-center gap-2">
                  <Trash2 size={24} />
                  Zona de Perigo
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl border border-red-100 shadow-sm flex flex-col justify-between">
                    <div>
                      <p className="font-bold text-gray-900 mb-1 text-sm">Resetar Galeria</p>
                    </div>
                    <button 
                      onClick={() => setShowDeleteAllMediaModal(true)}
                      className="mt-4 w-full py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all font-bold text-xs"
                    >
                      EXCLUIR MÍDIAS
                    </button>
                  </div>

                  <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl border border-red-100 shadow-sm flex flex-col justify-between">
                    <div>
                      <p className="font-bold text-gray-900 mb-1 text-sm">Limpar Mural</p>
                    </div>
                    <button 
                      onClick={() => setShowDeleteAllMessagesModal(true)}
                      className="mt-4 w-full py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all font-bold text-xs"
                    >
                      EXCLUIR RECADOS
                    </button>
                  </div>

                  <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl border border-red-100 shadow-sm flex flex-col justify-between">
                    <div>
                      <p className="font-bold text-gray-900 mb-1 text-sm">Zerar Videntes</p>
                    </div>
                    <button 
                      onClick={() => setShowDeleteAllPredictionsModal(true)}
                      className="mt-4 w-full py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all font-bold text-xs"
                    >
                      ZERAR PREVISÕES
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'access_logs' ? (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-medium text-gray-900">Registros de Acesso</h2>
                <p className="text-sm text-gray-500 mt-1">Lista de convidados que acessaram a aplicação com data e horário.</p>
              </div>
              <div className="flex items-center gap-4">
                {accessLogs.length > 0 && (
                  <button
                    onClick={() => setShowClearLogsModal(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors shrink-0"
                  >
                    <Trash2 size={16} />
                    Limpar Histórico
                  </button>
                )}
              </div>
            </div>
            
            {isLoadingLogs ? (
              <div className="py-12 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : accessLogs.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Nenhum registro de acesso encontrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="py-3 px-4 font-medium text-gray-500">Convidado</th>
                      <th className="py-3 px-4 font-medium text-gray-500">Contato</th>
                      <th className="py-3 px-4 font-medium text-gray-500 text-center">Data</th>
                      <th className="py-3 px-4 font-medium text-gray-500 text-center">Horário</th>
                      <th className="py-3 px-4 font-medium text-gray-500 text-right">Sessão ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accessLogs.map((log) => (
                      <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-900">{log.guestName}</td>
                        <td className="py-3 px-4 text-gray-600">{log.contact || '-'}</td>
                        <td className="py-3 px-4 text-center text-gray-600">
                          {log.timestamp ? new Date(log.timestamp.toDate()).toLocaleDateString('pt-BR') : '...'}
                        </td>
                        <td className="py-3 px-4 text-center text-gray-600">
                          {log.timestamp ? new Date(log.timestamp.toDate()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '...'}
                        </td>
                        <td className="py-3 px-4 text-right text-xs text-gray-400 font-mono">
                          {log.sessionId.substring(0, 8)}...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'guestbook' ? (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <Guestbook isAdmin={true} />
          </div>
        ) : activeTab === 'predictions' ? (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <Predictions isAdmin={true} />
          </div>
        ) : activeTab === 'feed' ? (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <Feed isAdmin={true} />
          </div>
        ) : activeTab === 'settings' ? (
          <div className="max-w-xl bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-medium mb-6">Configurações do Evento</h2>
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código de Convite</label>
                <input
                  type="text"
                  value={settings.inviteCode}
                  onChange={(e) => setSettings({...settings, inviteCode: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 outline-none"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Os convidados precisarão deste código para acessar a galeria.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Evento / Aniversariante</label>
                <input
                  type="text"
                  value={settings.eventName || ''}
                  onChange={(e) => setSettings({...settings, eventName: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 outline-none"
                  placeholder="Ex: 15 Anos da Ana"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data e Horário do Evento</label>
                <input
                  type="datetime-local"
                  value={settings.eventDate || ''}
                  onChange={(e) => setSettings({...settings, eventDate: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 outline-none"
                />
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h3 className="font-medium text-gray-900">Redes Sociais</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instagram (URL da Rota do Perfil)</label>
                  <input
                    type="url"
                    value={settings.instagramUrl || ''}
                    onChange={(e) => setSettings({...settings, instagramUrl: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 outline-none"
                    placeholder="Ex: https://instagram.com/seu.perfil"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Facebook (URL da Página ou Perfil)</label>
                  <input
                    type="url"
                    value={settings.facebookUrl || ''}
                    onChange={(e) => setSettings({...settings, facebookUrl: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 outline-none"
                    placeholder="Ex: https://facebook.com/seu.perfil"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Twitter/X (URL do Perfil)</label>
                  <input
                    type="url"
                    value={settings.twitterUrl || ''}
                    onChange={(e) => setSettings({...settings, twitterUrl: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 outline-none"
                    placeholder="Ex: https://twitter.com/seu_perfil"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h3 className="font-medium text-gray-900">Permissões dos Convidados</h3>
                
                {[
                  { key: 'canLike', label: 'Curtir' },
                  { key: 'canComment', label: 'Comentar' },
                  { key: 'canShare', label: 'Compartilhar' },
                  { key: 'canDelete', label: 'Excluir (próprias mídias)' },
                  { key: 'canFavorite', label: 'Favoritar' },
                  { key: 'canDownload', label: 'Baixar' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-700">{label}</span>
                    <div className={`w-11 h-6 rounded-full transition-colors ${settings[key as keyof Settings] ? 'bg-green-500' : 'bg-gray-200'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${settings[key as keyof Settings] ? 'translate-x-6' : 'translate-x-0.5'} translate-y-0.5`} />
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={settings[key as keyof Settings] as boolean}
                      onChange={(e) => setSettings({...settings, [key]: e.target.checked})}
                    />
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Foto da Aniversariante</label>
                <div className="flex items-center gap-4">
                  {settings.eventPhotoUrl && (
                    <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-200 shrink-0">
                      <img src={settings.eventPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      ref={fileInputRef}
                      className="hidden"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="btn-beige px-4 py-2 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium"
                      >
                        {isUploadingPhoto ? (
                          <>
                            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                            Enviando...
                          </>
                        ) : (
                          <>
                            <ImageIcon size={16} />
                            Escolher Foto
                          </>
                        )}
                      </button>
                      {settings.eventPhotoUrl && (
                        <button
                          type="button"
                          onClick={() => setSettings({...settings, eventPhotoUrl: ''})}
                          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2 text-sm font-medium"
                        >
                          <Trash2 size={16} />
                          Remover
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Esta foto aparecerá na tela inicial para os convidados.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vídeo da Aniversariante (Opcional)</label>
                <div className="flex items-center gap-4">
                  {settings.eventVideoUrl && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 shrink-0 bg-black flex items-center justify-center">
                      <Video size={24} className="text-white/50" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      ref={videoInputRef}
                      className="hidden"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        disabled={isUploadingVideo}
                        className="btn-beige px-4 py-2 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium"
                      >
                        {isUploadingVideo ? (
                          <>
                            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Video size={16} />
                            Escolher Vídeo
                          </>
                        )}
                      </button>
                      {settings.eventVideoUrl && (
                        <button
                          type="button"
                          onClick={() => setSettings({...settings, eventVideoUrl: ''})}
                          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2 text-sm font-medium"
                        >
                          <Trash2 size={16} />
                          Remover
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Se enviado, este vídeo aparecerá na tela inicial em vez da foto.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Banner da Galeria (1080x200)</label>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        disabled={isUploadingBanner}
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = async (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (!file) return;
                            setIsUploadingBanner(true);
                            try {
                              const formData = new FormData();
                              formData.append('file', file);
                              const response = await fetch('/api/upload', {
                                method: 'POST',
                                body: formData
                              });
                              const data = await response.json();
                              const fileId = data?.driveFileId || data?.id;
                              if (fileId) {
                                setSettings({...settings, bannerUrl: `/api/image/${fileId}`});
                              }
                            } catch (error) {
                              console.error("Error uploading banner:", error);
                            } finally {
                              setIsUploadingBanner(false);
                            }
                          };
                          input.click();
                        }}
                        className="px-4 py-2 btn-gold rounded-lg flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                      >
                        <ImageIcon size={16} />
                        {isUploadingBanner ? 'Enviando...' : 'Enviar Banner'}
                      </button>
                      {settings.bannerUrl && (
                        <button
                          type="button"
                          onClick={() => setSettings({...settings, bannerUrl: ''})}
                          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2 text-sm font-medium"
                        >
                          <Trash2 size={16} />
                          Remover
                        </button>
                      )}
                    </div>
                    {settings.bannerUrl && (
                      <div className="mt-2 w-full aspect-[1080/400] rounded-lg overflow-hidden border">
                        <img src={settings.bannerUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              </div>


              <div className="space-y-4 pt-6 border-t border-gray-100">
                <h3 className="text-lg font-medium text-gray-900">Configuração do Modal de Boas-vindas</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem de Boas-vindas</label>
                  <textarea
                    value={settings.welcomeMessage || ''}
                    onChange={(e) => setSettings({...settings, welcomeMessage: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 outline-none"
                    rows={3}
                    placeholder="Ex: Muito feliz em compartilhar esse momento com vocês!"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Animação de Entrada (Antes do Modal)</label>
                    <button type="button" onClick={() => setShowEntrancePreview(true)} className="text-xs text-[#D4A373] hover:underline font-medium flex items-center gap-1">
                      <Eye size={14} /> Pré-visualizar
                    </button>
                  </div>
                  <select 
                    value={settings.entranceTemplate || 'none'}
                    onChange={(e) => setSettings({...settings, entranceTemplate: e.target.value as any})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 outline-none mb-3"
                  >
                    <option value="none">Nenhuma (Direto para o Modal)</option>
                    <option value="gift">Caixa de Presente (Aniversário)</option>
                    <option value="envelope">Envelope Elegante</option>
                    <option value="wedding_rings">Alianças (Casamento)</option>
                    <option value="party_popper">Chuva de Confetes (Festa)</option>
                    <option value="magic_dust">Pó Mágico (Infantil/Magia)</option>
                    <option value="fireworks">Fogos de Artifício</option>
                    <option value="stars">Chuva de Estrelas</option>
                    <option value="lock">Cadeado / Segredo</option>
                    <option value="music_box">Caixa de Música</option>
                    <option value="ribbon">Inauguração (Laço)</option>
                    <option value="clapperboard">Claquete (Cinema)</option>
                    <option value="ticket">Ingresso Dourado</option>
                    <option value="portal">Portal / Câmera</option>
                    <option value="book">Livro de Histórias</option>
                    <option value="crown">Coroa (Realeza)</option>
                    <option value="coffee">Momento Café</option>
                    <option value="plane">Avião / Viagem</option>
                    <option value="camera">Flash de Câmera</option>
                    <option value="idea">Ideia / Lâmpada</option>
                    <option value="compass">Bússola / Aventura</option>
                    <option value="map">Destino Especial</option>
                  </select>
                </div>

                {settings.entranceTemplate !== 'none' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">Som da Animação de Entrada</label>
                      {settings.entranceAudioPreset !== 'none' && settings.entranceAudioPreset !== 'custom' && (audioPresets[settings.entranceAudioPreset || '']?.url || settings.customAudioPresets?.find(p => p.id === settings.entranceAudioPreset)?.url) && (
                        <audio controls src={audioPresets[settings.entranceAudioPreset || '']?.url || settings.customAudioPresets?.find(p => p.id === settings.entranceAudioPreset)?.url} className="h-8 max-w-[200px]" />
                      )}
                    </div>
                    <select 
                      value={settings.entranceAudioPreset || 'none'}
                      onChange={(e) => setSettings({...settings, entranceAudioPreset: e.target.value as any})}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 outline-none"
                    >
                      <option value="none">Sem Som</option>
                      <option value="custom">Link / URL Personalizado</option>
                      {settings.customAudioPresets && settings.customAudioPresets.length > 0 && (
                        <optgroup label="Seus Modelos (Uploads)">
                          {settings.customAudioPresets.map(preset => (
                            <option key={preset.id} value={preset.id}>{preset.name}</option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="Sons Rápidos">
                        {Object.keys(audioPresets).map((preset) => (
                          <option key={preset} value={preset}>{audioPresets[preset].label}</option>
                        ))}
                      </optgroup>
                    </select>
                    {settings.entranceAudioPreset === 'custom' && (
                      <input
                        type="url"
                        placeholder="Cole o link do MP3 (ex: https://...)"
                        value={settings.entranceAudioUrl || ''}
                        onChange={(e) => setSettings({...settings, entranceAudioUrl: e.target.value})}
                        className="mt-2 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 outline-none"
                      />
                    )}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Modelo do Modal</label>
                    <button type="button" onClick={() => setShowWelcomePreview(true)} className="text-xs text-[#D4A373] hover:underline font-medium flex items-center gap-1">
                      <Eye size={14} /> Pré-visualizar
                    </button>
                  </div>
                  <select 
                    value={settings.welcomeTemplate || 'modern_gradient'}
                    onChange={(e) => setSettings({...settings, welcomeTemplate: e.target.value as any})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 outline-none"
                  >
                    <option value="modern_gradient">Moderno com Gradiente</option>
                    <option value="classic_elegant">Clássico e Elegante</option>
                    <option value="minimalist">Minimalista</option>
                    <option value="polaroid">Polaroid (Divertido)</option>
                    <option value="neon_cyberpunk">Neon Cyberpunk</option>
                    <option value="retro_arcade">Retro Arcade</option>
                    <option value="soft_clouds">Nuvens Suaves</option>
                    <option value="golden_glamour">Glamour Dourado</option>
                    <option value="nature_leaves">Folhas / Natureza</option>
                    <option value="pop_art">Pop Art Kawaii</option>
                    <option value="glassmorphism">Glassmorphism (Vidro)</option>
                    <option value="vintage_newspaper">Jornal Vintage</option>
                    <option value="ocean_breeze">Brisa do Oceano</option>
                    <option value="royal_purple">Realeza Púrpura</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Mídia</label>
                    <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-lg border">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="mediaType" value="photo" checked={(settings.welcomeMediaType || 'photo') === 'photo'} onChange={() => setSettings({...settings, welcomeMediaType: 'photo'})} />
                        <span className="text-sm">Foto</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="mediaType" value="video" checked={settings.welcomeMediaType === 'video'} onChange={() => setSettings({...settings, welcomeMediaType: 'video'})} />
                        <span className="text-sm">Vídeo</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Arquivo de Mídia do Modal ({(settings.welcomeMediaType || 'photo') === 'photo' ? 'Foto' : 'Vídeo'})</label>
                  <div className="flex items-center gap-4">
                    {settings.welcomeMediaUrl && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 shrink-0 bg-gray-100 flex items-center justify-center">
                        {(settings.welcomeMediaType || 'photo') === 'photo' ? (
                          <img src={settings.welcomeMediaUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          settings.welcomeMediaUrl ? <video src={settings.welcomeMediaUrl} className="w-full h-full object-cover" muted playsInline /> : <Video size={24} className="text-gray-400" />
                        )}
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept={(settings.welcomeMediaType || 'photo') === 'photo' ? "image/*" : "video/*"}
                        onChange={handleWelcomeMediaUpload}
                        className="hidden"
                        id="upload-welcome-media"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => document.getElementById('upload-welcome-media')?.click()}
                          disabled={isUploadingWelcomeMedia}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm font-medium"
                        >
                          {isUploadingWelcomeMedia ? 'Enviando...' : 'Escolher Arquivo'}
                        </button>
                        {settings.welcomeMediaUrl && (
                          <button
                            type="button"
                            onClick={() => setSettings({...settings, welcomeMediaUrl: ''})}
                            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Música / Áudio Automático (Opcional)</label>
                  </div>
                  <div className="flex flex-col gap-3">
                    <select
                      value={
                         !settings.welcomeAudioUrl || settings.welcomeAudioUrl.trim() === '' ? 'none' :
                         (Object.values(musicPresets).some(p => p.url === settings.welcomeAudioUrl) || settings.customAudioPresets?.some(p => p.url === settings.welcomeAudioUrl)) ? settings.welcomeAudioUrl : 'custom'
                      }
                      onChange={(e) => {
                        if (e.target.value === 'none') {
                          setSettings({...settings, welcomeAudioUrl: ''});
                        } else if (e.target.value === 'custom') {
                          setSettings({...settings, welcomeAudioUrl: ' '}); // Space triggers custom edit
                        } else {
                          setSettings({...settings, welcomeAudioUrl: e.target.value});
                        }
                      }}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 outline-none"
                    >
                      <option value="none">Sem Música</option>
                      <option value="custom">Link Personalizado via URL</option>
                      {settings.customAudioPresets && settings.customAudioPresets.length > 0 && (
                        <optgroup label="Seus Modelos (Uploads)">
                          {settings.customAudioPresets.map(preset => (
                            <option key={preset.id} value={preset.url}>{preset.name}</option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="Selecione um Estilo ou Playlist">
                        {Object.keys(musicPresets).map(preset => (
                          <option key={preset} value={musicPresets[preset].url}>{musicPresets[preset].label}</option>
                        ))}
                      </optgroup>
                    </select>
                    
                    {settings.welcomeAudioUrl !== '' && !Object.values(musicPresets).find(p => p.url === settings.welcomeAudioUrl) && !settings.customAudioPresets?.find(p => p.url === settings.welcomeAudioUrl) && (
                       <input
                         type="url"
                         placeholder="Ou cole o link de um MP3 (ex: https://...)"
                         value={settings.welcomeAudioUrl?.trim() === '' ? '' : settings.welcomeAudioUrl}
                         onChange={(e) => setSettings({...settings, welcomeAudioUrl: e.target.value})}
                         className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 outline-none"
                       />
                    )}

                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={handleCustomMusicPresetUpload}
                          className="hidden"
                          id="upload-welcome-audio"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => document.getElementById('upload-welcome-audio')?.click()}
                            disabled={isUploadingWelcomeAudio}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm font-medium"
                          >
                            {isUploadingWelcomeAudio ? 'Enviando e Salvando Modelo...' : 'Fazer Upload e Salvar como Modelo'}
                          </button>
                          {!isRecordingAudio ? (
                            <button
                              type="button"
                              onClick={startRecordingWelcomeAudio}
                              disabled={isUploadingWelcomeAudio}
                              className="px-4 py-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors flex items-center gap-2 text-sm font-medium"
                            >
                              Gravar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={stopRecordingWelcomeAudio}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 animate-pulse transition-colors flex items-center gap-2 text-sm font-medium"
                            >
                              Parar Gravação
                            </button>
                          )}
                          {settings.welcomeAudioUrl && (
                            <button
                              type="button"
                              onClick={() => setSettings({...settings, welcomeAudioUrl: ''})}
                              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {settings.welcomeAudioUrl && (
                    <audio controls src={settings.welcomeAudioUrl} className="mt-2 h-8 w-full max-w-xs" />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                <div>
                  <p className="font-medium text-gray-900">Permitir Uploads</p>
                  <p className="text-sm text-gray-500">Convidados podem enviar novas fotos/vídeos</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={settings.uploadsEnabled}
                    onChange={(e) => setSettings({...settings, uploadsEnabled: e.target.checked})}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                <div>
                  <p className="font-medium text-gray-900">Permitir Vídeos</p>
                  <p className="text-sm text-gray-500">Convidados podem enviar vídeos (além de fotos)</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={settings.videoUploadsEnabled}
                    onChange={(e) => setSettings({...settings, videoUploadsEnabled: e.target.checked})}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                <div>
                  <p className="font-medium text-gray-900">Aprovação Manual</p>
                  <p className="text-sm text-gray-500">Mídias precisam ser aprovadas antes de aparecer na galeria</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={settings.requireApproval}
                    onChange={(e) => setSettings({...settings, requireApproval: e.target.checked})}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                </label>
              </div>

              <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-xl border">
                <p className="font-medium text-gray-900 mb-4">QR Code de Convite</p>
                <div className="bg-white p-4 rounded-xl shadow-sm mb-4">
                  <QRCodeSVG 
                    value={`https://app.picphotoshare.com.br/?invite=${settings.inviteCode}`} 
                    size={200}
                  />
                </div>
                
                {/* Hidden High Res QR Code */}
                <div ref={highResQrRef} className="hidden">
                  <QRCodeCanvas 
                    value={`https://app.picphotoshare.com.br/?invite=${settings.inviteCode}`} 
                    size={1024}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                <button
                  type="button"
                  onClick={downloadHighResQRCode}
                  className="mb-4 flex items-center gap-2 px-4 py-2 btn-beige rounded-lg text-sm font-medium"
                >
                  <Download size={16} />
                  Baixar QR Code (Alta Resolução)
                </button>

                <p className="text-sm text-gray-500 text-center">
                  Os convidados podem escanear este código para acessar a galeria automaticamente, sem precisar digitar o código.
                </p>
              </div>

              <button 
                id="save-settings-btn"
                type="submit" 
                disabled={isSaving}
                className="w-full btn-gold rounded-lg py-3 font-medium disabled:opacity-50"
              >
                {isSaving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </form>
          </div>
        ) : activeTab === 'host_album' ? (
          <div className="space-y-6">
            {renderMediaControls('Álbum dos Anfitriões', 'Fotos e vídeos exclusivos postados por você.', hostAlbumMedia.length)}
            
            {isSlideshowMode ? (
              <Slideshow media={hostAlbumMedia} />
            ) : (
            <>
            <div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8"
            >
              {hostAlbumMedia.map(media => (
                <div key={media.id} className={`bg-gradient-to-b from-[#FFFDF9] to-[#FEF6EB] shadow-[0_12px_30px_-10px_rgba(212,163,115,0.4),0_4px_6px_-4px_rgba(212,163,115,0.2)] border border-[#E8D1B5]/60 hover:shadow-[0_20px_40px_-10px_rgba(212,163,115,0.5),0_8px_12px_-6px_rgba(212,163,115,0.3)] hover:-translate-y-1 rounded-3xl overflow-hidden flex flex-col transition-all duration-300 relative group/card ${isSelectionMode && selectedMediaIds.includes(media.id) ? 'ring-4 ring-[#D4A373]' : ''}`}>
                  <div className="absolute inset-0 z-20 pointer-events-none rounded-3xl border-t-2 border-white/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4),inset_0_-6px_15px_rgba(212,163,115,0.25)] transition-all duration-500 group-hover/card:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6),inset_0_-6px_20px_rgba(212,163,115,0.4)]"></div>
                  <div 
                    className="relative aspect-[3/4] bg-gray-100 cursor-pointer group"
                    onClick={() => isSelectionMode ? toggleSelection(media.id) : setSelectedMedia(media)}
                  >
                    {isSelectionMode && (
                      <div className="absolute top-3 left-3 z-20">
                        <div className={`w-8 h-8 rounded-full border-[3px] flex items-center justify-center transition-all shadow-md ${selectedMediaIds.includes(media.id) ? 'bg-[#D4A373] border-[#D4A373]' : 'bg-black/20 border-white backdrop-blur-md'}`}>
                          {selectedMediaIds.includes(media.id) && <Check size={16} strokeWidth={3} className="text-white" />}
                        </div>
                      </div>
                    )}
                    {media.type === 'photo' ? (
                      <motion.img 
                        layoutId={`media-${media.id}`}
                        src={`/api/image/${media?.driveFileId}`} 
                        alt={media.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center group-hover:scale-105 transition-transform duration-500 relative bg-gray-900">
                        {media.thumbnailLink ? (
                          <motion.img 
                            layoutId={`media-${media.id}`}
                            src={media.thumbnailLink.replace('=s220', '=s1000')} 
                            alt={media.title} 
                            className="w-full h-full object-cover opacity-80"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          (media?.driveViewLink?.includes('firebasestorage') || media?.driveFileId) && (
                            <motion.video 
                              layoutId={`media-${media.id}`}
                              src={media?.driveViewLink?.includes('firebasestorage') ? media.driveViewLink : `/api/video/${media?.driveFileId}#t=0.5`} 
                              className="w-full h-full object-cover opacity-80"
                              preload="metadata"
                            />
                          )
                        )}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-14 h-14 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-lg">
                            <Play size={24} className="ml-1" />
                          </div>
                        </div>
                      </div>
                    )}
                    {media.isHostAlbum && (
                      <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-amber-500 text-white text-[10px] font-bold rounded-full shadow-sm flex items-center gap-1">
                        <Crown size={10} /> Álbum Anfitrião
                      </div>
                    )}
                    
                    <div className="absolute top-4 right-4 flex flex-col gap-2">
                      <div className={`p-2 rounded-full backdrop-blur-md shadow-md ${media.status === 'approved' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                        {media.status === 'approved' ? <Eye size={16} /> : <EyeOff size={16} />}
                      </div>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDownloadMedia(media); }}
                          className="flex-1 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-2 rounded-xl flex items-center justify-center transition-colors"
                          title="Baixar"
                        >
                          <Download size={18} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleShareMedia(media); }}
                          className="flex-1 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-2 rounded-xl flex items-center justify-center transition-colors"
                          title="Compartilhar"
                        >
                          <Share2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-bold text-gray-900 truncate">Você (Anfitrião)</p>
                      <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                        {media.timestamp ? new Date(media.timestamp.toDate()).toLocaleDateString('pt-BR') : '...'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mb-4 text-xs font-medium text-gray-500">
                      <div className="flex items-center gap-1"><Heart size={14} className="text-gray-400" /> {media.likesCount || 0}</div>
                      <div className="flex items-center gap-1"><MessageCircle size={14} className="text-gray-400" /> {(media as any)?.commentsCount || 0}</div>
                    </div>
                    
                    <div className="mt-auto pt-4 border-t grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => updateStatus(media.id, media.status === 'approved' ? 'pending' : 'approved')}
                        className={`p-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-colors ${media.status === 'approved' ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                      >
                        {media.status === 'approved' ? <><EyeOff size={16} /> Ocultar</> : <><Eye size={16} /> Mostrar</>}
                      </button>
                      <button 
                        onClick={() => handleDelete(media.id)}
                        className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-colors border border-transparent hover:border-red-100"
                        title="Excluir"
                      >
                        <Trash2 size={16} /> Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </>
            )}
            
            {hostAlbumMedia.length === 0 && (
              <div className="col-span-full w-full">
                <EmptyState 
                  icon={ImageIcon}
                  title="Nenhuma mídia no Álbum dos Anfitriões."
                  description="Adicione fotos e vídeos para compartilhar com os convidados."
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {renderMediaControls(
              activeTab === 'pending' ? 'Mídias Pendentes' : activeTab === 'popular' ? 'Mais Curtidas' : 'Mídias',
              'Gerencie as mídias dos convidados.',
              gridMedia.length
            )}
            {isSlideshowMode ? (
              <Slideshow media={gridMedia} />
            ) : (
            <>
            <ScrollDots containerRef={mediaListRef} itemCount={gridMedia.length} />
            <div 
              ref={mediaListRef}
              className="flex overflow-x-auto sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8 snap-x snap-mandatory no-scrollbar"
            >
              {gridMedia.map(media => (
                <div key={media.id} className={`bg-gradient-to-b from-[#FFFDF9] to-[#FEF6EB] shadow-[0_12px_30px_-10px_rgba(212,163,115,0.4),0_4px_6px_-4px_rgba(212,163,115,0.2)] border border-[#E8D1B5]/60 hover:shadow-[0_20px_40px_-10px_rgba(212,163,115,0.5),0_8px_12px_-6px_rgba(212,163,115,0.3)] hover:-translate-y-1 rounded-3xl overflow-hidden flex flex-col transition-all duration-300 relative group/card shrink-0 w-64 sm:w-auto snap-center ${isSelectionMode && selectedMediaIds.includes(media.id) ? 'ring-4 ring-[#D4A373]' : ''}`}>
                  <div className="absolute inset-0 z-20 pointer-events-none rounded-3xl border-t-2 border-white/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4),inset_0_-6px_15px_rgba(212,163,115,0.25)] transition-all duration-500 group-hover/card:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6),inset_0_-6px_20px_rgba(212,163,115,0.4)]"></div>
                  <div 
                    className="relative aspect-[3/4] bg-gray-100 cursor-pointer group"
                    onClick={() => isSelectionMode ? toggleSelection(media.id) : setSelectedMedia(media)}
                  >
                    {isSelectionMode && (
                      <div className="absolute top-3 left-3 z-20">
                        <div className={`w-8 h-8 rounded-full border-[3px] flex items-center justify-center transition-all shadow-md ${selectedMediaIds.includes(media.id) ? 'bg-[#D4A373] border-[#D4A373]' : 'bg-black/20 border-white backdrop-blur-md'}`}>
                          {selectedMediaIds.includes(media.id) && <Check size={16} strokeWidth={3} className="text-white" />}
                        </div>
                      </div>
                    )}
                    {media.type === 'photo' ? (
                      <motion.img 
                        layoutId={`media-${media.id}`}
                        src={`/api/image/${media?.driveFileId}`} 
                        alt={media.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center group-hover:scale-105 transition-transform duration-500 relative bg-gray-900">
                        {media.thumbnailLink ? (
                          <motion.img 
                            layoutId={`media-${media.id}`}
                            src={media.thumbnailLink.replace('=s220', '=s1000')} 
                            alt={media.title} 
                            className="w-full h-full object-cover opacity-80"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          (media?.driveViewLink?.includes('firebasestorage') || media?.driveFileId) && (
                            <motion.video 
                              layoutId={`media-${media.id}`}
                              src={media?.driveViewLink?.includes('firebasestorage') ? media.driveViewLink : `/api/video/${media?.driveFileId}#t=0.5`} 
                              className="w-full h-full object-cover opacity-80"
                              preload="metadata"
                            />
                          )
                        )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-lg">
                          <Play size={24} className="ml-1" />
                        </div>
                      </div>
                    </div>
                  )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex items-end p-4">
                      <span className="text-white text-sm font-medium">Ver Detalhes</span>
                    </div>
                  </div>
                  {media.isHostAlbum && (
                    <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-amber-500 text-white text-[10px] font-bold rounded-full shadow-sm flex items-center gap-1">
                      <Crown size={10} /> Álbum Anfitrião
                    </div>
                  )}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-bold text-gray-900 truncate">{media.author}</p>
                    <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                      {media.timestamp ? new Date(media.timestamp.toDate()).toLocaleDateString('pt-BR') : '...'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-4 text-xs font-medium text-gray-500">
                    <div className="flex items-center gap-1"><Heart size={14} className="text-gray-400" /> {media.likesCount || 0}</div>
                    <div className="flex items-center gap-1"><MessageCircle size={14} className="text-gray-400" /> {(media as any)?.commentsCount || 0}</div>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t grid grid-cols-2 gap-2">
                    {media.status === 'pending' ? (
                      <>
                        <button 
                          onClick={() => updateStatus(media.id, 'approved')}
                          className="flex-1 bg-green-50 text-green-600 py-2.5 rounded-xl text-sm font-bold hover:bg-green-100 flex items-center justify-center gap-1 transition-colors shadow-sm"
                        >
                          <Check size={16} /> Sim
                        </button>
                        <button 
                          onClick={() => updateStatus(media.id, 'rejected')}
                          className="flex-1 bg-red-50 text-red-600 py-2.5 rounded-xl text-sm font-bold hover:bg-red-100 flex items-center justify-center gap-1 transition-colors shadow-sm"
                        >
                          <X size={16} /> Não
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => updateStatus(media.id, 'pending')}
                          className="flex-1 bg-amber-50 text-amber-600 py-2.5 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-1"
                          title="Ocultar da Galeria"
                        >
                          <EyeOff size={16} /> Ocultar
                        </button>
                        <div className="flex gap-1 items-center">
                          <button 
                            onClick={() => handleDownloadMedia(media)}
                            className="btn-beige p-2.5 rounded-xl transition-colors"
                            title="Baixar"
                          >
                            <Download size={18} />
                          </button>
                          <button 
                            onClick={() => handleShareMedia(media)}
                            className="btn-beige p-2.5 rounded-xl transition-colors"
                            title="Compartilhar"
                          >
                            <Share2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(media.id)}
                            className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            </div>
            </>
            )}
            
            {gridMedia.length === 0 && (
              <div className="col-span-full w-full">
                <EmptyState 
                  icon={ImageIcon}
                  title="Nenhuma mídia encontrada nesta categoria."
                />
              </div>
            )}
          </div>
        )}
    </main>

      {isUploadOpen && (
        <UploadModal onClose={() => setIsUploadOpen(false)} isHostAlbum={true} />
      )}

      <AnimatePresence>
        {selectedMedia && (
          <MediaViewer 
            media={selectedMedia} 
            onClose={() => setSelectedMedia(null)} 
            settings={settings}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      {mediaToDelete && (
        <Portal>
        <div className="fixed inset-0 z-[10000] overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={() => setMediaToDelete(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
              <h3 className="text-xl font-montserrat font-bold text-gray-800 mb-2">Excluir Mídia</h3>
            <p className="text-gray-600 mb-6">Tem certeza que deseja excluir esta mídia permanentemente?</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setMediaToDelete(null)}
                className="btn-beige px-5 py-2.5 rounded-full font-medium"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
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

      {/* Delete All Media Modal */}
      {showDeleteAllMediaModal && (
        <Portal>
        <div className="fixed inset-0 z-[10000] overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowDeleteAllMediaModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
              <h3 className="text-xl font-montserrat font-bold text-red-600 mb-2">Excluir Tudo?</h3>
            <p className="text-gray-600 mb-6">
              Esta ação apagará <strong>todas as fotos e vídeos</strong> permanentemente, além de limpar os registros que geram o ranking. 
              <strong>Não há como desfazer!</strong>
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowDeleteAllMediaModal(false)}
                className="btn-beige px-5 py-2.5 rounded-full font-medium"
                disabled={isDeletingAll}
              >
                Cancelar
              </button>
              <button 
                onClick={deleteAllMedia}
                disabled={isDeletingAll}
                className="px-5 py-2.5 rounded-full bg-red-500 text-white font-medium hover:bg-red-600 transition-colors shadow-md shadow-red-500/20 flex items-center gap-2"
              >
                {isDeletingAll ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Excluindo...
                  </>
                ) : (
                  'Confirmar Exclusão'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      </Portal>
      )}

      {/* Delete All Messages Modal */}
      {showDeleteAllMessagesModal && (
        <Portal>
        <div className="fixed inset-0 z-[10000] overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowDeleteAllMessagesModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
              <h3 className="text-xl font-montserrat font-bold text-red-600 mb-2">Limpar Mensagens?</h3>
            <p className="text-gray-600 mb-6">
              Todas as mensagens dos convidados serão removidas permanentemente.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowDeleteAllMessagesModal(false)}
                className="btn-beige px-5 py-2.5 rounded-full font-medium"
                disabled={isDeletingAll}
              >
                Cancelar
              </button>
              <button 
                onClick={deleteAllMessages}
                disabled={isDeletingAll}
                className="px-5 py-2.5 rounded-full bg-red-500 text-white font-medium hover:bg-red-600 transition-colors shadow-md shadow-red-500/20 flex items-center gap-2"
              >
                {isDeletingAll ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Limpando...
                  </>
                ) : (
                  'Confirmar Limpeza'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      </Portal>
      )}
      {/* Delete All Predictions Modal */}
      {showDeleteAllPredictionsModal && (
        <Portal>
        <div className="fixed inset-0 z-[10000] overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowDeleteAllPredictionsModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
              <h3 className="text-xl font-montserrat font-bold text-red-600 mb-2">Limpar Videntes?</h3>
            <p className="text-gray-600 mb-6">
              Todas as previsões dos videntes serão removidas permanentemente.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowDeleteAllPredictionsModal(false)}
                className="btn-beige px-5 py-2.5 rounded-full font-medium"
                disabled={isDeletingAll}
              >
                Cancelar
              </button>
              <button 
                onClick={deleteAllPredictions}
                disabled={isDeletingAll}
                className="px-5 py-2.5 rounded-full bg-red-500 text-white font-medium hover:bg-red-600 transition-colors shadow-md shadow-red-500/20 flex items-center gap-2"
              >
                {isDeletingAll ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Limpando...
                  </>
                ) : (
                  'Confirmar Limpeza'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      </Portal>
      )}

      {showClearLogsModal && (
        <Portal>
        <div className="fixed inset-0 z-[10000] overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowClearLogsModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
              <h3 className="text-xl font-montserrat font-bold text-gray-800 mb-2">Limpar Histórico</h3>
            <p className="text-gray-600 mb-6">Tem certeza que deseja limpar todo o histórico de acessos? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowClearLogsModal(false)}
                className="btn-beige px-5 py-2.5 rounded-full font-medium"
                disabled={isLoadingLogs}
              >
                Cancelar
              </button>
              <button 
                onClick={clearAccessLogs}
                disabled={isLoadingLogs}
                className="px-5 py-2.5 rounded-full bg-red-500 text-white font-medium hover:bg-red-600 transition-colors shadow-md shadow-red-500/20 flex items-center gap-2"
              >
                {isLoadingLogs ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Limpando...
                  </>
                ) : (
                  'Confirmar Limpeza'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      </Portal>
      )}
      <Footer />
      </div>

      {isSelectionMode && selectedMediaIds.length > 0 && (
        <div className="fixed top-[120px] left-1/2 -translate-x-1/2 z-[100] pointer-events-auto w-auto max-w-[90vw]">
          <div className="bg-gray-900/95 backdrop-blur-md shadow-2xl rounded-2xl p-3 flex items-center gap-3 sm:gap-4 animate-in slide-in-from-top-4 border border-white/10">
            <div className="flex items-center gap-2 sm:gap-3 pr-3 sm:pr-4 border-r border-white/20">
              <button 
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedMediaIds([]);
                }}
                className="p-1.5 sm:p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition"
              >
                <X size={16} className="sm:w-4 sm:h-4" />
              </button>
              <span className="font-semibold text-white whitespace-nowrap text-sm sm:text-base">
                {selectedMediaIds.length} <span className="hidden sm:inline">selecionados</span>
              </span>
            </div>

            <div className="flex gap-1.5 sm:gap-2">
              <button
                onClick={handleBulkShare}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition font-medium text-xs sm:text-sm"
              >
                <Share2 size={16} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Compartilhar</span>
              </button>
              
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-red-500/20 hover:bg-red-500/30 text-red-100 rounded-xl transition font-medium text-xs sm:text-sm"
              >
                <Trash2 size={16} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Excluir</span>
              </button>
            </div>
          </div>
        </div>
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
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          files: readyFilesToShare,
                          title: 'Mídias do Evento',
                          text: 'Confira as mídias do evento!'
                        }).catch(console.error);
                      } else {
                        alert("O compartilhamento de arquivos não é totalmente suportado neste navegador. Eles foram preparados, mas precisarão ser baixados manualmente.");
                        readyFilesToShare.forEach(f => saveAs(f));
                      }
                    }}
                    className="w-full bg-[#D4A373] text-white py-3 rounded-xl font-medium shadow-md hover:bg-[#c39162] transition-colors"
                  >
                    Compartilhar arquivos
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

      {showMaintenanceModal && (
        <Portal>
        <div className="fixed inset-0 z-[10000] overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowMaintenanceModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[32px] p-8 max-w-sm w-full text-center shadow-2xl relative"
            >
            <div className="w-20 h-20 bg-pink-50 rounded-3xl flex items-center justify-center text-[#D4A373] mx-auto mb-6">
              <Heart size={40} className="animate-pulse" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2 font-montserrat tracking-tight">Sincronizar Curtidas?</h3>
            <p className="text-gray-600 mb-8 text-sm leading-relaxed">
              Isso fará uma varredura em todas as mídias para corrigir contagens duplicadas e sincronizar o ranking.
            </p>
            <div className="flex flex-col gap-3">
              <button
                disabled={isRecalculatingLikes}
                onClick={recalculateAllLikes}
                className="w-full py-4 btn-gold rounded-2xl font-bold flex items-center justify-center gap-2"
              >
                {isRecalculatingLikes ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Sincronizando...
                  </>
                ) : 'SIM, INICIAR AGORA'}
              </button>
              <button
                disabled={isRecalculatingLikes}
                onClick={() => setShowMaintenanceModal(false)}
                className="btn-beige w-full py-3 rounded-2xl font-medium"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      </div>
      </Portal>
      )}

      {mediaToShare && (
        <ShareModal 
          isOpen={isShareModalOpen} 
          onClose={() => { setIsShareModalOpen(false); setMediaToShare(null); }}
          url={`${window.location.origin}/?ids=${mediaToShare.id}`}
          title={`Confira esta ${mediaToShare.type === 'photo' ? 'foto' : 'vídeo'} de ${mediaToShare.author}!`}
          mediaUrl={mediaToShare.driveViewLink?.includes('firebasestorage') ? mediaToShare.driveViewLink : (mediaToShare.driveFileId ? `/api/${mediaToShare.type === 'video' ? 'video' : 'image'}/${mediaToShare.driveFileId}` : undefined)}
          mediaType={mediaToShare.type}
        />
      )}

      {showEntrancePreview && settings && (
        <>
          <EntranceScreen settings={settings} onEnter={() => setShowEntrancePreview(false)} />
          <Portal>
             <button
                onClick={() => setShowEntrancePreview(false)}
                className="fixed top-4 right-4 z-[100000] p-2 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white transition-all"
                title="Fechar Preview"
              >
                <X size={24} />
             </button>
          </Portal>
        </>
      )}

      {showWelcomePreview && settings && (
        <WelcomeModal onClose={() => setShowWelcomePreview(false)} settings={settings} guestName="Administrador" />
      )}

      {showBulkDeleteConfirm && (
        <Portal>
          <div className="fixed inset-0 z-[10000] overflow-y-auto">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowBulkDeleteConfirm(false)} />
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
                <h3 className="text-xl font-serif text-gray-800 mb-2">Confirmar Exclusão</h3>
                <p className="text-gray-600 mb-6">
                  Tem certeza que deseja excluir {selectedMediaIds.length} item(ns) permanentemente?
                </p>
                <div className="flex gap-3 justify-end">
                  <button 
                    onClick={() => setShowBulkDeleteConfirm(false)}
                    className="btn-beige px-5 py-2.5 rounded-full font-medium"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmBulkDelete}
                    className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-full font-medium transition-colors"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

    </div>
  );
}
