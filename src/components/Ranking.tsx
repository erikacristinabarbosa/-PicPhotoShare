import React, { useState } from 'react';
import { 
  Trophy, Camera, Heart, MessageCircle, Medal, 
  PartyPopper, Music, Star, Crown, Info, X,
  TrendingUp, Award, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGlobalRanking } from '../RankingContext';
import { RankingUser } from '../hooks/useRanking';

export default function Ranking() {
  const { ranking, isLoading } = useGlobalRanking();
  const [selectedUser, setSelectedUser] = useState<RankingUser | null>(null);

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
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-center gap-3 mb-10 mt-4 flex-wrap">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 bg-yellow-50/50 px-3 py-1 rounded-full border border-yellow-100/50"
        >
          <Trophy size={14} className="text-yellow-600" />
          <h2 className="text-sm font-serif font-bold text-gray-800 tracking-tight whitespace-nowrap">
            Os mais animados da festa
          </h2>
        </motion.div>
        <div className="flex items-center gap-1.5 text-gray-500 italic">
          <TrendingUp size={10} className="text-green-500" />
          <p className="text-[10px]">Confira o ranking!</p>
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
              <span className="font-medium text-gray-600">Mídia = <strong className="text-[#D4A373]">10 pts</strong></span>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
              <MessageCircle size={14} className="text-blue-400" />
              <span className="font-medium text-gray-600">Mensagem = <strong className="text-blue-500">5 pts</strong></span>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
              <MessageCircle size={14} className="text-indigo-400" />
              <span className="font-medium text-gray-600">Comentário = <strong className="text-indigo-500">3 pts</strong></span>
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
              <div className="flex-1 text-center md:text-left min-w-0 md:pt-4 w-full">
                <div className="flex flex-col md:flex-row md:items-center gap-2 mb-4 w-full">
                  
                  <div className="relative flex flex-col items-center md:items-start min-w-0 w-full md:w-auto">
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
                    <div className="w-full max-w-[200px] sm:max-w-xs md:max-w-full overflow-hidden">
                      <h3 className={`text-xl sm:text-2xl font-serif truncate ${index === 0 ? 'text-amber-900' : 'text-gray-800'}`}>
                        {user.name}
                      </h3>
                    </div>
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
              className="relative w-full max-w-4xl bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row"
            >
              <button 
                onClick={() => setSelectedUser(null)}
                className="absolute top-4 right-4 p-2.5 btn-beige shadow-sm rounded-full z-20"
              >
                <X size={20} />
              </button>

              {/* Left Column: Photo */}
              <div className="w-full md:w-2/5 md:min-w-[320px] bg-gradient-to-br from-pink-50 to-amber-50 relative flex flex-col pt-12 p-6 md:p-8 shrink-0 border-b md:border-b-0 md:border-r border-pink-100/50">
                <div className="relative z-10 w-full h-[250px] md:h-[400px] bg-white rounded-3xl shadow-xl shadow-pink-200/20 flex items-center justify-center text-[#D4A373] overflow-hidden border-4 border-white shrink-0">
                  {selectedUser.avatarUrl ? (
                    <img src={selectedUser.avatarUrl} alt={selectedUser.name} className="w-full h-full object-contain bg-gray-50/50" />
                  ) : (
                    <span className="text-6xl font-serif font-bold">{selectedUser.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                {/* Visual Flair placed under the picture in desktop */}
                <div className="hidden md:flex flex-col items-center justify-center grow pt-6">
                  <div className="w-16 h-1 bg-[#D4A373]/20 rounded-full mb-3"></div>
                  <span className="text-xs uppercase tracking-[0.2em] text-[#D4A373]/60 font-bold">Convidado de Honra</span>
                </div>
              </div>

              {/* Right Column: Details */}
              <div className="w-full p-8 md:p-12 flex flex-col justify-center text-left bg-white">
                <h3 className="text-3xl md:text-4xl font-serif text-gray-800 mb-3 break-words leading-tight pr-8" title={selectedUser.name}>
                  {selectedUser.name}
                </h3>
                
                <div className="flex items-center gap-2 mb-8">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4A373] to-[#B38728] flex items-center justify-center shadow-md">
                    <Trophy size={14} className="text-white" />
                  </div>
                  <p className="text-[#D4A373] font-bold text-sm uppercase tracking-widest">
                    {selectedUser.total} Pontos de Animação
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
                  <div className="p-4 bg-amber-50 rounded-3xl border border-amber-100/50 flex flex-col items-center justify-center group hover:-translate-y-1 transition-transform">
                    <Camera size={26} className="text-amber-600 mb-2 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                    <div className="text-2xl font-bold text-amber-900 leading-none">{selectedUser.photos}</div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-amber-500 mt-1">Mídias</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-3xl border border-purple-100/50 flex flex-col items-center justify-center group hover:-translate-y-1 transition-transform">
                    <MessageCircle size={26} className="text-purple-600 mb-2 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                    <div className="text-2xl font-bold text-purple-900 leading-none">{selectedUser.messages}</div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-purple-500 mt-1 truncate w-full text-center">Mensagens</div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-3xl border border-blue-100/50 flex flex-col items-center justify-center group hover:-translate-y-1 transition-transform">
                    <MessageCircle size={26} className="text-blue-600 mb-2 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                    <div className="text-2xl font-bold text-blue-900 leading-none">{selectedUser.comments}</div>
                    <div className="text-[10px] md:text-[10px] uppercase tracking-wider font-bold text-blue-500 mt-1 truncate w-full text-center">Coments</div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-3xl border border-red-100/50 flex flex-col items-center justify-center group hover:-translate-y-1 transition-transform">
                    <Heart size={26} className="text-red-600 mb-2 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                    <div className="text-2xl font-bold text-red-900 leading-none">{selectedUser.likes}</div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-red-500 mt-1">Curtidas</div>
                  </div>
                </div>

                <div className="bg-gray-50/80 rounded-[2rem] p-6 border border-gray-100 mb-8 w-full relative overflow-hidden">
                  <div className="flex items-center gap-3 mb-3 relative z-10">
                    <TrendingUp size={20} className="text-green-500" />
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Análise de Animação</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed relative z-10">
                    <strong className="text-gray-900 font-semibold">{selectedUser.name}</strong> tem um nível de festa de <span className="font-bold text-[#D4A373] text-base">{selectedUser.animationLevel}%</span>. 
                    {selectedUser.animationLevel > 80 ? " Um verdadeiro ícone da noite! Brilhando demais! ✨" : 
                     selectedUser.animationLevel > 50 ? " Está agitando muito a pista, curtindo tudo! 💃" : 
                     " Está começando a se soltar... a festa agradece! 🎈"}
                  </p>
                  
                  {/* Subtle progress background */}
                  <div className="absolute bottom-0 left-0 h-1 bg-gray-200 w-full">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${selectedUser.animationLevel}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                      className="h-full bg-gradient-to-r from-[#D4A373] to-[#B38728]"
                    />
                  </div>
                </div>

                <div className="mt-auto">
                  <button 
                    onClick={() => setSelectedUser(null)}
                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold shadow-lg shadow-gray-900/20 hover:bg-black hover:shadow-gray-900/30 transition-all active:scale-[0.98]"
                  >
                    Fechar Estatísticas
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
