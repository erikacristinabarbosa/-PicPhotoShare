import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Settings } from '../types';
import { Heart, Gift, Mail, Sparkles, PartyPopper, Lock, KeyRound, Music, Scissors, Star, Film, Ticket, Aperture, BookOpen, Crown, Coffee, Plane, Camera as CameraIcon, Lightbulb, Compass, MapPin } from 'lucide-react';
import { audioPresets } from '../lib/audioPresets';

interface EntranceScreenProps {
  settings: Settings;
  onEnter: () => void;
}

export default function EntranceScreen({ settings, onEnter }: EntranceScreenProps) {
  const [opening, setOpening] = useState(false);
  const template = settings.entranceTemplate || 'none';
  const audioPreset = settings.entranceAudioPreset || 'none';

  useEffect(() => {
    if (template === 'none') {
      onEnter();
    } else {
      setTimeout(() => {
        handleOpen();
      }, 1500); // Wait 1.5s to show the entrance screen icon, then start animation
    }
  }, [template]); // Removed onEnter from deps so it doesn't trigger unexpectedly

  if (template === 'none') return null;

  const playInteractiveSound = () => {
    // Only try to play if a sound is configured
    if (audioPreset !== 'none') {
      try {
        let soundUrl = '';
        if (audioPreset === 'custom' && settings.entranceAudioUrl) {
           soundUrl = settings.entranceAudioUrl;
        } else if (audioPresets[audioPreset]) {
           soundUrl = audioPresets[audioPreset].url;
        } else if (settings.customAudioPresets?.find(p => p.id === audioPreset)) {
           soundUrl = settings.customAudioPresets.find(p => p.id === audioPreset)!.url;
        }

        if (soundUrl) {
          const audio = new Audio(soundUrl);
          audio.volume = 0.5;
          audio.play().catch(console.error);
        }
      } catch (e) {
        console.error('Error playing effect:', e);
      }
    }
  };

  const handleOpen = () => {
    if (opening) return;
    setOpening(true);
    playInteractiveSound();

    if (template === 'party_popper') {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    } else if (template === 'magic_dust') {
      const duration = 3 * 1000;
      const end = Date.now() + duration;

      (function frame() {
        confetti({
          particleCount: 8,
          angle: 60,
          spread: 65,
          origin: { x: 0 },
          colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8']
        });
        confetti({
          particleCount: 8,
          angle: 120,
          spread: 65,
          origin: { x: 1 },
          colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());
    } else if (template === 'wedding_rings') {
       confetti({
        particleCount: 80,
        spread: 120,
        origin: { y: 0.5 },
        colors: ['#FFD700', '#FFF8DC', '#FFFFFF']
      });
    } else if (template === 'fireworks') {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        function randomInRange(min: number, max: number) {
          return Math.random() * (max - min) + min;
        }

        const interval: any = setInterval(function() {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 20 * (timeLeft / duration);
          confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
          confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);
    } else if (template === 'stars') {
       confetti({
        particleCount: 80,
        spread: 100,
        origin: { y: 0.5 },
        shapes: ['star'],
        colors: ['#FDE047', '#FEF08A', '#FFFBEB']
      });
    } else if (template === 'gift') {
       confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6']
      });
    } else if (template === 'envelope') {
       confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#FBCFE8', '#F472B6', '#E879F9', '#FFFFFF']
      });
    } else if (template === 'crown') {
       confetti({
        particleCount: 70,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#FBBF24', '#F59E0B', '#D97706', '#FFFFFF']
      });
    } else if (template === 'ribbon') {
       confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.5 },
        colors: ['#DC2626', '#EF4444', '#FCA5A5']
      });
    } else if (template === 'ticket') {
       confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.5 },
        colors: ['#D4A373', '#FAEDCD', '#000000', '#FFFFFF']
      });
    } else if (template === 'music_box') {
      confetti({
        particleCount: 60,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#8B5CF6', '#A78BFA', '#C4B5FD', '#FFFFFF'],
        shapes: ['circle']
      });
    } else if (template === 'plane') {
      confetti({
        particleCount: 50,
        spread: 120,
        startVelocity: 50,
        origin: { y: 0.6 },
        colors: ['#0EA5E9', '#7DD3FC', '#FFFFFF'],
        shapes: ['square']
      });
    } else if (template === 'camera') {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.5 },
        colors: ['#9CA3AF', '#D1D5DB', '#FFFFFF'],
        shapes: ['circle']
      });
    } else if (template === 'coffee' || template === 'book' || template === 'lock' || template === 'clapperboard' || template === 'idea' || template === 'compass' || template === 'map') {
      // Just a subtle generic pop for the rest
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#D4A373', '#FFFFFF']
      });
    }

    setTimeout(() => {
      onEnter();
    }, 1500); // 1.5s delay before moving to actual welcome modal so animation can finish
  };

  const renderIcon = () => {
    switch (template) {
      case 'wedding_rings':
        return <div className="relative">
                 <div className="absolute -left-4 -top-2"><div className="w-16 h-16 rounded-full border-4 border-yellow-400 opacity-80 mix-blend-multiply"></div></div>
                 <div className="w-16 h-16 rounded-full border-4 border-yellow-300 relative z-10 shadow-lg"></div>
                 <Heart className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-50" size={24} />
               </div>;
      case 'gift': return <Gift size={80} className="text-[#D4A373] drop-shadow-lg" />;
      case 'envelope': return <Mail size={80} className="text-[#D4A373] drop-shadow-lg" />;
      case 'party_popper': return <PartyPopper size={80} className="text-[#D4A373] drop-shadow-lg" />;
      case 'magic_dust': return <Sparkles size={80} className="text-amber-400 drop-shadow-lg" />;
      case 'lock': return <KeyRound size={80} className="text-gray-400 drop-shadow-lg" />;
      case 'music_box': return <Music size={80} className="text-[#8B5CF6] drop-shadow-lg" />;
      case 'ribbon': return <Scissors size={80} className="text-[#EF4444] drop-shadow-lg" />;
      case 'stars': return <Star size={80} className="text-[#FBBF24] drop-shadow-lg" />;
      case 'fireworks': return <Sparkles size={80} className="text-[#EC4899] drop-shadow-lg" />;
      case 'clapperboard': return <Film size={80} className="text-gray-800 drop-shadow-lg" />;
      case 'ticket': return <Ticket size={80} className="text-[#D4A373] drop-shadow-lg" />;
      case 'portal': return <Aperture size={80} className="text-blue-500 drop-shadow-lg" />;
      case 'book': return <BookOpen size={80} className="text-[#8B4513] drop-shadow-lg" />;
      case 'crown': return <Crown size={80} className="text-yellow-500 drop-shadow-lg" />;
      case 'coffee': return <Coffee size={80} className="text-stone-600 drop-shadow-lg" />;
      case 'plane': return <Plane size={80} className="text-sky-500 drop-shadow-lg" />;
      case 'camera': return <CameraIcon size={80} className="text-gray-600 drop-shadow-lg" />;
      case 'idea': return <Lightbulb size={80} className="text-yellow-400 drop-shadow-lg" />;
      case 'compass': return <Compass size={80} className="text-indigo-500 drop-shadow-lg" />;
      case 'map': return <MapPin size={80} className="text-red-500 drop-shadow-lg" />;
      default: return <Heart size={80} className="text-red-400 drop-shadow-lg" />;
    }
  };

  const renderText = () => {
    switch (template) {
      case 'wedding_rings': return 'Celebrando o amor...';
      case 'gift': return 'Abrindo seu presente...';
      case 'envelope': return 'Abrindo o convite...';
      case 'party_popper': return 'Vamos celebrar?';
      case 'magic_dust': return 'Espalhando magia...';
      case 'lock': return 'Destrancando...';
      case 'music_box': return 'Aumenta o som...';
      case 'ribbon': return 'Inaugurando...';
      case 'stars': return 'Faça um pedido...';
      case 'fireworks': return 'Aproveite o show!';
      case 'clapperboard': return 'Luz, Câmera, Ação!';
      case 'ticket': return 'Entrando com passe VIP...';
      case 'portal': return 'Entrando no portal...';
      case 'book': return 'Abrindo o primeiro capítulo...';
      case 'crown': return 'Atenção, majestade...';
      case 'coffee': return 'Aproveite o momento...';
      case 'plane': return 'Decolando...';
      case 'camera': return 'Faça uma pose!';
      case 'idea': return 'Preparando a surpresa...';
      case 'compass': return 'Começando a jornada...';
      case 'map': return 'Chegando ao destino...';
      default: return 'Entrando...';
    }
  };

  return (
    <AnimatePresence>
      {!opening && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.2, transition: { duration: 1 } }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-gray-900/95 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: [0.8, 1.1, 1], rotate: [0, -5, 5, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="flex flex-col items-center gap-6"
          >
            <div className="bg-white/10 p-8 rounded-full border border-white/20 shadow-[0_0_50px_rgba(212,163,115,0.3)]">
              {renderIcon()}
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="text-white text-xl font-medium tracking-wide">
                {renderText()}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
