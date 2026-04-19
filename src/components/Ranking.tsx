import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, collectionGroup, query, where } from 'firebase/firestore';
import { 
  Trophy, Camera, Heart, MessageCircle, Medal, 
  PartyPopper, Music, Star, Crown, Info, X,
  TrendingUp, Award, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RankingUser {
  name: string;
  photos: number;
  likes: number;
  comments: number;
  total: number;
  animationLevel: number; // 0-100
  avatarUrl?: string;
}

export default function Ranking() {
  const [ranking, setRanking] = useState<RankingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<RankingUser | null>(null);
  
  // Dependency states
  const [media, setMedia] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [guestbook, setGuestbook] = useState<any[]>([]);
  const [likes, setLikes] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);

  useEffect(() => {
    let unsubs: (() => void)[] = [];

    unsubs.push(onSnapshot(query(collection(db, 'media'), where('status', '==', 'approved')), snapshot => {
      setMedia(snapshot.docs);
    }));

    unsubs.push(onSnapshot(collectionGroup(db, 'comments'), snapshot => {
      setComments(snapshot.docs);
    }));

    unsubs.push(onSnapshot(collection(db, 'guestbook'), snapshot => {
      setGuestbook(snapshot.docs);
    }));

    unsubs.push(onSnapshot(collectionGroup(db, 'likes'), snapshot => {
      setLikes(snapshot.docs);
    }));

    unsubs.push(onSnapshot(collection(db, 'predictions'), snapshot => {
      setPredictions(snapshot.docs);
    }));

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, []);

  useEffect(() => {
    const computeRanking = (m: any[], c: any[], g: any[], l: any[], p: any[]) => {
      setIsLoading(true);
      try {
        const userStats: Record<string, RankingUser> = {};
        const sessionToName: Record<string, string> = {};

        const getNormalizedName = (name: string | undefined | null) => {
          if (!name || name.trim() === '') return 'anônimo';
          return name.trim().toLowerCase();
        };

        const getDisplayName = (name: string | undefined | null) => {
          if (!name || name.trim() === '') return 'Anônimo';
          return name
            .trim()
            .toLowerCase()
            .split(/\s+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        };

        const updateStats = (sessionId: string | undefined, authorName: string | undefined, type: 'photos' | 'comments', avatarData?: { driveFileId?: string, thumbnailLink?: string }) => {
          const normName = getNormalizedName(authorName);
          if (sessionId) {
            sessionToName[sessionId] = normName;
          }
          
          if (!userStats[normName]) {
            userStats[normName] = { name: getDisplayName(authorName), photos: 0, likes: 0, comments: 0, total: 0, animationLevel: 0 };
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

        // 1. Photos & Videos
        const approvedMediaIds = new Set<string>();
        m.forEach(doc => {
          const data = doc.data() as any;
          approvedMediaIds.add(doc.id);
          // Count both photos and videos as valid media contributions
          if (data.type === 'photo' || data.type === 'video') {
            updateStats(data.authorSessionId, data.author, 'photos', { driveFileId: data.driveFileId, thumbnailLink: data.thumbnailLink });
          }
        });

        // 2. Comments (Only from approved media)
        c.forEach(doc => {
          const data = doc.data() as any;
          const mediaId = doc.ref.parent.parent?.id;
          if (mediaId && approvedMediaIds.has(mediaId)) {
            updateStats(data.authorSessionId, data.author, 'comments');
          }
        });

        // 3. Comments (from guestbook)
        g.forEach(doc => {
          const data = doc.data() as any;
          updateStats(data.authorSessionId, data.author, 'comments', { driveFileId: data.driveFileId, thumbnailLink: data.thumbnailLink });
        });

        // 3.5. Predictions
        p.forEach(doc => {
          const data = doc.data() as any;
          updateStats(data.authorSessionId, data.author, 'comments', { driveFileId: data.driveFileId, thumbnailLink: data.thumbnailLink });
        });

        // 4. Likes
        l.forEach(doc => {
          const data = doc.data() as any;
          const mediaId = doc.ref.parent.parent?.id;
          
          if (mediaId && approvedMediaIds.has(mediaId)) {
            const sessionId = data.sessionId || doc.id;
            if (sessionId) {
              const normName = sessionToName[sessionId] || getNormalizedName(data.author);
              if (!userStats[normName]) {
                const displayName = data.author ? getDisplayName(data.author) : 'Anônimo';
                userStats[normName] = { name: displayName, photos: 0, likes: 0, comments: 0, total: 0, animationLevel: 0 };
              }
              userStats[normName].likes += 1;
              
              // If we didn't have a display name before but now we have one from the like, update it
              if (data.author && userStats[normName].name === 'Anônimo') {
                userStats[normName].name = getDisplayName(data.author);
              }
            }
          }
        });

        // Calculate total and sort
        const rawRanking = Object.values(userStats)
          .filter(stat => stat.name.toLowerCase() !== 'anônimo')
          .map(stat => ({
            ...stat,
            total: stat.photos * 10 + stat.comments * 5 + stat.likes * 2 // Weighting
          })).sort((a, b) => b.total - a.total);

        const maxScore = rawRanking.length > 0 ? rawRanking[0].total : 1;
        
        const rankingArray = rawRanking.map(stat => ({
          ...stat,
          animationLevel: Math.min(100, Math.round((stat.total / maxScore) * 100))
        })).slice(0, 10);

        setRanking(rankingArray);
      } catch (error) {
        console.error("Error computing ranking:", error);
      } finally {
        setIsLoading(false);
      }
    };
    computeRanking(media, comments, guestbook, likes, predictions);
  }, [media, comments, guestbook, likes, predictions]);

  const getRankColor = (index: number) => {
    switch(index) {
      case 0: return 'from-[#D4A373] to-[#B38728]'; // Premium Gold
      case 1: return 'from-slate-300 to-slate-500';
      case 2: return 'from-orange-400 to-orange-700';
      default: return 'from-pink-400 to-rose-500';
    }
  };

  const getCardBg = (index: number) => {
    switch(index) {
      case 0: return 'bg-gradient-to-br from-[#FFFDF0] to-[#FDF2D0] border-amber-200 shadow-amber-100/50';
      case 1: return 'bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200 shadow-slate-100/50';
      case 2: return 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-200 shadow-orange-100/50';
      default: return 'bg-white border-gray-100 shadow-gray-100/50';
    }
  };

  console.log("Rendering Ranking with:", ranking.length, "users");
  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center py-32 space-y-4">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-pink-100 border-t-[#D4A373] rounded-full"
        />
        <p className="text-[#D4A373] font-serif animate-pulse">Calculando animação...</p>
      </div>
    );
  }

  if (ranking.length === 0) {
    return (
      <div className="text-center py-20 px-6">
        <div className="bg-white rounded-[3rem] p-12 shadow-xl border border-pink-50">
          <PartyPopper size={64} className="mx-auto mb-6 text-pink-200" />
          <h3 className="text-2xl font-serif text-gray-800 mb-2">A festa está só começando!</h3>
          <p className="text-gray-500">Seja o primeiro a postar e lidere o ranking de animação.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="inline-block p-4 bg-gradient-to-br from-yellow-100 to-pink-100 rounded-[2rem] shadow-inner mb-6"
        >
          <Trophy size={48} className="text-yellow-600" />
        </motion.div>
        <h2 className="text-2xl font-serif text-gray-800 tracking-tight mb-4">
          Os mais animados da festa
        </h2>
        <div className="flex items-center justify-center gap-2 text-gray-500 max-w-md mx-auto mb-6">
          <TrendingUp size={18} className="text-green-500" />
          <p>Quem está fazendo a festa acontecer? Confira o ranking!</p>
        </div>

        {/* Info Box about scoring formula */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/60 backdrop-blur-sm border border-pink-100 rounded-2xl p-4 max-w-2xl mx-auto shadow-sm"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <Info size={16} className="text-pink-500" />
            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Como funciona a pontuação?</h4>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
              <Camera size={14} className="text-[#D4A373]" />
              <span className="font-medium text-gray-600">Foto = <strong className="text-[#D4A373]">10 pts</strong></span>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
              <MessageCircle size={14} className="text-blue-400" />
              <span className="font-medium text-gray-600">Mensagem = <strong className="text-blue-500">5 pts</strong></span>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
              <Heart size={14} className="text-red-400" />
              <span className="font-medium text-gray-600">Curtida = <strong className="text-red-500">2 pts</strong></span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Ranking List */}
      <div className="grid gap-6">
        {ranking.map((user, index) => (
          <motion.div
            key={user.name}
            initial={{ opacity: 0, y: 50, x: index % 2 === 0 ? -20 : 20 }}
            animate={index === 0 ? { 
              opacity: 1, y: 0, x: 0,
              scale: [1, 1.02, 1],
            } : { opacity: 1, y: 0, x: 0 }}
            transition={index === 0 ? {
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              opacity: { duration: 0.6, delay: index * 0.1 },
              y: { duration: 0.6, delay: index * 0.1 },
              x: { duration: 0.6, delay: index * 0.1 },
              type: "spring",
              bounce: 0.4
            } : { 
              duration: 0.6, 
              delay: index * 0.1,
              type: "spring",
              bounce: 0.4
            }}
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedUser(user)}
            className={`cursor-pointer group relative rounded-[2.5rem] p-6 md:p-8 border-2 transition-all duration-300 ${getCardBg(index)} ${
              index === 0 ? 'ring-4 ring-amber-400/20 ring-offset-4' : ''
            }`}
          >
            {/* Top 3 Glow Effects */}
            {index === 0 && (
              <div className="absolute inset-0 bg-amber-400/5 rounded-[2.5rem] blur-xl group-hover:blur-2xl transition-all"></div>
            )}

            <div className="relative flex flex-col md:flex-row items-center gap-6">
              {/* Rank Badge / Avatar */}
              <div className="relative shrink-0">
                <div className={`relative w-20 h-20 rounded-[1.5rem] bg-gradient-to-br ${getRankColor(index)} flex items-center justify-center text-white shadow-lg transform group-hover:rotate-12 transition-transform duration-500 overflow-hidden`}>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                  ) : null}
                  <div className={`absolute inset-0 flex items-center justify-center ${user.avatarUrl ? 'bg-black/30 backdrop-blur-[2px]' : ''}`}>
                    {index === 0 ? <Crown size={40} className={user.avatarUrl ? 'text-amber-300 drop-shadow-md' : ''} /> : 
                     index === 1 ? <Medal size={36} className={user.avatarUrl ? 'text-slate-200 drop-shadow-md' : ''}/> : 
                     index === 2 ? <Award size={36} className={user.avatarUrl ? 'text-orange-300 drop-shadow-md' : ''} /> : 
                     <span className="text-2xl font-bold font-serif drop-shadow-md">#{index + 1}</span>}
                  </div>
                </div>
                {index < 3 && (
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-2 -right-2 bg-white rounded-full p-1.5 shadow-md border border-gray-100 z-10"
                  >
                    <Star size={16} className="text-yellow-500 fill-yellow-500" />
                  </motion.div>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 text-center md:text-left min-w-0 md:pt-4">
                <div className="flex flex-col md:flex-row md:items-center gap-2 mb-4">
                  
                  <div className="relative inline-flex flex-col items-center md:items-start w-full md:w-auto">
                    {/* Balloon for 2nd and 3rd place */}
                    {(index === 1 || index === 2) && (
                      <motion.div
                        initial={{ y: 0, opacity: 0 }}
                        animate={{ y: [-5, -15, -5], opacity: 1 }}
                        transition={{ 
                          y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                          opacity: { duration: 0.5, delay: 0.5 }
                        }}
                        className="absolute -top-10 bg-pink-500 text-white px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap shadow-md z-20 flex items-center gap-1 self-center md:self-start md:translate-x-4"
                      >
                        Quase lá! 🎈
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-pink-500 rotate-45"></div>
                      </motion.div>
                    )}
                    <h3 className={`text-2xl font-serif truncate w-full ${index === 0 ? 'text-amber-900' : 'text-gray-800'}`}>
                      {user.name}
                    </h3>
                  </div>

                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <span className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-[#D4A373] border border-[#D4A373]/20">
                      {user.total} Pontos de Animação
                    </span>
                  </div>
                </div>

                {/* Animation Level Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter text-gray-400">
                    <span>Nível de Festa</span>
                    <span>{user.animationLevel}%</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200/50 p-0.5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${user.animationLevel}%` }}
                      transition={{ duration: 1.5, delay: 0.5 + index * 0.1 }}
                      className={`h-full rounded-full bg-gradient-to-r ${getRankColor(index)} shadow-sm relative`}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="hidden lg:flex flex-col items-end gap-2 shrink-0">
                <div className="flex gap-3">
                  <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-50 group-hover:border-pink-100 transition-colors">
                    <Camera size={20} className="text-[#D4A373]" />
                  </div>
                  <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-50 group-hover:border-pink-100 transition-colors">
                    <Heart size={20} className="text-red-400" />
                  </div>
                  <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-50 group-hover:border-pink-100 transition-colors">
                    <MessageCircle size={20} className="text-blue-400" />
                  </div>
                </div>
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Clique para detalhes</p>
              </div>
            </div>

            {/* Floating Icons for Festive Feel */}
            <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-30 transition-opacity">
              {index % 3 === 0 ? <Music size={48} /> : 
               index % 3 === 1 ? <PartyPopper size={48} /> : 
               <Zap size={48} />}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-pink-100 to-amber-100"></div>
              
              <button 
                onClick={() => setSelectedUser(null)}
                className="absolute top-6 right-6 p-2 bg-white/80 backdrop-blur-md rounded-full text-gray-400 hover:text-gray-600 z-10"
              >
                <X size={20} />
              </button>

              <div className="p-10 pt-16 text-center">
                <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl flex items-center justify-center text-[#D4A373] mx-auto mb-6 border-4 border-white relative -mt-20">
                  <span className="text-4xl font-serif font-bold">{selectedUser.name.charAt(0).toUpperCase()}</span>
                </div>
                
                <h3 className="text-3xl font-serif text-gray-800 mb-2">{selectedUser.name}</h3>
                <p className="text-[#D4A373] font-bold text-sm uppercase tracking-widest mb-8">
                  {selectedUser.total} Pontos de Animação
                </p>

                <div className="grid grid-cols-3 gap-2 md:gap-4 mb-8">
                  <div className="p-3 md:p-4 bg-amber-50 rounded-3xl border border-amber-100 flex flex-col items-center justify-center">
                    <Camera size={24} className="text-amber-600 mb-2" />
                    <div className="text-lg md:text-xl font-bold text-amber-900 leading-none">{selectedUser.photos}</div>
                    <div className="text-[8px] md:text-[9px] uppercase font-bold text-amber-500 mt-1">Fotos</div>
                  </div>
                  <div className="p-3 md:p-4 bg-red-50 rounded-3xl border border-red-100 flex flex-col items-center justify-center">
                    <Heart size={24} className="text-red-600 mb-2" />
                    <div className="text-lg md:text-xl font-bold text-red-900 leading-none">{selectedUser.likes}</div>
                    <div className="text-[8px] md:text-[9px] uppercase font-bold text-red-500 mt-1">Curtidas</div>
                  </div>
                  <div className="p-3 md:p-4 bg-blue-50 rounded-3xl border border-blue-100 flex flex-col items-center justify-center">
                    <MessageCircle size={24} className="text-blue-600 mb-2" />
                    <div className="text-lg md:text-xl font-bold text-blue-900 leading-none">{selectedUser.comments}</div>
                    <div className="text-[8px] md:text-[9px] uppercase font-bold text-blue-500 mt-1 truncate w-full text-center">Comentários</div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100">
                  <div className="flex items-center gap-3 mb-4 text-left">
                    <TrendingUp size={20} className="text-green-500" />
                    <span className="text-sm font-bold text-gray-700 uppercase tracking-tight">Análise de Animação</span>
                  </div>
                  <p className="text-sm text-gray-500 text-left leading-relaxed">
                    {selectedUser.name} está com um nível de festa de <span className="font-bold text-[#D4A373]">{selectedUser.animationLevel}%</span>. 
                    {selectedUser.animationLevel > 80 ? " Um verdadeiro ícone da noite!" : 
                     selectedUser.animationLevel > 50 ? " Está agitando muito a pista!" : 
                     " Está começando a se soltar!"}
                  </p>
                </div>

                <button 
                  onClick={() => setSelectedUser(null)}
                  className="w-full mt-8 py-4 bg-[#D4A373] text-white rounded-2xl font-bold shadow-lg shadow-[#D4A373]/20 hover:bg-[#c39162] transition-colors"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
