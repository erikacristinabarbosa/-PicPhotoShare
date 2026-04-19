import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDoc, setDoc, collectionGroup, getDocs, where, writeBatch } from 'firebase/firestore';
import { Media, Settings, UserLog } from '../types';
import { LogOut, Check, X, Trash2, Settings as SettingsIcon, Image as ImageIcon, Video, Play, Download, BarChart2, Menu, Trophy, Clock, Crown, BookOpen, Sparkles, Users, Share2, Eye, EyeOff, Lock } from 'lucide-react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import MediaViewer from './MediaViewer';
import DisplayGenerator from './DisplayGenerator';
import Footer from './Footer';
import UploadModal from './UploadModal';
import ShareModal from './ShareModal';

import Guestbook from './Guestbook';
import Predictions from './Predictions';
import Ranking from './Ranking';
import EmptyState from './EmptyState';
import ScrollDots from './ScrollDots';
import AdminManager from './AdminManager';

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
    canDownload: true
  });
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'settings' | 'guestbook' | 'dashboard' | 'display' | 'host_album' | 'predictions' | 'ranking' | 'access_logs' | 'admin_manager'>('pending');
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [ranking, setRanking] = useState<{name: string, photos: number, likes: number, comments: number, total: number}[]>([]);
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
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
            canLike: data.canLike ?? true,
            canComment: data.canComment ?? true,
            canShare: data.canShare ?? true,
            canDelete: data.canDelete ?? false,
            canFavorite: data.canFavorite ?? false,
            canDownload: data.canDownload ?? true
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

    if (activeTab === 'dashboard' || activeTab === 'ranking') {
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

          const updateStats = (sessionId: string | undefined, authorName: string | undefined, type: 'photos' | 'comments', avatarData?: { driveFileId?: string, thumbnailLink?: string }) => {
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

            if (avatarData && !userStats[normName].avatarUrl) {
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
            updateStats(data.authorSessionId, data.author, 'comments', { driveFileId: data.driveFileId, thumbnailLink: data.thumbnailLink });
          });

          // 3.5 Predictions
          currentPredictions.forEach(doc => {
            const data = doc.data() as any;
            updateStats(data.authorSessionId, data.author, 'comments', { driveFileId: data.driveFileId, thumbnailLink: data.thumbnailLink });
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
            .filter(stat => stat.name.toLowerCase() !== 'anônimo')
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
      
      rankingUnsubs.push(onSnapshot(query(collection(db, 'media'), where('status', '==', 'approved')), snapshot => { currentMedia = snapshot.docs; handleUpdate(); }));
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
        if (data.driveFileId) {
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
      guestbookSnap.docs.forEach(d => batch.delete(d.ref));
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
      predictionsSnap.docs.forEach(d => batch.delete(d.ref));
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
        if (mediaData.driveFileId) {
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
        canLike: settings.canLike ?? true,
        canComment: settings.canComment ?? true,
        canShare: settings.canShare ?? true,
        canDelete: settings.canDelete ?? false,
        canFavorite: settings.canFavorite ?? false,
        canDownload: settings.canDownload ?? true
      });
      console.log("Configurações salvas com sucesso no Firestore.");
      alert('Configurações salvas com sucesso!');
    } catch (error: any) {
      console.error("Error saving settings:", error);
      alert(`Erro ao salvar configurações: ${error.message}`);
    } finally {
      setIsSaving(false);
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

  const pendingMedia = mediaList.filter(m => m.status === 'pending');
  const approvedMedia = mediaList.filter(m => m.status === 'approved' && !m.isHostAlbum);
  const hostAlbumMedia = mediaList.filter(m => m.isHostAlbum);

  if (!auth.currentUser && !isLoading) {
    return null; // Let the useEffect navigate to login
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] gap-4">
        <div className="w-12 h-12 border-4 border-[#D4A373]/20 border-t-[#D4A373] rounded-full animate-spin"></div>
        <p className="text-[#D4A373] font-medium animate-pulse">Carregando painel...</p>
      </div>
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
            { id: 'pending', label: `Pendentes (${pendingMedia.length})`, icon: <Clock size={18} /> },
            { id: 'approved', label: `Aprovados (${approvedMedia.length})`, icon: <Check size={18} /> },
            { id: 'host_album', label: 'Álbum dos Anfitriões', icon: <Crown size={18} /> },
            { id: 'guestbook', label: 'Deixe um carinho', icon: <BookOpen size={18} /> },
            { id: 'predictions', label: 'Videntes por um Dia', icon: <Sparkles size={18} /> },
            { id: 'ranking', label: 'Os mais animados da festa', icon: <Trophy size={18} /> },
            { id: 'access_logs', label: 'Acessos', icon: <Users size={18} /> },
            { id: 'admin_manager', label: 'Administradores', icon: <Lock size={18} /> },
            { id: 'settings', label: 'Configurações', icon: <SettingsIcon size={18} /> },
            { id: 'dashboard', label: 'Dashboard', icon: <BarChart2 size={18} /> },
            { id: 'display', label: 'Display', icon: <ImageIcon size={18} /> },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setIsMenuOpen(false); }}
              className={`flex items-center gap-3 py-3 px-4 rounded-xl font-medium transition-all duration-200 text-left ${activeTab === tab.id ? 'bg-[#D4A373] text-white shadow-md shadow-[#D4A373]/20 scale-[1.02]' : 'text-gray-600 hover:bg-pink-50 hover:text-[#D4A373]'}`}
            >
              <div className={activeTab === tab.id ? 'text-white' : 'text-gray-400'}>{tab.icon}</div>
              {tab.label}
            </button>
          ))}

          <div className="border-t border-gray-100 mt-4 pt-4 mb-4">
            <button onClick={handleLogout} className="flex items-center gap-3 w-full text-left text-gray-600 hover:text-red-500 hover:bg-red-50 transition-colors py-3 px-4 rounded-xl">
              <LogOut size={18} />
              <span className="font-medium">Sair do Painel</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content App Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#FAFAFA]">
      
      {/* Header */}
      <header className={`bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-pink-100/50 transition-all duration-300 py-4`}>
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
                {settings?.eventName || 'Painel Admin'}
              </span>
              <span className="text-[8px] sm:text-[10px] text-[#D4A373] font-bold uppercase mt-1">
                Administrador
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Collapsible Menu */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${isMenuOpen ? 'max-h-[800px] border-t border-gray-100 mt-2 shadow-inner' : 'max-h-0'}`}>
          <div className="px-4 py-3 bg-white flex flex-col gap-1">
            <span className="text-sm text-gray-500 font-medium border-b border-gray-100 pb-2 mb-1 px-2">Menu Administrativo</span>
            
            {[
              { id: 'pending', label: `Pendentes (${pendingMedia.length})`, icon: <Clock size={18} /> },
              { id: 'approved', label: `Aprovados (${approvedMedia.length})`, icon: <Check size={18} /> },
              { id: 'host_album', label: 'Álbum dos Anfitriões', icon: <Crown size={18} /> },
              { id: 'guestbook', label: 'Deixe um carinho', icon: <BookOpen size={18} /> },
              { id: 'predictions', label: 'Videntes por um Dia', icon: <Sparkles size={18} /> },
              { id: 'ranking', label: 'Os mais animados da festa', icon: <Trophy size={18} /> },
              { id: 'access_logs', label: 'Acessos', icon: <Users size={18} /> },
              { id: 'admin_manager', label: 'Administradores', icon: <Lock size={18} /> },
              { id: 'settings', label: 'Configurações', icon: <SettingsIcon size={18} /> },
              { id: 'dashboard', label: 'Dashboard', icon: <BarChart2 size={18} /> },
              { id: 'display', label: 'Display', icon: <ImageIcon size={18} /> },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setIsMenuOpen(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-pink-50 text-[#D4A373]' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
            
            <div className="border-t border-gray-100 mt-1 pt-1">
              <button onClick={handleLogout} className="flex items-center gap-2 w-full text-left text-gray-600 hover:text-red-500 hover:bg-red-50 transition-colors py-2.5 px-3 rounded-lg">
                <LogOut size={18} />
                <span className="font-medium">Sair do Painel</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Banner (Same as Gallery) */}
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
              className="w-full h-full absolute inset-0 flex items-center justify-center bg-gradient-to-r from-[#D4A373]/20 to-[#5A5A40]/20"
              style={{ display: settings?.bannerUrl || '/banner.png' ? 'none' : 'flex' }}
            >
              <div className="text-center">
                <h1 className="text-2xl sm:text-4xl font-serif text-[#D4A373] tracking-wider uppercase">
                  Painel Administrativo
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Tabs (Same style as Gallery Filters) - Hidden on desktop due to sidebar */}
      <div className="flex md:hidden w-full px-6 pt-2 pb-4 gap-3 overflow-x-auto custom-scrollbar">
        {[
          { id: 'pending', label: `Pendentes (${pendingMedia.length})`, icon: <Clock size={16} /> },
          { id: 'approved', label: `Aprovados (${approvedMedia.length})`, icon: <Check size={16} /> },
          { id: 'host_album', label: 'Álbum dos Anfitriões', icon: <Crown size={16} /> },
          { id: 'guestbook', label: 'Deixe um carinho', icon: <BookOpen size={16} /> },
          { id: 'predictions', label: 'Videntes por um Dia', icon: <Sparkles size={16} /> },
          { id: 'ranking', label: 'Os mais animados da festa', icon: <Trophy size={16} /> },
          { id: 'access_logs', label: 'Acessos', icon: <Users size={16} /> },
          { id: 'admin_manager', label: 'Administradores', icon: <Lock size={16} /> },
          { id: 'settings', label: 'Configurações', icon: <SettingsIcon size={16} /> },
          { id: 'dashboard', label: 'Dashboard', icon: <BarChart2 size={16} /> },
          { id: 'display', label: 'Display', icon: <ImageIcon size={16} /> },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`w-28 h-16 px-2 rounded-xl text-xs font-medium whitespace-normal leading-tight transition-all duration-300 flex flex-col items-center justify-center text-center shrink-0 gap-1 ${activeTab === tab.id ? 'bg-[#D4A373] text-white shadow-md shadow-[#D4A373]/20' : 'bg-white text-gray-500 hover:bg-pink-50 border border-gray-100'}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <main className="flex-1 w-full px-4 sm:px-6 py-8">
        {activeTab === 'display' ? (
          <DisplayGenerator 
            eventName={settings?.eventName || ''} 
            eventDate={settings?.eventDate}
            inviteCode={settings?.inviteCode || ''} 
            eventPhotoUrl={settings?.eventPhotoUrl}
          />
        ) : activeTab === 'ranking' ? (
          <Ranking />
        ) : activeTab === 'admin_manager' ? (
          <div className="py-8">
            <AdminManager />
          </div>
        ) : activeTab === 'dashboard' ? (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-medium text-gray-900">Download em Massa</h2>
                <p className="text-sm text-gray-500 mt-1">Baixe todas as fotos e vídeos aprovados em um arquivo ZIP.</p>
              </div>
              <button
                onClick={handleDownloadAll}
                disabled={isDownloading || mediaList.filter(m => m.status === 'approved').length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                <Download size={20} />
                {isDownloading ? `Baixando... ${downloadProgress}%` : 'Baixar Tudo (ZIP)'}
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-medium text-gray-900">Os mais animados da festa</h2>
                <button type="button" onClick={(e) => { e.preventDefault(); }} className="text-sm text-blue-600 hover:underline">Atualização Automática (Ao vivo)</button>
              </div>
              
              {isLoadingRanking ? (
                <div className="py-12 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : ranking.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nenhum dado de engajamento encontrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="py-3 px-4 font-medium text-gray-500">Posição</th>
                        <th className="py-3 px-4 font-medium text-gray-500">Convidado</th>
                        <th className="py-3 px-4 font-medium text-gray-500 text-center">Fotos/Vídeos</th>
                        <th className="py-3 px-4 font-medium text-gray-500 text-center">Comentários</th>
                        <th className="py-3 px-4 font-medium text-gray-500 text-center">Curtidas</th>
                        <th className="py-3 px-4 font-medium text-gray-500 text-right">Pontuação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking.map((user, index) => (
                        <tr key={index} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-medium ${
                              index === 0 ? 'bg-yellow-100 text-yellow-700' :
                              index === 1 ? 'bg-gray-200 text-gray-700' :
                              index === 2 ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-500'
                            }`}>
                              {index + 1}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-900">{user.name}</td>
                          <td className="py-3 px-4 text-center text-gray-600">{user.photos}</td>
                          <td className="py-3 px-4 text-center text-gray-600">{user.comments}</td>
                          <td className="py-3 px-4 text-center text-gray-600">{user.likes}</td>
                          <td className="py-3 px-4 text-right font-medium text-[#D4A373]">{user.total} pts</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 rounded-2xl border border-red-100 p-6 mt-6">
              <h2 className="text-xl font-medium text-red-900 mb-4 flex items-center gap-2">
                <Trash2 size={24} />
                Zona de Perigo
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-red-100 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">Excluir Todas as Mídias</h3>
                    <p className="text-sm text-gray-500 mt-1">Apaga permanentemente todas as fotos, vídeos e zera o ranking de contribuições.</p>
                  </div>
                  <button 
                    onClick={() => setShowDeleteAllMediaModal(true)}
                    className="mt-4 w-full py-2 bg-red-100 text-red-600 rounded-lg font-bold hover:bg-red-200 transition-colors"
                  >
                    Excluir Tudo
                  </button>
                </div>

                <div className="bg-white p-4 rounded-xl border border-red-100 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">Limpar Mural de Mensagens</h3>
                    <p className="text-sm text-gray-500 mt-1">Remove todas as mensagens do "Deixe um carinho" e atualiza o engajamento.</p>
                  </div>
                  <button 
                    onClick={() => setShowDeleteAllMessagesModal(true)}
                    className="mt-4 w-full py-2 bg-red-100 text-red-600 rounded-lg font-bold hover:bg-red-200 transition-colors"
                  >
                    Limpar Mural
                  </button>
                </div>

                <div className="bg-white p-4 rounded-xl border border-red-100 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">Zerar Videntes por um dia</h3>
                    <p className="text-sm text-gray-500 mt-1">Apaga todas as previsões feitas pelos convidados.</p>
                  </div>
                  <button 
                    onClick={() => setShowDeleteAllPredictionsModal(true)}
                    className="mt-4 w-full py-2 bg-red-100 text-red-600 rounded-lg font-bold hover:bg-red-200 transition-colors"
                  >
                    Zerar Previsões
                  </button>
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
                      <th className="py-3 px-4 font-medium text-gray-500 text-center">Data</th>
                      <th className="py-3 px-4 font-medium text-gray-500 text-center">Horário</th>
                      <th className="py-3 px-4 font-medium text-gray-500 text-right">Sessão ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accessLogs.map((log) => (
                      <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-900">{log.guestName}</td>
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
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
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
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
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
                              if (data.driveFileId) {
                                setSettings({...settings, bannerUrl: `/api/image/${data.driveFileId}`});
                              }
                            } catch (error) {
                              console.error("Error uploading banner:", error);
                            } finally {
                              setIsUploadingBanner(false);
                            }
                          };
                          input.click();
                        }}
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
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
                  className="mb-4 flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  <Download size={16} />
                  Baixar QR Code (Alta Resolução)
                </button>

                <p className="text-sm text-gray-500 text-center">
                  Os convidados podem escanear este código para acessar a galeria automaticamente, sem precisar digitar o código.
                </p>
              </div>

              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full bg-gray-900 text-white rounded-lg py-3 font-medium hover:bg-black transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </form>
          </div>
        ) : activeTab === 'host_album' ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm">
              <div>
                <h2 className="text-xl font-medium text-gray-900">Álbum dos Anfitriões</h2>
                <p className="text-sm text-gray-500 mt-1">Fotos e vídeos exclusivos postados por você.</p>
              </div>
              <button
                onClick={() => setIsUploadOpen(true)}
                className="bg-[#D4A373] text-white px-6 py-2.5 rounded-full font-medium hover:bg-[#c29161] transition-colors shadow-md shadow-[#D4A373]/20 flex items-center gap-2"
              >
                <ImageIcon size={18} />
                Adicionar Mídia
              </button>
            </div>
            
            <div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8"
            >
              {hostAlbumMedia.map(media => (
                <div key={media.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border flex flex-col hover:shadow-xl transition-all duration-300">
                  <div 
                    className="relative aspect-[3/4] bg-gray-100 cursor-pointer group"
                    onClick={() => setSelectedMedia(media)}
                  >
                    {media.type === 'photo' ? (
                      <img 
                        src={`/api/image/${media.driveFileId}`} 
                        alt={media.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center group-hover:scale-105 transition-transform duration-500 relative bg-gray-900">
                        {media.thumbnailLink ? (
                          <img 
                            src={media.thumbnailLink.replace('=s220', '=s1000')} 
                            alt={media.title} 
                            className="w-full h-full object-cover opacity-80"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <video 
                            src={`/api/video/${media.driveFileId}#t=0.5`} 
                            className="w-full h-full object-cover opacity-80"
                            preload="metadata"
                          />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-14 h-14 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-lg">
                            <Play size={24} className="ml-1" />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="absolute top-4 right-4 flex flex-col gap-2">
                      <div className={`p-2 rounded-full backdrop-blur-md shadow-md ${media.status === 'approved' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                        {media.status === 'approved' ? <Eye size={16} /> : <EyeOff size={16} />}
                      </div>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
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
                      <span className="text-[10px] text-gray-400 font-medium">
                        {media.timestamp ? new Date(media.timestamp.toDate()).toLocaleDateString('pt-BR') : '...'}
                      </span>
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
            <ScrollDots containerRef={mediaListRef} itemCount={(activeTab === 'pending' ? pendingMedia : approvedMedia).length} />
            <div 
              ref={mediaListRef}
              className="flex overflow-x-auto sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8 snap-x snap-mandatory no-scrollbar"
            >
              {(activeTab === 'pending' ? pendingMedia : approvedMedia).map(media => (
                <div key={media.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border flex flex-col hover:shadow-xl transition-all duration-300 shrink-0 w-64 sm:w-auto snap-center">
                  <div 
                    className="relative aspect-[3/4] bg-gray-100 cursor-pointer group"
                    onClick={() => setSelectedMedia(media)}
                  >
                  {media.type === 'photo' ? (
                    <img 
                      src={`/api/image/${media.driveFileId}`} 
                      alt={media.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center group-hover:scale-105 transition-transform duration-500 relative bg-gray-900">
                      {media.thumbnailLink ? (
                        <img 
                          src={media.thumbnailLink.replace('=s220', '=s1000')} 
                          alt={media.title} 
                          className="w-full h-full object-cover opacity-80"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <video 
                          src={`/api/video/${media.driveFileId}#t=0.5`} 
                          className="w-full h-full object-cover opacity-80"
                          preload="metadata"
                        />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-lg">
                          <Play size={24} className="ml-1" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <span className="text-white text-sm font-medium">Ver Detalhes</span>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-bold text-gray-900 truncate">{media.author}</p>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {media.timestamp ? new Date(media.timestamp.toDate()).toLocaleDateString('pt-BR') : '...'}
                    </span>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t grid grid-cols-2 gap-2">
                    {activeTab === 'pending' ? (
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
                            className="p-2.5 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                            title="Baixar"
                          >
                            <Download size={18} />
                          </button>
                          <button 
                            onClick={() => handleShareMedia(media)}
                            className="p-2.5 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
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
            
            {(activeTab === 'pending' ? pendingMedia : approvedMedia).length === 0 && (
              <div className="col-span-full w-full">
                <EmptyState 
                  icon={ImageIcon}
                  title="Nenhuma mídia encontrada nesta categoria."
                />
              </div>
            )}
          </div>
        </div>
      )}
    </main>

      {isUploadOpen && (
        <UploadModal onClose={() => setIsUploadOpen(false)} isHostAlbum={true} />
      )}

      {selectedMedia && (
        <MediaViewer 
          media={selectedMedia} 
          onClose={() => setSelectedMedia(null)} 
          settings={settings}
        />
      )}

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
                onClick={confirmDelete}
                className="px-5 py-2.5 rounded-full bg-red-500 text-white font-medium hover:bg-red-600 transition-colors shadow-md shadow-red-500/20"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Media Modal */}
      {showDeleteAllMediaModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-xl font-serif text-red-600 mb-2">Excluir Tudo?</h3>
            <p className="text-gray-600 mb-6">
              Esta ação apagará <strong>todas as fotos e vídeos</strong> permanentemente, além de limpar os registros que geram o ranking. 
              <strong>Não há como desfazer!</strong>
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowDeleteAllMediaModal(false)}
                className="px-5 py-2.5 rounded-full text-gray-600 font-medium hover:bg-gray-100 transition-colors"
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
      )}

      {/* Delete All Messages Modal */}
      {showDeleteAllMessagesModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-xl font-serif text-red-600 mb-2">Limpar Mensagens?</h3>
            <p className="text-gray-600 mb-6">
              Todas as mensagens dos convidados serão removidas permanentemente.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowDeleteAllMessagesModal(false)}
                className="px-5 py-2.5 rounded-full text-gray-600 font-medium hover:bg-gray-100 transition-colors"
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
      )}
      {/* Delete All Predictions Modal */}
      {showDeleteAllPredictionsModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-xl font-serif text-red-600 mb-2">Zerar Previsões?</h3>
            <p className="text-gray-600 mb-6">
              Todas as previsões dos videntes serão removidas permanentemente.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowDeleteAllPredictionsModal(false)}
                className="px-5 py-2.5 rounded-full text-gray-600 font-medium hover:bg-gray-100 transition-colors"
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
      )}

      {showClearLogsModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-xl font-serif text-gray-800 mb-2">Limpar Histórico</h3>
            <p className="text-gray-600 mb-6">Tem certeza que deseja limpar todo o histórico de acessos? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowClearLogsModal(false)}
                className="px-5 py-2.5 rounded-full text-gray-600 font-medium hover:bg-gray-100 transition-colors"
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
      )}
      <Footer />
      {mediaToShare && (
        <ShareModal 
          isOpen={isShareModalOpen} 
          onClose={() => { setIsShareModalOpen(false); setMediaToShare(null); }}
          url={`${window.location.origin}/?ids=${mediaToShare.id}`}
          title={`Confira esta ${mediaToShare.type === 'photo' ? 'foto' : 'vídeo'} de ${mediaToShare.author}!`}
        />
      )}
      </div>
    </div>
  );
}
