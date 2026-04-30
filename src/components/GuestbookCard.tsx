import React, { useState, useEffect } from 'react';
import { Share2, Trash2, Heart, MessageCircle, Send } from 'lucide-react';
import { db } from '../firebase';
import { collection, updateDoc, increment, getDocs, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { GuestbookEntry } from '../types';

interface GuestbookCardProps {
  entry: GuestbookEntry;
  isAdmin: boolean;
  settings: any;
  sessionId?: string | null;
  guestSessionId?: string | null;
  guestName?: string | null;
  handleDelete: (id: string, driveDocId?: string) => void;
  handleShare: (entry: GuestbookEntry) => void;
  formatName: (input: string) => string;
}

export default function GuestbookCard({
  entry,
  isAdmin,
  settings,
  sessionId,
  guestSessionId,
  guestName,
  handleDelete,
  handleShare,
  formatName
}: GuestbookCardProps) {
  const [likers, setLikers] = useState<string[]>([]);
  const [commenters, setCommenters] = useState<string[]>([]);
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [isLiking, setIsLiking] = useState(false);
  const [localLikesCount, setLocalLikesCount] = useState(entry.likesCount || 0);

  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const authorId = sessionId || guestSessionId || 'anonymous';
  const nameToSave = guestName || (isAdmin ? 'Anfitrião' : 'Anônimo');

  const isLikedByMe = likers.includes(nameToSave);

  useEffect(() => {
    let unsubLikes: () => void;
    let unsubComments: () => void;

    const likesRef = collection(db, 'guestbook', entry.id, 'likes');
    unsubLikes = onSnapshot(likesRef, (snap) => {
      const names = snap.docs.map(d => d.data().author || 'Anônimo');
      setLikers(Array.from(new Set(names)));
      setLocalLikesCount(snap.size);
    });

    const commentsRef = collection(db, 'guestbook', entry.id, 'comments');
    const q = query(commentsRef, orderBy('timestamp', 'asc'));
    unsubComments = onSnapshot(q, (snap) => {
      const names = snap.docs.map(d => d.data().author || 'Anônimo');
      setCommenters(Array.from(new Set(names)));
      setCommentsList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      if (unsubLikes) unsubLikes();
      if (unsubComments) unsubComments();
    }
  }, [entry.id]);

  const toggleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      const likeId = `${authorId}_heart`;
      const likeRef = doc(db, 'guestbook', entry.id, 'likes', likeId);
      const entryRef = doc(db, 'guestbook', entry.id);

      if (isLikedByMe) {
        await deleteDoc(likeRef);
        await updateDoc(entryRef, { likesCount: increment(-1) });
      } else {
        await setDoc(likeRef, {
          author: nameToSave,
          sessionId: authorId,
          type: 'heart',
          timestamp: serverTimestamp()
        });
        await updateDoc(entryRef, { likesCount: increment(1) });
        if (!isAdmin && authorId) {
          window.dispatchEvent(new CustomEvent('points-earned', { detail: { actionName: 'Curtida', points: 2 } }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLiking(false);
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      await addDoc(collection(db, 'guestbook', entry.id, 'comments'), {
        author: nameToSave,
        authorSessionId: authorId,
        text: newComment.trim(),
        timestamp: serverTimestamp()
      });
      await updateDoc(doc(db, 'guestbook', entry.id), {
        commentsCount: increment(1)
      });
      if (!isAdmin && authorId) {
        window.dispatchEvent(new CustomEvent('points-earned', { detail: { actionName: 'Comentário', points: 3 } }));
      }
      setNewComment('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <div 
      id={`entry-${entry.id}`}
      className="bg-gradient-to-b from-[#FFFDF9] to-[#FEF6EB] rounded-3xl overflow-hidden border-2 border-[#D4A373] shadow-[0_12px_30px_-10px_rgba(212,163,115,0.6),0_4px_6px_-4px_rgba(212,163,115,0.4),inset_0_2px_4px_rgba(255,255,255,1),inset_0_-4px_8px_rgba(212,163,115,0.4)] relative group/card shrink-0 w-[92vw] sm:w-[400px] max-w-full snap-center transition-all duration-500 hover:shadow-[0_20px_40px_-10px_rgba(212,163,115,0.7),0_8px_12px_-6px_rgba(212,163,115,0.5),inset_0_2px_4px_rgba(255,255,255,1),inset_0_-4px_10px_rgba(212,163,115,0.5)] hover:-translate-y-2 flex flex-col"
    >
      <div className="absolute inset-0 z-20 pointer-events-none rounded-3xl border-t-[3px] border-white/90 transition-all duration-500"></div>
      {(isAdmin || (settings?.canDelete && (entry.authorSessionId === sessionId || entry.authorSessionId === guestSessionId || (guestName && formatName(entry.author) === formatName(guestName))))) && (
        <button 
          onClick={() => handleDelete(entry.id, entry.driveFileId)}
          className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-sm text-red-400 rounded-full opacity-100 lg:opacity-0 group-hover/card:opacity-100 transition-all shadow-sm z-10 hover:bg-red-50 hover:text-red-500 scale-90 hover:scale-100"
          title="Excluir mensagem"
        >
          <Trash2 size={16} />
        </button>
      )}

      <button 
        onClick={() => handleShare(entry)}
        className="absolute top-4 left-4 p-2 bg-white/80 backdrop-blur-sm text-[#D4A373] rounded-full opacity-100 lg:opacity-0 group-hover/card:opacity-100 transition-all shadow-sm z-10 hover:bg-amber-50 scale-90 hover:scale-100"
        title="Compartilhar mensagem"
      >
        <Share2 size={16} />
      </button>
      
      {entry.driveFileId ? (
        <div className="w-full bg-gray-50 flex items-center justify-center relative p-2 pb-0">
          <img 
            src={`/api/image/${entry.driveFileId}`} 
            alt="Foto do convidado" 
            className="w-full h-[280px] object-cover rounded-t-[1.5rem] shadow-inner"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : (
        <div className="w-full h-40 bg-gradient-to-br from-amber-50/60 to-orange-50/30 flex flex-col items-center justify-center relative border-b border-[#D4A373]/20">
          {entry.authorPhotoUrl ? (
            <div className="w-20 h-20 rounded-full overflow-hidden shadow-md border-2 border-white ring-4 ring-amber-50 relative z-10">
              <img 
                src={entry.authorPhotoUrl} 
                alt={entry.author} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#D4A373] to-[#B38728] flex items-center justify-center text-white font-serif text-3xl shadow-[0_4px_10px_rgba(212,163,115,0.5)] border-2 border-white ring-4 ring-amber-50 relative z-10">
              {formatName(entry.author).charAt(0)}
            </div>
          )}
        </div>
      )}
      
      <div className={`p-8 pt-6 flex-1 flex flex-col ${showComments ? 'pb-2' : ''}`}>
        <div className="flex flex-col items-center gap-1 mb-6 text-center border-b border-gray-50 pb-4">
          <h4 className="font-serif text-2xl bg-gradient-to-br from-[#8B5E34] to-[#D4A373] bg-clip-text text-transparent tracking-wide font-bold">{formatName(entry.author)}</h4>
          {entry.timestamp && (
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-1">
              {new Date(entry.timestamp.toDate()).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
        
        <div className="relative flex-1 flex flex-col justify-center">
          <svg className="absolute -top-4 -left-2 w-8 h-8 text-[#D4A373] opacity-30 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C20.1216 16 21.017 16.8954 21.017 18V21C21.017 22.1046 20.1216 23 19.017 23H16.017C14.9124 23 14.017 22.1046 14.017 21ZM5.017 21L5.017 18C5.017 16.8954 5.91243 16 7.017 16H10.017C11.1216 16 12.017 16.8954 12.017 18V21C12.017 22.1046 11.1216 23 10.017 23H7.017C5.91243 23 5.017 22.1046 5.017 21ZM12.017 13H5.017V10H12.017V13ZM21.017 13H14.017V10H21.017V13ZM12.017 7H5.017V4H12.017V7ZM21.017 7H14.017V4H21.017V7Z" />
          </svg>
          <p className="text-gray-600 leading-relaxed font-serif italic text-sm sm:text-base relative z-10 text-center px-4 py-2">
            "{entry.message}"
          </p>
        </div>
        
        {entry.signatureDataUrl && (
          <div className="flex justify-center mt-6 pt-6 border-t border-gray-50">
            <img 
              src={entry.signatureDataUrl} 
              alt={`Assinatura de ${entry.author}`} 
              className="h-16 object-contain opacity-60 hover:opacity-100 transition-opacity duration-500"
            />
          </div>
        )}

        <div className="flex items-center gap-6 mt-6 pt-4 justify-center">
          <button
            title={likers.length > 0 ? `Curtido por: ${likers.map(formatName).join(', ')}` : 'Nenhuma curtida'}
            onClick={toggleLike}
            disabled={isLiking}
            className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-red-500 transition-colors"
          >
            <Heart size={18} className={isLikedByMe ? 'fill-red-500 text-red-500' : 'stroke-[1.5px]'} /> 
            <span className="text-[13px]">{localLikesCount}</span>
          </button>
          
          <button
            title={commenters.length > 0 ? `Comentado por: ${commenters.map(formatName).join(', ')}` : 'Nenhum comentário'}
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center gap-2 text-xs font-medium transition-colors cursor-pointer ${showComments ? 'text-[#D4A373]' : 'text-gray-400 hover:text-[#D4A373]'}`}
          >
            <MessageCircle size={18} className={`stroke-[1.5px] ${showComments ? 'fill-[#D4A373]/20' : ''}`} /> 
            <span className="text-[13px]">{commentsList.length}</span>
          </button>
        </div>
      </div>

      {/* Expandable Comments Section */}
      {showComments && (
        <div className="bg-gradient-to-b from-gray-50 to-white px-6 py-5 flex-1 flex flex-col max-h-[300px] border-t border-gray-100">
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 mb-4">
            {commentsList.length > 0 ? (
              commentsList.map(c => (
                <div key={c.id} className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-50/80">
                  <p className="text-xs font-bold text-gray-800 mb-1 font-serif tracking-wide">{formatName(c.author)}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{c.text}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-center text-gray-400 italic py-4 font-serif">Seja o primeiro a comentar!</p>
            )}
          </div>
          <form onSubmit={submitComment} className="flex gap-2 items-center bg-white p-1.5 rounded-full border border-gray-200 shadow-sm focus-within:ring-2 focus-within:ring-[#D4A373]/20 focus-within:border-[#D4A373] transition-all">
            <input 
              type="text" 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escreva um comentário..."
              className="flex-1 border-none focus:ring-0 bg-transparent text-sm px-4 py-1.5 text-gray-700 placeholder:text-gray-400"
              disabled={isSubmittingComment}
            />
            <button 
              type="submit"
              disabled={!newComment.trim() || isSubmittingComment}
              className="p-2 bg-[#D4A373] text-white rounded-full hover:bg-amber-700 disabled:opacity-30 disabled:hover:bg-[#D4A373] transition-all shrink-0 shadow-sm"
            >
              <Send size={14} className="m-0.5 ml-1" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
