import React, { useState, useEffect } from 'react';
import Portal from './Portal';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../SessionContext';
import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Settings } from '../types';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, X, AlertCircle, ExternalLink, RefreshCcw, HelpCircle, Lock, User, EyeOff, Eye, Ticket, Camera } from 'lucide-react';
import Footer from './Footer';

export default function Login({ settings: initialSettings }: { settings?: Settings | null }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(initialSettings || null);
  const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [progress, setProgress] = useState(0);
  const { login, sessionId } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    const cachedObj = localStorage.getItem('guestCache');
    if (cachedObj) {
      try {
        const data = JSON.parse(cachedObj);
        if (data.name) setName(data.name);
        if (data.phone) setPhone(data.phone);
        if (data.pin) setPin(data.pin);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
      return;
    }
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as Settings);
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    };
    fetchSettings();
  }, [initialSettings]);

  useEffect(() => {
    if (!settings?.eventDate) return;

    const eventTime = new Date(settings.eventDate).getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = eventTime - now;

      if (distance < 0) {
        setTimeLeft(null);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [settings?.eventDate]);

  useEffect(() => {
    if (showSplash) return; // Wait for splash screen to finish

    const params = new URLSearchParams(window.location.search);
    const inviteParam = params.get('invite');

    const checkInviteAndLogin = async () => {
      if (inviteParam) {
        setLoading(true);
        try {
          const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
          const settingsData = settingsDoc.data();
          if (settingsData && settingsData.inviteCode === inviteParam) {
            setInviteCode(inviteParam);
          } else {
            setError('Código de convite na URL é inválido.');
            setInviteCode(inviteParam);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
    };

    if (sessionId) {
      navigate({ pathname: '/gallery', search: window.location.search });
    } else {
      checkInviteAndLogin();
    }
  }, [sessionId, navigate, login, showSplash]);

  useEffect(() => {
    let html5QrCode: Html5Qrcode;
    if (isScanning) {
      html5QrCode = new Html5Qrcode("reader");
      html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          try {
            const url = new URL(decodedText);
            const invite = url.searchParams.get('invite');
            if (invite) {
              setInviteCode(invite);
              setIsScanning(false);
            }
          } catch (e) {
            setInviteCode(decodedText);
            setIsScanning(false);
          }
        },
        (errorMessage) => {
          // parse error, ignore
        }
      ).catch((err) => {
        console.error("Error starting scanner", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || String(err).includes('Permission denied')) {
          setError("Acesso à câmera negado. Clique no ícone de cadeado na barra de endereços, mude 'Câmera' para 'Permitir' e clique em 'Tentar Novamente'. Ou abra em uma nova aba.");
        } else {
          setError("Não foi possível acessar a câmera para ler o QR Code. Certifique-se de que deu permissão ou tente abrir o app em uma nova aba.");
        }
        setIsScanning(false);
      });
    }

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [isScanning]);

  const formatName = (input: string) => {
    return input
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
      const settingsData = settingsDoc.data();

      if (!settingsData) {
        throw new Error('Configuração não encontrada.');
      }

      if (settingsData.inviteCode !== inviteCode) {
        throw new Error('Código de convite inválido.');
      }

      const trimmedName = name.trim();
      const nameParts = trimmedName.split(/\s+/);
      if (nameParts.length < 2 || nameParts[0].length < 2 || nameParts[1].length < 2) {
        throw new Error('Por favor, insira nome e sobrenome.');
      }

      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length < 10) throw new Error('Por favor, insira um telefone válido com DDD.');
      
      const trimmedPin = pin.trim();
      if (trimmedPin.length !== 4) throw new Error('O PIN deve ter exatamente 4 números.');

      const formattedName = formatName(trimmedName);
      const guestId = cleanPhone;
      
      const userRef = doc(db, 'guest_users', guestId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        
        const dbNameLower = (userData.name || '').toLowerCase().trim();
        const inputNameLower = formattedName.toLowerCase().trim();
        
        if (dbNameLower && dbNameLower !== inputNameLower) {
          throw new Error(`Este telefone já está cadastrado com outro nome. Por favor, digite o nome usado no primeiro login.`);
        }
        
        if (userData.pin !== trimmedPin) {
          throw new Error('Telefone já cadastrado. Por favor, insira o PIN associado a este telefone.');
        }
        localStorage.setItem('guestCache', JSON.stringify({ name: formattedName || userData.name, phone, pin: trimmedPin }));
        login(formattedName || userData.name, cleanPhone);
      } else {
        await setDoc(userRef, {
          name: formattedName || cleanPhone,
          contact: phone,
          pin: trimmedPin,
          createdAt: serverTimestamp()
        });
        localStorage.setItem('guestCache', JSON.stringify({ name: formattedName || cleanPhone, phone, pin: trimmedPin }));
        login(formattedName || cleanPhone, cleanPhone);
      }

      navigate({ pathname: '/gallery', search: window.location.search });
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!showSplash) return;
    
    const duration = 2000; // 2 seconds
    const interval = 20;
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setProgress(Math.min((currentStep / steps) * 100, 100));
      
      if (currentStep >= steps) {
        clearInterval(timer);
        setTimeout(() => setShowSplash(false), 400);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [showSplash]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value;
    
    // If user is deleting (input is shorter than current phone), just accept it
    if (input.length < phone.length) {
      setPhone(input);
      return;
    }

    let v = input.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    
    if (v.length > 10) {
      v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1)$2-$3');
    } else if (v.length > 6) {
      v = v.replace(/^(\d{2})(\d{4,5})(\d{0,4}).*/, '($1)$2-$3');
    } else if (v.length > 2) {
      v = v.replace(/^(\d{2})(\d{0,5})/, '($1)$2');
    } else if (v.length > 0) {
      v = v.replace(/^(\d*)/, '($1');
    }
    setPhone(v);
  };

  if (showSplash) {
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <Portal>
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#FAFAFA]">
          <div className="relative flex items-center justify-center">
            {/* Background Circle */}
            <svg className="absolute w-40 h-40 transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke="#f3e8d6"
                strokeWidth="4"
                fill="transparent"
              />
              {/* Progress Circle */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke="url(#gold-gradient)"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-75 ease-linear"
              />
              <defs>
                <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#BF953F" />
                  <stop offset="25%" stopColor="#FCF6BA" />
                  <stop offset="50%" stopColor="#B38728" />
                  <stop offset="75%" stopColor="#FBF5B7" />
                  <stop offset="100%" stopColor="#AA771C" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Logo */}
            <div className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center bg-white shadow-sm z-10">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
          </div>
          <div className="mt-8 text-[#D4A373] font-medium tracking-widest uppercase text-sm animate-pulse">
            Carregando...
          </div>
        </div>
      </Portal>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <a 
        href="https://wa.me/5519920103269"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-[74px] right-6 z-40 w-14 h-14 hover:scale-110 transition-transform drop-shadow-[0_4px_15px_rgba(0,0,0,0.6)] animate-pulse-scale"
        title="Fale conosco no WhatsApp"
      >
        <img src="/botao-whats.png" alt="WhatsApp" className="w-full h-full object-contain" />
      </a>

      {/* Imagem de Fundo Moderna de Festa com Celular */}
      <div 
        className="absolute inset-0 z-0 sm:bg-cover sm:bg-center bg-contain bg-[center_top_2rem] bg-no-repeat opacity-100 saturate-[1.25] brightness-110 contrast-110"
        style={{ backgroundImage: `url('/bg-festa-celular.png')` }}
      />
      {/* Sobreposição escura para garantir que o formulário seja legível */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/20 via-black/50 to-[#2A0815] shadow-[inset_0_0_80px_rgba(0,0,0,0.4)]" />

      <div className="w-full max-w-[400px] px-6 z-10 flex flex-col items-center flex-1 justify-center">
        <div className="flex flex-col items-center text-center space-y-4 mb-4 pt-4">
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-tr from-[#B38728] via-[#FCF6BA] to-[#BF953F] p-1 shadow-[0_0_40px_rgba(191,149,63,0.4)] flex items-center justify-center translate-y-[-10px]">
             <div className="w-full h-full bg-[#2A0815] rounded-full flex items-center justify-center relative overflow-hidden">
               <img src="/logo.png" alt="Logo" className="w-[115%] h-[115%] object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden') }} />
               <Camera size={40} className="text-[#D4A373] relative z-10 hidden" />
             </div>
          </div>
          <h1 className="text-4xl sm:text-[2.75rem] font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#D4A373] via-[#FCF6BA] to-[#D4A373] drop-shadow-lg tracking-wide py-1 transform -translate-y-4">
            PicPhotoShare
          </h1>
          <p className="text-white/90 font-medium text-sm px-4 leading-relaxed tracking-wide transform -translate-y-4">
             Onde cada momento vira uma celebração compartilhada!
          </p>
        </div>

        <div className="w-full bg-white/[0.08] backdrop-blur-2xl border border-[#D4AF37] rounded-[2.5rem] p-6 shadow-[0_0_25px_rgba(212,175,55,0.4),0_15px_40px_rgba(0,0,0,0.5)] mb-8 relative">
          
          <form onSubmit={handleLogin} className="space-y-4 flex flex-col items-center w-full mt-2">
            
            <div className="relative w-full group">
              <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#D4A373]/70 group-focus-within:text-[#D4A373] transition-colors" />
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-full bg-white/[0.05] border border-white/10 text-white placeholder-white/40 focus:bg-white/[0.08] focus:border-[#D4A373]/50 focus:ring-1 focus:ring-[#D4A373]/50 outline-none transition-all text-[15px]"
                placeholder="Nome Completo"
                required
              />
            </div>

            <div className="relative w-full group">
              <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#D4A373]/70 group-focus-within:text-[#D4A373] transition-colors" />
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                className="w-full pl-12 pr-4 py-3.5 rounded-full bg-white/[0.05] border border-white/10 text-white placeholder-white/40 focus:bg-white/[0.08] focus:border-[#D4A373]/50 focus:ring-1 focus:ring-[#D4A373]/50 outline-none transition-all text-[15px]"
                placeholder="Telefone ex: (11)99999-9999"
                required
              />
            </div>
            
            <div className="relative w-full group">
              <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#D4A373]/70 group-focus-within:text-[#D4A373] transition-colors" />
              <input
                id="pin"
                type={showPin ? "text" : "password"}
                pattern="\d*"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  const input = e.target.value;
                  if (input.length < pin.length) {
                    setPin(input);
                    return;
                  }
                  const val = input.replace(/\D/g, '');
                  if (val.length <= 4) setPin(val);
                }}
                className="w-full pl-12 pr-12 py-3.5 rounded-full bg-white/[0.05] border border-white/10 text-white placeholder-white/40 focus:bg-white/[0.08] focus:border-[#D4A373]/50 focus:ring-1 focus:ring-[#D4A373]/50 outline-none transition-all text-[15px]"
                placeholder="PIN (4 números)"
                required
              />
              <button
                type="button"
                className="absolute right-5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                onClick={() => setShowPin(!showPin)}
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-white/60 text-xs px-2 text-center">
              No primeiro acesso, crie um PIN de <strong className="text-white/80">exatamente 4 números</strong>. Guarde-o para os próximos acessos.
            </p>

            <div className="relative w-full group">
              <Ticket size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#D4A373]/70 group-focus-within:text-[#D4A373] transition-colors" />
              <input
                id="code"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-full bg-white/[0.05] border border-white/10 text-white placeholder-white/40 focus:bg-white/[0.08] focus:border-[#D4A373]/50 focus:ring-1 focus:ring-[#D4A373]/50 outline-none transition-all text-[15px]"
                placeholder="Código do Convite"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-900/30 text-rose-300 rounded-2xl text-[13px] border border-rose-500/30 flex flex-col gap-2 w-full mt-2 backdrop-blur-md">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            <div className="pt-2 w-full">
              <div className="border border-white/10 rounded-[1.25rem] p-3 bg-gradient-to-b from-white/[0.02] to-white/[0.05]">
                <button
                  type="button"
                  onClick={() => setIsScanning(true)}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-4 flex items-center justify-center gap-3 transition-colors text-white/90 text-[15px] tracking-wide"
                >
                  <QrCode size={22} className="text-[#D4A373]" />
                  Ler QR Code
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative w-full mt-6 rounded-full p-[2px] bg-gradient-to-tr from-[#B38728] via-[#FCF6BA] to-[#BF953F] shadow-[0_4px_25px_rgba(191,149,63,0.4)] hover:shadow-[0_6px_30px_rgba(191,149,63,0.6)] transition-all active:scale-[0.98] group"
            >
              <div className="w-full h-full bg-gradient-to-b from-zinc-800 via-black to-black rounded-full py-4 flex items-center justify-center shadow-[inset_0_2px_15px_rgba(0,0,0,0.8)]">
                <span className="text-base font-bold uppercase tracking-[0.15em] bg-clip-text text-transparent bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] drop-shadow-[0_2px_2px_rgba(0,0,0,1)] group-hover:brightness-125 transition-all">
                  {loading ? 'Aguarde...' : 'ENTRAR'}
                </span>
              </div>
            </button>
          </form>
        </div>
      </div>
      
      <div className="w-full z-10 shrink-0 relative mt-auto pb-4">
        <Footer isLogin={true} />
      </div>

      {isScanning && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-md">
          <button
            onClick={() => setIsScanning(false)}
            className="absolute top-6 right-6 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
          >
            <X size={24} />
          </button>
          
          <div className="w-full max-w-sm">
            <h3 className="text-white text-center font-medium text-lg mb-6 tracking-wide uppercase">Ler QR Code</h3>
            <div className="relative rounded-[2rem] overflow-hidden border-2 border-[#D4A373]/50 shadow-[0_0_30px_rgba(212,163,115,0.2)] bg-black">
              <div id="reader" className="w-full min-h-[300px]"></div>
            </div>
            <p className="text-center text-white/50 text-sm mt-6 font-light">
              Aponte a câmera para o QR Code do convite
            </p>
          </div>
        </div>
      )}
    </div>
  );
}