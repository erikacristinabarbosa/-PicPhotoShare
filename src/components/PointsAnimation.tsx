import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Trophy, Zap, Crown, Medal } from 'lucide-react';
import { useSession } from '../SessionContext';
import { useGlobalRanking } from '../RankingContext';

interface AnimationEvent {
  actionName: string;
  points: number;
}

export default function PointsAnimation() {
  const { guestName } = useSession();
  const { ranking } = useGlobalRanking();
  
  const [currentEvent, setCurrentEvent] = useState<AnimationEvent | null>(null);
  const [show, setShow] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // We preload a futuristic/game-like sound here if we had an asset, or rely on a synthesized beep
    audioRef.current = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=success-1-6297.mp3'); 
  }, []);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handlePointsEarned = (e: Event) => {
      const customEvent = e as CustomEvent<AnimationEvent>;
      setCurrentEvent(customEvent.detail);
      setShow(true);
      
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.warn("Audio play failed:", e));
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setShow(false);
      }, 4000);
    };

    window.addEventListener('points-earned', handlePointsEarned);
    return () => {
      window.removeEventListener('points-earned', handlePointsEarned);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  }, []);

  const normalizedName = guestName ? guestName.trim().toLowerCase() : '';
  const guestRankData = ranking.find(r => r.normName === normalizedName);
  
  // Calculate display stats. Since ranking might be delayed, we might just display what we have.
  const displayTotal = guestRankData?.total || 0;
  const position = guestRankData?.position || 0;
  const isTop3 = position > 0 && position <= 3;

  return (
    <AnimatePresence>
      {show && currentEvent && (
        <motion.div
          className="fixed inset-0 z-[999999] pointer-events-none flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Subtle backdrop overlay */}
          <motion.div 
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="relative bg-gradient-to-br from-slate-900/90 to-black/90 border border-yellow-500/50 p-8 rounded-3xl shadow-[0_0_50px_rgba(234,179,8,0.3)] flex flex-col items-center justify-center text-center overflow-hidden max-w-sm w-full"
            initial={{ scale: 0.8, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.5 }}
          >
            {/* Spinning background effect */}
            <motion.div 
              className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(234,179,8,0.3)_360deg)] opacity-50"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
            />
            <div className="absolute inset-1 bg-slate-900 rounded-[22px] z-0" />

            <div className="relative z-10 flex flex-col items-center gap-4">
              <motion.div 
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-xl shadow-yellow-500/30"
              >
                <Zap className="w-10 h-10 text-white fill-white" />
              </motion.div>

              <div>
                <motion.h2 
                  className="text-2xl font-bold bg-gradient-to-r from-yellow-200 to-yellow-500 bg-clip-text text-transparent"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {currentEvent.actionName}
                </motion.h2>
                <motion.div 
                  className="text-5xl font-black text-white mt-2 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: [1.2, 1], opacity: 1 }}
                  transition={{ delay: 0.4, type: "spring" }}
                >
                  +{currentEvent.points} <span className="text-xl font-medium text-yellow-500">pts</span>
                </motion.div>
              </div>

              <motion.div 
                className="w-full h-px bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent my-2"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.5 }}
              />

              <motion.div 
                className="flex items-center gap-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <div className="flex flex-col items-center">
                  <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Total</span>
                  <span className="text-2xl font-bold text-white">{displayTotal}</span>
                </div>
                
                {position > 0 && (
                  <div className="flex flex-col items-center">
                    <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Posição</span>
                    <div className="flex items-center gap-1">
                      {isTop3 ? (
                        position === 1 ? <Crown className="w-5 h-5 text-yellow-400" /> : <Medal className={`w-5 h-5 ${position === 2 ? 'text-slate-300' : 'text-amber-600'}`} />
                      ) : (
                        <Trophy className="w-4 h-4 text-slate-500" />
                      )}
                      <span className={`text-2xl font-bold ${isTop3 ? 'text-yellow-400' : 'text-white'}`}>{position}º</span>
                    </div>
                  </div>
                )}
              </motion.div>

              {isTop3 && (
                <motion.div 
                  className="mt-2 bg-yellow-500/20 text-yellow-300 px-4 py-1.5 rounded-full text-sm font-medium border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.8, type: "spring" }}
                >
                  Wow! Você está no TOP 3! 🏆
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
