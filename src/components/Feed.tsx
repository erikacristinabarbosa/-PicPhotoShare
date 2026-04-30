import React, { useState } from 'react';
import { useFeed, FeedPost } from '../hooks/useFeed';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trash2, Image as ImageIcon, Video, MessageCircle, Heart, Share2, MoreHorizontal, User, Send, Star, Zap, ThumbsDown, Smile, Check } from 'lucide-react';
import { doc, deleteDoc, setDoc, serverTimestamp, collection, addDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { useSession } from '../SessionContext';
import confetti from 'canvas-confetti';
import ShareModal from './ShareModal';
import Portal from './Portal';

const REACTIONS = [
  { id: 'heart', icon: Heart, label: 'Amei', color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' },
  { id: 'legend', icon: Star, label: 'Lenda Viva', color: 'text-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  { id: 'scary', icon: Zap, label: 'Assustadoramente incrível', color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200' },
  { id: 'dislike', icon: ThumbsDown, label: 'Não gostei', color: 'text-gray-800', bg: 'bg-gray-200', border: 'border-gray-300' },
  { id: 'killed_it', icon: Smile, label: 'Arrasou', color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' },
];

interface FeedProps {
  isAdmin?: boolean;
  settings?: any;
}

export default function Feed({ isAdmin, settings }: FeedProps) {
  const { feedPosts, isLoading } = useFeed(isAdmin);
  const { guestName, sessionId, guestSessionId } = useSession();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [pointsAnimation, setPointsAnimation] = useState<{ amount: number; message: string; type: 'add' | 'remove' } | null>(null);
  const [displayLimit, setDisplayLimit] = useState(10);
  const [expandedComments, setExpandedComments] = useState<string[]>([]);
  const [expandedLikes, setExpandedLikes] = useState<string[]>([]);
  const [shareTarget, setShareTarget] = useState<FeedPost | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [deleteConfirmInfo, setDeleteConfirmInfo] = useState<{ type: 'post' | 'comment', post: FeedPost, commentId?: string } | null>(null);

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#D4A373', '#FF6B6B', '#4ECDC4', '#FFE66D']
    });
  };

  const showPoints = (amount: number, message: string, type: 'add' | 'remove') => {
    setPointsAnimation({ amount, message, type });
    if (type === 'add') triggerConfetti();
    setTimeout(() => setPointsAnimation(null), 3000);
  };

  const handleShare = async (post: FeedPost) => {
    setShareTarget(post);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmInfo) return;
    const { type, post, commentId } = deleteConfirmInfo;
    
    if (type === 'post') {
      try {
        setDeletingId(post.id);
        await deleteDoc(doc(db, post.docPath));
        showPoints(10, 'Postagem removida', 'remove');
      } catch (e: any) {
        console.error(e);
        alert('Erro ao apagar: ' + e.message);
      } finally {
        setDeletingId(null);
        setDeleteConfirmInfo(null);
      }
    } else if (type === 'comment' && commentId) {
      try {
        await deleteDoc(doc(db, `${post.docPath}/comments/${commentId}`));
        await updateDoc(doc(db, post.docPath), { commentsCount: increment(-1) }).catch(e => {
          console.error("Failed to decrement commentsCount", e);
        });
        showPoints(0, 'Comentário removido', 'remove');
      } catch (e: any) {
        console.error('Comment delete error', e);
        alert('Missing or insufficient permissions: ' + e.message);
      } finally {
        setDeleteConfirmInfo(null);
      }
    }
  };

  const handleDelete = async (post: FeedPost) => {
    setDeleteConfirmInfo({ type: 'post', post });
  };

  const handleApprove = async (post: FeedPost) => {
    try {
      await updateDoc(doc(db, post.docPath), { status: 'approved' });
      showPoints(5, 'Postagem aprovada', 'add');
    } catch (e) {
      console.error(e);
      alert('Erro ao aprovar');
    }
  };

  const handleLikeToggle = async (post: FeedPost, reactionId: string = 'heart') => {
    if (!guestName || !sessionId) return;
    const likeId = `${sessionId}_${reactionId}`;
    const likeRef = doc(db, `${post.docPath}/likes/${likeId}`);
    const isLiked = post.likes.some(l => l.author === guestName && l.type === reactionId);
    
    try {
      if (isLiked) {
        await deleteDoc(likeRef);
        await updateDoc(doc(db, post.docPath), { likesCount: increment(-1) }).catch(e => {
            console.error("Failed to decrement likesCount", e);
        });
        showPoints(5, 'Reação removida', 'remove');
      } else {
        await setDoc(likeRef, {
          author: guestName,
          sessionId,
          type: reactionId,
          timestamp: serverTimestamp()
        });
        await updateDoc(doc(db, post.docPath), { likesCount: increment(1) }).catch(e => {
            console.error("Failed to increment likesCount", e);
        });
        showPoints(5, 'Reação enviada!', 'add');
      }
    } catch (e) {
      console.error('Like error', e);
      alert('Missing or insufficient permissions.');
    }
  };

  const submitComment = async (post: FeedPost) => {
    if (!guestName || !sessionId || !commentText.trim()) return;
    try {
      await addDoc(collection(db, `${post.docPath}/comments`), {
        author: guestName,
        authorSessionId: sessionId,
        text: commentText.trim(),
        timestamp: serverTimestamp()
      });
      await updateDoc(doc(db, post.docPath), { commentsCount: increment(1) }).catch(e => {
          console.error("Failed to increment commentsCount", e);
      });
      setCommentText('');
      setCommentingId(null);
      showPoints(10, 'Comentário enviado!', 'add');
    } catch (e) {
      console.error('Comment error', e);
      alert('Missing or insufficient permissions.');
    }
  };

  const handleDeleteComment = async (post: FeedPost, commentId: string) => {
    setDeleteConfirmInfo({ type: 'comment', post, commentId });
  };

  const submitEditComment = async (post: FeedPost, commentId: string) => {
    if (!editingCommentText.trim()) return;
    try {
      await updateDoc(doc(db, `${post.docPath}/comments/${commentId}`), {
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

  const formatName = (name: string) => name.split(' ').map(n => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()).join(' ');

  if (isLoading) {
    return (
      <div className="min-h-[80vh] w-[calc(100%+3rem)] -ml-6 sm:w-full sm:ml-0 rounded-none sm:rounded-3xl bg-gradient-to-br from-[#FFFDF0] via-[#FDF2D0] to-[#E6CC98] px-0 py-6 sm:p-8 shadow-inner relative overflow-hidden flex flex-col items-center">
        <div className="w-full max-w-xl mx-auto space-y-4 sm:space-y-8 mt-2 sm:mt-0">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/50 backdrop-blur-sm rounded-none sm:rounded-2xl border-y sm:border border-white/20 overflow-hidden animate-pulse shadow-md w-full">
              <div className="flex items-center gap-3 p-3 border-b border-white/20">
                <div className="w-9 h-9 rounded-full bg-[#E8D3BA] opacity-50"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-[#E8D3BA] rounded w-24 opacity-50"></div>
                  <div className="h-2 bg-[#E8D3BA] rounded w-16 opacity-30"></div>
                </div>
              </div>
              <div className="w-full aspect-[4/5] bg-[#E8D3BA]/20"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (feedPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ImageIcon className="text-gray-300 w-16 h-16 mb-4" />
        <p className="text-gray-500 font-medium">Nenhuma postagem ainda.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] w-[calc(100%+3rem)] -ml-6 sm:w-full sm:ml-0 rounded-none sm:rounded-3xl bg-gradient-to-br from-[#FFFDF0] via-[#FDF2D0] to-[#E6CC98] px-0 py-6 sm:p-8 shadow-inner relative overflow-hidden flex flex-col items-center">
      
      {/* Points Animation Toast */}
      <AnimatePresence>
        {pointsAnimation && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-white text-gray-900 px-6 py-4 rounded-2xl shadow-2xl border border-[#D4A373]/30 flex flex-col items-center min-w-[200px]"
          >
            <div className={`text-2xl font-bold mb-1 ${pointsAnimation.type === 'add' ? 'text-green-500' : 'text-red-500'}`}>
              {pointsAnimation.type === 'add' ? '+' : '-'}{pointsAnimation.amount} pts
            </div>
            <div className="text-sm font-medium text-gray-600">{pointsAnimation.message}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-xl mx-auto space-y-6 sm:space-y-8 flex flex-col items-center px-0 sm:px-0">
        <AnimatePresence>
          {feedPosts.slice(0, displayLimit).map((post) => {
          const isLikedHeart = post.likes.some(l => l.author === guestName && (!l.type || l.type === 'heart'));
          const isDeleting = deletingId === post.id;
          
          return (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`rounded-none sm:rounded-[2rem] overflow-hidden relative group/card w-full max-w-lg mx-auto transition-all duration-500 hover:-translate-y-1 flex flex-col bg-gradient-to-b from-[#FFFDF9] to-[#FEF6EB] shadow-[0_12px_30px_-10px_rgba(212,163,115,0.4),0_4px_6px_-4px_rgba(212,163,115,0.2)] border-y sm:border border-[#E8D1B5]/60 hover:shadow-[0_20px_40px_-10px_rgba(212,163,115,0.5),0_8px_12px_-6px_rgba(212,163,115,0.3)] ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <div className="hidden sm:block absolute inset-0 z-20 pointer-events-none rounded-[2rem] border-t-2 border-white/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4),inset_0_-6px_15px_rgba(212,163,115,0.25)] transition-all duration-500 group-hover/card:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6),inset_0_-6px_20px_rgba(212,163,115,0.4)]"></div>

              {/* Header */}
              {post.type !== 'guestbook' && post.type !== 'prediction' && (
                <div className="flex items-center justify-between p-4 border-b border-gray-50 bg-white/50 backdrop-blur-sm relative z-30">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 p-[2px]">
                      <div className="w-full h-full bg-white rounded-full flex items-center justify-center p-0.5 overflow-hidden">
                        {post.authorAvatar ? (
                          <img src={post.authorAvatar} alt={post.author} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                        ) : (
                           <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center">
                             <User size={16} className="text-gray-400" />
                           </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-gray-900">{formatName(post.author)}</div>
                      {post.timestamp && (
                        <div className="text-[11px] text-gray-500">
                          {formatDistanceToNow(post.timestamp, { addSuffix: true, locale: ptBR })}
                        </div>
                      )}
                    </div>
                  </div>
                  {(isAdmin || (settings?.canDelete && (
                    (sessionId && post.authorSessionId === sessionId) || 
                    (guestSessionId && post.authorSessionId === guestSessionId) ||
                    (guestName && formatName(post.author) === formatName(guestName))
                  ))) && (
                    <div className="flex items-center gap-1">
                      {isAdmin && post.status === 'pending' && (
                        <button onClick={() => handleApprove(post)} className="p-2 text-gray-400 hover:text-green-500 transition-colors rounded-full" title="Aprovar">
                          <Check size={18} />
                        </button>
                      )}
                      <button onClick={() => handleDelete(post)} className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-full" title="Apagar">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Delete and Approve buttons for Guestbook style */}
              {((isAdmin || (settings?.canDelete && (
                (sessionId && post.authorSessionId === sessionId) || 
                (guestSessionId && post.authorSessionId === guestSessionId) ||
                (guestName && formatName(post.author) === formatName(guestName))
              ))) && (post.type === 'guestbook' || post.type === 'prediction')) && (
                <div className="absolute top-4 right-4 flex items-center gap-2 z-40 opacity-100 lg:opacity-0 group-hover/card:opacity-100 transition-all">
                  {isAdmin && post.status === 'pending' && (
                    <button 
                      onClick={() => handleApprove(post)}
                      className="p-2 bg-white/80 backdrop-blur-sm text-green-500 rounded-full shadow-sm hover:bg-green-50 scale-90 hover:scale-100 transition-all"
                      title="Aprovar mensagem"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(post)}
                    className="p-2 bg-white/80 backdrop-blur-sm text-red-400 rounded-full shadow-sm hover:bg-red-50 hover:text-red-500 scale-90 hover:scale-100 transition-all"
                    title="Excluir mensagem"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}

              {/* Media Context */}
              {post.type === 'media' && post.mediaDriveId ? (
                <div className="w-full aspect-[4/5] bg-gray-100 relative group">
                  <img 
                    src={post.mediaThumbnail || `/api/image/${post.mediaDriveId}`} 
                    alt="Mídia" 
                    className="w-full h-full object-cover relative z-30"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  {post.mediaType === 'video' && (
                    <div className="absolute top-4 right-4 bg-black/50 p-1.5 rounded-full backdrop-blur-sm z-30">
                      <Video size={16} className="text-white" />
                    </div>
                  )}
                </div>
              ) : post.type === 'guestbook' || post.type === 'prediction' ? (
                <div className="flex flex-col relative z-30 w-full pt-10 pb-4">
                  <div className="w-full flex justify-center mb-4">
                    {post.authorAvatar ? (
                      <div className="w-20 h-20 rounded-full overflow-hidden shadow-md border-2 border-white ring-4 ring-amber-50">
                        <img 
                          src={post.authorAvatar} 
                          alt={post.author} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#D4A373] to-[#B38728] flex items-center justify-center text-white font-serif text-3xl shadow-[0_4px_10px_rgba(212,163,115,0.5)] border-2 border-white ring-4 ring-amber-50">
                        {formatName(post.author).charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-1 mb-6 text-center border-b border-[#D4A373]/10 pb-4 mx-8">
                    <h4 className="font-serif text-2xl bg-gradient-to-br from-[#8B5E34] to-[#D4A373] bg-clip-text text-transparent tracking-wide font-bold">{formatName(post.author)}</h4>
                    {post.timestamp && (
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-1">
                        {new Date(post.timestamp).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                  <div className="relative flex-1 flex flex-col justify-center px-8 pb-4">
                    {post.type === 'guestbook' ? (
                      <svg className="absolute -top-4 left-4 w-8 h-8 text-[#D4A373] opacity-30 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C20.1216 16 21.017 16.8954 21.017 18V21C21.017 22.1046 20.1216 23 19.017 23H16.017C14.9124 23 14.017 22.1046 14.017 21ZM5.017 21L5.017 18C5.017 16.8954 5.91243 16 7.017 16H10.017C11.1216 16 12.017 16.8954 12.017 18V21C12.017 22.1046 11.1216 23 10.017 23H7.017C5.91243 23 5.017 22.1046 5.017 21ZM12.017 13H5.017V10H12.017V13ZM21.017 13H14.017V10H21.017V13ZM12.017 7H5.017V4H12.017V7ZM21.017 7H14.017V4H21.017V7Z" />
                      </svg>
                    ) : null}
                    <p className={`text-gray-600 leading-relaxed font-serif italic relative z-10 text-center py-2 ${post.type === 'guestbook' ? 'text-sm sm:text-base' : 'text-lg sm:text-xl'}`}>
                      "{post.content}"
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Action Bar */}
              <div className="px-4 pt-3 pb-2 relative z-30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => handleLikeToggle(post, 'heart')}
                      className={`hover:opacity-70 transition-opacity ${isLikedHeart ? 'text-red-500' : 'text-gray-900'}`}
                    >
                      <Heart size={26} className={isLikedHeart ? 'fill-red-500' : ''} />
                    </button>
                    <button onClick={() => setCommentingId(commentingId === post.id ? null : post.id)} className="hover:opacity-70 transition-opacity text-gray-900">
                      <MessageCircle size={26} />
                    </button>
                    {(settings?.canShare !== false || isAdmin) && (
                      <button onClick={() => handleShare(post)} className="hover:opacity-70 transition-opacity text-gray-900">
                        <Share2 size={24} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Available Reactions */}
                <div className="flex flex-wrap gap-2 mb-3 mt-1">
                  {REACTIONS.map((reaction) => {
                    const Icon = reaction.icon;
                    const isActive = post.likes.some(l => l.author === guestName && (!l.type ? reaction.id === 'heart' : l.type === reaction.id));
                    const count = post.likes.filter(l => (!l.type ? reaction.id === 'heart' : l.type === reaction.id)).length;
                    
                    return (
                      <motion.button
                        key={reaction.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleLikeToggle(post, reaction.id)}
                        title={reaction.label}
                        className={`group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all duration-300 ${
                          isActive 
                            ? `${reaction.bg} ${reaction.border} shadow-sm` 
                            : 'bg-gray-50 border-gray-100 hover:border-gray-200 text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        <Icon 
                          size={16} 
                          fill={isActive ? "currentColor" : "none"}
                          className={`${isActive ? reaction.color : 'text-gray-400 group-hover:text-gray-600'}`} 
                        />
                        {count > 0 && (
                          <span className={`text-[11px] font-bold ${isActive ? reaction.color : 'text-gray-500'}`}>
                            {count}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Likes info */}
                {post.likes.length > 0 && (() => {
                  const isLikesExpanded = expandedLikes.includes(post.id);
                  const myLikes = post.likes.filter(l => l.author === guestName);
                  const otherLikers = Array.from(new Set(post.likes.filter(l => l.author !== guestName).map(l => l.author)));
                  const allLikers = Array.from(new Set(post.likes.map(l => l.author)));
                  
                  if (isLikesExpanded) {
                    return (
                      <div className="text-[13px] font-medium text-gray-900 mb-1">
                        Curtido por: <span className="font-normal">{allLikers.map(formatName).join(', ')}</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedLikes(prev => prev.filter(id => id !== post.id))
                          }}
                          className="ml-2 text-gray-500 hover:text-gray-700 text-[11px] uppercase tracking-wider font-bold"
                        >
                          Ocultar
                        </button>
                      </div>
                    );
                  }
                  
                  let summary = null;
                  if (post.likes.length === 1 && myLikes.length > 0) {
                    summary = <>Curtido por <span className="font-bold">você</span></>;
                  } else if (myLikes.length > 0 && otherLikers.length > 0) {
                    summary = <>Curtido por <span className="font-bold">você</span>, <span className="font-bold">{formatName(otherLikers[0])}</span> e <span className="font-bold">outras {otherLikers.length - 1} {otherLikers.length - 1 === 1 ? 'pessoa' : 'pessoas'}</span></>;
                  } else if (otherLikers.length === 1) {
                    summary = <>Curtido por <span className="font-bold">{formatName(otherLikers[0])}</span></>;
                  } else if (otherLikers.length > 1) {
                    summary = <>Curtido por <span className="font-bold">{formatName(otherLikers[0])}</span> e <span className="font-bold">outras {otherLikers.length - 1} {otherLikers.length - 1 === 1 ? 'pessoa' : 'pessoas'}</span></>;
                  }
                  
                  return (
                    <div 
                      className="text-[13px] font-medium text-gray-900 mb-1 cursor-pointer hover:underline"
                      onClick={() => setExpandedLikes(prev => [...prev, post.id])}
                    >
                      {summary}
                    </div>
                  );
                })()}

                {/* Upload timestamp (instead of file name) */}
                {post.type === 'media' && post.timestamp && (
                  <div className="text-sm mb-2 mt-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span className="font-semibold text-gray-900 mr-1 sm:mr-0 inline-flex">{formatName(post.author)}</span>
                    <span className="text-gray-500 text-xs mt-0.5 font-medium">
                      Adicionado em {format(post.timestamp, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                )}

                {/* Comments */}
                {post.comments.length > 0 && (() => {
                  const isExpanded = expandedComments.includes(post.id);
                  const commentsToShow = isExpanded ? post.comments : post.comments.slice(-2);
                  return (
                    <div className="text-sm mt-1 space-y-1">
                      {post.comments.length > 2 && !isExpanded && (
                        <div 
                          className="text-gray-500 text-[13px] mb-1 cursor-pointer hover:underline"
                          onClick={() => setExpandedComments(prev => [...prev, post.id])}
                        >
                          Ver todos os {post.comments.length} comentários
                        </div>
                      )}
                      {commentsToShow.map(c => (
                        <div key={c.id} className="text-gray-900 group flex items-start justify-between">
                          {editingCommentId === c.id ? (
                            <div className="flex-1 flex gap-2">
                              <input
                                autoFocus
                                value={editingCommentText}
                                onChange={e => setEditingCommentText(e.target.value)}
                                className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-gray-300"
                                onKeyDown={e => {
                                  if (e.key === 'Enter') submitEditComment(post, c.id);
                                  if (e.key === 'Escape') setEditingCommentId(null);
                                }}
                              />
                              <button onClick={() => submitEditComment(post, c.id)} className="text-pink-500 hover:text-pink-600 text-xs font-semibold">Salvar</button>
                              <button onClick={() => setEditingCommentId(null)} className="text-gray-400 hover:text-gray-600 text-xs">Cancelar</button>
                            </div>
                          ) : (
                            <>
                              <div>
                                <span className="font-semibold mr-1">{formatName(c.author)}</span>
                                <span>{c.content}</span>
                              </div>
                              <div className="flex items-center gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                {(isAdmin || (c.authorSessionId && sessionId && c.authorSessionId === sessionId) || (c.authorSessionId && guestSessionId && c.authorSessionId === guestSessionId) || (formatName(c.author) === formatName(guestName || ''))) && (
                                  <>
                                    <button 
                                      onClick={() => { setEditingCommentId(c.id); setEditingCommentText(c.content); }}
                                      className="text-gray-400 hover:text-blue-500"
                                      title="Editar"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteComment(post, c.id)}
                                      className="text-gray-400 hover:text-red-500"
                                      title="Excluir"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Add comment input */}
                {commentingId === post.id && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 flex items-center gap-2"
                  >
                    <input 
                      type="text"
                      placeholder="Adicione um comentário..."
                      className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-full px-4 py-2 focus:outline-none focus:border-gray-300 focus:bg-white transition-colors"
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && submitComment(post)}
                      autoFocus
                    />
                    <button 
                      onClick={() => submitComment(post)}
                      disabled={!commentText.trim()}
                      className="p-2 text-pink-500 disabled:opacity-50 hover:bg-pink-50 rounded-full transition-colors"
                    >
                      <Send size={18} />
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
        </AnimatePresence>
        
        {displayLimit < feedPosts.length && (
          <div 
            key={`observer-${displayLimit}`}
            className="w-full py-8 flex justify-center"
            ref={(el) => {
              if (!el) return;
              const observer = new IntersectionObserver(
                entries => {
                  if (entries[0].isIntersecting) {
                    setDisplayLimit(prev => prev + 10);
                    observer.disconnect();
                  }
                },
                { threshold: 0.1 }
              );
              observer.observe(el);
            }}
          >
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-8 h-8 border-4 border-[#D4A373]/20 border-t-[#D4A373] rounded-full"
            />
          </div>
        )}
      </div>
      
      {/* Share Modal */}
      <ShareModal 
        isOpen={shareTarget !== null} 
        onClose={() => setShareTarget(null)} 
        url={shareTarget?.mediaDriveId ? `${window.location.origin}/?ids=${shareTarget.mediaDriveId}` : `${window.location.origin}/?feed=${shareTarget?.id}`}
        title={`Confira o post de ${shareTarget?.author}!`} 
        mediaUrl={shareTarget?.mediaDriveId ? `/api/${shareTarget.mediaType === 'video' ? 'video' : 'image'}/${shareTarget.mediaDriveId}` : undefined}
        mediaType={shareTarget?.mediaType}
      />
      {/* Modal Overlay explicitly for Feed to fix issues with iframe popups */}
      {deleteConfirmInfo && (
        <Portal>
        <div className="fixed inset-0 z-[10000] overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={() => setDeleteConfirmInfo(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
              <h3 className="text-xl font-serif text-gray-800 mb-2">Confirmar Exclusão</h3>
              <p className="text-gray-600 mb-6">
                Tem certeza que deseja excluir este {deleteConfirmInfo.type === 'post' ? 'post' : 'comentário'} permanentemente?
              </p>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setDeleteConfirmInfo(null)}
                  className="btn-beige px-5 py-2.5 rounded-full font-medium"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete}
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
