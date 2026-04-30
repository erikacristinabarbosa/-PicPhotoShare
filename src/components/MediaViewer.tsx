import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSession } from '../SessionContext';
import { auth, db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc, deleteDoc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { Media, Comment } from '../types';
import { X, Heart, MessageCircle, Send, Trash2, Smile, Star, ThumbsDown, Zap, Camera, Image as ImageIcon, Share2, Pin, Video } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import confetti from 'canvas-confetti';
import ShareModal from './ShareModal';
import Portal from './Portal';

const REACTIONS = [
  { id: 'heart', icon: Heart, label: 'Amei', color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' },
  { id: 'legend', icon: Star, label: 'Lenda Viva', color: 'text-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  { id: 'scary', icon: Zap, label: 'Assustadoramente incrível', color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200' },
  { id: 'dislike', icon: ThumbsDown, label: 'Não gostei', color: 'text-gray-800', bg: 'bg-gray-200', border: 'border-gray-300' },
  { id: 'killed_it', icon: Smile, label: 'Arrasou', color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' },
  { id: 'best_party', icon: Camera, label: 'A festa mais linda do ano', color: 'text-pink-500', bg: 'bg-pink-50', border: 'border-pink-200' },
  { id: 'frame_it', icon: ImageIcon, label: 'Essa foto já nasceu pra virar quadro', color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
];

export default function MediaViewer({ media, onClose, settings }: { media: Media, onClose: () => void, settings: any }) {
  const { guestName, sessionId, guestSessionId } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [userReactions, setUserReactions] = useState<string[]>([]);
  const [localLikesCount, setLocalLikesCount] = useState(media.likesCount);
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});
  const [reactionAuthors, setReactionAuthors] = useState<Record<string, string[]>>({});
  const [showReactions, setShowReactions] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPinned, setIsPinned] = useState(media.isPinned || false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [mediaToDelete, setMediaToDelete] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setIsAdmin(!!user);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    // Listen for comments
    const q = query(
      collection(db, 'media', media.id, 'comments'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribeComments = onSnapshot(q, (snapshot) => {
      const items: Comment[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Comment);
      });
      setComments(items);
    });

    // Listen for all likes to get reaction counts
    const unsubscribeLikes = onSnapshot(collection(db, 'media', media.id, 'likes'), (snapshot) => {
      const counts: Record<string, number> = {};
      const authors: Record<string, string[]> = {};
      const currentUserReactions: string[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const type = data.type || 'heart';
        const authorName = data.author || 'Anônimo';
        
        counts[type] = (counts[type] || 0) + 1;
        
        if (!authors[type]) authors[type] = [];
        authors[type].push(authorName);
        
        if (data.sessionId === sessionId) {
          currentUserReactions.push(type);
        }
      });

      setReactionCounts(counts);
      setReactionAuthors(authors);
      if (sessionId) {
        setIsLiked(currentUserReactions.length > 0);
        setUserReactions(currentUserReactions);
      }
    });

    // Listen for media updates (like count)
    const unsubscribeMedia = onSnapshot(doc(db, 'media', media.id), (docSnap) => {
      if (docSnap.exists()) {
        setLocalLikesCount(docSnap.data().likesCount);
      }
    });

    return () => {
      unsubscribeComments();
      unsubscribeLikes();
      unsubscribeMedia();
    };
  }, [media.id, sessionId]);

  const handleLike = async (reactionId: string = 'heart') => {
    // Admins can also like even if they don't have a guest sessionId
    if (!sessionId) return;
    
    const likeId = `${sessionId}_${reactionId}`;
    const likeRef = doc(db, 'media', media.id, 'likes', likeId);
    const mediaRef = doc(db, 'media', media.id);

    setShowReactions(false);

    const isAlreadyReacted = userReactions.includes(reactionId);

    try {
      if (isAlreadyReacted) {
        // Remove specific reaction
        const newUserReactions = userReactions.filter(id => id !== reactionId);
        setUserReactions(newUserReactions);
        setIsLiked(newUserReactions.length > 0);
        setLocalLikesCount(prev => Math.max(0, prev - 1));
        
        await deleteDoc(likeRef);
        await updateDoc(mediaRef, { likesCount: increment(-1) });
      } else {
        // Add specific reaction
        const newUserReactions = [...userReactions, reactionId];
        setUserReactions(newUserReactions);
        setIsLiked(true);
        setLocalLikesCount(prev => prev + 1);
        
        // Confetti animation
        if (reactionId !== 'dislike') {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.8 },
            colors: ['#D4A373', '#FFB6C1', '#FF1493', '#FFFFFF']
          });
        }

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
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert optimistic update on error (simplified)
      setLocalLikesCount(media.likesCount);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !sessionId) return;

    const commentText = newComment.trim();
    setNewComment('');

    try {
      await addDoc(collection(db, 'media', media.id, 'comments'), {
        author: guestName || (isAdmin ? 'Anfitrião' : 'Anônimo'),
        authorSessionId: sessionId,
        text: commentText,
        timestamp: serverTimestamp()
      });
      await updateDoc(doc(db, 'media', media.id), {
        commentsCount: increment(1)
      });
      if (!isAdmin && sessionId) {
        window.dispatchEvent(new CustomEvent('points-earned', { detail: { actionName: 'Comentário', points: 3 } }));
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  const handleDeleteComment = (commentId: string) => {
    setCommentToDelete(commentId);
  };

  const submitEditComment = async (commentId: string) => {
    if (!editingCommentText.trim()) return;
    try {
      await updateDoc(doc(db, 'media', media.id, 'comments', commentId), {
        text: editingCommentText.trim(),
        editedAt: serverTimestamp()
      });
      setEditingCommentId(null);
      setEditingCommentText('');
    } catch (e) {
      console.error('Comment edit error', e);
      alert('Missing or insufficient permissions.');
    }
  };

  const confirmDeleteComment = async () => {
    if (!commentToDelete) return;
    try {
      await deleteDoc(doc(db, 'media', media.id, 'comments', commentToDelete));
      await updateDoc(doc(db, 'media', media.id), {
        commentsCount: increment(-1)
      });
      setCommentToDelete(null);
    } catch (error: any) {
      console.error("Error deleting comment:", error);
      alert("Erro ao excluir comentário: " + error.message);
      setCommentToDelete(null);
    }
  };

  const confirmDeleteMedia = async () => {
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
      
      const { writeBatch, getDocs, collection } = await import('firebase/firestore');
      const commentsSnap = await getDocs(collection(db, 'media', mediaToDelete, 'comments'));
      const likesSnap = await getDocs(collection(db, 'media', mediaToDelete, 'likes'));
      const batch = writeBatch(db);
      commentsSnap.docs.forEach(d => batch.delete(d.ref));
      likesSnap.docs.forEach(d => batch.delete(d.ref));
      batch.delete(doc(db, 'media', mediaToDelete));
      await batch.commit();

      setMediaToDelete(null);
      onClose();
    } catch (error: any) {
      console.error("Error deleting media:", error);
      alert('Erro ao excluir mídia: ' + error.message);
      setMediaToDelete(null);
    }
  };

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  const handleTogglePin = async () => {
    if (!isAdmin) return;
    const newValue = !isPinned;
    setIsPinned(newValue); // Optimistic update
    try {
      await updateDoc(doc(db, 'media', media.id), {
        isPinned: newValue
      });
    } catch (error) {
      console.error("Error toggling pin:", error);
      setIsPinned(!newValue); // Revert on error
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
      animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
      exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 bg-black/80 z-50 flex flex-col md:flex-row h-[100dvh] overflow-hidden"
    >
      {/* Close buttons */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="fixed top-4 sm:top-6 right-4 sm:right-6 z-[60] flex gap-2 sm:gap-3"
      >
        {isAdmin && (
          <button 
            onClick={handleTogglePin}
            className={`p-3 rounded-full backdrop-blur-md transition-all duration-300 border border-white/10 shadow-lg ${isPinned ? 'bg-[#D4A373] text-white' : 'bg-black/40 hover:bg-black/60 text-white'}`}
            title={isPinned ? "Desafixar do topo" : "Fixar no topo"}
          >
            <Pin size={24} className={isPinned ? 'fill-current' : ''} />
          </button>
        )}
        {(settings?.canFavorite || isAdmin) && (
          <button 
            onClick={() => handleLike('heart')}
            className={`p-3 rounded-full backdrop-blur-md transition-all duration-300 border border-white/10 shadow-lg ${userReactions.includes('heart') ? 'bg-red-500 text-white' : 'bg-black/40 hover:bg-black/60 text-white'}`}
            title="Favoritar"
          >
            <Heart size={24} className={userReactions.includes('heart') ? 'fill-current' : ''} />
          </button>
        )}
        {(settings?.canShare || isAdmin) && (
          <button 
            onClick={handleShare}
            className="p-3 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all duration-300 border border-white/10 shadow-lg"
            title="Compartilhar"
          >
            <Share2 size={24} />
          </button>
        )}
        <button 
          onClick={onClose}
          className="p-3 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all duration-300 border border-white/10 shadow-lg"
          title="Fechar"
        >
          <X size={24} />
        </button>
      </motion.div>

      {/* Media Area */}
      <div className="flex-none flex items-center justify-center p-4 md:p-12 h-[42vh] md:h-full relative z-0">
        {media.type === 'photo' ? (
          <motion.img 
            layoutId={`media-${media.id}`}
            src={`/api/image/${media?.driveFileId}`} 
            alt={media.title} 
            className="w-full h-full object-contain rounded-xl md:shadow-2xl"
            referrerPolicy="no-referrer"
          />
        ) : (
          (media?.driveViewLink?.includes('firebasestorage') || media?.driveFileId) ? (
            <motion.video
              layoutId={`media-${media.id}`}
              src={media?.driveViewLink?.includes('firebasestorage') ? media.driveViewLink : `/api/video/${media?.driveFileId}`}
              controls
              playsInline
              poster={media.thumbnailLink ? media.thumbnailLink.replace('=s220', '=s2000') : undefined}
              className="w-full h-full object-contain rounded-xl md:shadow-2xl"
              title={media.title}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 rounded-xl md:shadow-2xl text-gray-500">
               <Video size={48} className="mb-4 opacity-50 text-white" />
               <p className="text-white">Vídeo indisponível</p>
            </div>
          )
        )}
      </div>

      {/* Sidebar (Comments & Info) */}
      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="w-full md:w-[400px] bg-white flex flex-col h-[58vh] md:h-full rounded-t-[2.5rem] md:rounded-none md:rounded-l-[2.5rem] shadow-[0_-15px_50px_rgba(0,0,0,0.4)] relative z-20 md:mt-0"
      >
        {/* Header Info */}
        <div className="p-6 border-b border-pink-50 bg-white/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-serif text-xl text-gray-800 truncate">{media.author}</p>
              {media.timestamp && (
                <p className="text-sm text-gray-400 mt-1">
                  {formatDistanceToNow(media.timestamp.toDate(), { addSuffix: true, locale: ptBR })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 ml-2">
              {settings?.canDownload && (
                <a
                  href={media?.type === 'photo' ? `/api/image/${media?.driveFileId}` : `/api/video/${media?.driveFileId}`}
                  download={media.title || 'media'}
                  className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                  title="Baixar mídia"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </a>
              )}
              {(isAdmin || (settings?.canDelete && (
                (sessionId && media.authorSessionId === sessionId) || 
                (guestSessionId && media.authorSessionId === guestSessionId) ||
                (guestName && media.author.toLowerCase() === guestName.toLowerCase())
              ))) && (
                <button
                  onClick={() => setMediaToDelete(media.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex items-center justify-center"
                  title="Excluir mídia"
                >
                  <Trash2 size={20} />
                </button>
              )}
              {/* Extra close button for mobile accessibility */}
              <button 
                onClick={onClose}
                className="md:hidden p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                title="Fechar"
              >
                <X size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#FAFAFA] flex flex-col">
          {comments.length > 0 && (
            <div className="mb-4 pb-4 border-b border-gray-100">
              <h4 className="text-sm font-medium text-gray-700 mb-1">
                {comments.length} {comments.length === 1 ? 'Comentário' : 'Comentários'}
              </h4>
              <p className="text-xs text-gray-500">
                Comentado por: {Array.from(new Set(comments.map(c => c.author))).join(', ')}
              </p>
            </div>
          )}
          <div className="space-y-6">
            <AnimatePresence>
              {comments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4 py-10">
                  <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center">
                    <MessageCircle size={28} className="text-pink-200" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">Nenhum comentário ainda.</p>
                </div>
              ) : (
                comments.map(comment => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex gap-4 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center shrink-0 shadow-sm">
                      <span className="text-sm font-serif text-[#D4A373]">
                        {comment.author.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      {editingCommentId === comment.id ? (
                        <div className="flex flex-col gap-2 bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-50">
                          <input
                            autoFocus
                            value={editingCommentText}
                            onChange={e => setEditingCommentText(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') submitEditComment(comment.id);
                              if (e.key === 'Escape') setEditingCommentId(null);
                            }}
                            className="text-sm bg-gray-50 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-gray-300 w-full"
                          />
                          <div className="flex justify-end gap-2 mt-1">
                            <button onClick={() => setEditingCommentId(null)} className="text-gray-400 hover:text-gray-600 text-xs font-medium">Cancelar</button>
                            <button onClick={() => submitEditComment(comment.id)} className="text-pink-500 hover:text-pink-600 text-xs font-semibold">Salvar</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-50 group-hover:border-gray-100 transition-colors">
                            <p className="text-sm text-gray-700">
                              <span className="font-medium text-gray-900 mr-2">{comment.author}</span>
                              {comment.text}
                            </p>
                          </div>
                          {comment.timestamp && (
                            <p className="text-[11px] text-gray-400 mt-1.5 ml-1">
                              {formatDistanceToNow(comment.timestamp.toDate(), { addSuffix: true, locale: ptBR })}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    {(isAdmin || comment.authorSessionId === sessionId || comment.authorSessionId === guestSessionId || (comment.author || '').toLowerCase() === (guestName || '').toLowerCase()) && (
                      <div className="flex flex-col lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingCommentId(comment.id);
                            setEditingCommentText(comment.text);
                          }}
                          className="text-gray-300 hover:text-blue-500 p-2 rounded-full hover:bg-blue-50 transition-all"
                          title="Editar comentário"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
                        </button>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteComment(comment.id);
                          }}
                          className="text-gray-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-all"
                          title="Excluir comentário"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Actions & Input */}
        <div className="p-4 sm:p-6 border-t border-pink-50 bg-white relative pb-8 sm:pb-6">
          { (settings?.canLike || isAdmin) && (
            <div className="mb-6">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3 ml-1">Reações</p>
              <div className="flex flex-wrap gap-2">
                {REACTIONS.map((reaction) => {
                  const Icon = reaction.icon;
                  const count = reactionCounts[reaction.id] || 0;
                  const isActive = userReactions.includes(reaction.id);
                  const authors = reactionAuthors[reaction.id] || [];
                  const authorsText = authors.length > 0 ? authors.join(', ') : '';

                  return (
                    <motion.button
                      key={reaction.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleLike(reaction.id)}
                      className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-300 ${
                        isActive 
                          ? `${reaction.bg} ${reaction.border} shadow-sm` 
                          : 'bg-white border-gray-100 hover:border-gray-200 text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <Icon 
                        size={20} 
                        fill={isActive ? "currentColor" : "none"}
                        className={`${isActive ? reaction.color : 'text-gray-400 group-hover:text-gray-600'}`} 
                      />
                      {count > 0 && (
                        <span className={`text-sm font-bold ${isActive ? reaction.color : 'text-gray-500'}`}>
                          {count}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Show likers names per reaction here to avoid overflow bugs */}
              <div className="mt-4 flex flex-col gap-1.5">
                {REACTIONS.map(reaction => {
                  const authors = reactionAuthors[reaction.id] || [];
                  if (authors.length === 0) return null;
                  return (
                    <div key={`likers-${reaction.id}`} className="text-[13px] text-gray-600">
                      <span className="font-semibold text-gray-800 mr-1">{reaction.label}:</span>
                      {authors.length > 5 ? `${authors.slice(0, 5).join(', ')} e outras ${authors.length - 5} pessoas` : authors.join(', ')}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          { (settings?.canComment || isAdmin) && (
            <form onSubmit={handleComment} className="flex items-center gap-3">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Adicione um comentário..."
                className="flex-1 bg-gray-50 border border-gray-100 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A373]/20 focus:border-[#D4A373] transition-all"
              />
              <button 
                type="submit"
                disabled={!newComment.trim()}
                className="p-3 bg-[#D4A373] text-white disabled:opacity-50 disabled:bg-gray-200 rounded-full transition-all duration-300 hover:bg-[#c39162] shadow-md shadow-[#D4A373]/20"
              >
                <Send size={18} className="ml-0.5" />
              </button>
            </form>
          )}
        </div>
      </motion.div>

      {/* Delete Comment Confirmation Modal */}
      {commentToDelete && (
        <Portal>
        <div className="fixed inset-0 z-[10000] overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={() => setCommentToDelete(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
              <h3 className="text-xl font-serif text-gray-800 mb-2">Excluir Comentário</h3>
            <p className="text-gray-600 mb-6">Tem certeza que deseja excluir este comentário?</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setCommentToDelete(null)}
                className="btn-beige px-5 py-2.5 rounded-full font-medium"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDeleteComment}
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

      {/* Delete Media Confirmation Modal */}
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

      {/* Share Modal */}
      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        url={`${window.location.origin}/?ids=${media.id}`}
        title={`Confira esta ${media.type === 'photo' ? 'foto' : 'vídeo'} de ${media.author}!`} 
        mediaUrl={media.driveViewLink?.includes('firebasestorage') ? media.driveViewLink : (media.driveFileId ? `/api/${media.type === 'video' ? 'video' : 'image'}/${media.driveFileId}` : undefined)}
        mediaType={media.type}
      />
      </motion.div>
  );
}
