import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, Sparkles, Camera, Volume2, VolumeX, Play, Crown } from 'lucide-react';
import confetti from 'canvas-confetti';
import Portal from './Portal';

interface WelcomeModalProps {
  onClose: () => void;
  settings: any;
  guestName?: string;
}

export default function WelcomeModal({ onClose, settings, guestName }: WelcomeModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Show modal immediately
    setIsVisible(true);
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        setIsPlayingAudio(true);
      }).catch(err => {
        console.log('Autoplay prevented', err);
        setAudioError(true);
      });
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setTimeout(onClose, 300); // Matches exit animation
  };

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlayingAudio) {
        audioRef.current.pause();
        setIsPlayingAudio(false);
      } else {
        audioRef.current.play();
        setIsPlayingAudio(true);
        setAudioError(false);
      }
    }
  };

  const mediaType = settings?.welcomeMediaType || 'photo';
  const mediaUrl = settings?.welcomeMediaUrl || settings?.eventPhotoUrl;
  const audioUrl = settings?.welcomeAudioUrl;
  const template = settings?.welcomeTemplate || 'modern_gradient';
  
  const message = settings?.welcomeMessage || 'Estamos muito felizes em ter você aqui para compartilhar este momento especial!';
  const eventName = settings?.eventName || 'Nosso Evento';
  const firstName = guestName?.split(' ')[0] || 'Convidado';

  const renderMedia = () => {
    if (!mediaUrl) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center text-white/50 bg-gray-200">
          <Camera size={48} className="mb-2" />
          <span className="text-sm font-medium tracking-wider uppercase">{eventName}</span>
        </div>
      );
    }

    if (mediaType === 'video') {
      return mediaUrl ? (
        <video 
          src={mediaUrl} 
          className="w-full h-full object-cover"
          autoPlay 
          muted={audioUrl ? true : false}
          loop 
          playsInline 
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-white/50 bg-gray-200">
          <Camera size={48} className="mb-2" />
          <span className="text-sm font-medium tracking-wider uppercase">{eventName}</span>
        </div>
      );
    }

    return (
      <img 
        src={mediaUrl} 
        alt="Event" 
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  };

  const renderTemplate = () => {
    switch (template) {
      case 'classic_elegant':
        return (
          <div className="relative w-full max-w-md bg-[#faf8f5] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-[#D4A373]/30">
            <div className="relative aspect-[4/5] w-full shrink-0 border-b-[3px] border-[#D4A373]">
              {renderMedia()}
            </div>
            <div className="p-8 flex flex-col items-center text-center overflow-y-auto">
              <h2 className="text-3xl font-serif text-[#5A5A40] mb-4">Bem-vindo, {firstName}</h2>
              <div className="w-8 h-[1px] bg-[#D4A373] mb-6 mx-auto" />
              <p className="text-gray-700 leading-relaxed font-serif italic text-lg">{message}</p>
              <button
                onClick={handleClose}
                className="mt-10 px-8 py-3 bg-transparent border border-[#D4A373] text-[#5A5A40] font-serif uppercase tracking-widest text-sm hover:bg-[#D4A373] hover:text-white transition-colors"
              >
                Acessar Galeria
              </button>
            </div>
          </div>
        );

      case 'minimalist':
        return (
          <div className="relative w-full max-w-sm bg-white shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="relative aspect-[4/5] w-full shrink-0">
              {renderMedia()}
            </div>
            <div className="p-8 flex flex-col items-start overflow-y-auto">
              <h2 className="text-2xl font-light text-gray-900 mb-4 tracking-tight">Olá, {firstName}.</h2>
              <p className="text-gray-500 leading-relaxed font-light text-sm">{message}</p>
              <button
                onClick={handleClose}
                className="mt-8 text-sm font-medium tracking-wide text-gray-900 hover:text-gray-500 transition-colors uppercase flex items-center gap-2"
              >
                Entrar <div className="w-6 h-[1px] bg-gray-900" />
              </button>
            </div>
          </div>
        );

      case 'polaroid':
        return (
          <div className="relative w-full max-w-sm bg-white shadow-2xl p-4 pb-12 flex flex-col max-h-[90vh] rotate-[-2deg]">
            <div className="relative aspect-[4/5] w-full shrink-0 bg-gray-100 mb-4">
              {renderMedia()}
            </div>
            <div className="flex flex-col items-center text-center overflow-y-auto">
              <p className="text-gray-800 text-xl font-['Comic_Sans_MS',_cursive,sans-serif] leading-relaxed mb-4">{message}</p>
              <p className="text-gray-500 text-sm font-['Comic_Sans_MS',_cursive,sans-serif] mb-6">- Para {firstName}</p>
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-rose-500 text-white font-bold rounded-full hover:bg-rose-600 transition-colors shadow-md"
              >
                Simbora!
              </button>
            </div>
          </div>
        );

      case 'neon_cyberpunk':
        return (
          <div className="relative w-full max-w-md bg-gray-900 border-2 border-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,0.5)] overflow-hidden flex flex-col max-h-[90vh] rounded-xl">
            <div className="relative aspect-[4/5] w-full shrink-0 border-b-2 border-cyan-400">
              {renderMedia()}
              <div className="absolute inset-0 bg-fuchsia-900/40 mix-blend-overlay" />
            </div>
            <div className="p-8 flex flex-col items-center text-center overflow-y-auto">
              <h2 className="text-3xl font-mono text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] mb-4">LOG_IN: {firstName}</h2>
              <p className="text-fuchsia-300 font-mono text-sm leading-relaxed mb-8">{message}</p>
              <button onClick={handleClose} className="px-8 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-mono uppercase tracking-[0.2em] rounded border border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.5)] transition-all">ENTER_SYSTEM</button>
            </div>
          </div>
        );

      case 'retro_arcade':
        return (
          <div className="relative w-full max-w-sm bg-black border-4 border-yellow-400 p-2 flex flex-col max-h-[90vh]">
            <div className="border-4 border-t-red-500 border-r-blue-500 border-b-green-500 border-l-yellow-500">
              <div className="relative aspect-[4/5] w-full shrink-0 grayscale hover:grayscale-0 transition-all duration-500">
                {renderMedia()}
                <div className="absolute inset-0 bg-black/20" />
              </div>
              <div className="p-6 flex flex-col items-center text-center bg-black overflow-y-auto">
                <h2 className="text-xl font-mono text-white mb-6 uppercase tracking-widest bg-blue-600 px-4 py-1">Player 1: {firstName}</h2>
                <p className="text-green-400 font-mono text-xs leading-relaxed mb-8 uppercase text-left">{message}</p>
                <button onClick={handleClose} className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-mono uppercase tracking-widest border-b-4 border-red-800 active:border-b-0 active:translate-y-1 transition-all">START_GAME</button>
              </div>
            </div>
          </div>
        );

      case 'soft_clouds':
        return (
          <div className="relative w-full max-w-md bg-gradient-to-b from-sky-100 to-white rounded-[3rem] shadow-xl overflow-hidden flex flex-col max-h-[90vh] border-4 border-white">
            <div className="relative aspect-[4/5] w-full shrink-0 shadow-inner rounded-t-[2.5rem] overflow-hidden">
              {renderMedia()}
              <div className="absolute -bottom-8 -left-8 w-16 h-16 bg-white rounded-full blur-xl opacity-80" />
              <div className="absolute -bottom-4 right-8 w-24 h-24 bg-white rounded-full blur-xl opacity-80" />
            </div>
            <div className="p-8 pb-10 flex flex-col items-center text-center overflow-y-auto">
              <h2 className="text-3xl font-bold text-sky-400 mb-4 tracking-tighter">Oi, {firstName}! ☁️</h2>
              <p className="text-sky-800/70 font-medium leading-relaxed mb-8">{message}</p>
              <button onClick={handleClose} className="px-8 py-3 bg-sky-400 hover:bg-sky-500 text-white font-bold rounded-full shadow-[0_8px_20px_rgba(56,189,248,0.4)] transition-all transform hover:-translate-y-1">Flutuar para dentro</button>
            </div>
          </div>
        );

      case 'golden_glamour':
        return (
          <div className="relative w-full max-w-md bg-[#0a0a0a] shadow-2xl flex flex-col max-h-[90vh] border border-yellow-600/30">
            <div className="p-2 border border-yellow-500/20 m-2">
              <div className="relative aspect-[4/5] w-full shrink-0 ring-1 ring-yellow-500/50">
                {renderMedia()}
                <div className="absolute inset-0 bg-gradient-to-tr from-yellow-700/20 to-transparent mix-blend-overlay" />
              </div>
              <div className="p-8 flex flex-col items-center text-center overflow-y-auto">
                <span className="text-yellow-600 text-xs tracking-[0.3em] font-serif uppercase mb-2">Convidado VIP</span>
                <h2 className="text-2xl font-serif text-yellow-500 mb-4 uppercase tracking-wider">{firstName}</h2>
                <div className="flex gap-2 mb-6">
                  <div className="w-1 h-1 rounded-full bg-yellow-600" />
                  <div className="w-1 h-1 rounded-full bg-yellow-600" />
                  <div className="w-1 h-1 rounded-full bg-yellow-600" />
                </div>
                <p className="text-gray-400 font-serif italic mb-8">{message}</p>
                <button onClick={handleClose} className="px-8 py-3 bg-transparent hover:bg-yellow-900/30 text-yellow-500 font-serif uppercase tracking-[0.2em] border border-yellow-600 transition-colors">Entrar</button>
              </div>
            </div>
          </div>
        );

      case 'nature_leaves':
        return (
          <div className="relative w-full max-w-md bg-[#f4faec] shadow-xl overflow-hidden flex flex-col max-h-[90vh] rounded-2xl rounded-tr-[5rem] rounded-bl-[5rem]">
            <div className="relative aspect-[4/5] w-full shrink-0">
              {renderMedia()}
              <div className="absolute inset-0 bg-emerald-900/10" />
            </div>
            <div className="p-8 flex flex-col items-center text-center overflow-y-auto">
              <h2 className="text-3xl font-serif text-emerald-800 mb-4">{firstName}</h2>
              <div className="w-16 h-1 bg-emerald-300 rounded-full mb-6" />
              <p className="text-emerald-700 leading-relaxed font-medium mb-8">{message}</p>
              <button onClick={handleClose} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-full shadow-lg hover:shadow-emerald-600/30 transition-all">Explorar Verde</button>
            </div>
          </div>
        );

      case 'pop_art':
        return (
          <div className="relative w-full max-w-md bg-yellow-300 border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-1 bg-[radial-gradient(circle,rgba(0,0,0,0.1)_2px,transparent_2px)] bg-[length:10px_10px]">
              <div className="relative aspect-[4/5] w-full shrink-0 border-4 border-black bg-cyan-400 overflow-hidden">
                {renderMedia()}
                <div className="absolute inset-0 mix-blend-hard-light bg-pink-500/30" />
              </div>
              <div className="p-6 flex flex-col items-center text-center bg-white border-4 border-black mt-2">
                <div className="bg-pink-500 text-white font-black uppercase text-2xl px-4 py-1 border-2 border-black -mt-10 rotate-[-5deg] shadow-[4px_4px_0_0_rgba(0,0,0,1)] mb-6">
                  POW! Oii {firstName}!
                </div>
                <p className="text-black font-bold uppercase mb-6 leading-tight">{message}</p>
                <button onClick={handleClose} className="px-8 py-3 bg-cyan-400 hover:bg-cyan-300 text-black font-black uppercase border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-transform hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]">Bora!</button>
              </div>
            </div>
          </div>
        );

      case 'glassmorphism':
        return (
          <div className="relative w-full max-w-md bg-white/20 backdrop-blur-xl border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="relative aspect-[4/5] w-full shrink-0 p-4">
              <div className="w-full h-full rounded-2xl overflow-hidden shadow-inner">
                {renderMedia()}
              </div>
            </div>
            <div className="p-8 pt-4 flex flex-col items-center text-center overflow-y-auto">
              <h2 className="text-3xl font-light text-white drop-shadow-md mb-2">{firstName}</h2>
              <p className="text-white/80 font-medium leading-relaxed drop-shadow-sm mb-8">{message}</p>
              <button onClick={handleClose} className="px-8 py-3 bg-white/30 hover:bg-white/40 border border-white/50 text-white font-medium rounded-full shadow-lg backdrop-blur-md transition-all">Ver Detalhes</button>
            </div>
          </div>
        );

      case 'vintage_newspaper':
        return (
          <div className="relative w-full max-w-sm bg-[#eedfc8] border-[8px] border-double border-stone-800 p-4 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="border-b-2 border-stone-800 pb-2 mb-4 text-center">
              <h1 className="text-3xl font-black font-serif text-stone-900 tracking-tighter uppercase mb-1">A Gazeta do Evento</h1>
              <p className="text-xs font-serif text-stone-600 uppercase tracking-widest">{new Date().toLocaleDateString()}</p>
            </div>
            <div className="relative aspect-[4/5] w-full shrink-0 border border-stone-800 p-1 bg-[#eedfc8] mb-4 sepia contrast-125">
              <div className="w-full h-full overflow-hidden">
                {renderMedia()}
              </div>
            </div>
            <div className="flex flex-col text-center overflow-y-auto">
              <h2 className="text-2xl font-black font-serif text-stone-900 mb-2 underline decoration-stone-400">PRESENÇA ILUSTRE: {firstName.toUpperCase()}!</h2>
              <p className="text-stone-800 font-serif text-sm leading-snug mb-6 text-justify" style={{columnCount: 2, columnGap: '1rem'}}>{message}</p>
              <button onClick={handleClose} className="mx-auto w-full py-2 bg-stone-800 hover:bg-stone-700 text-[#eedfc8] font-serif uppercase tracking-widest font-bold">Ler Tudo</button>
            </div>
          </div>
        );

      case 'ocean_breeze':
        return (
          <div className="relative w-full max-w-md bg-gradient-to-br from-teal-50 to-cyan-100 shadow-xl overflow-hidden flex flex-col max-h-[90vh] rounded-[2rem]">
            <div className="relative aspect-[4/5] w-full shrink-0">
               {renderMedia()}
               {/* Wave SVG */}
               <svg className="absolute bottom-0 left-0 w-full text-teal-50" viewBox="0 0 1440 320" fill="currentColor">
                 <path d="M0,192L48,197.3C96,203,192,213,288,192C384,171,480,117,576,112C672,107,768,149,864,165.3C960,181,1056,171,1152,144C1248,117,1344,75,1392,53.3L1440,32L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
               </svg>
            </div>
            <div className="p-8 pt-2 flex flex-col items-center text-center overflow-y-auto z-10">
              <h2 className="text-3xl font-bold text-teal-800 mb-3">{firstName}</h2>
              <p className="text-cyan-800 font-medium leading-relaxed mb-8">{message}</p>
              <button onClick={handleClose} className="px-8 py-3 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-full shadow-lg shadow-teal-500/30 transition-all">Mergulhar</button>
            </div>
          </div>
        );

      case 'royal_purple':
        return (
          <div className="relative w-full max-w-md bg-indigo-950 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] rounded-lg border-2 border-purple-500/30">
            <div className="relative aspect-[4/5] w-full shrink-0 p-3 pb-0">
              <div className="w-full h-full rounded-t-full border-t-2 border-l-2 border-r-2 border-yellow-400 overflow-hidden">
                {renderMedia()}
                <div className="absolute inset-0 bg-indigo-900/30 mix-blend-multiply" />
              </div>
            </div>
            <div className="p-8 pb-10 flex flex-col items-center text-center overflow-y-auto">
              <Crown size={32} className="text-yellow-400 mb-3" />
              <h2 className="text-2xl font-serif text-yellow-300 mb-4 tracking-wide">{firstName}</h2>
              <p className="text-indigo-200 font-serif leading-relaxed mb-8 italic px-4">{message}</p>
              <button onClick={handleClose} className="px-8 py-2 bg-transparent text-yellow-400 font-serif border-y-2 border-yellow-600 hover:bg-yellow-900/40 transition-colors uppercase tracking-[0.2em] text-sm">Adentrar</button>
            </div>
          </div>
        );

      case 'modern_gradient':
      default:
        return (
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="relative aspect-[4/5] w-full shrink-0 bg-gradient-to-br from-orange-400 to-rose-500 overflow-hidden">
              {renderMedia()}
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
              <div className="absolute bottom-4 left-0 w-full flex justify-center">
                <span className="px-4 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-bold text-gray-800 tracking-widest uppercase shadow-sm border border-white/50 flex items-center gap-1.5">
                  <Sparkles size={12} className="text-orange-500" />
                  {eventName}
                </span>
              </div>
            </div>
            <div className="p-8 flex flex-col items-center text-center overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 font-serif capitalize">Olá, {firstName}!</h2>
              <div className="w-12 h-1 bg-gradient-to-r from-orange-300 to-rose-300 rounded-full mb-6 mx-auto" />
              <p className="text-gray-600 leading-relaxed text-base">{message}</p>
              <button
                onClick={handleClose}
                className="mt-8 w-full py-3.5 px-6 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl font-medium tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                Começar a explorar
                <Heart size={18} className="text-red-400" />
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[99999] bg-black/90 flex items-center justify-center p-4 overflow-hidden">
        {audioUrl && <audio ref={audioRef} src={audioUrl} loop preload="auto" />}

        {/* Modal Phase */}
        <AnimatePresence>
            <>
              {/* Discreet Close Button at Screen Top Right */}
              <button
                onClick={handleClose}
                className="fixed top-4 right-4 z-[99999] p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white/70 hover:text-white transition-all"
                title="Fechar"
              >
                <X size={24} />
              </button>

              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: isVisible ? 1 : 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                onClick={handleClose}
              />

              {/* Modal window */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ 
                  opacity: isVisible ? 1 : 0, 
                  scale: isVisible ? 1 : 0.95, 
                  y: isVisible ? 0 : 20 
                }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", bounce: 0.4, duration: 0.8 }}
                className="relative z-10 w-full flex justify-center"
              >
                {/* Audio Controls */}
                {audioUrl && (
                  <div className="absolute -top-12 right-0 md:-right-12 md:top-0">
                    <button
                      onClick={toggleAudio}
                      className="p-3 bg-white/90 backdrop-blur-md text-gray-800 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center"
                      title={isPlayingAudio ? "Pausar Música" : "Tocar Música"}
                    >
                      {isPlayingAudio ? <Volume2 size={20} /> : audioError ? <Play size={20} className="text-red-500" /> : <VolumeX size={20} />}
                    </button>
                  </div>
                )}

                {renderTemplate()}
              </motion.div>
            </>
        </AnimatePresence>
      </div>
    </Portal>
  );
}
